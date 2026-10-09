/** The top line rounds the biggest class up to a multiple of 10 (26 → 30), so the middle line is whole. */
export function classAxisTop(biggest: number): number {
  return Math.max(10, Math.ceil(biggest / 10) * 10)
}
