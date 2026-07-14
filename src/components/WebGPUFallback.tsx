import { AlertTriangle, Monitor, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";

interface WebGPUFallbackProps {
  reason?: string;
}

export default function WebGPUFallback({ reason }: WebGPUFallbackProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-b from-indigo-50 to-slate-50 z-50 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white rounded-2xl shadow-lg border border-slate-200 p-6 space-y-5"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 border border-amber-200">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
          </div>
          <h2 className="text-lg font-semibold text-slate-800">
            WebGPU Not Available
          </h2>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed">
          QuietNote uses <strong>WebGPU</strong> to run AI entirely on your
          device for maximum privacy. Your current browser doesn't support
          this technology yet.
        </p>

        {reason && (
          <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2 border border-slate-100">
            {reason}
          </div>
        )}

        <div className="space-y-2">
          <h3 className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Monitor className="h-4 w-4" />
            Supported Browsers
          </h3>
          <ul className="text-sm text-slate-600 space-y-1 ml-6 list-disc">
            <li>
              <strong>Google Chrome</strong> 113+
            </li>
            <li>
              <strong>Microsoft Edge</strong> 113+
            </li>
            <li>
              <strong>Chrome for Android</strong> 121+
            </li>
            <li className="text-slate-400">
              Firefox, Safari — not yet supported
            </li>
          </ul>
        </div>

        <div className="bg-indigo-50 rounded-lg px-4 py-3 border border-indigo-100">
          <p className="text-sm text-indigo-700">
            QuietNote's AI companion needs WebGPU, which this browser
            doesn't offer yet. Your data never left this device — nothing
            was sent or lost. To use QuietNote, open it in Chrome or Edge
            113+ (or Chrome for Android 121+).
          </p>
        </div>

        <a
          href="https://developer.chrome.com/blog/webgpu-release"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
        >
          Learn more about WebGPU
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </motion.div>
    </div>
  );
}
