// Shared display-only freshness rule. Collection validity and completeness
// remain separate states owned by their source snapshots.
export function snapshotOverdue(
  updatedAt: string | null | undefined,
  maxAgeMs: number,
  status = 'ok',
  now = Date.now(),
): boolean {
  if (status !== 'ok' || !updatedAt) return true;
  const updated = Date.parse(updatedAt);
  return !Number.isFinite(updated) || now - updated > maxAgeMs;
}
