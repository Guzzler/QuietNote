import { useMemo, useState } from "react";
import type { MoodEntry, MoodEmotion } from "../types";

const EMOTION_DOT_COLORS: Record<MoodEmotion, string> = {
  happy: "#eab308",
  sad: "#3b82f6",
  anxious: "#a855f7",
  angry: "#ef4444",
  calm: "#14b8a6",
  excited: "#f97316",
  frustrated: "#f59e0b",
  content: "#ec4899",
  lonely: "#64748b",
  grateful: "#22c55e",
};

const EMOTION_LABELS: Record<MoodEmotion, string> = {
  happy: "Happy",
  sad: "Sad",
  anxious: "Anxious",
  angry: "Angry",
  calm: "Calm",
  excited: "Excited",
  frustrated: "Frustrated",
  content: "Content",
  lonely: "Lonely",
  grateful: "Grateful",
};

type TimeRange = "7d" | "30d" | "all";

interface MoodChartProps {
  moods: MoodEntry[];
}

function formatShortDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export default function MoodChart({ moods }: MoodChartProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const filtered = useMemo(() => {
    if (moods.length === 0) return [];
    const sorted = [...moods].sort((a, b) => a.ts - b.ts);
    if (timeRange === "all") return sorted;

    const now = Date.now();
    const cutoff = timeRange === "7d" ? now - 7 * 86400000 : now - 30 * 86400000;
    return sorted.filter((m) => m.ts >= cutoff);
  }, [moods, timeRange]);

  const emotionsUsed = useMemo(() => {
    const set = new Set<MoodEmotion>();
    for (const m of filtered) set.add(m.emotion);
    return Array.from(set).sort();
  }, [filtered]);

  if (moods.length < 2) return null;

  const padding = { top: 16, right: 16, bottom: 28, left: 28 };
  const width = 400;
  const height = 160;
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const minTs = filtered.length > 0 ? filtered[0].ts : 0;
  const maxTs = filtered.length > 0 ? filtered[filtered.length - 1].ts : 1;
  const tsRange = maxTs - minTs || 1;

  const points = filtered.map((m, i) => ({
    x: padding.left + (chartW * (m.ts - minTs)) / tsRange,
    y: padding.top + chartH - (chartH * (m.intensity - 1)) / 9,
    mood: m,
    index: i,
  }));

  const yTicks = [1, 4, 7, 10];
  const xTickCount = Math.min(filtered.length, 5);
  const xTicks: { ts: number; x: number }[] = [];
  if (filtered.length > 0) {
    for (let i = 0; i < xTickCount; i++) {
      const idx = Math.round((i * (filtered.length - 1)) / (xTickCount - 1 || 1));
      const ts = filtered[idx].ts;
      xTicks.push({
        ts,
        x: padding.left + (chartW * (ts - minTs)) / tsRange,
      });
    }
  }

  const linePath =
    points.length > 1
      ? points
          .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
          .join(" ")
      : "";

  return (
    <div className="mb-4">
      {/* Header row */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Mood Over Time
        </h4>
        <div className="flex gap-1">
          {([["7d", "7D"], ["30d", "30D"], ["all", "All"]] as [TimeRange, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                onClick={() => setTimeRange(value)}
                className={`px-2 py-0.5 text-[10px] font-medium rounded transition-colors ${
                  timeRange === value
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                {label}
              </button>
            )
          )}
        </div>
      </div>

      {filtered.length < 2 ? (
        <p className="text-xs text-slate-400 text-center py-4">
          Not enough data in this range. Try a wider range or log more moods.
        </p>
      ) : (
        <>
          {/* SVG Chart */}
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            role="img"
            aria-label={`Mood intensity chart showing ${filtered.length} entries`}
          >
            {/* Grid lines */}
            {yTicks.map((v) => {
              const y = padding.top + chartH - (chartH * (v - 1)) / 9;
              return (
                <g key={v}>
                  <line
                    x1={padding.left}
                    x2={width - padding.right}
                    y1={y}
                    y2={y}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                  <text
                    x={padding.left - 6}
                    y={y + 3}
                    textAnchor="end"
                    className="fill-slate-400"
                    fontSize="8"
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* X-axis labels */}
            {xTicks.map((tick, i) => (
              <text
                key={i}
                x={tick.x}
                y={height - 4}
                textAnchor="middle"
                className="fill-slate-400"
                fontSize="8"
              >
                {formatShortDate(tick.ts)}
              </text>
            ))}

            {/* Connecting line */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="#c7d2fe"
                strokeWidth="1.5"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* Data points */}
            {points.map((p) => (
              <circle
                key={p.index}
                cx={p.x}
                cy={p.y}
                r={hoveredIndex === p.index ? 5 : 3.5}
                fill={EMOTION_DOT_COLORS[p.mood.emotion]}
                stroke="white"
                strokeWidth="1.5"
                className="transition-all duration-150 cursor-pointer"
                onMouseEnter={() => setHoveredIndex(p.index)}
                onMouseLeave={() => setHoveredIndex(null)}
              />
            ))}

            {/* Tooltip */}
            {hoveredIndex !== null && points[hoveredIndex] && (() => {
              const p = points[hoveredIndex];
              const tooltipW = 110;
              const tooltipH = 32;
              let tx = p.x - tooltipW / 2;
              if (tx < 4) tx = 4;
              if (tx + tooltipW > width - 4) tx = width - tooltipW - 4;
              const ty = p.y - tooltipH - 8;
              return (
                <g>
                  <rect
                    x={tx}
                    y={ty}
                    width={tooltipW}
                    height={tooltipH}
                    rx="4"
                    fill="#1e293b"
                    opacity="0.9"
                  />
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 13}
                    textAnchor="middle"
                    fill="white"
                    fontSize="9"
                    fontWeight="600"
                  >
                    {EMOTION_LABELS[p.mood.emotion]} — {p.mood.intensity}/10
                  </text>
                  <text
                    x={tx + tooltipW / 2}
                    y={ty + 25}
                    textAnchor="middle"
                    fill="#94a3b8"
                    fontSize="8"
                  >
                    {formatShortDate(p.mood.ts)}
                  </text>
                </g>
              );
            })()}
          </svg>

          {/* Legend */}
          {emotionsUsed.length > 1 && (
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 justify-center">
              {emotionsUsed.map((e) => (
                <div key={e} className="flex items-center gap-1">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: EMOTION_DOT_COLORS[e] }}
                  />
                  <span className="text-[10px] text-slate-500">{EMOTION_LABELS[e]}</span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
