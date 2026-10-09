const round1 = (n: number) => Math.round(n * 10) / 10

/** Width of the blue and red parts, as numbers from 0 to 50. The seat line is at 50. */
export function seatMeterWidths(count: number, seats: number): { blue: number; red: number } {
  if (seats <= 0) return { blue: 0, red: count > 0 ? 50 : 0 }
  const load = count / seats
  return {
    blue: round1(Math.min(1, load) * 50),
    red: round1(Math.min(1, Math.max(0, load - 1)) * 50),
  }
}
