import { Loader2, Send, MessageSquare, Info, AlertCircle, RefreshCw, Lock, Sparkles, Heart } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PromptSelector from "./PromptSelector";
import MoodSuggestionCard from "./MoodSuggestionCard";
import PromptSuggestionCard from "./PromptSuggestionCard";
import { getTopEmotion } from "../utils/emotionExtractor";
import { getTopTheme } from "../utils/themeExtractor";
import { getPromptByCategory } from "../data/journalPrompts";
import type { MoodEmotion, MoodEntry, PromptCategory } from "../types";

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

export default function ChatPanel({
  topic: _topic,      // unused (kept for prop compatibility)
  setTopic: _setTopic, // unused
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
  modelError,
  clearModelError,
  onRetryLoad,
}: any) {
  const [animated, setAnimated] = useState("");
  const animatedMessageIds = useRef<Set<string>>(new Set());

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
    animatedMessageIds.current = new Set();
  }, [current?.id]);

  // Typing animation for the latest assistant message — only after finalization, only once per message
  useEffect(() => {
    if (!activeThread) return;
    const msgs = activeThread.messages;
    const last = msgs[msgs.length - 1];
    // Only animate once the message is finalized (not during streaming)
    if (last?.role === "assistant" && !last.temp) {
      // Skip animation if this message was already animated
      if (animatedMessageIds.current.has(last.id)) {
        setAnimated(last.content || "");
        return;
      }
      let i = 0;
      const text = last.content || "";
      const interval = setInterval(() => {
        setAnimated(text.slice(0, i));
        i++;
        if (i > text.length) {
          clearInterval(interval);
          animatedMessageIds.current.add(last.id);
        }
      }, 18);
      return () => clearInterval(interval);
    } else {
      setAnimated("");
    }
  }, [activeThread?.messages?.length, activeThread?.messages?.[activeThread?.messages?.length - 1]?.temp]);

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
      (m: any) => m.role === "user" && m.ts <= lastMsg.ts
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
    <main className="rounded-2xl border border-slate-200 bg-white/80 p-4 flex flex-col h-full min-h-[75vh] shadow-sm backdrop-blur-sm transition-all duration-300">
      {/* Chat Area */}
      {!current ? (
        <div className="flex-1 grid place-items-center text-slate-600">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="text-center max-w-sm px-4"
          >
            <div className="mx-auto mb-4 w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center">
              <MessageSquare className="h-6 w-6 text-indigo-600" />
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mb-1">Welcome to Quietnote</h2>
            <p className="text-sm text-slate-500 mb-5">A private space to reflect on your thoughts and feelings.</p>

            <div className="text-left space-y-3 mb-5">
              <div className="flex items-start gap-2.5">
                <Lock className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">Everything stays on your device — nothing is sent to any server</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">Try a <button onClick={() => setPromptSelectorOpen(true)} className="inline text-indigo-600 underline hover:text-indigo-700 transition-colors">journal prompt</button> to get started, or just start typing</p>
              </div>
              <div className="flex items-start gap-2.5">
                <Heart className="h-4 w-4 text-pink-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-slate-600">Track your mood over time to discover patterns</p>
              </div>
            </div>

            <p className="text-xs text-slate-400">Your thoughts are safe here.</p>
          </motion.div>
        </div>
      ) : (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="flex-1 flex flex-col bg-white/80 rounded-2xl border border-slate-200 p-3 shadow-sm"
        >
          {!activeThread ? (
            <div className="flex-1 grid place-items-center text-slate-500">
              Start by sending a message.
            </div>
          ) : (
            <>
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

                {contextTrimmed && (
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mx-1">
                    <Info className="h-3 w-3 flex-shrink-0" />
                    <span>Earlier messages are no longer in context. The model may not recall the start of this conversation.</span>
                  </div>
                )}
                <AnimatePresence>
                  {activeThread.messages
                    .filter((m: any) => m.role !== "system")
                    .map((m: any, idx: number) => {
                      const isLastAssistant =
                        m.role === "assistant" &&
                        idx === activeThread.messages.filter((msg: any) => msg.role !== "system").length - 1;

                      return (
                        <div key={m.id}>
                          <motion.div
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.25 }}
                            className={`max-w-[85%] rounded-2xl px-3 py-2 border text-sm shadow-sm hover:shadow-md transition-all ${
                              m.role === "user"
                                ? "ml-auto bg-indigo-600 text-white border-indigo-600"
                                : "mr-auto bg-indigo-50 border-indigo-100 text-slate-800"
                            }`}
                          >
                            <div className="whitespace-pre-wrap leading-relaxed">
                              {isLastAssistant ? (m.temp ? m.content : animated) : m.content}
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
        {/* Prompt Selector */}
        <div className="mb-2 flex justify-end">
          <PromptSelector onSelectPrompt={(prompt) => setUserInput(prompt)} externalOpen={promptSelectorOpen} onExternalOpenHandled={() => setPromptSelectorOpen(false)} />
        </div>

        <div className="flex gap-2 items-end">
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="What's on your mind?"
            className="flex-1 min-h-[52px] max-h-36 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all bg-white/80"
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
      </div>
    </main>
  );
}
