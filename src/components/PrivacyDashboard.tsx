import { useState, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
// NOTE: Outer AnimatePresence removed (Framer Motion v12 exit bug).
// Inner AnimatePresence for delete confirmation toggle is kept (keyed children work correctly).
import {
  Shield,
  X,
  Server,
  HardDrive,
  Trash2,
  Download,
  CheckCircle,
  Lock,
  Wifi,
  WifiOff,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { getStorageStats, clearAllData, listSessions, listMoods } from "../storage";
import { useFocusTrap } from "../hooks/useFocusTrap";
import type { RuntimeId } from "../inference/types";

const RUNTIME_OPTIONS: { id: RuntimeId; label: string; model: string; description: string }[] = [
  { id: "webllm", label: "WebLLM", model: "Gemma 2 2B", description: "Original backend via MLC WebGPU" },
  { id: "transformersjs", label: "Transformers.js", model: "Gemma 4 E2B", description: "Hugging Face ONNX via WebGPU/WASM" },
  { id: "mediapipe", label: "MediaPipe", model: "Gemma 3 1B", description: "Google AI Edge via WebGPU" },
];

interface PrivacyDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onDataCleared?: () => void;
  runtimeId?: RuntimeId;
  onRuntimeChange?: (runtime: RuntimeId) => void;
  engineLoading?: boolean;
}

export default function PrivacyDashboard({ isOpen, onClose, onDataCleared, runtimeId = "webllm", onRuntimeChange, engineLoading }: PrivacyDashboardProps) {
  const titleId = useId();
  const focusTrapRef = useFocusTrap(isOpen);
  const [stats, setStats] = useState<{ sessions: number; moods: number; totalBytes: number } | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadStats();
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

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const loadStats = async () => {
    try {
      const s = await getStorageStats();
      setStats(s);
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const sessions = await listSessions();
      const moods = await listMoods();

      const exportData = {
        version: "1.0",
        exportedAt: new Date().toISOString(),
        data: {
          sessions,
          moods,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quietnote-export-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleClearData = async () => {
    setIsDeleting(true);
    try {
      await clearAllData();
      await loadStats();
      setShowDeleteConfirm(false);
      onDataCleared?.();
    } catch (err) {
      console.error("Failed to clear data:", err);
    } finally {
      setIsDeleting(false);
    }
  };

  const privacyFeatures = [
    {
      icon: <Server className="h-5 w-5" />,
      title: "Zero Server Communication",
      description: "Your journal entries never leave your device. The AI model is downloaded once on first use, then all processing stays local.",
      status: "active",
    },
    {
      icon: <HardDrive className="h-5 w-5" />,
      title: "Local Storage Only",
      description: "All data stored in your browser's IndexedDB. You own your data.",
      status: "active",
    },
    {
      icon: <Lock className="h-5 w-5" />,
      title: "On-Device AI",
      description: "The AI model runs entirely in your browser. Model files are downloaded once, then everything runs locally.",
      status: "active",
    },
    {
      icon: isOnline ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />,
      title: "Works Offline",
      description: isOnline
        ? "You're online, but all features work offline after model download."
        : "You're offline - QuietNote is fully functional!",
      status: isOnline ? "info" : "active",
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 animate-modal-backdrop"
      />

      {/* Modal */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-hidden animate-modal-content"
        >
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-xl">
                      <Shield className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <h2 id={titleId} className="text-xl font-semibold text-slate-800">Privacy Dashboard</h2>
                      <p className="text-sm text-slate-600 mt-0.5">
                        Your data stays on your device. Always.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close privacy dashboard"
                    className="p-2 hover:bg-white/50 rounded-lg transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  >
                    <X className="h-5 w-5 text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Privacy Status Banner */}
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3">
                  <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-green-800">Your privacy is protected</p>
                    <p className="text-sm text-green-700">
                      After setup, all processing happens locally on your device.
                    </p>
                  </div>
                </div>

                {/* Privacy Features */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Privacy Features</h3>
                  <div className="space-y-3">
                    {privacyFeatures.map((feature, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100"
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            feature.status === "active"
                              ? "bg-green-100 text-green-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {feature.icon}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{feature.title}</p>
                          <p className="text-sm text-slate-500">{feature.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Storage Stats */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Your Data</h3>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <p className="text-2xl font-bold text-slate-800">{stats?.sessions ?? "..."}</p>
                      <p className="text-sm text-slate-500">Journal Sessions</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
                      <p className="text-2xl font-bold text-slate-800">{stats?.moods ?? "..."}</p>
                      <p className="text-sm text-slate-500">Mood Entries</p>
                    </div>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                    <p className="text-lg font-bold text-slate-800">
                      {stats ? formatBytes(stats.totalBytes) : "..."}
                    </p>
                    <p className="text-xs text-slate-500">Total Browser Storage (includes AI model cache)</p>
                  </div>
                </div>

                {/* Inference Engine Selection */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <Cpu className="h-4 w-4" />
                    Inference Engine
                  </h3>
                  <div className="space-y-2">
                    {RUNTIME_OPTIONS.map((option) => (
                      <button
                        key={option.id}
                        onClick={() => onRuntimeChange?.(option.id)}
                        disabled={engineLoading}
                        className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                          runtimeId === option.id
                            ? "bg-indigo-50 border-indigo-200"
                            : "bg-slate-50 border-slate-100 hover:border-slate-200"
                        } ${engineLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                      >
                        <div className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          runtimeId === option.id ? "border-indigo-500" : "border-slate-300"
                        }`}>
                          {runtimeId === option.id && (
                            <div className="w-2 h-2 rounded-full bg-indigo-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm">
                            {option.label} <span className="text-slate-400 font-normal">({option.model})</span>
                          </p>
                          <p className="text-xs text-slate-500">{option.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Switching engines requires downloading a new model. All processing remains on-device.
                  </p>
                </div>

                {/* Data Control Actions */}
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Data Control</h3>
                  <div className="flex gap-3">
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl hover:bg-indigo-100 transition-colors disabled:opacity-50"
                    >
                      <Download className="h-5 w-5" />
                      <span className="font-medium">
                        {isExporting ? "Exporting..." : "Export All Data"}
                      </span>
                    </button>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                      <span className="font-medium">Erase All Data</span>
                    </button>
                  </div>

                  {/* Export success message */}
                  <AnimatePresence>
                    {exportSuccess && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-3 flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2"
                      >
                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                        <span>Data exported successfully — check your downloads folder.</span>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Delete Confirmation */}
                <AnimatePresence>
                  {showDeleteConfirm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
                    >
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-red-800">Are you sure?</p>
                          <p className="text-sm text-red-700 mb-3">
                            This will permanently delete all your journal entries and mood data.
                            This action cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setShowDeleteConfirm(false)}
                              className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={handleClearData}
                              disabled={isDeleting}
                              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                            >
                              {isDeleting ? "Deleting..." : "Yes, Delete Everything"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Open Source Note */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    <span className="font-medium text-slate-800">Open Source & Auditable:</span>{" "}
                    QuietNote's code is open source. You can verify our privacy claims by reviewing
                    the source code. We believe in transparency and user sovereignty over personal
                    data.
                  </p>
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 border-t border-slate-200 bg-slate-50">
                <button
                  onClick={onClose}
                  className="w-full px-4 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors font-medium"
                >
                  Close
                </button>
              </div>
        </div>
      </div>
    </>
  );
}
