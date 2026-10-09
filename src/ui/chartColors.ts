/** The three chart colours (docs/03-design-system.md). Checked for colour-blind readers: do not swap. */
export type ChartColor = 'chart1' | 'chart2' | 'chart3'

export const chartBackground: Record<ChartColor, string> = {
  chart1: 'bg-chart-1',
  chart2: 'bg-chart-2',
  chart3: 'bg-chart-3',
}
