'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

export interface PrevalenceBarItem {
  name: string
  stunting: number
  wasting: number
  underweight: number
  overweight: number
}

export interface PrevalenceBarChartProps {
  data: PrevalenceBarItem[]
  className?: string
}

function truncate(str: string, max = 12) {
  return str.length > max ? str.slice(0, max) + '…' : str
}

export function PrevalenceBarChart({ data, className }: PrevalenceBarChartProps) {
  const chartData = data.map(d => ({
    ...d,
    name: truncate(d.name),
  }))

  return (
    <div className={className} style={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 16, left: -8, bottom: 8 }} barCategoryGap="25%">
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#6b7280' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => [`${value.toFixed(1)}%`, name]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="stunting" name="Stunting" fill="#f43f5e" radius={[3, 3, 0, 0]} />
          <Bar dataKey="wasting" name="Wasting" fill="#f97316" radius={[3, 3, 0, 0]} />
          <Bar dataKey="underweight" name="Kurang Gizi" fill="#eab308" radius={[3, 3, 0, 0]} />
          <Bar dataKey="overweight" name="Lebih Gizi" fill="#3b82f6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
