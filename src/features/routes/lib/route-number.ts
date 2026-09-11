/**
 * Derives the human-readable route number from the stored `sequenceNumber`
 * instead of persisting a formatted string (research.md #2) — keeps the
 * format a one-place concern and cannot drift out of sync with the integer.
 */
export function formatRouteNumber(sequenceNumber: number): string {
  return `RT-${String(sequenceNumber).padStart(6, "0")}`;
}
