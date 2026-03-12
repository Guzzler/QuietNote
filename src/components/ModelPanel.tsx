import { Loader2, RefreshCw, Settings, Trash2 } from "lucide-react";
import type { ModelRef, Session } from "../types";

export default function ModelPanel({
  model,
  setModel,
  loadModel,
  loading,
  logs,
  temperature,
  setTemperature,
  maxTokens,
  setMaxTokens,
  current,
  deleteCurrent,
}: {
  model: ModelRef;
  setModel: (m: ModelRef) => void;
  loadModel: (m?: ModelRef) => void;
  loading: boolean;
  logs: string[];
  temperature: number;
  setTemperature: (n: number) => void;
  maxTokens: number;
  setMaxTokens: (n: number) => void;
  current: Session | null;
  deleteCurrent: () => void;
}) {
  return (
    <aside className="rounded-2xl border border-slate-200 bg-white/70 p-4 max-w-[280px] w-full">
      <div className="flex items-center gap-2 mb-3">
        <Settings className="h-4 w-4" />
        <h2 className="text-sm font-semibold">Model</h2>
      </div>

      <label className="block text-[11px] text-slate-500">Model URL</label>
      <input
        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 mb-2"
        value={model.modelUrl}
        onChange={(e) => setModel({ ...model, modelUrl: e.target.value })}
      />

      <label className="block text-[11px] text-slate-500">Model ID</label>
      <input
        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300 mb-2"
        value={model.modelId}
        onChange={(e) => setModel({ ...model, modelId: e.target.value })}
      />

      <label className="block text-[11px] text-slate-500">Local ID</label>
      <input
        className="w-full text-sm px-3 py-2 rounded-xl border border-slate-300"
        value={model.localId}
        onChange={(e) => setModel({ ...model, localId: e.target.value })}
      />

      <button
        onClick={() => loadModel(model)}
        disabled={loading}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Initializing…
          </>
        ) : (
          <>
            <RefreshCw className="h-4 w-4" /> Load / Switch model
          </>
        )}
      </button>

      {logs.length > 0 && (
        <div className="mt-2 max-h-28 overflow-auto text-[11px] border rounded-xl p-2 bg-white">
          {logs.map((l, i) => (
            <div key={i} className="truncate" title={l}>
              {l}
            </div>
          ))}
        </div>
      )}

      <div className="h-px my-3 bg-slate-200" />

      <div className="text-xs text-slate-500">
        Temperature {temperature.toFixed(2)}
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={temperature}
        onChange={(e) => setTemperature(parseFloat(e.target.value))}
        className="w-full"
      />

      <div className="text-xs text-slate-500 mt-2">Max tokens {maxTokens}</div>
      <input
        type="range"
        min={64}
        max={512}
        step={32}
        value={maxTokens}
        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
        className="w-full"
      />

      {current && (
        <button
          onClick={deleteCurrent}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm border border-slate-300 hover:bg-slate-50"
        >
          <Trash2 className="h-4 w-4" /> Delete current
        </button>
      )}
    </aside>
  );
}
