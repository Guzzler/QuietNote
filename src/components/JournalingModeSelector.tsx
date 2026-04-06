import { PenLine, Heart } from "lucide-react";

export type JournalingMode = "freewrite" | "gratitude";

interface Props {
  mode: JournalingMode;
  onChange: (mode: JournalingMode) => void;
}

const MODES: { id: JournalingMode; label: string; icon: typeof PenLine }[] = [
  { id: "freewrite", label: "Free Write", icon: PenLine },
  { id: "gratitude", label: "Gratitude", icon: Heart },
];

export default function JournalingModeSelector({ mode, onChange }: Props) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5" role="radiogroup" aria-label="Journaling mode">
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          role="radio"
          aria-checked={mode === id}
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
            mode === id
              ? "bg-white text-indigo-700 shadow-sm border border-indigo-200"
              : "text-slate-500 hover:text-slate-700"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}
