import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import type { ContinuityPrompt } from "../utils/continuityPrompt";

export default function ContinuityCard({
  prompt,
  onClick,
}: {
  prompt: ContinuityPrompt;
  onClick: (text: string) => void;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.15 }}
      onClick={() => onClick(prompt.suggestedInput)}
      className="w-full max-w-md mx-auto rounded-2xl bg-slate-50 border border-slate-200 p-4 text-left hover:bg-slate-100 hover:border-slate-300 transition-all group cursor-pointer"
    >
      <p className="text-sm font-medium text-slate-700 mb-1">{prompt.headline}</p>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{prompt.body}</p>
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600 group-hover:text-indigo-700 transition-colors">
        Start writing
        <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </motion.button>
  );
}
