import { useState } from "react";
import { motion } from "framer-motion";
import { Heart, X, Pencil } from "lucide-react";
import type { MoodEmotion, MoodEntry } from "../types";
import { putMood } from "../storage";

interface MoodSuggestionCardProps {
  emotion: MoodEmotion;
  intensity: number;
  sessionId?: string;
  onAccept: (mood: MoodEntry) => void;
  onEdit: (emotion: MoodEmotion, intensity: number) => void;
  onDismiss: () => void;
}

const EMOTION_LABELS: Record<MoodEmotion, string> = {
  happy: "Happy",
  sad: "Sad",
  anxious: "Anxious",
  angry: "Angry",
  calm: "Calm",
  excited: "Excited",
  frustrated: "Frustrated",
  content: "Content",
  lonely: "Lonely",
  grateful: "Grateful",
};

const EMOTION_COLORS: Record<MoodEmotion, string> = {
  happy: "text-amber-600",
  sad: "text-blue-500",
  anxious: "text-orange-500",
  angry: "text-red-500",
  calm: "text-teal-500",
  excited: "text-yellow-500",
  frustrated: "text-rose-500",
  content: "text-emerald-500",
  lonely: "text-violet-500",
  grateful: "text-pink-500",
};

export default function MoodSuggestionCard({
  emotion,
  intensity,
  sessionId,
  onAccept,
  onEdit,
  onDismiss,
}: MoodSuggestionCardProps) {
  const [saving, setSaving] = useState(false);

  const handleAccept = async () => {
    setSaving(true);
    const mood: MoodEntry = {
      id: crypto.randomUUID(),
      sessionId,
      emotion,
      intensity,
      contexts: [],
      note: "Logged from conversation",
      ts: Date.now(),
    };
    await putMood(mood);
    onAccept(mood);
    setSaving(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mr-auto max-w-[85%] rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 shadow-sm"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Heart
            className={`h-4 w-4 flex-shrink-0 ${EMOTION_COLORS[emotion]}`}
          />
          <span className="text-xs text-slate-600">
            Would you like to remember feeling{" "}
            <span className={`font-medium ${EMOTION_COLORS[emotion]}`}>
              {EMOTION_LABELS[emotion].toLowerCase()}
            </span>
            ?
          </span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handleAccept}
            disabled={saving}
            className="text-[11px] px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 transition-colors disabled:opacity-50"
            title="Log this mood"
          >
            {saving ? "..." : "Log"}
          </button>
          <button
            onClick={() => onEdit(emotion, intensity)}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Edit before logging"
          >
            <Pencil className="h-3 w-3" />
          </button>
          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            title="Dismiss"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
