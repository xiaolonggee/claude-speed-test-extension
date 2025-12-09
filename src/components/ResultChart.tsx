import { useEffect, useRef } from 'react'
import * as echarts from 'echarts/core'
import { BarChart } from 'echarts/charts'
import {
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TitleComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  BarChart,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  DatasetComponent,
  TitleComponent,
  CanvasRenderer,
])

type ChartDatum = {
  name: string
  series: { label: string; value: number; color: string }[]
}

const ResultChart = ({ data }: { data: ChartDatum[] }) => {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    const chart = echarts.init(ref.current)

    const seriesNames = Array.from(new Set(data.flatMap((d) => d.series.map((s) => s.label))))

    const source: Array<Record<string, number | string>> = []
    data.forEach((row) => {
      const base: Record<string, number | string> = { name: row.name }
      row.series.forEach((s) => {
        base[s.label] = s.value
      })
      source.push(base)
    })

    const option = {
      title: {
        text: '首字节 / 总耗时（ms）',
        left: 'left',
        top: 0,
        textStyle: { fontSize: 13, fontWeight: 600 },
      },
      tooltip: { trigger: 'axis' },
      legend: {
        data: seriesNames,
        top: 24,
      },
      grid: { left: 8, right: 8, bottom: 12, top: 64, containLabel: true },
      dataset: { source },
      xAxis: { type: 'category', axisLabel: { interval: 0 } },
      yAxis: [{ type: 'value', name: 'ms' }],
      animationDurationUpdate: 300,
      animationEasingUpdate: 'cubicOut' as const,
      series: seriesNames.map((label) => {
        const color =
          data.find((d) => d.series.find((s) => s.label === label))?.series.find((s) => s.label === label)?.color ||
          '#fb923c'
        return {
          type: 'bar',
          name: label,
          encode: { x: 'name', y: label },
          itemStyle: {
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              { offset: 0, color },
              { offset: 1, color: `${color}33` },
            ]),
            borderRadius: [6, 6, 2, 2],
          },
          barWidth: '45%',
          emphasis: { focus: 'series' },
        }
      }),
    }

    chart.setOption(option)
    const resize = () => chart.resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      chart.dispose()
    }
  }, [data])

  return <div ref={ref} className="h-[260px] w-full rounded-lg border border-border/70 bg-white/60" />
}

export default ResultChart
