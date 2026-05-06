import { useMemo } from "react";
import { Clock, MessageSquare } from "lucide-react";
import type { MoodEntry, MoodEmotion } from "../types";
import MoodChart from "./MoodChart";

const EMOTION_COLORS: Record<MoodEmotion, string> = {
  happy: "bg-yellow-100 text-yellow-700",
  sad: "bg-blue-100 text-blue-700",
  anxious: "bg-purple-100 text-purple-700",
  angry: "bg-red-100 text-red-700",
  calm: "bg-teal-100 text-teal-700",
  excited: "bg-orange-100 text-orange-700",
  frustrated: "bg-amber-100 text-amber-700",
  content: "bg-pink-100 text-pink-700",
  lonely: "bg-slate-100 text-slate-700",
  grateful: "bg-green-100 text-green-700",
};

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

interface MoodHistoryPanelProps {
  moods: MoodEntry[];
  onViewSession?: (sessionId: string) => void;
}

function getDateGroup(ts: number): string {
  const now = new Date();
  const date = new Date(ts);

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const weekAgo = new Date(today.getTime() - 7 * 86400000);

  if (date >= today) return "Today";
  if (date >= yesterday) return "Yesterday";
  if (date >= weekAgo) return "This Week";
  return "Earlier";
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MoodHistoryPanel({ moods, onViewSession }: MoodHistoryPanelProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, MoodEntry[]> = {};
    const order = ["Today", "Yesterday", "This Week", "Earlier"];

    for (const mood of moods) {
      const group = getDateGroup(mood.ts);
      if (!groups[group]) groups[group] = [];
      groups[group].push(mood);
    }

    return order
      .filter((g) => groups[g]?.length)
      .map((label) => ({ label, entries: groups[label] }));
  }, [moods]);

  if (moods.length === 0) {
    return (
      <div className="text-center py-10 text-slate-500">
        <Clock className="h-8 w-8 mx-auto mb-3 text-slate-300" />
        <p className="text-sm font-medium">No moods logged yet</p>
        <p className="text-xs mt-1">Use the Log Mood tab to track how you're feeling.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <MoodChart moods={moods} />
      {grouped.map(({ label, entries }) => (
        <div key={label}>
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {label}
          </h3>
          <div className="space-y-2">
            {entries.map((mood) => (
              <div
                key={mood.id}
                className="rounded-xl border border-slate-200 bg-white p-3"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${EMOTION_COLORS[mood.emotion]}`}
                  >
                    {EMOTION_LABELS[mood.emotion]}
                  </span>
                  {/* Intensity bar */}
                  <div className="flex-1 flex items-center gap-1.5">
                    <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full rounded-full bg-indigo-400 transition-all"
                        style={{ width: `${mood.intensity * 10}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-slate-400">{mood.intensity}/10</span>
                  </div>
                  <span className="text-[11px] text-slate-400 ml-auto whitespace-nowrap">
                    {label === "This Week" || label === "Earlier"
                      ? formatDate(mood.ts)
                      : formatTime(mood.ts)}
                  </span>
                </div>

                {/* Context tags */}
                {mood.contexts.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {mood.contexts.map((ctx) => (
                      <span
                        key={ctx}
                        className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded"
                      >
                        {ctx}
                      </span>
                    ))}
                  </div>
                )}

                {/* Note */}
                {mood.note && (
                  <p className="text-xs text-slate-600 mt-2 italic leading-relaxed">
                    "{mood.note}"
                  </p>
                )}

                {/* Session link */}
                {mood.sessionId && onViewSession && (
                  <button
                    onClick={() => onViewSession(mood.sessionId!)}
                    className="flex items-center gap-1 text-[11px] text-indigo-500 hover:text-indigo-700 mt-2 transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    View session
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
