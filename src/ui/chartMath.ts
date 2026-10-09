/** The height of a bar as a share of the top line, from 0 to 100. Bars start at zero. */
export function percentOf(value: number | null, max: number): number {
  if (value === null || max <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((value / max) * 1000) / 10))
}

/** The width of each part of a stacked bar in percent. They add up to 100 (or all 0 for an empty row). */
export function partWidths(parts: { value: number }[]): number[] {
  const total = parts.reduce((sum, p) => sum + p.value, 0)
  return parts.map((p) => (total === 0 ? 0 : (p.value / total) * 100))
}

/** A stacked row: the 13px name line (13 × 1.4) + 5px + the 12px bar. Between two rows: 11px. */
export function stackedMinHeight(rows: number): number {
  return rows * (18.2 + 5 + 12) + (rows - 1) * 11
}

/** A bar-list row is as high as its 13px line: 13 × 1.4. Between two rows: 9px. */
export function barListMinHeight(rows: number): number {
  return rows * 18.2 + (rows - 1) * 9
}
