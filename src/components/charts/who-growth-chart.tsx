'use client'

import * as React from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { getWfaBoys, getWfaGirls, getLhfaBoys, getLhfaGirls, getWfhBoys, getWfhGirls } from '@/lib/who/index'
import { formatDateIndonesian } from '@/lib/utils/date'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChartMeasurementPoint {
  date: string
  ageDays: number
  ageMonths: number
  value: number        // weight (kg) for wfa/wfh, height (cm) for lhfa
  zscore: number | null
  status: string | null
  heightCm?: number    // needed for wfh (x-axis is height)
}

export interface WhoGrowthChartProps {
  chartType: 'wfa' | 'lhfa' | 'wfh'
  sex: 'L' | 'P'
  measurements: ChartMeasurementPoint[]
}

// ─── LMS SD value helper ──────────────────────────────────────────────────────

/** Compute the measurement value at z SD units from median using LMS formula. */
function sdVal(z: number, L: number, M: number, S: number): number {
  if (L === 0) return M * Math.exp(S * z)
  const base = 1 + L * S * z
  if (base <= 0) return 0
  return M * Math.pow(base, 1 / L)
}

// ─── Reference data builders ──────────────────────────────────────────────────

interface AgeRefPoint {
  x: number           // age in months
  sd_neg3: number
  sd_neg2: number
  sd_neg1: number
  sd_0: number
  sd_pos1: number
  sd_pos2: number
  sd_pos3: number
  band_below_neg3: number   // for area fill
  band_neg3_neg2: number
  band_neg2_pos2: number
  band_pos2_pos3: number
  band_above_pos3: number
}

function buildAgeRefData(
  chartType: 'wfa' | 'lhfa',
  sex: 'L' | 'P',
): AgeRefPoint[] {
  const table =
    chartType === 'wfa'
      ? sex === 'L' ? getWfaBoys() : getWfaGirls()
      : sex === 'L' ? getLhfaBoys() : getLhfaGirls()

  const points: AgeRefPoint[] = []

  // Generate reference points at every 30-day interval: 0, 30, 60, ..., 1800 days (= 0-60 months)
  for (let day = 0; day <= 1800; day += 30) {
    const lmsRow = table[Math.min(day, table.length - 1)]
    if (!lmsRow) continue
    const { L, M, S } = lmsRow
    const ageMonths = Math.round(day / 30.4375 * 10) / 10

    const neg3 = sdVal(-3, L, M, S)
    const neg2 = sdVal(-2, L, M, S)
    const neg1 = sdVal(-1, L, M, S)
    const med  = sdVal(0,  L, M, S)
    const pos1 = sdVal(1,  L, M, S)
    const pos2 = sdVal(2,  L, M, S)
    const pos3 = sdVal(3,  L, M, S)

    points.push({
      x: ageMonths,
      sd_neg3: neg3,
      sd_neg2: neg2,
      sd_neg1: neg1,
      sd_0: med,
      sd_pos1: pos1,
      sd_pos2: pos2,
      sd_pos3: pos3,
      band_below_neg3: neg3,
      band_neg3_neg2: neg2,
      band_neg2_pos2: pos2,
      band_pos2_pos3: pos3,
      band_above_pos3: pos3 + (pos3 - pos2) * 2, // extend a little above +3
    })
  }

  return points
}

interface HeightRefPoint {
  x: number       // height in cm
  sd_neg3: number
  sd_neg2: number
  sd_neg1: number
  sd_0: number
  sd_pos1: number
  sd_pos2: number
  sd_pos3: number
  band_below_neg3: number
  band_neg3_neg2: number
  band_neg2_pos2: number
  band_pos2_pos3: number
  band_above_pos3: number
}

function buildWfhRefData(sex: 'L' | 'P'): HeightRefPoint[] {
  const table = sex === 'L' ? getWfhBoys() : getWfhGirls()
  const points: HeightRefPoint[] = []

  // Sample every 1cm (step through table indices)
  for (let i = 0; i < table.length; i += 10) {
    const row = table[i]
    if (!row) continue
    const { L, M, S, height } = row

    const neg3 = sdVal(-3, L, M, S)
    const neg2 = sdVal(-2, L, M, S)
    const neg1 = sdVal(-1, L, M, S)
    const med  = sdVal(0,  L, M, S)
    const pos1 = sdVal(1,  L, M, S)
    const pos2 = sdVal(2,  L, M, S)
    const pos3 = sdVal(3,  L, M, S)

    points.push({
      x: height,
      sd_neg3: neg3,
      sd_neg2: neg2,
      sd_neg1: neg1,
      sd_0: med,
      sd_pos1: pos1,
      sd_pos2: pos2,
      sd_pos3: pos3,
      band_below_neg3: neg3,
      band_neg3_neg2: neg2,
      band_neg2_pos2: pos2,
      band_pos2_pos3: pos3,
      band_above_pos3: pos3 + (pos3 - pos2) * 2,
    })
  }

  return points
}

// ─── Custom Tooltip ────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  gizi_buruk: 'Gizi Buruk',
  gizi_kurang: 'Gizi Kurang',
  gizi_baik: 'Gizi Baik',
  gizi_lebih: 'Gizi Lebih',
  obesitas: 'Obesitas',
  sangat_pendek: 'Sangat Pendek',
  pendek: 'Pendek',
  normal: 'Normal',
  tinggi: 'Tinggi',
}

interface TooltipPayloadItem {
  dataKey?: string
  value?: number
  payload?: Record<string, unknown>
}

function CustomTooltip({
  active,
  payload,
  chartType,
}: {
  active?: boolean
  payload?: TooltipPayloadItem[]
  chartType: 'wfa' | 'lhfa' | 'wfh'
}) {
  if (!active || !payload?.length) return null

  const childPoint = payload.find((p) => p.dataKey === 'child_value')
  if (!childPoint?.payload) return null

  const data = childPoint.payload as Record<string, unknown>

  return (
    <div className="rounded-lg border border-border bg-background p-3 shadow-md text-xs space-y-1 max-w-[180px]">
      {Boolean(data.date) && (
        <div className="font-medium text-foreground">
          {formatDateIndonesian(String(data.date))}
        </div>
      )}
      {data.ageMonths !== undefined && (
        <div className="text-muted-foreground">
          Usia: {String(Math.round(Number(data.ageMonths)))} bulan
        </div>
      )}
      {data.child_value !== undefined && (
        <div className="text-foreground">
          {chartType === 'lhfa' ? 'TB' : 'BB'}:{' '}
          <strong>
            {Number(data.child_value).toFixed(chartType === 'lhfa' ? 1 : 2)}{' '}
            {chartType === 'lhfa' ? 'cm' : 'kg'}
          </strong>
        </div>
      )}
      {data.zscore !== undefined && data.zscore !== null && (
        <div className="text-foreground">
          Z-skor: <strong>{Number(data.zscore).toFixed(2)}</strong>
        </div>
      )}
      {Boolean(data.status) && (
        <div className="text-foreground">
          Status:{' '}
          <strong>{STATUS_LABELS[String(data.status)] ?? String(data.status)}</strong>
        </div>
      )}
    </div>
  )
}

// ─── Chart axis labels ─────────────────────────────────────────────────────────

const CHART_CONFIG = {
  wfa:  { xLabel: 'Usia (bulan)', yLabel: 'Berat Badan (kg)', xDomain: [0, 60] as [number, number] },
  lhfa: { xLabel: 'Usia (bulan)', yLabel: 'Tinggi/Panjang Badan (cm)', xDomain: [0, 60] as [number, number] },
  wfh:  { xLabel: 'Tinggi Badan (cm)', yLabel: 'Berat Badan (kg)', xDomain: [45, 120] as [number, number] },
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WhoGrowthChart({ chartType, sex, measurements }: WhoGrowthChartProps) {
  // Build reference data (memoized per chart type + sex)
  const refData = React.useMemo(() => {
    if (chartType === 'wfh') return buildWfhRefData(sex)
    return buildAgeRefData(chartType, sex)
  }, [chartType, sex])

  // Build child data points merged into ref data by x-value
  const childDataMap = React.useMemo(() => {
    const map = new Map<number, { child_value: number; zscore: number | null; status: string | null; date: string; ageMonths: number }>()
    for (const m of measurements) {
      const x = chartType === 'wfh' ? (m.heightCm ?? 0) : m.ageMonths
      map.set(Math.round(x * 10) / 10, {
        child_value: m.value,
        zscore: m.zscore,
        status: m.status,
        date: m.date,
        ageMonths: m.ageMonths,
      })
    }
    return map
  }, [measurements, chartType])

  // Merge child points into refData
  const chartData = React.useMemo(() => {
    const result = refData.map((p) => {
      const child = childDataMap.get(p.x)
      return {
        ...p,
        child_value: child?.child_value,
        zscore: child?.zscore,
        status: child?.status,
        date: child?.date,
        ageMonths: child?.ageMonths ?? p.x,
      }
    })

    // Also add child points that fall between reference x values
    for (const [x, child] of childDataMap) {
      const exists = result.some((p) => Math.abs(p.x - x) < 0.05)
      if (!exists) {
        result.push({
          x,
          sd_neg3: 0, sd_neg2: 0, sd_neg1: 0, sd_0: 0,
          sd_pos1: 0, sd_pos2: 0, sd_pos3: 0,
          band_below_neg3: 0, band_neg3_neg2: 0, band_neg2_pos2: 0,
          band_pos2_pos3: 0, band_above_pos3: 0,
          child_value: child.child_value,
          zscore: child.zscore,
          status: child.status,
          date: child.date,
          ageMonths: child.ageMonths,
        })
      }
    }

    return result.sort((a, b) => a.x - b.x)
  }, [refData, childDataMap])

  const config = CHART_CONFIG[chartType]

  // Compute y-domain from data
  const yMin = React.useMemo(() => {
    const vals = chartData.map((d) => d.sd_neg3).filter((v) => v > 0)
    return vals.length ? Math.floor(Math.min(...vals) * 0.9) : 0
  }, [chartData])

  const yMax = React.useMemo(() => {
    const vals = chartData.flatMap((d) => [d.sd_pos3, d.child_value ?? 0]).filter((v) => v > 0)
    return vals.length ? Math.ceil(Math.max(...vals) * 1.05) : 30
  }, [chartData])

  return (
    <div className="w-full" style={{ height: 340 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, bottom: 24, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />

          <XAxis
            dataKey="x"
            type="number"
            domain={config.xDomain}
            tickCount={chartType === 'wfh' ? 8 : 13}
            label={{ value: config.xLabel, position: 'insideBottom', offset: -12, fontSize: 11 }}
            tick={{ fontSize: 10 }}
          />
          <YAxis
            domain={[yMin, yMax]}
            label={{ value: config.yLabel, angle: -90, position: 'insideLeft', offset: 12, fontSize: 11 }}
            tick={{ fontSize: 10 }}
            width={45}
          />

          <Tooltip
            content={
              <CustomTooltip chartType={chartType} />
            }
          />

          {/* Colored area bands (below -3) */}
          <Area
            type="monotone"
            dataKey="band_below_neg3"
            stroke="none"
            fill="#fee2e2"
            fillOpacity={0.5}
            legendType="none"
            isAnimationActive={false}
          />
          {/* -3 to -2 band */}
          <Area
            type="monotone"
            dataKey="band_neg3_neg2"
            stroke="none"
            fill="#fef9c3"
            fillOpacity={0.6}
            legendType="none"
            isAnimationActive={false}
          />
          {/* -2 to +2 (normal) band */}
          <Area
            type="monotone"
            dataKey="band_neg2_pos2"
            stroke="none"
            fill="#dcfce7"
            fillOpacity={0.5}
            legendType="none"
            isAnimationActive={false}
          />
          {/* +2 to +3 band */}
          <Area
            type="monotone"
            dataKey="band_pos2_pos3"
            stroke="none"
            fill="#fef9c3"
            fillOpacity={0.6}
            legendType="none"
            isAnimationActive={false}
          />
          {/* above +3 */}
          <Area
            type="monotone"
            dataKey="band_above_pos3"
            stroke="none"
            fill="#fee2e2"
            fillOpacity={0.5}
            legendType="none"
            isAnimationActive={false}
          />

          {/* SD reference lines */}
          <Line
            type="monotone"
            dataKey="sd_neg3"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            name="-3 SD"
            legendType="line"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="sd_neg2"
            stroke="#f97316"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            name="-2 SD"
            legendType="line"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="sd_0"
            stroke="#94a3b8"
            strokeWidth={1.5}
            strokeDasharray="5 3"
            dot={false}
            name="Median"
            legendType="line"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="sd_pos2"
            stroke="#f97316"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            name="+2 SD"
            legendType="line"
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="sd_pos3"
            stroke="#ef4444"
            strokeWidth={1}
            strokeDasharray="4 3"
            dot={false}
            name="+3 SD"
            legendType="line"
            isAnimationActive={false}
          />

          {/* Child measurement line */}
          {measurements.length > 0 && (
            <Line
              type="monotone"
              dataKey="child_value"
              stroke="#16a34a"
              strokeWidth={2}
              dot={{ fill: '#16a34a', r: 4, strokeWidth: 1, stroke: '#fff' }}
              activeDot={{ r: 6 }}
              name="Anak"
              connectNulls={false}
              isAnimationActive={false}
            />
          )}

          <Legend
            verticalAlign="top"
            height={28}
            iconSize={12}
            wrapperStyle={{ fontSize: 10 }}
          />

          {/* Zero line */}
          <ReferenceLine y={0} stroke="#e2e8f0" strokeWidth={1} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
