/**
 * Pins the M6 (2026-07-25) safety-mirror oversampling contract in the
 * generated M3 notebook. The notebook is a build artifact of
 * scripts/build-m3-notebook.ts — regenerate with
 *   npx tsx scripts/build-m3-notebook.ts
 * after any builder change, or these assertions catch the drift.
 *
 * The invariants that matter for correctness (not just presence):
 *  - the oversample factor is defined in CONFIG,
 *  - the mirrors are re-weighted in the TRAIN split ONLY (never eval — that
 *    would leak identical records across the split and distort the measured
 *    distribution), and
 *  - the routing key `is_safety` is dropped before training so only `text`
 *    reaches the trainer.
 */
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NOTEBOOK = join(ROOT, "notebooks", "m3-qlora-gemma4-e2b.ipynb");

type Cell = { cell_type: string; source: string[] };

function loadCells(): Cell[] {
  const nb = JSON.parse(readFileSync(NOTEBOOK, "utf-8"));
  return nb.cells as Cell[];
}

/** Concatenated source of the first code cell whose text matches. */
function codeCellContaining(cells: Cell[], needle: string): string {
  const cell = cells.find(
    (c) => c.cell_type === "code" && c.source.join("").includes(needle),
  );
  expect(cell, `no code cell contains ${JSON.stringify(needle)}`).toBeDefined();
  return cell!.source.join("");
}

describe("M3 notebook — M6 safety-mirror oversampling", () => {
  const cells = loadCells();

  it("defines the oversample factor in the CONFIG cell", () => {
    const config = codeCellContaining(cells, "BASE_MODEL =");
    expect(config).toMatch(/^SAFETY_OVERSAMPLE\s*=\s*6\s*$/m);
  });

  it("render() returns the is_safety routing key so it survives remove_columns", () => {
    const renderCell = codeCellContaining(cells, "def render(example):");
    // The key must be RETURNED by the map fn (survives remove_columns), and
    // derived from the safety-* tag prefix.
    expect(renderCell).toContain('"is_safety": is_safety');
    expect(renderCell).toMatch(
      /is_safety\s*=\s*any\(\s*t\.startswith\("safety-"\)\s+for\s+t\s+in\s+example\["tags"\]\s*\)/,
    );
    // The strip list keeps only "text"; is_safety must NOT be pre-added there —
    // it has to arrive via the return value to survive.
    expect(renderCell).toContain(
      'remove_columns=[c for c in raw.column_names if c != "text"]',
    );
  });

  it("oversamples the TRAIN split only and never touches the eval split", () => {
    const cell = codeCellContaining(cells, "SAFETY_OVERSAMPLE - 1");
    // Train is rebuilt from itself + repeated safety rows.
    expect(cell).toContain("concatenate_datasets");
    expect(cell).toMatch(/\[safety\]\s*\*\s*\(SAFETY_OVERSAMPLE - 1\)/);
    expect(cell).toMatch(/safety\s*=\s*train_ds\.filter\(lambda r: r\["is_safety"\]\)/);
    // eval_ds comes straight off split["test"] and is only ever read/relabeled,
    // never concatenated with duplicated rows.
    expect(cell).toContain('eval_ds = split["test"]');
    expect(cell).not.toMatch(/concatenate_datasets\([^)]*eval_ds/);
    // The final DatasetDict still keys train/test for the downstream TRAIN cell.
    expect(cell).toContain('split = {"train": train_ds, "test": eval_ds}');
  });

  it("drops the routing key from BOTH splits before training", () => {
    const cell = codeCellContaining(cells, "SAFETY_OVERSAMPLE - 1");
    expect(cell).toContain('train_ds = train_ds.remove_columns("is_safety")');
    expect(cell).toContain('eval_ds = eval_ds.remove_columns("is_safety")');
  });

  it("prints the resulting safety share for the run log", () => {
    const cell = codeCellContaining(cells, "SAFETY_OVERSAMPLE - 1");
    expect(cell).toMatch(/print\(.*safety mirror/s);
  });
});
