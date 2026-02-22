'use client'

import { cn } from '@/lib/utils'
import { LineChart, Line, ResponsiveContainer } from 'recharts'

export interface SparklineProps {
  data: number[]
  className?: string
  height?: number
}

export function Sparkline({ data, className, height = 40 }: SparklineProps) {
  if (!data || data.length < 2) {
    return <div className={cn('flex items-center justify-center text-xs text-muted-foreground', className)}>–</div>
  }

  const improving = data[data.length - 1] >= data[0]
  const color = improving ? '#10b981' : '#f43f5e'

  const chartData = data.map((v, i) => ({ v, i }))

  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="v"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
