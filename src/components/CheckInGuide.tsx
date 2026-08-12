import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { checkinGuideForBand, GUIDE_SCAFFOLD_NOTE } from "../data/journalPrompts";
import { getTimeBand } from "../utils/timeOfDay";

interface Props {
  currentStep: number; // 1-based (1, 2, or 3)
  compact?: boolean;
  /** R12 — when supplied, the step prompt becomes something the writer can use. */
  onUsePrompt?: (prompt: string) => void;
}

export default function CheckInGuide({ currentStep, compact, onUsePrompt }: Props) {
  // F7 — the guide reads the same clock as the system prompt, so the step
  // shown on screen cannot ask about "your day" while the model is running
  // the late-night variant.
  const { sequence, title, morning } = checkinGuideForBand(getTimeBand());
  const step = sequence[Math.min(currentStep - 1, sequence.length - 1)];
  const total = sequence.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  const Icon = morning ? Sun : Moon;
  const accentBg = morning ? "bg-amber-100" : "bg-indigo-100";
  const accentText = morning ? "text-amber-600" : "text-indigo-600";
  const barActive = morning ? "bg-amber-400" : "bg-indigo-400";
  const barCurrent = morning ? "bg-amber-500" : "bg-indigo-500";
  const promptHover = morning
    ? "hover:text-amber-600 focus-visible:ring-amber-300"
    : "hover:text-indigo-600 focus-visible:ring-indigo-300";

  if (compact) {
    return (
      <div className="flex items-center gap-3 py-2 px-3" data-testid="guided-mode-banner">
        <div className={`w-7 h-7 rounded-lg ${accentBg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`h-4 w-4 ${accentText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif text-sm font-medium text-slate-800">{title}</span>
            {!isComplete && (
              <span className="text-xs text-slate-400">Step {displayStep} of {total}</span>
            )}
            <div className="flex items-center gap-1 ml-auto">
              {sequence.map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 < displayStep
                      ? `w-4 ${barActive}`
                      : i + 1 === displayStep
                        ? `w-5 ${barCurrent}`
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
              className={`font-serif text-xs text-slate-500 truncate block w-full text-left rounded focus:outline-none focus-visible:ring-2 transition-colors ${promptHover}`}
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
      <div className={`mx-auto mb-3 w-10 h-10 rounded-xl ${accentBg} flex items-center justify-center`}>
        <Icon className={`h-5 w-5 ${accentText}`} />
      </div>
      <h3 className="font-serif text-base font-semibold text-slate-800 mb-1">{title}</h3>

      {isComplete ? (
        <p className="font-serif text-[15px] text-slate-500">
          You've completed your {morning ? "morning" : "evening"} check-in. Feel free to continue writing or start a new session.
        </p>
      ) : (
        <>
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-1.5 mb-3">
            {sequence.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${
                  i + 1 < displayStep
                    ? `w-6 ${barActive}`
                    : i + 1 === displayStep
                      ? `w-8 ${barCurrent}`
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
              className={`font-serif text-[15px] text-slate-600 font-medium rounded px-1 focus:outline-none focus-visible:ring-2 transition-colors ${promptHover}`}
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
