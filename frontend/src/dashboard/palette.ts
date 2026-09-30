/**
 * The chart palette. Kept separate from the chart components: a module that exports both
 * components and constants can't be hot-swapped, so every edit to a chart would reload the
 * whole page instead.
 */
export const CHART_COLORS = ['#B8932E', '#2F7A4D', '#0E0E10', '#B4690E', '#B42318', '#6B6F6A', '#D4AF37', '#8A8F7F']

/** One colour per robot, stable across every chart that breaks a figure down by robot. */
export const ROBOT_COLOR: Record<string, string> = {
  'arm-01': CHART_COLORS[0],
  'arm-02': CHART_COLORS[1],
  'arm-03': CHART_COLORS[2],
  'mobile-01': CHART_COLORS[3],
  'humanoid-01': CHART_COLORS[4],
}

export const QUALITY_COLOR = { good: '#2F7A4D', usable: '#B4690E', bad: '#B42318' } as const

export const AXIS_COLOR = '#9A9E98'
export const GRID_COLOR = '#E3E5E0'
export const LABEL_COLOR = '#6B6F6A'

export function pct(part?: number, total?: number): number {
  if (!total || !part) return 0
  return Math.min(100, Math.round((part / total) * 100))
}
