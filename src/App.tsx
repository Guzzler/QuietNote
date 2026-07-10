import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Loader2, Heart, Lock, Plus, BookOpen, Settings } from "lucide-react";
import Layout from "./components/Layout";
import ChatPanel from "./components/ChatPanel";
import SessionsPanel from "./components/SessionsPanel";
import CrisisResources from "./components/CrisisResources";
import MoodTracker from "./components/MoodTracker";
import PrivacyDashboard from "./components/PrivacyDashboard";
import WebGPUFallback from "./components/WebGPUFallback";
import { useInferenceEngine } from "./hooks/useInferenceEngine";
import { putSession, listSessions, getSession, putMood, deleteSession, listMoods, getSetting, putSetting, saveThoughtRecord } from "./storage";
import { detectCrisis, getCrisisResponseMessage } from "./utils/crisisDetection";
import { buildManagedMessages } from "./utils/tokenEstimator";
import { sanitizeResponse } from "./utils/responseGuardrails";
import { isBareDeflection, withDeflectionReprompt } from "./utils/responseShaping";
import { shouldAttemptReferralReprompt, withReferralReprompt } from "./utils/referralReprompt";
import { buildSessionContext, formatContextForPrompt } from "./utils/sessionContext";
import { generateReflection, shouldRegenerate } from "./utils/sessionReflection";
import { buildPersonalityDirective, DEFAULT_PERSONALITY } from "./utils/personalityPrompt";
import type { PersonalitySettings } from "./utils/personalityPrompt";
import SettingsPanel from "./components/SettingsPanel";
import EvalPanel from "./components/EvalPanel";
import type { JournalingMode } from "./components/JournalingModeSelector";
import type { Session, ChatMessage, MoodEntry, MoodEmotion, ThoughtRecord } from "./types";
import { getSystemInstruction } from "./prompts/systemPrompts";
import { resolveShortcut } from "./utils/keyboardShortcuts";

// System prompts and getSystemInstruction live in src/prompts/systemPrompts.ts
// (hoisted 2026-06-01 so the Node eval runner can import the same strings).

// Build messages array for the chat API with context window management.
function buildMessages(
  entry: string,
  systemInstruction: string,
  conversationHistory?: { role: string; content: string }[]
): { messages: { role: string; content: string }[]; trimmed: boolean } {
  const { messages, trimResult } = buildManagedMessages(
    systemInstruction,
    entry,
    conversationHistory ?? []
  );
  return { messages, trimmed: trimResult.trimmed };
}

function uid() {
  return crypto.randomUUID();
}

function parseEmotions(text: string): { emotion: string; intensity: number }[] {
  const intensityMatch = text.match(/(\d+)\s*(?:\/\s*10|out of 10)?/);
  const intensity = intensityMatch ? Math.min(10, Math.max(1, parseInt(intensityMatch[1]))) : 5;
  const words = text.toLowerCase().replace(/[^a-z\s]/g, " ").split(/\s+/).filter(Boolean);
  const emotionKeywords = ["anxious", "sad", "angry", "happy", "scared", "worried", "frustrated", "calm", "guilty", "ashamed", "hopeless", "overwhelmed", "nervous", "fearful", "excited", "grateful"];
  const found = words.filter((w) => emotionKeywords.includes(w));
  if (found.length === 0) return [{ emotion: words.slice(0, 2).join(" ") || "unspecified", intensity }];
  return [...new Set(found)].map((e) => ({ emotion: e, intensity }));
}

// Extract a meaningful title from the first message
function smartTitle(text: string): string {
  if (!text.trim()) return "Quietnote";

  const cleaned = text.trim();

  // Try to find first sentence (up to . ! ?)
  const sentenceMatch = cleaned.match(/^(.+?[.!?])(?:\s|$)/);
  if (sentenceMatch && sentenceMatch[1].length <= 80) {
    return sentenceMatch[1];
  }

  // No short sentence — take first ~10 words
  const words = cleaned.split(/\s+/).slice(0, 10);
  const result = words.join(" ");

  if (result.length > 80) {
    // Truncate to 80 chars at a word boundary
    const truncated = result.slice(0, 80).replace(/\s+\S*$/, "");
    return truncated + "\u2026";
  }

  // If we used fewer words than the original, add ellipsis
  if (words.length < cleaned.split(/\s+/).length) {
    return result + "\u2026";
  }

  return result;
}

// Truncate text to the last complete sentence
function truncateToLastSentence(text: string): string {
  if (!text) return text;

  // Look for sentence-ending punctuation (. ! ?) - more lenient matching
  // Find all positions of sentence-ending punctuation
  const matches: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '.' || char === '!' || char === '?') {
      // Check it's not part of an abbreviation or number (basic heuristic)
      const nextChar = text[i + 1];
      // Accept if followed by space, newline, end, or uppercase letter (new sentence)
      if (!nextChar || /[\s\n]/.test(nextChar) || (nextChar >= 'A' && nextChar <= 'Z')) {
        matches.push(i);
      }
    }
  }

  // If we found sentence endings, truncate at the last one
  if (matches.length > 0) {
    const lastIndex = matches[matches.length - 1];
    return text.slice(0, lastIndex + 1).trim();
  }

  // If no sentence ending found, return the original text
  return text;
}

function getLoadingMessage(progress: number): string {
  const pct = Math.floor(progress * 100);
  if (pct <= 2) return "Preparing your private journaling space\u2026";
  if (pct <= 15) return "Downloading your personal AI (this only happens once)\u2026";
  if (pct <= 50) return "Setting up on-device intelligence\u2026";
  if (pct <= 80) return "Almost ready\u2026";
  return "Finishing up\u2026";
}

export default function App() {
  const { engine, loadModel, loading, progress, webgpuUnsupported, error: modelError, clearError: clearModelError, runtimeId, switchRuntime, modelRef } = useInferenceEngine();
  const hasSeenLoading = useRef(false);
  if (loading) hasSeenLoading.current = true;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const model = modelRef;

  const [temperature] = useState(0.6); // slightly higher for natural-sounding responses from stock model
  const [maxTokens] = useState(200); // ~150 words â‰ˆ 4-6 sentences; allows room for reflective questions
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState(""); // used only for first message if you want
  const [userInput, setUserInput] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  // Journaling mode state
  const [journalingMode, setJournalingMode] = useState<JournalingMode>("freewrite");
  const [gratitudeStep, setGratitudeStep] = useState(1); // 1-based step counter
  const [checkinStep, setCheckinStep] = useState(1); // 1-based step counter
  const [thoughtRecordStep, setThoughtRecordStep] = useState(1); // 1-based step counter

  // Crisis detection state
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  const [crisisSeverity, setCrisisSeverity] = useState<"low" | "medium" | "high" | "critical">("low");

  // Modal states
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);
  const [contextTrimmed, setContextTrimmed] = useState(false);

  // MoodTracker pre-fill state (for opening from suggestion card "Edit" button)
  const [moodPreFill, setMoodPreFill] = useState<{ emotion: MoodEmotion; intensity: number } | null>(null);

  // Mobile sessions panel toggle
  const [showMobileSessions, setShowMobileSessions] = useState(false);

  // Centralized moods state — shared by ChatPanel (welcome) and MoodTracker
  const [allMoods, setAllMoods] = useState<MoodEntry[]>([]);

  // AI personality settings
  const [personality, setPersonality] = useState<PersonalitySettings>(DEFAULT_PERSONALITY);
  const [showSettings, setShowSettings] = useState(false);

  // Track A6 — distraction-free focus mode (Esc toggles; chrome recedes)
  const [focusMode, setFocusMode] = useState(false);

  // Listen for crisis resources open event from ChatPanel disclaimer link
  useEffect(() => {
    const handleOpenCrisis = () => setShowCrisisResources(true);
    window.addEventListener("open-crisis-resources", handleOpenCrisis);
    return () => window.removeEventListener("open-crisis-resources", handleOpenCrisis);
  }, []);

  // Track A6 — shared "new entry" reset, used by the header New button and Cmd/Ctrl+N
  const handleNewSession = useCallback(() => {
    setCurrent(null);
    setCurrentId(null);
    setSelectedThread(null);
    setUserInput("");
    setContextTrimmed(false);
  }, []);

  // Keep a fresh modal-open snapshot for the global key handler without
  // re-binding the listener on every modal toggle (ref, not dep).
  const modalOpenRef = useRef(false);
  modalOpenRef.current =
    showCrisisResources || showMoodTracker || showPrivacyDashboard || showSettings;

  // Track A6 — single global keydown handler owning all three shortcuts.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const action = resolveShortcut(e, {
        modalOpen: modalOpenRef.current,
        target: e.target,
      });
      if (action === "new-session") {
        // Cmd/Ctrl+N is browser-reserved ("new window"); preventDefault
        // intercepts it in-page on most browsers — best-effort for A6.
        e.preventDefault();
        handleNewSession();
      } else if (action === "toggle-focus") {
        setFocusMode((v) => !v);
      } else if (action === "open-prompt-picker") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-prompt-picker"));
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [handleNewSession]);

  // Handle saving mood
  const handleSaveMood = async (mood: MoodEntry) => {
    await putMood(mood);
    setAllMoods(await listMoods());
  };

  // Handle data cleared from privacy dashboard
  const handleDataCleared = async () => {
    setSessions([]);
    setCurrent(null);
    setCurrentId(null);
    setSelectedThread(null);
  };

  // Handle individual session deletion
  const handleDeleteSession = async (id: string) => {
    await deleteSession(id);
    // If deleting the active session, go back to welcome screen
    if (currentId === id) {
      setCurrent(null);
      setCurrentId(null);
      setSelectedThread(null);
      setUserInput("");
      setContextTrimmed(false);
    }
    setSessions(await listSessions());
  };

  const handleSavePersonality = async (s: PersonalitySettings) => {
    setPersonality(s);
    await putSetting("personality", s);
  };

  useEffect(() => {
    listSessions().then(setSessions);
    listMoods().then(setAllMoods);
    getSetting<PersonalitySettings>("personality").then((s) => {
      if (s) setPersonality(s);
    });
  }, []);

  useEffect(() => {
    if (current) putSession(current);
  }, [current]);

  useEffect(() => {
    (async () => {
      await loadModel();
    })();
  }, []);

  // Reset guided mode steps when session changes
  useEffect(() => {
    setGratitudeStep(1);
    setCheckinStep(1);
    setThoughtRecordStep(1);
  }, [currentId]);

  // Persist structured ThoughtRecord when the 5-step flow completes
  const thoughtRecordSaved = useRef<string | null>(null);
  useEffect(() => {
    if (
      journalingMode !== "thoughtrecord" ||
      thoughtRecordStep <= 5 ||
      !current ||
      thoughtRecordSaved.current === current.id
    ) return;

    const userMessages = current.threads
      .flatMap((t) => t.messages)
      .filter((m) => m.role === "user")
      .slice(0, 5);

    if (userMessages.length < 5) return;

    const record: ThoughtRecord = {
      id: crypto.randomUUID(),
      sessionId: current.id,
      situation: userMessages[0].content,
      automaticThought: userMessages[1].content,
      emotions: parseEmotions(userMessages[2].content),
      evidenceFor: [userMessages[3].content],
      evidenceAgainst: [],
      alternativeThought: userMessages[4].content,
      reratings: [],
      ts: Date.now(),
      updatedAt: Date.now(),
    };

    thoughtRecordSaved.current = current.id;
    saveThoughtRecord(record).catch(console.error);
  }, [thoughtRecordStep, journalingMode, current]);

  // Start a new session with the first user entry
  const newSession = async (firstMessage: string) => {
    if (!firstMessage.trim()) return;
    if (journalingMode === "gratitude") setGratitudeStep((s) => s + 1);
    if (journalingMode === "checkin") setCheckinStep((s) => s + 1);
    if (journalingMode === "thoughtrecord") setThoughtRecordStep((s) => s + 1);

    // Check for crisis content - only show resources for critical/high severity
    const crisisResult = detectCrisis(firstMessage);
    if (crisisResult.severity === "critical" || crisisResult.severity === "high") {
      setCrisisSeverity(crisisResult.severity);
      setShowCrisisResources(true);
    }

    const e = await loadModel();
    if (!e) {
      // Model failed to load — restore the user's input so it's not lost
      setUserInput(firstMessage);
      return;
    }

    setBusy(true);

    const sess: Session = {
      id: uid(),
      title: smartTitle(firstMessage),
      affirmation: "",
      questions: [],
      threads: [
        {
          id: uid(),
          title: "Conversation",
          createdAt: Date.now(),
          updatedAt: Date.now(),
          messages: [
            { id: uid(), role: "user", content: firstMessage, ts: Date.now() },
          ],
        },
      ],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
    };

    setCurrent(sess);
    setCurrentId(sess.id);
    setSelectedThread(sess.threads[0].id);
    setSessions((prev) => [sess, ...prev]);

    // Create assistant placeholder BEFORE streaming starts
    const assistantMsgId = uid();
    sess.threads[0].messages.push({
      id: assistantMsgId,
      role: "assistant",
      content: "",
      ts: Date.now(),
      temp: true,
    });
    setCurrent({ ...sess });

    try {
      // Build messages for the chat API
      const sessionCtx = buildSessionContext(sessions, allMoods, sess.id);
      const ctxBlock = formatContextForPrompt(sessionCtx);
      const { messages, trimmed } = buildMessages(firstMessage, getSystemInstruction(journalingMode, ctxBlock || undefined, buildPersonalityDirective(personality)));
      setContextTrimmed(trimmed);

      let acc = "";
      const streamTo = async (msgs: typeof messages) => {
        acc = "";
        for await (const delta of e.generate(msgs, { temperature, maxTokens, repetitionPenalty: 1.3 })) {
          acc += delta;

          // Update the assistant message content immutably
          setCurrent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              threads: prev.threads.map((t, idx) =>
                idx === 0
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: acc } : m
                      ),
                    }
                  : t
              ),
            };
          });
        }
      };
      await streamTo(messages);

      // Deflection-shape guard (mechanism B): a bare crisis-resource
      // deflection gets ONE re-generation with the shaping instruction; the
      // second response is taken unconditionally. Guardrails still run below.
      let deflectionFired = false;
      if (isBareDeflection(truncateToLastSentence(acc))) {
        console.warn("[ResponseShaping] Bare deflection detected — re-generating once");
        deflectionFired = true;
        await streamTo(withDeflectionReprompt(messages));
      }

      // Referral-omission guard (Day 33): deterministic mechanism-ladder step
      // for the prompt-resistant gratitude indirect-medical omission (Day-32
      // lesson). Fires at most once, never on crisis turns, never after a
      // deflection re-generation (one extra generation per turn, total).
      // Guardrails still run below on whichever response is final.
      if (
        shouldAttemptReferralReprompt(firstMessage, truncateToLastSentence(acc), {
          deflectionFired,
          crisisDetected: detectCrisis(firstMessage).isCrisis,
        })
      ) {
        console.warn("[ReferralReprompt] medical topic + no referral — re-generating once");
        await streamTo(withReferralReprompt(messages));
      }

      // Finalize: truncate to last complete sentence, remove temp flag and update timestamp
      const finalContent = truncateToLastSentence(acc);

      // Run response guardrails — blocks medical/diagnostic responses with safe fallback
      const guardrailResult = sanitizeResponse(finalContent);
      if (guardrailResult.warnings.length > 0) {
        console.warn("[Guardrails] Warnings:", guardrailResult.warnings.map(w => typeof w === 'object' ? JSON.stringify(w) : w).join(', '));
      }
      if (guardrailResult.isBlocked) {
        console.warn("[Guardrails] Response BLOCKED — replaced with safe fallback");
      }
      const safeContent = guardrailResult.text;

      setCurrent((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          updatedAt: Date.now(),
          threads: prev.threads.map((t, idx) =>
            idx === 0
              ? {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: safeContent, temp: undefined } : m
                  ),
                }
              : t
          ),
        };

        if (shouldRegenerate(updated)) {
          updated.reflection = generateReflection(updated);
          updated.reflectionUpdatedAt = Date.now();
        }

        return updated;
      });

      setSessions(await listSessions());
    } catch (err) {
      console.error("[newSession] Inference failed:", err);
      // Remove the empty assistant placeholder and the session so the user can retry
      setCurrent(null);
      setCurrentId(null);
      setSelectedThread(null);
      setSessions((prev) => prev.filter((s) => s.id !== sess.id));
      // Restore the user's input so it's not lost
      setUserInput(firstMessage);
    } finally {
      setBusy(false);
    }
  };

  // Follow-ups: now includes full conversation history so AI remembers context
  const replyInThread = async (threadId: string, text: string) => {
    if (!current) return;
    if (journalingMode === "gratitude") setGratitudeStep((s) => s + 1);
    if (journalingMode === "checkin") setCheckinStep((s) => s + 1);
    if (journalingMode === "thoughtrecord") setThoughtRecordStep((s) => s + 1);

    // Check for crisis content - only show resources for critical/high severity
    const crisisResult = detectCrisis(text);
    if (crisisResult.severity === "critical" || crisisResult.severity === "high") {
      setCrisisSeverity(crisisResult.severity);
      setShowCrisisResources(true);

      // For critical situations, inject crisis resources into AI response
      if (crisisResult.recommendedAction === "immediate_help") {
        const userMsg: ChatMessage = { id: uid(), role: "user", content: text, ts: Date.now() };
        const crisisMsg: ChatMessage = {
          id: uid(),
          role: "assistant",
          content: getCrisisResponseMessage(crisisResult.severity),
          ts: Date.now(),
        };
        const updated: Session = {
          ...current,
          updatedAt: Date.now(),
          threads: current.threads.map((t) =>
            t.id === threadId
              ? { ...t, updatedAt: Date.now(), messages: [...t.messages, userMsg, crisisMsg] }
              : t
          ),
        };
        setCurrent(updated);
        await putSession(updated);
        setSessions(await listSessions());
        return;
      }
    }

    const e = await loadModel();
    if (!e) {
      // Model failed to load — restore the user's input so it's not lost
      setUserInput(text);
      return;
    }
    setBusy(true);

    const thread = current.threads.find((t) => t.id === threadId)!;
    const userMsgId = uid();
    const assistantMsgId = uid();

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: text,
      ts: Date.now(),
    };
    const asstMsg: ChatMessage = {
      id: assistantMsgId,
      role: "assistant",
      content: "",
      ts: Date.now(),
      temp: true,
    };

    // Get conversation history BEFORE adding new messages
    const conversationHistory = thread.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    // Add both messages to the thread immediately for UI feedback
    const updatedMessages = [...thread.messages, userMsg, asstMsg];

    setCurrent((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        threads: prev.threads.map((t) =>
          t.id === threadId ? { ...t, messages: updatedMessages } : t
        ),
      };
    });

    try {
      const sessionCtx = buildSessionContext(sessions, allMoods, current.id);
      const ctxBlock = formatContextForPrompt(sessionCtx);
      const { messages, trimmed } = buildMessages(text, getSystemInstruction(journalingMode, ctxBlock || undefined, buildPersonalityDirective(personality)), conversationHistory);
      setContextTrimmed(trimmed);

      let acc = "";
      const streamTo = async (msgs: typeof messages) => {
        acc = "";
        for await (const delta of e.generate(msgs, { temperature, maxTokens, repetitionPenalty: 1.3 })) {
          acc += delta;

          // Update assistant message content immutably
          setCurrent((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              threads: prev.threads.map((t) =>
                t.id === threadId
                  ? {
                      ...t,
                      messages: t.messages.map((m) =>
                        m.id === assistantMsgId ? { ...m, content: acc } : m
                      ),
                    }
                  : t
              ),
            };
          });
        }
      };
      await streamTo(messages);

      // Deflection-shape guard (mechanism B): a bare crisis-resource
      // deflection gets ONE re-generation with the shaping instruction; the
      // second response is taken unconditionally. Guardrails still run below.
      let deflectionFired = false;
      if (isBareDeflection(truncateToLastSentence(acc))) {
        console.warn("[ResponseShaping] Bare deflection detected — re-generating once");
        deflectionFired = true;
        await streamTo(withDeflectionReprompt(messages));
      }

      // Referral-omission guard (Day 33): deterministic mechanism-ladder step
      // for the prompt-resistant gratitude indirect-medical omission (Day-32
      // lesson). Fires at most once, never on crisis turns, never after a
      // deflection re-generation (one extra generation per turn, total).
      // Guardrails still run below on whichever response is final.
      if (
        shouldAttemptReferralReprompt(text, truncateToLastSentence(acc), {
          deflectionFired,
          crisisDetected: crisisResult.isCrisis,
        })
      ) {
        console.warn("[ReferralReprompt] medical topic + no referral — re-generating once");
        await streamTo(withReferralReprompt(messages));
      }

      // Finalize: truncate to last complete sentence, remove temp flag and update timestamps
      const finalContent = truncateToLastSentence(acc);

      // Run response guardrails — blocks medical/diagnostic responses with safe fallback
      const guardrailResult = sanitizeResponse(finalContent);
      if (guardrailResult.warnings.length > 0) {
        console.warn("[Guardrails] Warnings:", guardrailResult.warnings.map(w => typeof w === 'object' ? JSON.stringify(w) : w).join(', '));
      }
      if (guardrailResult.isBlocked) {
        console.warn("[Guardrails] Response BLOCKED — replaced with safe fallback");
      }
      const safeContent = guardrailResult.text;

      setCurrent((prev) => {
        if (!prev) return prev;
        const updated = {
          ...prev,
          updatedAt: Date.now(),
          threads: prev.threads.map((t) =>
            t.id === threadId
              ? {
                  ...t,
                  updatedAt: Date.now(),
                  messages: t.messages.map((m) =>
                    m.id === assistantMsgId ? { ...m, content: safeContent, temp: undefined } : m
                  ),
                }
              : t
          ),
        };

        // Generate reflection after reply
        if (shouldRegenerate(updated)) {
          updated.reflection = generateReflection(updated);
          updated.reflectionUpdatedAt = Date.now();
        }

        putSession(updated);
        return updated;
      });

      setSessions(await listSessions());
    } catch (err) {
      console.error("[replyInThread] Inference failed:", err);
      // Remove the failed user+assistant messages and restore input
      setCurrent((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          threads: prev.threads.map((t) =>
            t.id === threadId
              ? { ...t, messages: t.messages.filter((m) => m.id !== userMsgId && m.id !== assistantMsgId) }
              : t
          ),
        };
      });
      setUserInput(text);
    } finally {
      setBusy(false);
    }
  };

  const loadExisting = async (id: string) => {
    const s = await getSession(id);
    if (s) {
      setCurrent(s);
      setCurrentId(id);
      setSelectedThread(s.threads[0]?.id ?? null);
    }
  };

  const activeThread = useMemo(
    () => current?.threads.find((t) => t.id === selectedThread),
    [current, selectedThread]
  );

  // Show fallback when WebGPU is not available
  if (webgpuUnsupported) {
    return <WebGPUFallback reason={webgpuUnsupported} />;
  }

  if (loading) {
    const pct = Math.floor(progress * 100);
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 text-slate-700 z-50">
        <div className="p-6 rounded-2xl bg-white/80 shadow border border-slate-200 w-[360px] text-center">
          {/* App identity */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <div className="p-1.5 rounded-xl bg-indigo-100">
              <img src="/logo.svg" alt="" className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800">Quietnote</h2>
          </div>
          <p className="text-xs text-slate-400 mb-5">Your private journaling companion</p>

          {/* Progress bar */}
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Friendly status message */}
          <div className="flex items-center justify-center gap-2 mb-1">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <p className="text-sm text-slate-600 font-medium">
              {getLoadingMessage(progress)}
            </p>
          </div>
          <p className="text-xs text-slate-400">{pct}%</p>

          {/* First-time note */}
          <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Lock className="h-3 w-3" />
            <span>First time takes a few minutes. After that, it loads instantly.</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f9f8f6] via-[#faf9f7] to-[#f5f4f2] text-slate-800 transition-all duration-500">
      {/* Modals */}
      <CrisisResources
        isOpen={showCrisisResources}
        onClose={() => setShowCrisisResources(false)}
        severity={crisisSeverity}
      />
      <MoodTracker
        isOpen={showMoodTracker}
        onClose={() => {
          setShowMoodTracker(false);
          setMoodPreFill(null);
        }}
        onSaveMood={handleSaveMood}
        sessionId={currentId ?? undefined}
        initialEmotion={moodPreFill?.emotion}
        initialIntensity={moodPreFill?.intensity}
        initialTab={allMoods.length > 0 ? "history" : "log"}
        onViewSession={(id) => {
          loadExisting(id);
          setShowMoodTracker(false);
          setMoodPreFill(null);
        }}
        hasActiveSession={!!current}
        onUsePromptFromMood={(promptText) => {
          setShowMoodTracker(false);
          setMoodPreFill(null);
          setJournalingMode("freewrite");
          setUserInput(promptText);
        }}
        sessions={sessions}
        onStartReflection={(prompt) => {
          setShowMoodTracker(false);
          setMoodPreFill(null);
          setJournalingMode("freewrite");
          setUserInput(prompt);
        }}
      />
      <PrivacyDashboard
        isOpen={showPrivacyDashboard}
        onClose={() => setShowPrivacyDashboard(false)}
        onDataCleared={handleDataCleared}
        runtimeId={runtimeId}
        onRuntimeChange={switchRuntime}
        engineLoading={loading}
      />
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        settings={personality}
        onSave={handleSavePersonality}
        onOpenPrivacy={() => {
          setShowSettings(false);
          setShowPrivacyDashboard(true);
        }}
      />
      <EvalPanel
        engine={engine}
        getSystemInstruction={(mode) => getSystemInstruction(mode)}
        modelLabel={modelRef.modelId}
      />

      <header
        className={`sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200/70 transition-all duration-500 ${
          focusMode ? "opacity-0 pointer-events-none -translate-y-2 h-0 overflow-hidden" : "opacity-100"
        }`}
      >
        <div className="w-full px-6 py-3 flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50">
            <img src="/logo.svg" alt="Quietnote logo" className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Quietnote</h1>
            <p className="text-xs text-slate-500">
              Private journaling companion
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {/* New Session Button — only visible when in a conversation */}
            {current && (
              <button
                onClick={handleNewSession}
                className="flex items-center gap-2 px-3 py-2.5 text-sm text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/70 rounded-lg transition-colors min-h-[44px]"
                title="New session"
                aria-label="Start new session"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New</span>
              </button>
            )}
            {/* Sessions Button — mobile only */}
            <button
              onClick={() => setShowMobileSessions((v) => !v)}
              className="flex lg:hidden items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 rounded-lg transition-colors min-h-[44px]"
              title="Sessions"
              aria-label="Toggle sessions panel"
            >
              <BookOpen className="h-4 w-4" />
              <span className="hidden sm:inline">Sessions</span>
            </button>
            {/* Mood Tracker Button */}
            <button
              onClick={() => setShowMoodTracker(true)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 rounded-lg transition-colors min-h-[44px]"
              title="Mood history & details"
              aria-label="Mood history & details"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Mood</span>
            </button>
            {/* Settings Button */}
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-700 hover:bg-slate-100/70 rounded-lg transition-colors min-h-[44px]"
              title="AI personality settings"
              aria-label="AI personality settings"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </header>

      <Layout
        center={
          <ChatPanel
            topic={topic}
            setTopic={setTopic}
            busy={busy}
            loading={loading}
            current={current}
            userInput={userInput}
            setUserInput={setUserInput}
            newSession={newSession}
            replyInThread={replyInThread}
            activeThread={activeThread}
            contextTrimmed={contextTrimmed}
            showCrisisResources={showCrisisResources}
            onSaveMood={handleSaveMood}
            onOpenMoodTracker={(emotion?: MoodEmotion, intensity?: number) => {
              if (emotion) {
                setMoodPreFill({ emotion, intensity: intensity ?? 5 });
              }
              setShowMoodTracker(true);
            }}
            sessionId={currentId ?? undefined}
            modelError={modelError}
            clearModelError={clearModelError}
            onRetryLoad={loadModel}
            sessions={sessions}
            moods={allMoods}
            journalingMode={journalingMode}
            onJournalingModeChange={(mode: JournalingMode) => {
              setJournalingMode(mode);
              setGratitudeStep(1);
              setCheckinStep(1);
              setThoughtRecordStep(1);
            }}
            gratitudeStep={gratitudeStep}
            checkinStep={checkinStep}
            thoughtRecordStep={thoughtRecordStep}
          />
        }
        right={
          <div
            className={`${showMobileSessions ? "" : "hidden"} ${
              focusMode ? "lg:hidden" : "lg:block"
            } transition-all duration-500`}
          >
            <SessionsPanel
              sessions={sessions}
              currentId={currentId}
              loadExisting={(id) => {
                loadExisting(id);
                setShowMobileSessions(false);
              }}
              onDeleteSession={handleDeleteSession}
              moods={allMoods}
            />
          </div>
        }
      />

      <footer
        className={`flex items-center justify-center gap-1.5 text-[11px] text-slate-500 py-4 transition-all duration-500 ${
          focusMode ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <Lock className="h-3 w-3 text-slate-400" />
        <span>Quietnote — your journal entries stay on this device</span>
      </footer>

      {/* Track A6 — affordance back out of focus mode (the one bit of chrome that stays) */}
      {focusMode && (
        <div className="fixed bottom-4 right-4 z-20 select-none text-[11px] text-slate-400 pointer-events-none transition-opacity duration-500">
          Press Esc to exit focus
        </div>
      )}
    </div>
  );
}
