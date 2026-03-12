import { Loader2, Send, MessageSquare } from "lucide-react";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import PromptSelector from "./PromptSelector";

export default function ChatPanel({
  topic,              // unused (kept for prop compatibility)
  setTopic,           // unused
  busy,
  loading,
  current,
  userInput,
  setUserInput,
  newSession,
  replyInThread,
  activeThread,
}: any) {
  const [animated, setAnimated] = useState("");

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
                <AnimatePresence>
                  {activeThread.messages
                    .filter((m: any) => m.role !== "system")
                    .map((m: any, idx: number) => (
                      <motion.div
                        key={m.id}
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
                          {m.role === "assistant" &&
                          idx === activeThread.messages.length - 1
                            ? animated
                            : m.content}
                        </div>
                      </motion.div>
                    ))}
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
