import { motion } from "framer-motion";
import { Lightbulb } from "lucide-react";
import type { MoodJournalObservation } from "../utils/moodJournalCorrelations";

interface Props {
  observations: MoodJournalObservation[];
}

const CONFIDENCE_DOT: Record<string, string> = {
  high: "bg-slate-600",
  medium: "bg-slate-400",
  low: "bg-slate-300",
};

export default function MoodJournalCorrelations({ observations }: Props) {
  if (observations.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4"
    >
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="h-4 w-4 text-amber-500" />
        <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
          Patterns I've noticed
        </h4>
      </div>
      <ul className="space-y-2">
        {observations.map((obs, i) => (
          <li key={i} className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-2 w-2 rounded-full flex-shrink-0 ${CONFIDENCE_DOT[obs.confidence]}`}
              title={`${obs.confidence} confidence`}
            />
            <span className="text-sm text-slate-700 leading-relaxed">
              {obs.text}
            </span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}
