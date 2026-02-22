'use client'

import {
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { SKDNData } from '@/lib/analytics/skdn'

const MONTH_LABELS: Record<string, string> = {
  '01': 'Jan', '02': 'Feb', '03': 'Mar', '04': 'Apr',
  '05': 'Mei', '06': 'Jun', '07': 'Jul', '08': 'Agu',
  '09': 'Sep', '10': 'Okt', '11': 'Nov', '12': 'Des',
}

function formatBulan(bulan: string): string {
  const [, mm] = bulan.split('-')
  return MONTH_LABELS[mm] ?? bulan
}

export interface SKDNTrendChartProps {
  data: SKDNData[]
  className?: string
}

export function SKDNTrendChart({ data, className }: SKDNTrendChartProps) {
  const chartData = data.map(d => ({
    bulan: formatBulan(d.bulan),
    'D/S (%)': d.ds_pct,
    'N/D (%)': d.nd_pct,
  }))

  return (
    <div className={className} style={{ width: '100%', height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="bulan"
            tick={{ fontSize: 12, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
            labelFormatter={(label) => `Bulan: ${label}`}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <ReferenceLine
            y={80}
            stroke="#f43f5e"
            strokeDasharray="6 3"
            strokeWidth={1.5}
            label={{ value: 'Target 80%', position: 'insideTopRight', fontSize: 10, fill: '#f43f5e' }}
          />
          <Line
            type="monotone"
            dataKey="D/S (%)"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#3b82f6' }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="N/D (%)"
            stroke="#10b981"
            strokeWidth={2.5}
            dot={{ r: 4, fill: '#10b981' }}
            activeDot={{ r: 6 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
