import { Sun, Moon } from "lucide-react";
import { motion } from "framer-motion";
import { MORNING_CHECKIN_SEQUENCE, EVENING_CHECKIN_SEQUENCE } from "../data/journalPrompts";

interface Props {
  currentStep: number; // 1-based (1, 2, or 3)
}

function isMorning(): boolean {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12;
}

export default function CheckInGuide({ currentStep }: Props) {
  const morning = isMorning();
  const sequence = morning ? MORNING_CHECKIN_SEQUENCE : EVENING_CHECKIN_SEQUENCE;
  const step = sequence[Math.min(currentStep - 1, sequence.length - 1)];
  const total = sequence.length;
  const displayStep = Math.min(currentStep, total);
  const isComplete = currentStep > total;

  const Icon = morning ? Sun : Moon;
  const title = morning ? "Morning Check-in" : "Evening Check-in";
  const accentBg = morning ? "bg-amber-100" : "bg-indigo-100";
  const accentText = morning ? "text-amber-600" : "text-indigo-600";
  const barActive = morning ? "bg-amber-400" : "bg-indigo-400";
  const barCurrent = morning ? "bg-amber-500" : "bg-indigo-500";

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
      <h3 className="text-base font-semibold text-slate-800 mb-1">{title}</h3>

      {isComplete ? (
        <p className="text-sm text-slate-500">
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
          <p className="text-sm text-slate-600 font-medium">{step.prompt}</p>
        </>
      )}
    </motion.div>
  );
}
