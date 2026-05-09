import { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus, BarChart3, BookOpen } from "lucide-react";
import { generateWeeklyReport, MIN_ENTRIES_FOR_PATTERNS } from "../utils/moodPatterns";
import type { MoodEntry, MoodEmotion } from "../types";

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

const TREND_CONFIG = {
  improving: {
    icon: TrendingUp,
    label: "Your mood is trending positively",
    color: "text-green-600",
    bg: "bg-green-50 border-green-200",
  },
  stable: {
    icon: Minus,
    label: "Your mood has been steady",
    color: "text-slate-600",
    bg: "bg-slate-50 border-slate-200",
  },
  declining: {
    icon: TrendingDown,
    label: "You\u2019ve been feeling more intensity lately",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
  },
} as const;

interface WellnessSummaryProps {
  moods: MoodEntry[];
  onStartReflection?: (prompt: string) => void;
}

function buildReflectionPrompt(trend: "improving" | "stable" | "declining", topEmotion: string): string {
  const trendIntro =
    trend === "improving"
      ? "Your mood has been improving this week"
      : trend === "declining"
        ? "It’s been a tougher stretch lately"
        : "Your mood has been steady this week";

  const emotionNote = `, and you’ve been feeling ${topEmotion} most often.`;

  const question =
    trend === "improving"
      ? " What’s been helping? How can you keep this momentum going?"
      : trend === "declining"
        ? " What would help you feel more supported right now? Is there something small you can do for yourself today?"
        : " What’s been on your mind? Is there something you’d like to change or explore?";

  return trendIntro + emotionNote + question;
}

export default function WellnessSummary({ moods, onStartReflection }: WellnessSummaryProps) {
  const report = useMemo(() => generateWeeklyReport(moods), [moods]);

  // Progress state: not enough moods yet
  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) {
    const remaining = MIN_ENTRIES_FOR_PATTERNS - moods.length;
    const progress = (moods.length / MIN_ENTRIES_FOR_PATTERNS) * 100;

    return (
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4 mb-4">
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-medium text-indigo-700">Wellness Summary</h3>
        </div>
        <p className="text-xs text-indigo-600 mb-2">
          Log {remaining} more {remaining === 1 ? "mood" : "moods"} to unlock your wellness summary
        </p>
        <div className="h-1.5 w-full bg-indigo-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-indigo-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-[10px] text-indigo-400 mt-1">{moods.length}/{MIN_ENTRIES_FOR_PATTERNS} entries</p>
      </div>
    );
  }

  const trend = TREND_CONFIG[report.moodTrend];
  const TrendIcon = trend.icon;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 mb-4 space-y-3">
      <div className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4 text-indigo-500" />
        <h3 className="text-sm font-medium text-slate-700">Wellness Summary</h3>
      </div>

      {/* Trend indicator */}
      <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${trend.bg}`}>
        <TrendIcon className={`h-4 w-4 ${trend.color}`} />
        <span className={`text-sm font-medium ${trend.color}`}>{trend.label}</span>
      </div>

      {/* Average intensity */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500">Avg intensity:</span>
        <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden max-w-[120px]">
          <div
            className="h-full rounded-full bg-indigo-400 transition-all"
            style={{ width: `${report.moodAverage * 10}%` }}
          />
        </div>
        <span className="text-xs font-medium text-slate-600">{report.moodAverage}/10</span>
      </div>

      {/* Top emotions */}
      {report.topEmotions.length > 0 && (
        <div>
          <span className="text-xs text-slate-500 block mb-1.5">Top emotions</span>
          <div className="flex flex-wrap gap-1.5">
            {report.topEmotions.map(({ emotion, count }) => (
              <span
                key={emotion}
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${EMOTION_COLORS[emotion]}`}
              >
                {EMOTION_LABELS[emotion]} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Top contexts */}
      {report.topContexts.length > 0 && (
        <div>
          <span className="text-xs text-slate-500 block mb-1.5">Life areas</span>
          <div className="flex flex-wrap gap-1.5">
            {report.topContexts.map(({ context, count }) => (
              <span
                key={context}
                className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full"
              >
                {context} ({count})
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Patterns */}
      {report.patterns.length > 0 && (
        <div>
          <span className="text-xs text-slate-500 block mb-1.5">Patterns noticed</span>
          <div className="space-y-1">
            {report.patterns.map((pattern, idx) => (
              <p key={idx} className="text-xs text-slate-600 leading-relaxed">
                {pattern.description}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Insights */}
      {report.insights.length > 0 && (
        <div className="border-t border-slate-100 pt-2">
          {report.insights.map((insight, idx) => (
            <p key={idx} className="text-xs text-slate-500 italic leading-relaxed">
              {insight}
            </p>
          ))}
        </div>
      )}

      {/* Weekly reflection entry point */}
      {onStartReflection && report.topEmotions.length > 0 && (
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => {
              const topEmotion = EMOTION_LABELS[report.topEmotions[0].emotion];
              const prompt = buildReflectionPrompt(report.moodTrend, topEmotion.toLowerCase());
              onStartReflection(prompt);
            }}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            <BookOpen className="h-4 w-4" />
            Reflect on your week
          </button>
        </div>
      )}
    </div>
  );
}
