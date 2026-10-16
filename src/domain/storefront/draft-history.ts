/** In-memory undo/redo stacks for an editor draft. Never touches saved or published data. */
export type DraftHistory<T> = { past: T[]; future: T[] };

export const DRAFT_HISTORY_LIMIT = 50;

export function createDraftHistory<T>(): DraftHistory<T> {
  return { past: [], future: [] };
}

/** Record the value before an edit; a new edit clears the redo stack. */
export function pushDraftHistory<T>(history: DraftHistory<T>, previous: T | null | undefined): DraftHistory<T> {
  if (previous == null) return history;
  return { past: [...history.past, previous].slice(-DRAFT_HISTORY_LIMIT), future: [] };
}

export function undoDraftHistory<T>(history: DraftHistory<T>, current: T | null | undefined): { history: DraftHistory<T>; value: T } | null {
  const value = history.past[history.past.length - 1];
  if (value === undefined || current == null) return null;
  return { history: { past: history.past.slice(0, -1), future: [current, ...history.future] }, value };
}

export function redoDraftHistory<T>(history: DraftHistory<T>, current: T | null | undefined): { history: DraftHistory<T>; value: T } | null {
  const value = history.future[0];
  if (value === undefined || current == null) return null;
  return { history: { past: [...history.past, current].slice(-DRAFT_HISTORY_LIMIT), future: history.future.slice(1) }, value };
}
