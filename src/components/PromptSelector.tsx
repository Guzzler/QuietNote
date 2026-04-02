import { useState, useEffect, useRef } from "react";
import { Sparkles, RefreshCw, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
// NOTE: Outer AnimatePresence removed (Framer Motion v12 exit bug).
// Inner AnimatePresence for prompt content transitions is kept (keyed children work correctly).
import {
  getRandomPrompt,
  getPromptByCategory,
  getAllCategories,
  type PromptData,
} from "../data/journalPrompts";
import type { PromptCategory } from "../types";

interface PromptSelectorProps {
  onSelectPrompt: (prompt: string) => void;
  externalOpen?: boolean;
  onExternalOpenHandled?: () => void;
}

export default function PromptSelector({ onSelectPrompt, externalOpen, onExternalOpenHandled }: PromptSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<PromptData | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<PromptCategory | "all">("all");
  const containerRef = useRef<HTMLDivElement>(null);

  const categories = getAllCategories();

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const categoryLabels: Record<PromptCategory | "all", string> = {
    all: "All Categories",
    gratitude: "Gratitude",
    "self-reflection": "Self-Reflection",
    goals: "Goals & Aspirations",
    challenges: "Challenges",
    relationships: "Relationships",
    growth: "Personal Growth",
    creativity: "Creative Writing",
  };

  const generatePrompt = () => {
    const prompt =
      selectedCategory === "all"
        ? getRandomPrompt()
        : getPromptByCategory(selectedCategory);
    setCurrentPrompt(prompt);
  };

  useEffect(() => {
    if (externalOpen) {
      setIsOpen(true);
      if (!currentPrompt) {
        const prompt = selectedCategory === "all" ? getRandomPrompt() : getPromptByCategory(selectedCategory);
        setCurrentPrompt(prompt);
      }
      onExternalOpenHandled?.();
    }
  }, [externalOpen]);

  const usePrompt = () => {
    if (currentPrompt) {
      onSelectPrompt(currentPrompt.text);
      setIsOpen(false);
      setCurrentPrompt(null);
    }
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !currentPrompt) generatePrompt();
        }}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-indigo-400 transition-all"
        title="Get a journaling prompt"
      >
        <Sparkles className="h-4 w-4 text-indigo-600" />
        <span className="text-slate-700">Prompt</span>
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
          <div
            className="absolute bottom-full mb-2 right-0 w-[calc(100vw-2rem)] max-w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-4 z-50 animate-dropdown"
          >
            {/* Category Selector */}
            <div className="mb-4">
              <label className="text-xs font-medium text-slate-600 mb-2 block">
                Category
              </label>
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => {
                    setSelectedCategory(e.target.value as PromptCategory | "all");
                    setCurrentPrompt(null);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm appearance-none cursor-pointer hover:border-indigo-400 transition-colors pr-8"
                >
                  <option value="all">{categoryLabels.all}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {categoryLabels[cat]}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Prompt Display */}
            <AnimatePresence mode="wait">
              {currentPrompt ? (
                <motion.div
                  key={currentPrompt.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-4 p-4 bg-indigo-50 border border-indigo-200 rounded-lg"
                >
                  <p className="text-sm text-slate-800 leading-relaxed">
                    {currentPrompt.text}
                  </p>
                  <span className="inline-block mt-2 text-xs text-indigo-600 font-medium">
                    {categoryLabels[currentPrompt.category]}
                  </span>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <p className="text-sm text-slate-500 text-center">
                    Generate a prompt to get started
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={generatePrompt}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 hover:border-indigo-400 transition-all text-sm font-medium"
              >
                <RefreshCw className="h-4 w-4" />
                <span>New Prompt</span>
              </button>
              <button
                onClick={usePrompt}
                disabled={!currentPrompt}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all text-sm font-medium"
              >
                Use This
              </button>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              className="w-full mt-2 text-xs text-slate-500 hover:text-slate-700 py-1"
            >
              Close
            </button>
          </div>
        )}
    </div>
  );
}
