import { Loader2, Send, Info, AlertCircle, RefreshCw, X } from "lucide-react";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PromptSelector from "./PromptSelector";
import MoodSuggestionCard from "./MoodSuggestionCard";
import PromptSuggestionCard from "./PromptSuggestionCard";
import JournalingModeSelector from "./JournalingModeSelector";
import GratitudeGuide from "./GratitudeGuide";
import CheckInGuide from "./CheckInGuide";
import ThoughtRecordGuide from "./ThoughtRecordGuide";
import type { JournalingMode } from "./JournalingModeSelector";
import { getTopEmotion } from "../utils/emotionExtractor";
import { getTopTheme } from "../utils/themeExtractor";
import { getPromptByCategory } from "../data/journalPrompts";
import { analyzeMoodTrend, findTopEmotions } from "../utils/moodPatterns";
import { buildContinuityPrompt } from "../utils/continuityPrompt";
import WelcomeEmptyState from "./WelcomeEmptyState";
import { makeQuickMoodEntry } from "../utils/quickMood";
import type { ChatMessage, MoodEmotion, MoodEntry, PromptCategory, Session, Thread } from "../types";

// Guardrail constants for mood suggestions
const MIN_MESSAGE_LENGTH = 20;
const SUGGESTION_COOLDOWN = 3; // Show at most 1 mood suggestion per N assistant messages
const MAX_DISMISSALS_PER_SESSION = 3;
const EMOTION_CONFIDENCE_THRESHOLD = 0.4;

// Guardrail constants for prompt suggestions
const PROMPT_MIN_MESSAGE_LENGTH = 30; // Themes need more context than emotions
const PROMPT_SUGGESTION_COOLDOWN = 5; // Less frequent than mood suggestions
const MAX_PROMPT_DISMISSALS_PER_SESSION = 2;
const THEME_CONFIDENCE_THRESHOLD = 0.4;

// Emotions that indicate the user is in distress — suppress gratitude prompts
const NEGATIVE_EMOTIONS: MoodEmotion[] = [
  "sad",
  "anxious",
  "angry",
  "frustrated",
  "lonely",
];

interface MoodSuggestion {
  emotion: MoodEmotion;
  intensity: number;
  afterMessageId: string; // The assistant message ID this suggestion follows
}

interface PromptSuggestion {
  prompt: string;
  category: PromptCategory;
  afterMessageId: string;
}

interface ChatPanelProps {
  topic: string;
  setTopic: (topic: string) => void;
  busy: boolean;
  loading: boolean;
  current: Session | null;
  userInput: string;
  setUserInput: (input: string) => void;
  newSession: (text: string) => void;
  replyInThread: (threadId: string, text: string) => void;
  activeThread: Thread | null | undefined;
  contextTrimmed: boolean;
  showCrisisResources: boolean;
  onSaveMood?: (mood: MoodEntry) => void;
  onOpenMoodTracker?: (emotion?: MoodEmotion, intensity?: number) => void;
  sessionId?: string;
  sessions?: Session[];
  moods?: MoodEntry[];
  modelError: string | null;
  clearModelError?: () => void;
  onRetryLoad?: () => void;
  journalingMode?: JournalingMode;
  onJournalingModeChange: (mode: JournalingMode) => void;
  gratitudeStep?: number;
  checkinStep?: number;
  thoughtRecordStep?: number;
}

export default function ChatPanel({
  topic: _topic,
  setTopic: _setTopic,
  busy,
  loading,
  current,
  userInput,
  setUserInput,
  newSession,
  replyInThread,
  activeThread,
  contextTrimmed,
  showCrisisResources,
  onSaveMood,
  onOpenMoodTracker,
  sessionId,
  sessions: allSessions = [],
  moods = [],
  modelError,
  clearModelError,
  onRetryLoad,
  journalingMode = "freewrite",
  onJournalingModeChange,
  gratitudeStep = 1,
  checkinStep = 1,
  thoughtRecordStep = 1,
}: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mood suggestion state (session-scoped)
  const [activeSuggestion, setActiveSuggestion] = useState<MoodSuggestion | null>(null);
  const [dismissCount, setDismissCount] = useState(0);
  const [messagesSinceSuggestion, setMessagesSinceSuggestion] = useState(0);
  const [acceptedMessageIds, setAcceptedMessageIds] = useState<Set<string>>(new Set());

  // Prompt suggestion state (session-scoped)
  const [activePromptSuggestion, setActivePromptSuggestion] = useState<PromptSuggestion | null>(null);
  const [promptDismissCount, setPromptDismissCount] = useState(0);
  const [messagesSincePromptSuggestion, setMessagesSincePromptSuggestion] = useState(0);
  const [suggestedCategories, setSuggestedCategories] = useState<Set<PromptCategory>>(new Set());
  const [promptAcceptedMessageIds, setPromptAcceptedMessageIds] = useState<Set<string>>(new Set());

  // External trigger for PromptSelector (from welcome card link)
  const [promptSelectorOpen, setPromptSelectorOpen] = useState(false);

  // Keyboard shortcut hints visibility
  const [inputFocused, setInputFocused] = useState(false);

  // Dismissible context trimming notice
  const [showTrimNotice, setShowTrimNotice] = useState(true);

  // Reset trim notice when new trimming occurs
  useEffect(() => {
    if (contextTrimmed) setShowTrimNotice(true);
  }, [contextTrimmed]);

  // Personalized welcome: compute greeting and suggestions from mood data
  const personalizedWelcome = useMemo(() => {
    const hour = new Date().getHours();
    let greeting: string;
    let suggestion: { text: string; mode: JournalingMode } | null = null;

    if (hour >= 5 && hour < 12) {
      greeting = "Good morning";
      suggestion = { text: "Start with a morning check-in?", mode: "checkin" };
    } else if (hour >= 12 && hour < 17) {
      greeting = "Good afternoon";
    } else if (hour >= 17 && hour < 21) {
      greeting = "Good evening";
      suggestion = { text: "Wind down with an evening reflection?", mode: "checkin" };
    } else {
      greeting = "Hello";
    }

    let moodTrend: "improving" | "stable" | "declining" | null = null;
    let topEmotion: string | null = null;

    if (moods.length >= 5) {
      moodTrend = analyzeMoodTrend(moods);
      const top = findTopEmotions(moods, 1);
      if (top.length > 0) topEmotion = top[0].emotion;

      // Override suggestion based on recent mood patterns
      const recentMoods = moods.slice(0, 5);
      const anxiousOrStressed = recentMoods.filter(
        (m) => m.emotion === "anxious" || m.emotion === "frustrated" || m.emotion === "angry"
      );
      if (anxiousOrStressed.length >= 2) {
        suggestion = { text: "Feeling overwhelmed? Try a thought record.", mode: "thoughtrecord" };
      }
    }

    return { greeting, suggestion, moodTrend, topEmotion, hasMoodData: moods.length > 0 };
  }, [moods]);

  const continuityPrompt = useMemo(
    () => buildContinuityPrompt(allSessions, moods, sessionId),
    [allSessions, moods, sessionId]
  );

  // On the freewrite empty state the page should be ready to write in —
  // focus the textarea so the first keystroke lands in it. Re-run when model
  // loading finishes, since the panel mounts behind the loading screen.
  useEffect(() => {
    if (!current && !loading && journalingMode === "freewrite") {
      textareaRef.current?.focus();
    }
  }, [current, loading, journalingMode]);

  // Auto-scroll to bottom when messages change or streamed content grows
  const lastMessageContent = activeThread?.messages?.[activeThread.messages.length - 1]?.content;
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages?.length, lastMessageContent, busy]);

  // Reset all suggestion state when session changes
  useEffect(() => {
    setActiveSuggestion(null);
    setDismissCount(0);
    setMessagesSinceSuggestion(0);
    setAcceptedMessageIds(new Set());
    setActivePromptSuggestion(null);
    setPromptDismissCount(0);
    setMessagesSincePromptSuggestion(0);
    setSuggestedCategories(new Set());
    setPromptAcceptedMessageIds(new Set());
  }, [current?.id]);

  // NOTE: assistant text is revealed by real token streaming (App.tsx updates
  // message content per delta). The old post-finalization typewriter re-played
  // the whole message from index 0, causing a visible "double render"
  // (streamed text blanked, then re-typed) — removed 2026-06-10.

  // Check for emotions and themes after assistant messages are finalized
  useEffect(() => {
    if (!activeThread || busy) return;

    const msgs = activeThread.messages;
    if (msgs.length < 2) return;

    const lastMsg = msgs[msgs.length - 1];

    // Only trigger after a finalized assistant message (no temp flag)
    if (lastMsg.role !== "assistant" || lastMsg.temp) return;

    // Guardrail: crisis suppression — never show during crisis
    if (showCrisisResources) return;

    // Find the preceding user message
    const userMsg = [...msgs].reverse().find(
      (m: ChatMessage) => m.role === "user" && m.ts <= lastMsg.ts
    );
    if (!userMsg) return;

    // --- Mood suggestion check ---
    if (
      !acceptedMessageIds.has(lastMsg.id) &&
      dismissCount < MAX_DISMISSALS_PER_SESSION &&
      messagesSinceSuggestion >= SUGGESTION_COOLDOWN &&
      userMsg.content.length >= MIN_MESSAGE_LENGTH
    ) {
      const topEmotion = getTopEmotion(userMsg.content, EMOTION_CONFIDENCE_THRESHOLD);
      if (topEmotion) {
        setActiveSuggestion({
          emotion: topEmotion.emotion,
          intensity: topEmotion.intensity,
          afterMessageId: lastMsg.id,
        });
        setMessagesSinceSuggestion(0);
        // Mood suggestion takes priority — skip prompt suggestion
        setMessagesSincePromptSuggestion((prev) => prev + 1);
        return;
      }
    }
    setMessagesSinceSuggestion((prev) => prev + 1);

    // --- Prompt suggestion check (only if no mood suggestion is active) ---
    if (
      !activeSuggestion &&
      !promptAcceptedMessageIds.has(lastMsg.id) &&
      promptDismissCount < MAX_PROMPT_DISMISSALS_PER_SESSION &&
      messagesSincePromptSuggestion >= PROMPT_SUGGESTION_COOLDOWN &&
      userMsg.content.length >= PROMPT_MIN_MESSAGE_LENGTH
    ) {
      const topTheme = getTopTheme(userMsg.content, THEME_CONFIDENCE_THRESHOLD);
      if (topTheme && !suggestedCategories.has(topTheme.theme)) {
        // Don't suggest gratitude prompts when negative emotions are detected
        const topEmotion = getTopEmotion(userMsg.content, 0.3);
        if (
          topTheme.theme === "gratitude" &&
          topEmotion &&
          NEGATIVE_EMOTIONS.includes(topEmotion.emotion)
        ) {
          setMessagesSincePromptSuggestion((prev) => prev + 1);
          return;
        }

        const promptData = getPromptByCategory(topTheme.theme);
        if (promptData) {
          setActivePromptSuggestion({
            prompt: promptData.text,
            category: topTheme.theme,
            afterMessageId: lastMsg.id,
          });
          setMessagesSincePromptSuggestion(0);
          return;
        }
      }
    }
    setMessagesSincePromptSuggestion((prev) => prev + 1);
  }, [activeThread?.messages?.length, busy]);

  const handleSuggestionAccept = useCallback((mood: MoodEntry) => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    onSaveMood?.(mood);
  }, [activeSuggestion, onSaveMood]);

  const handleSuggestionEdit = useCallback((emotion: MoodEmotion, intensity: number) => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    onOpenMoodTracker?.(emotion, intensity);
  }, [activeSuggestion, onOpenMoodTracker]);

  const handleSuggestionDismiss = useCallback(() => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    setDismissCount((prev) => prev + 1);
  }, [activeSuggestion]);

  const handlePromptUse = useCallback((prompt: string) => {
    if (activePromptSuggestion) {
      setPromptAcceptedMessageIds((prev) => new Set(prev).add(activePromptSuggestion.afterMessageId));
      setSuggestedCategories((prev) => new Set(prev).add(activePromptSuggestion.category));
    }
    setActivePromptSuggestion(null);
    setUserInput(prompt);
  }, [activePromptSuggestion, setUserInput]);

  const handlePromptDismiss = useCallback(() => {
    if (activePromptSuggestion) {
      setPromptAcceptedMessageIds((prev) => new Set(prev).add(activePromptSuggestion.afterMessageId));
      setSuggestedCategories((prev) => new Set(prev).add(activePromptSuggestion.category));
    }
    setActivePromptSuggestion(null);
    setPromptDismissCount((prev) => prev + 1);
  }, [activePromptSuggestion]);

  // Auto-resize textarea based on content
  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  // Reset textarea height when input is cleared (e.g. after send)
  useEffect(() => {
    if (!userInput) {
      const el = textareaRef.current;
      if (el) el.style.height = "auto";
    } else {
      autoResizeTextarea();
    }
  }, [userInput, autoResizeTextarea]);

  const handleSend = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const text = (userInput || "").trim();
    if (!text) return;
    // Clear input optimistically — App.tsx restores it if model fails to load
    setUserInput("");
    if (!current || !activeThread) {
      // first turn → start a new session
      newSession(text);
    } else {
      replyInThread(activeThread.id, text);
    }
  };

  return (
    <main className="rounded-2xl border border-slate-200/70 bg-white/60 p-4 flex flex-col h-full min-h-[75vh] backdrop-blur-sm transition-all duration-300">
      {/* Chat Area */}
      {!current ? (
        <div className="flex-1 grid place-items-center text-slate-600">
          {journalingMode === "gratitude" ? (
            <GratitudeGuide currentStep={gratitudeStep} />
          ) : journalingMode === "checkin" ? (
            <CheckInGuide currentStep={checkinStep} />
          ) : journalingMode === "thoughtrecord" ? (
            <ThoughtRecordGuide currentStep={thoughtRecordStep} />
          ) : (
            <WelcomeEmptyState
              greeting={personalizedWelcome.greeting}
              suggestion={personalizedWelcome.suggestion}
              continuityPrompt={continuityPrompt}
              onUseContinuity={(text) => {
                setUserInput(text);
                textareaRef.current?.focus();
              }}
              onSuggestMode={onJournalingModeChange}
              onOpenPrompts={() => setPromptSelectorOpen(true)}
              onPickMood={(emotion) =>
                onSaveMood?.(makeQuickMoodEntry(emotion, sessionId))
              }
              onAddMoodDetail={(emotion) => onOpenMoodTracker?.(emotion, 5)}
            />
          )}
        </div>
      ) : (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col p-1"
        >
          {!activeThread ? (
            <div className="flex-1 grid place-items-center text-slate-500">
              Start by sending a message.
            </div>
          ) : (
            <>
              {journalingMode !== "freewrite" && (
                <div className="sticky top-0 z-10 mb-2 pb-2 border-b border-slate-100 bg-white/80 backdrop-blur-sm rounded-t-xl">
                  {journalingMode === "gratitude" && <GratitudeGuide currentStep={gratitudeStep} compact />}
                  {journalingMode === "checkin" && <CheckInGuide currentStep={checkinStep} compact />}
                  {journalingMode === "thoughtrecord" && <ThoughtRecordGuide currentStep={thoughtRecordStep} compact />}
                </div>
              )}
              <div className="flex-1 overflow-auto space-y-3 pb-2">
                {/* AI Limitations Disclaimer — always shown at top of conversation */}
                <div className="flex items-start gap-2 text-xs text-stone-400 bg-stone-50 border border-stone-200 rounded-lg px-3 py-2 mx-1">
                  <AlertCircle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Quietnote is an AI journaling companion, not a therapist or mental health professional.
                    Your conversations stay on this device.{" "}
                    <button
                      onClick={() => {
                        // Trigger showing crisis resources for informational access
                        const event = new CustomEvent("open-crisis-resources");
                        window.dispatchEvent(event);
                      }}
                      className="underline text-stone-500 hover:text-stone-700 transition-colors"
                    >
                      Crisis resources
                    </button>
                  </p>
                </div>

                {contextTrimmed && showTrimNotice && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mx-1">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span className="flex-1">Earlier messages are no longer in context. The model may not recall the start of this conversation.</span>
                    <button
                      onClick={() => setShowTrimNotice(false)}
                      aria-label="Dismiss notice"
                      className="p-0.5 hover:bg-amber-100 rounded transition-colors flex-shrink-0"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}
                <AnimatePresence>
                  {activeThread.messages
                    .filter((m: ChatMessage) => m.role !== "system")
                    .map((m: ChatMessage) => {
                      return (
                        <div key={m.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`max-w-[85%] rounded-2xl px-4 py-2.5 border text-[15px] ${
                              m.role === "user"
                                ? "ml-auto bg-indigo-500 text-white border-indigo-500"
                                : "mr-auto bg-white/70 border-slate-200/70 text-slate-800"
                            }`}
                          >
                            <div className="whitespace-pre-wrap leading-relaxed font-serif">
                              {m.content}
                            </div>
                          </motion.div>

                          {/* Mood suggestion card — appears after the relevant assistant message */}
                          {activeSuggestion &&
                            activeSuggestion.afterMessageId === m.id &&
                            m.role === "assistant" && (
                              <div className="mt-2">
                                <MoodSuggestionCard
                                  emotion={activeSuggestion.emotion}
                                  intensity={activeSuggestion.intensity}
                                  sessionId={sessionId}
                                  onAccept={handleSuggestionAccept}
                                  onEdit={handleSuggestionEdit}
                                  onDismiss={handleSuggestionDismiss}
                                />
                              </div>
                            )}

                          {/* Prompt suggestion card — appears after the relevant assistant message */}
                          {activePromptSuggestion &&
                            activePromptSuggestion.afterMessageId === m.id &&
                            m.role === "assistant" &&
                            !activeSuggestion && (
                              <div className="mt-2">
                                <PromptSuggestionCard
                                  prompt={activePromptSuggestion.prompt}
                                  category={activePromptSuggestion.category}
                                  onUsePrompt={handlePromptUse}
                                  onDismiss={handlePromptDismiss}
                                />
                              </div>
                            )}
                        </div>
                      );
                    })}
                </AnimatePresence>

                {busy && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 pl-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Quietnote is thinking…</span>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </>
          )}
        </motion.div>
      )}

      {/* Model Error Banner */}
      {modelError && (
        <div className="mx-1 mb-2 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{modelError}</p>
          </div>
          <button
            onClick={() => {
              clearModelError?.();
              onRetryLoad?.();
            }}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium bg-red-100 hover:bg-red-200 rounded transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      {/* Input Row */}
      <div className="border-t border-slate-200 mt-2 pt-2">
        {/* Mode selector + Prompt Selector */}
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <JournalingModeSelector mode={journalingMode} onChange={onJournalingModeChange} />
          </div>
          <PromptSelector onSelectPrompt={(prompt: string) => setUserInput(prompt)} externalOpen={promptSelectorOpen} onExternalOpenHandled={() => setPromptSelectorOpen(false)} />
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            ref={textareaRef}
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              autoResizeTextarea();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder="What's on your mind?"
            className={`flex-1 ${current ? "min-h-[52px]" : "min-h-[88px]"} max-h-36 resize-none rounded-xl border border-slate-300 px-3 py-2 font-serif text-[15px] focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all bg-white/80`}
          />
          <button
            onClick={handleSend}
            disabled={busy || loading}
            aria-label="Send message"
            className="h-[52px] aspect-square inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-all"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
        {inputFocused && (
          <p className="hidden sm:block text-[10px] text-slate-400 mt-1 ml-1">
            Enter to send · Shift+Enter for new line
          </p>
        )}
      </div>
    </main>
  );
}
