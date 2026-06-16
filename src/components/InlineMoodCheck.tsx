import { useState } from "react";
import type { MoodEmotion } from "../types";

// A gentle, optional "How are you feeling?" row at the free-write entry start.
// One tap logs a lightweight mood (the parent owns the save) and offers an
// "add detail" path into the full tracker. Calm palette only — no per-emotion
// colors leak in here (guarded by VisualCalmGuards): neutral slate chips, the
// shared indigo accent on selection. Keyword extraction stays the fallback for
// entries where nobody taps a chip, so this is purely additive.

interface Props {
  onPick: (emotion: MoodEmotion) => void;
  // emotion omitted from "more…" → tracker opens with no pre-selection.
  onAddDetail: (emotion?: MoodEmotion) => void;
}

// A balanced ~6 primaries keep the row whisper-quiet; the full set of 10 (plus
// intensity/contexts) lives one tap away behind "more…".
const PRIMARY: { value: MoodEmotion; label: string }[] = [
  { value: "happy", label: "Happy" },
  { value: "calm", label: "Calm" },
  { value: "anxious", label: "Anxious" },
  { value: "sad", label: "Sad" },
  { value: "frustrated", label: "Frustrated" },
  { value: "grateful", label: "Grateful" },
];

export default function InlineMoodCheck({ onPick, onAddDetail }: Props) {
  const [picked, setPicked] = useState<MoodEmotion | null>(null);

  if (picked) {
    const label = PRIMARY.find((e) => e.value === picked)?.label ?? picked;
    return (
      <div className="mb-5">
        <p
          role="status"
          aria-live="polite"
          className="text-xs text-slate-500 mb-2"
        >
          Noted — feeling {label.toLowerCase()}.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => onAddDetail(picked)}
            className="text-xs text-indigo-600 hover:text-indigo-700 underline transition-colors"
          >
            add detail →
          </button>
          <button
            onClick={() => setPicked(null)}
            className="text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
          >
            change
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-5">
      <p className="text-xs text-slate-500 mb-2">How are you feeling?</p>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {PRIMARY.map((e) => (
          <button
            key={e.value}
            onClick={() => {
              setPicked(e.value);
              onPick(e.value);
            }}
            aria-label={`Log feeling ${e.label}`}
            className="min-h-[44px] px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition-colors"
          >
            {e.label}
          </button>
        ))}
        <button
          onClick={() => onAddDetail()}
          aria-label="More moods and detail"
          className="min-h-[44px] px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 underline transition-colors"
        >
          more…
        </button>
      </div>
    </div>
  );
}
