import { lazy, Suspense, type ComponentProps, type CSSProperties } from 'react'
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, LABEL_COLOR } from './palette'

// ECharts is over a megabyte. Lazily loaded so it never blocks the first paint, which on this
// page -- a dashboard someone opens first thing -- is exactly the part that matters.
const ReactEChartsLazy = lazy(() => import('echarts-for-react'))

function ReactECharts(props: ComponentProps<typeof ReactEChartsLazy>) {
  const height = (props.style as CSSProperties | undefined)?.height ?? 200
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-line border-t-ink" />
        </div>
      }
    >
      <ReactEChartsLazy {...props} />
    </Suspense>
  )
}

function NoData({ text = 'No data for this range' }: { text?: string }) {
  return <div className="flex items-center justify-center py-6 text-xs text-ink-faint">{text}</div>
}

export function PieChart({ slices, height = 220 }: { slices: { label: string; value: number; color?: string }[]; height?: number }) {
  const data = slices
    .filter((slice) => slice.value > 0)
    .map((slice, index) => ({
      name: slice.label,
      value: slice.value,
      itemStyle: { color: slice.color ?? CHART_COLORS[index % CHART_COLORS.length] },
    }))

  if (data.length === 0) return <NoData />

  return (
    <ReactECharts
      option={{
        backgroundColor: 'transparent',
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        legend: { orient: 'vertical', right: '5%', top: 'center', textStyle: { fontSize: 11, color: LABEL_COLOR } },
        series: [
          {
            type: 'pie',
            radius: ['35%', '65%'],
            center: ['35%', '50%'],
            avoidLabelOverlap: true,
            label: { show: false },
            emphasis: { label: { show: true, fontSize: 13, fontWeight: 'bold' } },
            data,
          },
        ],
      }}
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  )
}

export function BarChart({
  bars,
  horizontal = true,
  height = 200,
}: {
  bars: { label: string; value: number; color?: string }[]
  horizontal?: boolean
  height?: number
}) {
  if (bars.length === 0) return <NoData />

  const labels = bars.map((bar) => bar.label)
  const values = bars.map((bar, index) => ({
    value: bar.value,
    itemStyle: { color: bar.color ?? CHART_COLORS[index % CHART_COLORS.length], borderRadius: horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0] },
  }))

  const option = horizontal
    ? {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '8%', bottom: '3%', containLabel: true },
        xAxis: { type: 'value', axisLabel: { color: AXIS_COLOR, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_COLOR } } },
        yAxis: { type: 'category', data: labels, axisLabel: { color: LABEL_COLOR, fontSize: 11 }, axisTick: { show: false } },
        series: [{ type: 'bar', data: values, barMaxWidth: 20 }],
      }
    : {
        backgroundColor: 'transparent',
        tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
        grid: { left: '3%', right: '4%', bottom: '15%', top: '5%', containLabel: true },
        xAxis: { type: 'category', data: labels, axisLabel: { color: LABEL_COLOR, fontSize: 10, rotate: labels.length > 5 ? 30 : 0 }, axisTick: { show: false } },
        yAxis: { type: 'value', axisLabel: { color: AXIS_COLOR, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_COLOR } } },
        series: [{ type: 'bar', data: values, barMaxWidth: 28 }],
      }

  return <ReactECharts option={option as never} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />
}

export function LineChart({
  points,
  series,
  height = 220,
}: {
  points: string[]
  series: { name: string; values: number[]; color?: string; area?: boolean }[]
  height?: number
}) {
  if (points.length === 0) return <NoData />
  const single = points.length === 1

  return (
    <ReactECharts
      option={
        {
          backgroundColor: 'transparent',
          tooltip: { trigger: 'axis' },
          legend: series.length > 1 ? { top: 0, right: 0, textStyle: { fontSize: 11, color: LABEL_COLOR }, icon: 'roundRect' } : undefined,
          grid: { left: '3%', right: '4%', bottom: '10%', top: series.length > 1 ? '18%' : '8%', containLabel: true },
          xAxis: { type: 'category', data: points, axisLabel: { color: AXIS_COLOR, fontSize: 10 }, axisTick: { show: false }, axisLine: { lineStyle: { color: GRID_COLOR } } },
          yAxis: { type: 'value', axisLabel: { color: AXIS_COLOR, fontSize: 10 }, splitLine: { lineStyle: { color: GRID_COLOR } } },
          series: series.map((one, index) => {
            const color = one.color ?? CHART_COLORS[index % CHART_COLORS.length]
            return {
              name: one.name,
              type: 'line',
              data: one.values,
              smooth: true,
              symbol: 'circle',
              symbolSize: single ? 10 : 6,
              showSymbol: true,
              lineStyle: { color, width: 2.5 },
              itemStyle: { color },
              areaStyle:
                one.area === false
                  ? undefined
                  : {
                      color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [
                          { offset: 0, color: `${color}40` },
                          { offset: 1, color: `${color}08` },
                        ],
                      },
                    },
            }
          }),
        } as never
      }
      style={{ height, width: '100%' }}
      opts={{ renderer: 'svg' }}
    />
  )
}
