import { useState, useRef } from "react";
import { runEvalSuite, reportToMarkdown } from "../utils/evalDriver";
import type { EvalRunReport } from "../utils/evalDriver";
import type { EvalResult, EvalDimension } from "../utils/evalRunner";
import type { InferenceEngine } from "../inference/types";
import type { JournalingMode } from "./JournalingModeSelector";

const ALL_DIMENSIONS: EvalDimension[] = [
  "persona",
  "medical_refusal",
  "jailbreak",
  "format",
  "empathy",
  "boundary",
];

interface EvalPanelProps {
  engine: InferenceEngine | null;
  getSystemInstruction: (mode: JournalingMode) => string;
  modelLabel: string;
}

export default function EvalPanel({ engine, getSystemInstruction, modelLabel }: EvalPanelProps) {
  const [open, setOpen] = useState(false);
  const [selectedDimensions, setSelectedDimensions] = useState<EvalDimension[]>([...ALL_DIMENSIONS]);
  const [mode, setMode] = useState<JournalingMode>("freewrite");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [lastResult, setLastResult] = useState<EvalResult | null>(null);
  const [report, setReport] = useState<EvalRunReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  if (!import.meta.env.DEV) return null;
  if (!new URLSearchParams(window.location.search).has("eval")) return null;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-40 bg-purple-600 hover:bg-purple-500 text-white px-3 py-2 rounded-lg text-sm font-medium shadow-lg"
      >
        Eval Panel
      </button>
    );
  }

  const toggleDimension = (dim: EvalDimension) => {
    setSelectedDimensions((prev) =>
      prev.includes(dim) ? prev.filter((d) => d !== dim) : [...prev, dim]
    );
  };

  const handleRun = async () => {
    if (!engine || engine.getStatus() !== "ready") {
      setError("Model not loaded. Load the model first.");
      return;
    }

    setRunning(true);
    setError(null);
    setReport(null);
    setProgress({ done: 0, total: 0 });
    setLastResult(null);

    const controller = new AbortController();
    abortRef.current = controller;

    const systemInstruction = getSystemInstruction(mode);

    const generate = async (messages: { role: string; content: string }[]): Promise<string> => {
      await engine.resetContext();
      let acc = "";
      for await (const token of engine.generate(messages, {
        temperature: 0.7,
        maxTokens: 512,
        repetitionPenalty: 1.3,
      })) {
        acc += token;
      }
      return acc;
    };

    try {
      const result = await runEvalSuite(
        {
          systemInstruction,
          generate,
          dimensions: selectedDimensions.length < ALL_DIMENSIONS.length ? selectedDimensions : undefined,
          onProgress: (done, total, last) => {
            setProgress({ done, total });
            setLastResult(last);
          },
          signal: controller.signal,
        },
        modelLabel
      );
      setReport(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
      abortRef.current = null;
    }
  };

  const handleAbort = () => {
    abortRef.current?.abort();
  };

  const handleCopyMarkdown = () => {
    if (!report) return;
    const md = reportToMarkdown(report);
    navigator.clipboard.writeText(md);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-slate-900 text-slate-100 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div>
            <h2 className="text-lg font-semibold">Eval Harness — DEV ONLY</h2>
            <p className="text-xs text-slate-400">Model: {modelLabel}</p>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-slate-400 hover:text-slate-100 px-2 py-1"
          >
            ✕
          </button>
        </div>

        {/* Controls */}
        <div className="p-4 border-b border-slate-700 space-y-3">
          <div className="flex flex-wrap gap-2">
            {ALL_DIMENSIONS.map((dim) => (
              <label key={dim} className="flex items-center gap-1 text-sm">
                <input
                  type="checkbox"
                  checked={selectedDimensions.includes(dim)}
                  onChange={() => toggleDimension(dim)}
                  disabled={running}
                  className="rounded"
                />
                {dim}
              </label>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <select
              value={mode}
              onChange={(e) => setMode(e.target.value as JournalingMode)}
              disabled={running}
              className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm"
            >
              <option value="freewrite">Free Write</option>
              <option value="gratitude">Gratitude</option>
              <option value="checkin">Check-in</option>
              <option value="thoughtrecord">Thought Record</option>
            </select>

            {!running ? (
              <button
                onClick={handleRun}
                disabled={selectedDimensions.length === 0}
                className="bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 px-4 py-1.5 rounded text-sm font-medium"
              >
                Run Eval
              </button>
            ) : (
              <button
                onClick={handleAbort}
                className="bg-red-600 hover:bg-red-500 px-4 py-1.5 rounded text-sm font-medium"
              >
                Abort
              </button>
            )}
          </div>

          {progress && running && (
            <div className="text-sm text-slate-300">
              Progress: {progress.done}/{progress.total}
              {lastResult && (
                <span className={lastResult.passed ? " text-green-400" : " text-red-400"}>
                  {" "}— {lastResult.caseId}: {lastResult.passed ? "PASS" : "FAIL"}
                </span>
              )}
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto p-4">
          {report && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <span className="text-green-400">{report.summary.passed} passed</span>
                  {" / "}
                  <span className="text-red-400">{report.summary.failed} failed</span>
                  {" / "}
                  <span className="text-slate-400">{report.summary.total} total</span>
                </div>
                <button
                  onClick={handleCopyMarkdown}
                  className="bg-slate-700 hover:bg-slate-600 px-3 py-1 rounded text-xs"
                >
                  Copy Markdown Report
                </button>
              </div>

              {/* Dimension summary */}
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(report.summary.byDimension).map(([dim, stats]) => {
                  const rate = stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0;
                  return (
                    <div key={dim} className="bg-slate-800 rounded p-2 text-xs">
                      <div className="font-medium">{dim}</div>
                      <div className={rate >= 80 ? "text-green-400" : rate >= 50 ? "text-yellow-400" : "text-red-400"}>
                        {rate}% ({stats.passed}/{stats.total})
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Results table */}
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-slate-400 border-b border-slate-700">
                    <th className="p-1">Case</th>
                    <th className="p-1">Dimension</th>
                    <th className="p-1">Result</th>
                    <th className="p-1">Failure</th>
                    <th className="p-1">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {report.results.map((r) => (
                    <tr key={r.caseId} className="border-b border-slate-800">
                      <td className="p-1 font-mono">{r.caseId}</td>
                      <td className="p-1">{r.dimension}</td>
                      <td className={`p-1 ${r.passed ? "text-green-400" : "text-red-400"}`}>
                        {r.passed ? "PASS" : "FAIL"}
                      </td>
                      <td className="p-1 text-red-300 max-w-48 truncate">
                        {r.failures.join("; ")}
                      </td>
                      <td className="p-1 max-w-64 truncate text-slate-400">
                        {r.response.slice(0, 80)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

