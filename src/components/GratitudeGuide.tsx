import { Heart } from "lucide-react";
import { motion } from "framer-motion";
import { GRATITUDE_SEQUENCE } from "../data/journalPrompts";

interface Props {
  currentStep: number; // 1-based (1, 2, or 3)
}

export default function GratitudeGuide({ currentStep }: Props) {
  const step = GRATITUDE_SEQUENCE[Math.min(currentStep - 1, GRATITUDE_SEQUENCE.length - 1)];
  const total = GRATITUDE_SEQUENCE.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

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
      <h3 className="text-base font-semibold text-slate-800 mb-1">Gratitude Journal</h3>

      {isComplete ? (
        <p className="text-sm text-slate-500">
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
          <p className="text-sm text-slate-600 font-medium">{step.prompt}</p>
        </>
      )}
    </motion.div>
  );
}
