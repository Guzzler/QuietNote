import { motion } from "framer-motion";
import { BookOpen, X } from "lucide-react";
import type { PromptCategory } from "../types";

interface PromptSuggestionCardProps {
  prompt: string;
  category: PromptCategory;
  onUsePrompt: (prompt: string) => void;
  onDismiss: () => void;
}

const CATEGORY_LABELS: Record<PromptCategory, string> = {
  gratitude: "Gratitude",
  "self-reflection": "Self-Reflection",
  goals: "Goals",
  challenges: "Challenges",
  relationships: "Relationships",
  growth: "Growth",
  creativity: "Creativity",
};

export default function PromptSuggestionCard({
  prompt,
  category,
  onUsePrompt,
  onDismiss,
}: PromptSuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.97 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className="mr-auto max-w-[85%] rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white px-3 py-2.5 shadow-sm"
    >
      <div className="flex items-start gap-2">
        <BookOpen className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-emerald-600 font-medium mb-1">
            {CATEGORY_LABELS[category]} prompt
          </div>
          <p className="text-xs text-slate-600 leading-relaxed mb-2">
            {prompt}
          </p>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onUsePrompt(prompt)}
              className="text-[11px] px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
            >
              Use this prompt
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
      </div>
    </motion.div>
  );
}
