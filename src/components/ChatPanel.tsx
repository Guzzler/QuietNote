import { Loader2, Send, MessageSquare, Info } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PromptSelector from "./PromptSelector";
import MoodSuggestionCard from "./MoodSuggestionCard";
import { getTopEmotion } from "../utils/emotionExtractor";
import type { MoodEmotion, MoodEntry } from "../types";

// Guardrail constants
const MIN_MESSAGE_LENGTH = 20;
const SUGGESTION_COOLDOWN = 3; // Show at most 1 suggestion per N assistant messages
const MAX_DISMISSALS_PER_SESSION = 3;
const EMOTION_CONFIDENCE_THRESHOLD = 0.4;

interface MoodSuggestion {
  emotion: MoodEmotion;
  intensity: number;
  afterMessageId: string; // The assistant message ID this suggestion follows
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
}: any) {
  const [animated, setAnimated] = useState("");

  // Mood suggestion state (session-scoped)
  const [activeSuggestion, setActiveSuggestion] = useState<MoodSuggestion | null>(null);
  const [dismissCount, setDismissCount] = useState(0);
  const [messagesSinceSuggestion, setMessagesSinceSuggestion] = useState(0);
  const [acceptedMessageIds, setAcceptedMessageIds] = useState<Set<string>>(new Set());

  // Reset suggestion state when session changes
  useEffect(() => {
    setActiveSuggestion(null);
    setDismissCount(0);
    setMessagesSinceSuggestion(0);
    setAcceptedMessageIds(new Set());
  }, [current?.id]);

  // Typing animation for the latest assistant message
  useEffect(() => {
    if (!activeThread) return;
    const msgs = activeThread.messages;
    const last = msgs[msgs.length - 1];
    if (last?.role === "assistant") {
      let i = 0;
      const text = last.content || "";
      const interval = setInterval(() => {
        setAnimated(text.slice(0, i));
        i++;
        if (i > text.length) clearInterval(interval);
      }, 18);
      return () => clearInterval(interval);
    } else {
      setAnimated("");
    }
  }, [activeThread]);

  // Check for emotions after assistant messages are finalized
  useEffect(() => {
    if (!activeThread || busy) return;

    const msgs = activeThread.messages;
    if (msgs.length < 2) return;

    const lastMsg = msgs[msgs.length - 1];

    // Only trigger after a finalized assistant message (no temp flag)
    if (lastMsg.role !== "assistant" || lastMsg.temp) return;

    // Don't suggest if already accepted/dismissed for this message
    if (acceptedMessageIds.has(lastMsg.id)) return;

    // Guardrail: hit dismiss limit for this session
    if (dismissCount >= MAX_DISMISSALS_PER_SESSION) return;

    // Guardrail: cooldown — haven't had enough messages since last suggestion
    setMessagesSinceSuggestion((prev) => prev + 1);
    if (messagesSinceSuggestion < SUGGESTION_COOLDOWN && activeSuggestion !== null) return;

    // Guardrail: crisis suppression — never show during crisis
    if (showCrisisResources) return;

    // Find the preceding user message
    const userMsg = [...msgs].reverse().find(
      (m: any) => m.role === "user" && m.ts <= lastMsg.ts
    );
    if (!userMsg) return;

    // Guardrail: minimum message length
    if (userMsg.content.length < MIN_MESSAGE_LENGTH) return;

    // Run emotion extraction on the user message
    const topEmotion = getTopEmotion(userMsg.content, EMOTION_CONFIDENCE_THRESHOLD);
    if (!topEmotion) return;

    setActiveSuggestion({
      emotion: topEmotion.emotion,
      intensity: topEmotion.intensity,
      afterMessageId: lastMsg.id,
    });
    setMessagesSinceSuggestion(0);
  }, [activeThread?.messages?.length, busy]);

  const handleSuggestionAccept = useCallback((mood: MoodEntry) => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    onSaveMood?.(mood);
  }, [activeSuggestion, onSaveMood]);

  const handleSuggestionEdit = useCallback((_emotion: MoodEmotion, _intensity: number) => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    onOpenMoodTracker?.();
  }, [activeSuggestion, onOpenMoodTracker]);

  const handleSuggestionDismiss = useCallback(() => {
    if (activeSuggestion) {
      setAcceptedMessageIds((prev) => new Set(prev).add(activeSuggestion.afterMessageId));
    }
    setActiveSuggestion(null);
    setDismissCount((prev) => prev + 1);
  }, [activeSuggestion]);

  const handleSend = () => {
    const text = (userInput || "").trim();
    if (!text) return;
    if (!current || !activeThread) {
      // first turn → start a new session
      newSession(text);
    } else {
      replyInThread(activeThread.id, text);
    }
    setUserInput("");
  };

  return (
    <main className="rounded-2xl border border-slate-200 bg-white/80 p-4 flex flex-col h-full min-h-[75vh] shadow-sm backdrop-blur-sm transition-all duration-300">
      {/* Chat Area */}
      {!current ? (
        <div className="flex-1 grid place-items-center text-slate-500">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="text-center"
          >
            <MessageSquare className="h-8 w-8 mx-auto mb-2 text-slate-400" />
            <p>Write your journal entry to start.</p>
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
                              {isLastAssistant ? animated : m.content}
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

      {/* Input Row */}
      <div className="border-t border-slate-200 mt-2 pt-2">
        {/* Prompt Selector */}
        <div className="mb-2 flex justify-end">
          <PromptSelector onSelectPrompt={(prompt) => setUserInput(prompt)} />
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
            placeholder="Write your journal entry…"
            className="flex-1 min-h-[52px] max-h-36 resize-none rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all bg-white/80"
          />
          <button
            onClick={handleSend}
            disabled={busy || loading}
            className="h-[52px] aspect-square inline-flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 shadow-sm transition-all"
          >
            {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </main>
  );
}
