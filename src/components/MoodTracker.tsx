import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Smile,
  Frown,
  Meh,
  Heart,
  Zap,
  Cloud,
  Sun,
  Moon,
  X,
  Check,
  ChevronDown,
} from "lucide-react";
import type { MoodEmotion, MoodContext, MoodEntry } from "../types";
import { listMoods } from "../storage";
import MoodInsightsCard from "./MoodInsightsCard";
import { useFocusTrap } from "../hooks/useFocusTrap";

interface MoodTrackerProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMood: (mood: MoodEntry) => void | Promise<void>;
  sessionId?: string;
  initialEmotion?: MoodEmotion;
  initialIntensity?: number;
}

const EMOTIONS: { value: MoodEmotion; label: string; icon: React.ReactNode; color: string }[] = [
  { value: "happy", label: "Happy", icon: <Smile className="h-6 w-6" />, color: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { value: "sad", label: "Sad", icon: <Frown className="h-6 w-6" />, color: "bg-blue-100 border-blue-300 text-blue-700" },
  { value: "anxious", label: "Anxious", icon: <Zap className="h-6 w-6" />, color: "bg-purple-100 border-purple-300 text-purple-700" },
  { value: "angry", label: "Angry", icon: <Cloud className="h-6 w-6" />, color: "bg-red-100 border-red-300 text-red-700" },
  { value: "calm", label: "Calm", icon: <Moon className="h-6 w-6" />, color: "bg-teal-100 border-teal-300 text-teal-700" },
  { value: "excited", label: "Excited", icon: <Sun className="h-6 w-6" />, color: "bg-orange-100 border-orange-300 text-orange-700" },
  { value: "frustrated", label: "Frustrated", icon: <Meh className="h-6 w-6" />, color: "bg-amber-100 border-amber-300 text-amber-700" },
  { value: "content", label: "Content", icon: <Heart className="h-6 w-6" />, color: "bg-pink-100 border-pink-300 text-pink-700" },
  { value: "lonely", label: "Lonely", icon: <Cloud className="h-6 w-6" />, color: "bg-slate-100 border-slate-300 text-slate-700" },
  { value: "grateful", label: "Grateful", icon: <Heart className="h-6 w-6" />, color: "bg-green-100 border-green-300 text-green-700" },
];

const CONTEXTS: { value: MoodContext; label: string }[] = [
  { value: "work", label: "Work" },
  { value: "relationships", label: "Relationships" },
  { value: "health", label: "Health" },
  { value: "family", label: "Family" },
  { value: "friends", label: "Friends" },
  { value: "finances", label: "Finances" },
  { value: "personal", label: "Personal" },
  { value: "other", label: "Other" },
];

export default function MoodTracker({ isOpen, onClose, onSaveMood, sessionId, initialEmotion, initialIntensity }: MoodTrackerProps) {
  const titleId = useId();
  const focusTrapRef = useFocusTrap(isOpen);
  const [selectedEmotion, setSelectedEmotion] = useState<MoodEmotion | null>(null);
  const [intensity, setIntensity] = useState(5);
  const [selectedContexts, setSelectedContexts] = useState<MoodContext[]>([]);
  const [note, setNote] = useState("");
  const [showContexts, setShowContexts] = useState(false);
  const [allMoods, setAllMoods] = useState<MoodEntry[]>([]);

  // Load moods for insights when modal opens
  useEffect(() => {
    if (isOpen) {
      listMoods().then(setAllMoods);
    }
  }, [isOpen]);

  // Apply pre-fill values when modal opens with initial values
  useEffect(() => {
    if (isOpen && initialEmotion) {
      setSelectedEmotion(initialEmotion);
      setIntensity(initialIntensity ?? 5);
    }
  }, [isOpen, initialEmotion, initialIntensity]);

  // Reset state when closed without saving
  useEffect(() => {
    if (!isOpen) {
      handleReset();
    }
  }, [isOpen]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handleSave = async () => {
    if (!selectedEmotion) return;

    const moodEntry: MoodEntry = {
      id: crypto.randomUUID(),
      sessionId,
      emotion: selectedEmotion,
      intensity,
      contexts: selectedContexts,
      note: note.trim() || undefined,
      ts: Date.now(),
    };

    await onSaveMood(moodEntry);
    // Refresh mood list so count updates immediately
    const updated = await listMoods();
    setAllMoods(updated);
    handleReset();
    onClose();
  };

  const handleReset = () => {
    setSelectedEmotion(null);
    setIntensity(5);
    setSelectedContexts([]);
    setNote("");
    setShowContexts(false);
  };

  const toggleContext = (context: MoodContext) => {
    setSelectedContexts((prev) =>
      prev.includes(context)
        ? prev.filter((c) => c !== context)
        : [...prev, context]
    );
  };

  const getIntensityLabel = (value: number) => {
    if (value <= 2) return "Very mild";
    if (value <= 4) return "Mild";
    if (value <= 6) return "Moderate";
    if (value <= 8) return "Strong";
    return "Very strong";
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-modal-backdrop"
      />

      {/* Modal wrapper — click outside the white box to close */}
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-hidden animate-modal-content"
        >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h2 id={titleId} className="text-xl font-semibold text-slate-800">How are you feeling?</h2>
                  <p className="text-sm text-slate-500 mt-1">Track your mood to discover patterns</p>
                </div>
                <div className="flex flex-col items-center gap-0.5">
                  <button
                    onClick={onClose}
                    aria-label="Close mood tracker"
                    className="p-2 hover:bg-slate-100 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                  <span className="text-[10px] text-slate-400 hidden sm:block">Esc</span>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-160px)]">
                {/* Emotion Grid */}
                <div className="mb-6">
                  <label className="text-sm font-medium text-slate-700 mb-3 block">
                    Select your emotion
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {EMOTIONS.map((emotion) => (
                      <motion.button
                        key={emotion.value}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedEmotion(emotion.value)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${
                          selectedEmotion === emotion.value
                            ? `${emotion.color} border-2 shadow-md`
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <span className={selectedEmotion === emotion.value ? "" : "text-slate-500"}>
                          {emotion.icon}
                        </span>
                        <span className="text-xs font-medium">{emotion.label}</span>
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Intensity Slider */}
                {selectedEmotion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-6"
                  >
                    <label className="text-sm font-medium text-slate-700 mb-3 block">
                      Intensity: <span className="text-indigo-600">{getIntensityLabel(intensity)}</span> ({intensity}/10)
                    </label>
                    <div className="relative">
                      <input
                        type="range"
                        min="1"
                        max="10"
                        value={intensity}
                        onChange={(e) => setIntensity(Number(e.target.value))}
                        className="w-full h-3 bg-slate-200 rounded-full appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, ${
                            intensity <= 2 ? "#22c55e" :
                            intensity <= 4 ? "#84cc16" :
                            intensity <= 6 ? "#eab308" :
                            intensity <= 8 ? "#f97316" : "#ef4444"
                          } ${intensity * 10}%, #e2e8f0 ${intensity * 10}%)`,
                        }}
                      />
                      <div className="flex justify-between text-xs text-slate-400 mt-1">
                        <span>Mild</span>
                        <span>Strong</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Context Tags */}
                {selectedEmotion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-6"
                  >
                    <button
                      onClick={() => setShowContexts(!showContexts)}
                      className="flex items-center gap-2 text-sm font-medium text-slate-700 mb-3"
                    >
                      <span>What's contributing to this feeling?</span>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${showContexts ? "rotate-180" : ""}`}
                      />
                    </button>

                    <AnimatePresence>
                      {showContexts && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="flex flex-wrap gap-2"
                        >
                          {CONTEXTS.map((context) => (
                            <button
                              key={context.value}
                              onClick={() => toggleContext(context.value)}
                              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                                selectedContexts.includes(context.value)
                                  ? "bg-indigo-100 text-indigo-700 border-2 border-indigo-300"
                                  : "bg-slate-100 text-slate-600 border-2 border-transparent hover:bg-slate-200"
                              }`}
                            >
                              {context.label}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                )}

                {/* Note */}
                {selectedEmotion && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-4"
                  >
                    <label className="text-sm font-medium text-slate-700 mb-2 block">
                      Add a note (optional)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="What's on your mind?"
                      rows={2}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:border-indigo-400 focus:ring-1 focus:ring-indigo-100 transition-all resize-none"
                    />
                  </motion.div>
                )}

                {/* Mood Insights */}
                <MoodInsightsCard moods={allMoods} />
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-3">
                <button
                  onClick={handleReset}
                  className="flex-1 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                >
                  Reset
                </button>
                <button
                  onClick={handleSave}
                  disabled={!selectedEmotion}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  Save Mood
                </button>
              </div>
            </div>
          </div>
      </>
    );
}
