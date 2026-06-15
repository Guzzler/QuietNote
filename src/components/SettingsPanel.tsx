import { useState, useEffect, useCallback } from "react";
import { X, Settings, Shield, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { PersonalitySettings } from "../utils/personalityPrompt";

export default function SettingsPanel({
  isOpen,
  onClose,
  settings,
  onSave,
  onOpenPrivacy,
}: {
  isOpen: boolean;
  onClose: () => void;
  settings: PersonalitySettings;
  onSave: (settings: PersonalitySettings) => void;
  onOpenPrivacy: () => void;
}) {
  const [warmth, setWarmth] = useState(settings.warmth);
  const [verbosity, setVerbosity] = useState(settings.verbosity);
  const [style, setStyle] = useState(settings.style);

  useEffect(() => {
    if (isOpen) {
      setWarmth(settings.warmth);
      setVerbosity(settings.verbosity);
      setStyle(settings.style);
    }
  }, [isOpen, settings]);

  const trapRef = useFocusTrap(isOpen);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  const handleSave = () => {
    onSave({ warmth, verbosity, style });
    onClose();
  };

  const warmthLabel = warmth <= 3 ? "Clinical" : warmth <= 7 ? "Warm" : "Very warm";

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={trapRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-sm mx-4 p-5"
            role="dialog"
            aria-modal="true"
            aria-label="AI personality settings"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-slate-600" />
                <h2 className="text-sm font-semibold text-slate-800">AI Personality</h2>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                aria-label="Close settings"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Warmth slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-medium text-slate-700">Warmth</label>
                  <span className="text-xs text-slate-500">{warmthLabel} ({warmth})</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={warmth}
                  onChange={(e) => setWarmth(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-600"
                  aria-label={`Warmth: ${warmth}`}
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                  <span>Clinical</span>
                  <span>Very warm</span>
                </div>
              </div>

              {/* Verbosity radio */}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Response length</label>
                <div className="flex gap-2">
                  {(["concise", "balanced", "detailed"] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setVerbosity(v)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        verbosity === v
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Style radio */}
              <div>
                <label className="text-xs font-medium text-slate-700 mb-1.5 block">Conversation style</label>
                <div className="flex gap-2">
                  {(["supportive", "socratic", "direct"] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setStyle(s)}
                      className={`flex-1 py-1.5 text-xs rounded-lg border transition-all ${
                        style === s
                          ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium"
                          : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-1">
                  {style === "socratic" && "Asks questions to help you discover insights"}
                  {style === "supportive" && "Validates feelings before exploring deeper"}
                  {style === "direct" && "Shares observations and reflections directly"}
                </p>
              </div>
            </div>

            {/* Privacy & your data — entry point to the data controls */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={onOpenPrivacy}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left hover:bg-slate-50 transition-colors min-h-[44px]"
                aria-label="Open privacy and data controls"
              >
                <Shield className="h-4 w-4 text-slate-500 shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-slate-700">Privacy &amp; your data</span>
                  <span className="block text-[11px] text-slate-400">Export or erase your entries</span>
                </span>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            </div>

            <button
              onClick={handleSave}
              className="w-full mt-5 py-2 text-sm font-medium bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Save
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
