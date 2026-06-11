import { MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import ContinuityCard from "./ContinuityCard";
import type { ContinuityPrompt } from "../utils/continuityPrompt";
import type { JournalingMode } from "./JournalingModeSelector";
import {
  INVITATION_TEXT,
  pickAuxiliaryElement,
  type WelcomeSuggestion,
} from "../utils/welcomeEmptyState";

interface Props {
  greeting: string;
  suggestion: WelcomeSuggestion | null;
  continuityPrompt: ContinuityPrompt | null;
  onUseContinuity: (text: string) => void;
  onSuggestMode: (mode: JournalingMode) => void;
  onOpenPrompts: () => void;
}

// The freewrite empty state: one warm invitation to write, at most one
// auxiliary element, one quiet prompt link. Nothing else.
export default function WelcomeEmptyState({
  greeting,
  suggestion,
  continuityPrompt,
  onUseContinuity,
  onSuggestMode,
  onOpenPrompts,
}: Props) {
  const auxiliary = pickAuxiliaryElement(continuityPrompt, suggestion);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="text-center max-w-sm px-4"
    >
      <div className="mx-auto mb-4 w-10 h-10 rounded-2xl bg-indigo-100 flex items-center justify-center">
        <MessageSquare className="h-5 w-5 text-indigo-600" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 mb-1">{greeting}</h2>
      <p className="text-sm text-slate-500 mb-5">{INVITATION_TEXT}</p>

      {auxiliary === "continuity" && continuityPrompt && (
        <div className="mb-5">
          <ContinuityCard prompt={continuityPrompt} onClick={onUseContinuity} />
        </div>
      )}
      {auxiliary === "suggestion" && suggestion && (
        <p className="mb-5">
          <button
            onClick={() => onSuggestMode(suggestion.mode)}
            className="text-xs text-indigo-600 hover:text-indigo-700 underline transition-colors"
          >
            {suggestion.text}
          </button>
        </p>
      )}

      <p className="text-xs text-slate-400">
        or try a{" "}
        <button
          onClick={onOpenPrompts}
          className="text-indigo-500 underline hover:text-indigo-700 transition-colors"
        >
          journal prompt
        </button>
      </p>
    </motion.div>
  );
}
