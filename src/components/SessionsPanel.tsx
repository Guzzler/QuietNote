import { BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Session } from "../types";

export default function SessionsPanel({
  sessions,
  currentId,
  loadExisting,
}: {
  sessions: Session[];
  currentId: string | null;
  loadExisting: (id: string) => void;
}) {
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
            return (
              <motion.button
                key={s.id}
                layout
                onClick={() => loadExisting(s.id)}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{
                  y: -2,
                  scale: 1.01,
                  transition: { duration: 0.2 },
                }}
                className={`w-full text-left px-3 py-2 rounded-xl border text-sm mb-1 transition-all ${
                  isActive
                    ? "bg-indigo-50 border-indigo-200 shadow-[0_0_10px_rgba(99,102,241,0.2)]"
                    : "bg-white border-slate-200 hover:bg-slate-50 hover:shadow-sm"
                }`}
              >
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
              </motion.button>
            );
          })
        )}
      </AnimatePresence>
    </aside>
  );
}
