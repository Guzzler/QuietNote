import { useState } from "react";
import { BookOpen, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "../types";

export default function SessionsPanel({
  sessions,
  currentId,
  loadExisting,
  onDeleteSession,
}: {
  sessions: Session[];
  currentId: string | null;
  loadExisting: (id: string) => void;
  onDeleteSession?: (id: string) => void;
}) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  return (
    <aside className="rounded-2xl border border-slate-200 bg-white/80 p-4 max-w-[300px] w-full overflow-auto shadow-sm backdrop-blur-sm">
      <div className="flex items-center gap-2 mb-2">
        <BookOpen className="h-4 w-4 text-indigo-600" />
        <h2 className="text-sm font-semibold text-slate-700">Sessions</h2>
      </div>

      <AnimatePresence mode="popLayout">
        {sessions.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-slate-500"
          >
            No saved sessions yet.
          </motion.div>
        ) : (
          sessions.map((s) => {
            const isActive = currentId === s.id;
            const isConfirming = confirmingId === s.id;
            return (
              <motion.div
                key={s.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20, transition: { duration: 0.2 } }}
                className={`relative group w-full text-left px-3 py-2 rounded-xl border text-sm mb-1 transition-all cursor-pointer ${
                  isActive
                    ? "bg-indigo-50 border-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-white border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                }`}
              >
                {isConfirming ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 flex-1">Delete this session?</span>
                    <button
                      onClick={() => {
                        onDeleteSession?.(s.id);
                        setConfirmingId(null);
                      }}
                      className="px-2 py-1 text-xs bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors min-h-[32px]"
                      aria-label="Confirm delete session"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setConfirmingId(null)}
                      className="px-2 py-1 text-xs bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 transition-colors min-h-[32px]"
                      aria-label="Cancel delete"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-2"
                    onClick={() => loadExisting(s.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        loadExisting(s.id);
                      }
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div
                        className={`font-medium truncate ${
                          isActive ? "text-indigo-700" : "text-slate-700"
                        }`}
                      >
                        {s.title}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {new Date(s.updatedAt).toLocaleString()}
                      </div>
                    </div>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingId(s.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all min-h-[32px] min-w-[32px] flex items-center justify-center"
                        title="Delete session"
                        aria-label={`Delete session: ${s.title}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })
        )}
      </AnimatePresence>
    </aside>
  );
}
