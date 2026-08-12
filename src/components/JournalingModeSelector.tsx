import { PenLine, Heart, Sun, Moon, Brain } from "lucide-react";

export type JournalingMode = "freewrite" | "gratitude" | "checkin" | "thoughtrecord";

interface Props {
  mode: JournalingMode;
  onChange: (mode: JournalingMode) => void;
}

function getCheckinIcon() {
  const hour = new Date().getHours();
  return hour >= 5 && hour < 12 ? Sun : Moon;
}

const STATIC_MODES: { id: JournalingMode; label: string; icon: typeof PenLine }[] = [
  { id: "freewrite", label: "Free Write", icon: PenLine },
  { id: "gratitude", label: "Gratitude", icon: Heart },
];

export default function JournalingModeSelector({ mode, onChange }: Props) {
  const CheckinIcon = getCheckinIcon();
  const modes = [
    ...STATIC_MODES,
    { id: "checkin" as JournalingMode, label: "Check-in", icon: CheckinIcon },
    { id: "thoughtrecord" as JournalingMode, label: "Thought Record", icon: Brain },
  ];

  return (
    // F6 — this row used to be an inline-flex strip that scrolled sideways,
    // which at phone widths pushed "Thought Record" (the widest label, last
    // of four) off the edge behind a scrollbar the first tester never used.
    // It wraps now, so every mode is always visible.
    <div className="flex flex-wrap gap-0.5 max-w-full" role="radiogroup" aria-label="Journaling mode">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={mode === id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 min-h-[36px] text-xs font-medium rounded-md transition-all whitespace-nowrap flex-shrink-0 ${
            mode === id
              ? "text-indigo-600 bg-indigo-50/70"
              : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
