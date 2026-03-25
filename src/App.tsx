import { useState, useEffect, useMemo } from "react";
import { Brain, Shield, Loader2, Heart } from "lucide-react";
import Layout from "./components/Layout";
import ChatPanel from "./components/ChatPanel";
import SessionsPanel from "./components/SessionsPanel";
import CrisisResources from "./components/CrisisResources";
import MoodTracker from "./components/MoodTracker";
import PrivacyDashboard from "./components/PrivacyDashboard";
import WebGPUFallback from "./components/WebGPUFallback";
import { useMLCEngine, MODEL_REF } from "./hooks/useMLCEngine";
import { putSession, listSessions, getSession, putMood } from "./storage";
import { detectCrisis, getCrisisResponseMessage } from "./utils/crisisDetection";
import { buildManagedMessages } from "./utils/tokenEstimator";
import { sanitizeResponse } from "./utils/responseGuardrails";
import type { Session, ChatMessage, ModelRef, MoodEntry, MoodEmotion } from "./types";

// System instruction for the model
const SYSTEM_INSTRUCTION = `You are Quietnote, a thoughtful journaling companion. Your role is to help users explore their thoughts and feelings through gentle reflection.

Guidelines:
- Acknowledge what the user shared with empathy (1 sentence)
- Ask 1-2 open-ended questions to help them reflect deeper
- Never give advice, diagnose, or make assumptions about their situation
- NEVER recommend medications, supplements, dosages, or treatments — including natural ones like melatonin or herbal remedies
- If asked about ANY health condition, treatment, or diagnosis, redirect to journaling about how it makes them feel and suggest consulting a healthcare professional
- Keep responses concise (3-4 sentences total)
- Use a warm, calm tone

Example:
User: "I had a stressful day at work"
Assistant: "It sounds like work took a lot out of you today. What moment felt the most overwhelming? Is there anything that helped you get through it?"

User: "Should I try melatonin for my insomnia?"
Assistant: "Sleep difficulties can be really draining. What's been on your mind when you're lying awake? If sleep is an ongoing struggle, a doctor could help explore what's going on."`;

// Build messages array for the chat API with context window management.
// Uses token estimation to trim older messages when the conversation
// exceeds the model's context limit. Returns both messages and whether
// trimming occurred (for UI indicator).
function buildMessages(
  entry: string,
  conversationHistory?: { role: string; content: string }[]
): { messages: { role: string; content: string }[]; trimmed: boolean } {
  const { messages, trimResult } = buildManagedMessages(
    SYSTEM_INSTRUCTION,
    entry,
    conversationHistory ?? []
  );
  return { messages, trimmed: trimResult.trimmed };
}

function uid() {
  return crypto.randomUUID();
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

export default function App() {
  const { loadModel, loading, logs, progress, webgpuUnsupported } = useMLCEngine();

  const [sessions, setSessions] = useState<Session[]>([]);
  const [current, setCurrent] = useState<Session | null>(null);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [model] = useState<ModelRef>(MODEL_REF);

  const [temperature] = useState(0.4); // tight for instruction following
  const [maxTokens] = useState(150); // ~112 words ≈ 4-5 sentences; hard-caps generation length
  const [busy, setBusy] = useState(false);
  const [topic, setTopic] = useState(""); // used only for first message if you want
  const [userInput, setUserInput] = useState("");
  const [selectedThread, setSelectedThread] = useState<string | null>(null);

  // Crisis detection state
  const [showCrisisResources, setShowCrisisResources] = useState(false);
  const [crisisSeverity, setCrisisSeverity] = useState<"low" | "medium" | "high" | "critical">("low");

  // Modal states
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [showPrivacyDashboard, setShowPrivacyDashboard] = useState(false);
  const [contextTrimmed, setContextTrimmed] = useState(false);

  // MoodTracker pre-fill state (for opening from suggestion card "Edit" button)
  const [moodPreFill, setMoodPreFill] = useState<{ emotion: MoodEmotion; intensity: number } | null>(null);

  // Listen for crisis resources open event from ChatPanel disclaimer link
  useEffect(() => {
    const handleOpenCrisis = () => setShowCrisisResources(true);
    window.addEventListener("open-crisis-resources", handleOpenCrisis);
    return () => window.removeEventListener("open-crisis-resources", handleOpenCrisis);
  }, []);

  // Handle saving mood
  const handleSaveMood = async (mood: MoodEntry) => {
    await putMood(mood);
  };

  // Handle data cleared from privacy dashboard
  const handleDataCleared = async () => {
    setSessions([]);
    setCurrent(null);
    setCurrentId(null);
    setSelectedThread(null);
  };

  useEffect(() => {
    listSessions().then(setSessions);
  }, []);

  useEffect(() => {
    if (current) putSession(current);
  }, [current]);

  useEffect(() => {
    (async () => {
      await loadModel();
    })();
  }, []);

  // Start a new session with the first user entry
  const newSession = async (firstMessage: string) => {
    const e = await loadModel();
    if (!firstMessage.trim()) return;

    // Check for crisis content - only show resources for critical/high severity
    const crisisResult = detectCrisis(firstMessage);
    if (crisisResult.severity === "critical" || crisisResult.severity === "high") {
      setCrisisSeverity(crisisResult.severity);
      setShowCrisisResources(true);
    }

    setBusy(true);

    const sess: Session = {
      id: uid(),
      title: firstMessage.slice(0, 48) || "Quietnote",
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
      const { messages, trimmed } = buildMessages(firstMessage);
      setContextTrimmed(trimmed);

      // Reset WebLLM's internal KV cache to prevent stale state accumulation.
      // We provide the full conversation in the messages array, so the engine
      // must process it from scratch each turn to avoid repetition/corruption.
      await e.resetChat();

      const stream = await e.chat.completions.create({
        messages,
        temperature,
        max_tokens: maxTokens,
        repetition_penalty: 1.3,
        stream: true,
      });

      let acc = "";
      for await (const c of stream) {
        const delta =
          c?.choices?.[0]?.delta?.content ??
          (c as any)?.output_text ??
          "";
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
        return {
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
      });

      setSessions(await listSessions());
    } finally {
      setBusy(false);
    }
  };

  // Follow-ups: now includes full conversation history so AI remembers context
  const replyInThread = async (threadId: string, text: string) => {
    if (!current) return;

    // Check for crisis content - only show resources for critical/high severity
    const crisisResult = detectCrisis(text);
    if (crisisResult.severity === "critical" || crisisResult.severity === "high") {
      setCrisisSeverity(crisisResult.severity);
      setShowCrisisResources(true);

      // For critical situations, inject crisis resources into AI response
      if (crisisResult.recommendedAction === "immediate_help") {
        const thread = current.threads.find((t) => t.id === threadId)!;
        thread.messages.push(
          { id: uid(), role: "user", content: text, ts: Date.now() },
          {
            id: uid(),
            role: "assistant",
            content: getCrisisResponseMessage(crisisResult.severity),
            ts: Date.now()
          }
        );
        setCurrent({ ...current });
        await putSession(current);
        setSessions(await listSessions());
        return;
      }
    }

    const e = await loadModel();
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
      // Build messages with conversation history (context-managed)
      const { messages, trimmed } = buildMessages(text, conversationHistory);
      setContextTrimmed(trimmed);

      // Reset WebLLM's internal KV cache before each turn to prevent
      // stale state causing repetition or degeneration.
      await e.resetChat();

      const stream = await e.chat.completions.create({
        messages,
        temperature,
        max_tokens: maxTokens,
        repetition_penalty: 1.3,
        stream: true,
      });

      let acc = "";
      for await (const c of stream) {
        const delta =
          c?.choices?.[0]?.delta?.content ??
          (c as any)?.output_text ??
          "";
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
        // Persist after finalizing
        putSession(updated);
        return updated;
      });

      setSessions(await listSessions());
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
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 text-slate-700 z-50">
        <div className="p-4 rounded-2xl bg-white/80 shadow border border-slate-200 w-[320px] text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Loader2 className="h-5 w-5 animate-spin text-indigo-600" />
            <h2 className="font-semibold">Loading Quietnote model…</h2>
          </div>
          <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-300"
              style={{ width: `${Math.floor(progress * 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-2">
            {Math.floor(progress * 100)}% initialized
          </div>
          <div className="text-[10px] text-slate-400 mt-2 max-h-[100px] overflow-auto">
            {logs.slice(-4).map((l, i) => (
              <div key={i}>{l}</div>
            ))}
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
      />
      <PrivacyDashboard
        isOpen={showPrivacyDashboard}
        onClose={() => setShowPrivacyDashboard(false)}
        onDataCleared={handleDataCleared}
      />

      <header className="sticky top-0 z-10 backdrop-blur bg-white/60 border-b border-slate-200 shadow-sm">
        <div className="w-full px-6 py-3 flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-indigo-100 border border-indigo-200">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Quietnote</h1>
            <p className="text-xs text-slate-500">
              On-device introspective coach (WebLLM)
            </p>
          </div>
          <div className="ml-auto flex items-center gap-4">
            {/* Mood Tracker Button */}
            <button
              onClick={() => setShowMoodTracker(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-pink-50 text-pink-700 border border-pink-200 rounded-lg hover:bg-pink-100 transition-colors"
              title="Track your mood"
            >
              <Heart className="h-4 w-4" />
              <span className="hidden sm:inline">Mood</span>
            </button>
            {/* Privacy Dashboard Button */}
            <button
              onClick={() => setShowPrivacyDashboard(true)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
              title="Privacy dashboard"
            >
              <Shield className="h-4 w-4" />
              <span className="hidden sm:inline">Privacy</span>
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
          />
        }
        right={
          <SessionsPanel
            sessions={sessions}
            currentId={currentId}
            loadExisting={loadExisting}
          />
        }
      />

      <footer className="text-center text-[11px] text-slate-500 py-4">
        Quietnote • All inference on-device • Sessions stored locally
      </footer>
    </div>
  );
}
