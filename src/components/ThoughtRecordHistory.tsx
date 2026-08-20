import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Brain, Trash2 } from "lucide-react";
import type { ThoughtRecord } from "../types";
import { listThoughtRecords, deleteThoughtRecord } from "../storage";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function avgIntensity(emotions: { emotion: string; intensity: number }[]): number {
  if (emotions.length === 0) return 0;
  return Math.round(emotions.reduce((s, e) => s + e.intensity, 0) / emotions.length * 10) / 10;
}

// R13b — the card's headers are the question each answer was written against
// (THOUGHT_RECORD_SEQUENCE in src/data/journalPrompts.ts), not a clinical claim
// about what the text contains. The save at App.tsx is a positional map of the
// first five user messages, so a clinical header was asserting a meaning the
// app cannot support; the prompt the user was shown, it can.
const THOUGHT_RECORD_CARD_LABELS = {
  situation: "What happened",
  automaticThought: "What went through your mind",
  emotions: "How you felt",
  evidenceFor: "The evidence",
  alternativeThought: "A more balanced view",
} as const;

function formatEmotions(emotions: { emotion: string; intensity: number }[]): string {
  return emotions.map((e) => `${e.emotion} (${e.intensity}/10)`).join(", ");
}

/**
 * The five positional entries in the order they were written, so nothing the
 * user captured is invisible on the card. Empty entries are skipped rather
 * than rendered as a bare header.
 */
// Exported for R13c's tests, which assert the rendered "How you felt" value for
// real records. It cannot move to a util: R13b's source guards
// (ThoughtRecordCardLabels.test.ts:43-64) assert that the five `record.*` reads
// live in this file, in this order.
// eslint-disable-next-line react-refresh/only-export-components
export function entriesForRecord(record: ThoughtRecord): { label: string; value: string }[] {
  return [
    { label: THOUGHT_RECORD_CARD_LABELS.situation, value: record.situation },
    {
      label: THOUGHT_RECORD_CARD_LABELS.automaticThought,
      value: record.automaticThought,
    },
    {
      label: THOUGHT_RECORD_CARD_LABELS.emotions,
      // R13c — prefer the sentence the user actually wrote. Records saved before
      // R13c have no `emotionsText` and render from the keyword parse exactly as
      // they do today; their original text is not in IndexedDB and is not
      // recoverable, so it is never re-derived.
      value: record.emotionsText?.trim() || formatEmotions(record.emotions),
    },
    {
      label: THOUGHT_RECORD_CARD_LABELS.evidenceFor,
      value: record.evidenceFor.join(" "),
    },
    {
      label: THOUGHT_RECORD_CARD_LABELS.alternativeThought,
      value: record.alternativeThought,
    },
  ].filter((entry) => entry.value.trim().length > 0);
}

export default function ThoughtRecordHistory({ isOpen, onClose }: Props) {
  const [records, setRecords] = useState<ThoughtRecord[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      listThoughtRecords().then(setRecords);
    }
  }, [isOpen]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (confirmDeleteId) {
          setConfirmDeleteId(null);
        } else {
          onClose();
        }
      }
    },
    [onClose, confirmDeleteId]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleDelete = async (id: string) => {
    await deleteThoughtRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
    setConfirmDeleteId(null);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Thought Record History"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <h2 className="text-base font-semibold text-slate-800">Thought Records</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4">
            {records.length === 0 ? (
              <div className="text-center py-10 text-slate-500">
                <Brain className="h-8 w-8 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium">No thought records yet</p>
                <p className="text-xs mt-1">
                  Complete a Thought Record exercise to see your history here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {records.map((record) => {
                  const initialAvg = avgIntensity(record.emotions);
                  const reratedAvg = avgIntensity(record.reratings);
                  const hasDelta = record.reratings.length > 0;

                  return (
                    <div
                      key={record.id}
                      className="rounded-xl border border-slate-200 bg-white p-4 group/record"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-[11px] text-slate-400">
                          {formatDate(record.ts)}
                        </span>
                        {hasDelta && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-600">
                            {initialAvg} → {reratedAvg} ↓
                          </span>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        {entriesForRecord(record).map((entry) => (
                          <div key={entry.label}>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              {entry.label}
                            </span>
                            <p className="text-sm text-slate-700 line-clamp-2">
                              {entry.value}
                            </p>
                          </div>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center justify-end">
                        {confirmDeleteId === record.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Delete?</span>
                            <button
                              onClick={() => handleDelete(record.id)}
                              className="text-xs px-2 py-1 rounded-md bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="text-xs px-2 py-1 rounded-md bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(record.id)}
                            aria-label="Delete thought record"
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover/record:opacity-100 sm:opacity-0 max-sm:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
