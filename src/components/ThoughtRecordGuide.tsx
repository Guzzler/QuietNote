import { Brain } from "lucide-react";
import { motion } from "framer-motion";
import { THOUGHT_RECORD_SEQUENCE } from "../data/journalPrompts";

interface Props {
  currentStep: number; // 1-based (1 through 5)
  compact?: boolean;
}

export default function ThoughtRecordGuide({ currentStep, compact }: Props) {
  const step = THOUGHT_RECORD_SEQUENCE[Math.min(currentStep - 1, THOUGHT_RECORD_SEQUENCE.length - 1)];
  const total = THOUGHT_RECORD_SEQUENCE.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 px-3" data-testid="guided-mode-banner">
        <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
          <Brain className="h-4 w-4 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-800">Thought Record</span>
            {!isComplete && (
              <span className="text-xs text-slate-400">Step {displayStep} of {total}</span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {THOUGHT_RECORD_SEQUENCE.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 < displayStep
                      ? "w-4 bg-purple-400"
                      : i + 1 === displayStep
                        ? "w-5 bg-purple-500"
                        : "w-4 bg-slate-200"
                  }`}
                />
              ))}
            </div>
          </div>
          {isComplete ? (
            <p className="text-xs text-slate-500 truncate">Complete — notice how your perspective may have shifted.</p>
          ) : (
            <p className="text-xs text-slate-500 truncate">{step.prompt}</p>
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
      <div className="mx-auto mb-3 w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center">
        <Brain className="h-5 w-5 text-purple-600" />
      </div>
      <h3 className="text-base font-semibold text-slate-800 mb-1">Thought Record</h3>

      {isComplete ? (
        <p className="text-sm text-slate-500">
          You've completed your thought record. Take a moment to notice how your perspective may have shifted.
        </p>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {THOUGHT_RECORD_SEQUENCE.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 < displayStep
                    ? "w-5 bg-purple-400"
                    : i + 1 === displayStep
                      ? "w-7 bg-purple-500"
                      : "w-5 bg-slate-200"
                }`}
              />
            ))}
          </div>

          <p className="text-xs text-slate-400 mb-1">
            Step {displayStep} of {total}
          </p>
          <p className="text-sm text-slate-600 font-medium">{step.prompt}</p>
        </>
      )}
    </motion.div>
  );
}
