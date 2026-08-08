import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { GRATITUDE_SEQUENCE, GUIDE_SCAFFOLD_NOTE } from "../data/journalPrompts";

interface Props {
  currentStep: number; // 1-based (1, 2, or 3)
  compact?: boolean;
  /** R12 — when supplied, the step prompt becomes something the writer can use. */
  onUsePrompt?: (prompt: string) => void;
}

export default function GratitudeGuide({ currentStep, compact, onUsePrompt }: Props) {
  const step = GRATITUDE_SEQUENCE[Math.min(currentStep - 1, GRATITUDE_SEQUENCE.length - 1)];
  const total = GRATITUDE_SEQUENCE.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 px-3" data-testid="guided-mode-banner">
        <div className="w-7 h-7 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0">
          <Heart className="h-4 w-4 text-pink-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-medium text-slate-800">Gratitude Journal</span>
            {!isComplete && (
              <span className="text-xs text-slate-400">Step {displayStep} of {total}</span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {GRATITUDE_SEQUENCE.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 < displayStep
                      ? "w-4 bg-pink-400"
                      : i + 1 === displayStep
                        ? "w-5 bg-pink-500"
                        : "w-4 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
          {isComplete ? (
            <p className="font-serif text-xs text-slate-500 truncate">Complete — feel free to continue or start a new session.</p>
          ) : onUsePrompt ? (
            <button
              type="button"
              onClick={() => onUsePrompt(step.prompt)}
              aria-label={`Use this prompt: ${step.prompt}`}
              className="font-serif text-xs text-slate-500 truncate block w-full text-left rounded hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 transition-colors"
            >
              {step.prompt}
            </button>
          ) : (
            <p className="font-serif text-xs text-slate-500 truncate">{step.prompt}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="text-center max-w-sm mx-auto px-4"
    >
      <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center">
        <Heart className="h-5 w-5 text-pink-600" />
      </div>
      <h3 className="font-serif text-base font-semibold text-slate-800 mb-1">Gratitude Journal</h3>

      {isComplete ? (
        <p className="font-serif text-[15px] text-slate-500">
          You've completed your gratitude reflection. Feel free to continue writing or start a new session.
        </p>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {GRATITUDE_SEQUENCE.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 < displayStep
                    ? "w-6 bg-pink-400"
                    : i + 1 === displayStep
                      ? "w-8 bg-pink-500"
                      : "w-6 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-1">
            Step {displayStep} of {total}
          </p>
          {onUsePrompt ? (
            <button
              type="button"
              onClick={() => onUsePrompt(step.prompt)}
              aria-label={`Use this prompt: ${step.prompt}`}
              className="font-serif text-[15px] text-slate-600 font-medium rounded px-1 hover:text-pink-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-300 transition-colors"
            >
              {step.prompt}
            </button>
          ) : (
            <p className="font-serif text-[15px] text-slate-600 font-medium">{step.prompt}</p>
          )}
          <p className="text-xs text-slate-400 mt-2">{GUIDE_SCAFFOLD_NOTE}</p>
        </>
      )}
    </motion.div>
  );
}
