// Canonical train lifecycle phase; renderer backend is tracked separately.
// Visibility and motion preference are inputs, not extra mutable states.
export type TrainPhase = 'running' | 'paused' | 'reduced' | 'disposed';
export function trainPhase(visible: boolean, pageHidden: boolean, reduced: boolean, disposed: boolean): TrainPhase {
  if (disposed) return 'disposed';
  if (reduced) return 'reduced';
  return visible && !pageHidden ? 'running' : 'paused';
}
