import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  BarChart3,
  Info,
} from "lucide-react";
import type { MoodEntry, MoodEmotion } from "../types";
import {
  MIN_ENTRIES_FOR_PATTERNS,
  analyzeMoodTrend,
  findTopEmotions,
  detectCorrelations,
  detectDayOfWeekPatterns,
  generateWeeklyReport,
} from "../utils/moodPatterns";

interface MoodInsightsCardProps {
  moods: MoodEntry[];
}

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

export default function MoodInsightsCard({ moods }: MoodInsightsCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Gate: not enough data
  if (moods.length < MIN_ENTRIES_FOR_PATTERNS) {
    return (
      <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-center">
        <BarChart3 className="h-5 w-5 text-slate-400 mx-auto mb-2" />
        <p className="text-sm text-slate-500">
          Log at least {MIN_ENTRIES_FOR_PATTERNS} moods to see patterns.{" "}
          You've logged {moods.length} so far.
        </p>
      </div>
    );
  }

  const trend = analyzeMoodTrend(moods);
  const topEmotions = findTopEmotions(moods, 3);
  const correlations = detectCorrelations(moods);
  const dayPatterns = detectDayOfWeekPatterns(moods);
  const report = generateWeeklyReport(moods);

  const trendIcon =
    trend === "improving" ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : trend === "declining" ? (
      <TrendingDown className="h-4 w-4 text-amber-600" />
    ) : (
      <Minus className="h-4 w-4 text-slate-500" />
    );

  const trendLabel =
    trend === "improving"
      ? "Positive shift"
      : trend === "declining"
        ? "More intensity lately"
        : "Steady";

  const trendColor =
    trend === "improving"
      ? "text-green-700 bg-green-50 border-green-200"
      : trend === "declining"
        ? "text-amber-700 bg-amber-50 border-amber-200"
        : "text-slate-600 bg-slate-50 border-slate-200";

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 bg-indigo-50 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          <span className="text-sm font-medium text-indigo-800">
            Your Patterns
          </span>
          <span className="text-xs text-indigo-500">
            ({moods.length} moods logged)
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-indigo-500 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-4 bg-white border border-slate-200 rounded-xl space-y-4">
              {/* Trend indicator */}
              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${trendColor}`}
              >
                {trendIcon}
                <span className="text-sm font-medium">{trendLabel}</span>
                {trend === "declining" && (
                  <span className="text-xs ml-auto">
                    Support is always available
                  </span>
                )}
              </div>

              {/* Top emotions */}
              {topEmotions.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Most logged emotions
                  </h4>
                  <div className="space-y-1.5">
                    {topEmotions.map(({ emotion, count }) => {
                      const maxCount = topEmotions[0].count;
                      const pct = Math.round((count / maxCount) * 100);
                      return (
                        <div key={emotion} className="flex items-center gap-2">
                          <span
                            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              EMOTION_COLORS[emotion]
                            }`}
                          >
                            {emotion}
                          </span>
                          <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-400 rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-500 w-6 text-right">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Correlations */}
              {correlations.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Patterns noticed
                  </h4>
                  <ul className="space-y-1">
                    {correlations.slice(0, 3).map((p, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 flex items-start gap-1.5"
                      >
                        <span className="text-indigo-400 mt-0.5">-</span>
                        {p.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Day-of-week patterns */}
              {dayPatterns.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Day patterns
                  </h4>
                  <ul className="space-y-1">
                    {dayPatterns.slice(0, 3).map((p, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600 flex items-start gap-1.5"
                      >
                        <span className="text-indigo-400 mt-0.5">-</span>
                        {p.description}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Insights from report */}
              {report.insights.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                    Insights
                  </h4>
                  <ul className="space-y-1">
                    {report.insights.map((insight, i) => (
                      <li
                        key={i}
                        className="text-sm text-slate-600"
                      >
                        {insight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Disclaimer */}
              <div className="flex items-start gap-1.5 pt-2 border-t border-slate-100">
                <Info className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <p className="text-xs text-slate-400">
                  Based on your mood logs. This is not a clinical assessment.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
