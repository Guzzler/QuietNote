/**
 * Pure path derivation for the Node eval runner (`scripts/run-eval.ts`).
 *
 * Why this exists (Day 32): the runner stamped its output directory from the
 * UTC clock and wrote one fixed file per mode, so runs crossing UTC midnight
 * landed in the wrong-dated dir (Day-29, Day-31) and later stages of a
 * multi-pass same-mode run silently overwrote earlier ones. `--outdir=` pins
 * the directory name; `--outfile-suffix=` makes per-pass filenames unique.
 * Extracted here so the derivation is unit-testable without loading the model.
 */

/** Directory name under docs/eval-runs/: `--outdir=` verbatim, else UTC today. */
export function resolveOutDirName(outdir: string | undefined, today: string): string {
  const trimmed = outdir?.trim();
  return trimmed ? trimmed : today;
}

/** Insert `-${suffix}` before the extension: `gratitude.md` + `pass1` → `gratitude-pass1.md`. */
export function withOutfileSuffix(base: string, suffix: string | undefined): string {
  const trimmed = suffix?.trim();
  if (!trimmed) return base;
  const dot = base.lastIndexOf(".");
  if (dot <= 0) return `${base}-${trimmed}`;
  return `${base.slice(0, dot)}-${trimmed}${base.slice(dot)}`;
}

/** Per-mode report filename. Freewrite keeps its historical fullsuite name. */
export function modeReportFilename(mode: string, suffix?: string): string {
  const base = mode === "freewrite" ? "freewrite-fullsuite.md" : `${mode}.md`;
  return withOutfileSuffix(base, suffix);
}

/** Machine summary filename read by the critic step. */
export function summaryFilename(suffix?: string): string {
  return withOutfileSuffix("summary.json", suffix);
}
