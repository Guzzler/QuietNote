# Mobile Fix, Code Cleanup, and Code Splitting — 2026-04-08

## Summary

Polish and technical debt cleanup: fixed mobile mode selector overflow, removed dead code, added TypeScript types to ChatPanel, and implemented code splitting for inference engines.

## What Changed

### 1. Mobile Mode Selector Overflow Fix
**File:** `src/components/JournalingModeSelector.tsx`

The 4-pill mode selector (Free Write, Gratitude, Check-in, Thought Record) was wrapping text on 375px mobile viewports, making labels like "Free Write" split across two lines.

**Fix:** Added `overflow-x-auto` and `max-w-full` to the container, and `whitespace-nowrap` + `flex-shrink-0` to each pill button. This enables horizontal scrolling on narrow viewports while keeping pill labels readable.

### 2. Dead Code Removal
**File deleted:** `src/hooks/useMLCEngine.ts` (80 lines)

This hook was fully superseded by `useInferenceEngine.ts` (which supports multiple runtimes via the adapter pattern). Confirmed zero imports across the codebase.

### 3. ChatPanel TypeScript Types
**File:** `src/components/ChatPanel.tsx`

Replaced 5 `any` type annotations:
- Component props: `any` → `ChatPanelProps` interface with all 20+ props properly typed
- Message callbacks (lines 160, 382, 383, 386): `(m: any)` → `(m: ChatMessage)`

### 4. Code Splitting for Inference Engines
**Files:** `src/inference/index.ts`, `src/hooks/useInferenceEngine.ts`

Converted the `createEngine()` factory from static imports to dynamic `import()`:
- `WebLLMEngine` and its 5.5MB `@mlc-ai/web-llm` dependency only load when WebLLM runtime is selected
- `TransformersJSEngine` and its 540KB `@huggingface/transformers` dependency only load when Transformers.js is selected
- Model ref constants inlined in `index.ts` to avoid pulling in engine modules via re-exports

**Bundle impact:**
| Chunk | Before | After |
|-------|--------|-------|
| Main JS | 5.9 MB | 414 KB |
| WebLLM chunk | — | 5,502 KB (lazy) |
| Transformers.js chunk | — | 2.3 KB + 540 KB (lazy) |

## Technical Details

- `createEngine()` is now `async` returning `Promise<InferenceEngine>` — the only caller (`useInferenceEngine`) was already in an async context so integration was seamless
- Model ref constants duplicated in `index.ts` to break the static import chain — these are small data objects that rarely change

## Tests

- All 345 existing tests pass
- `npm run build` succeeds with zero TypeScript errors
- No new tests needed (changes are refactoring/styling, not new features)

## Next Steps

- Manual WebGPU testing to verify engine selection still works end-to-end
- Consider `manualChunks` in Vite config to further optimize chunk boundaries
- Address remaining UX issues: PromptSelector mobile overflow, footer overlap on short viewports
