import { AreaChart, Area, ResponsiveContainer } from 'recharts'

interface Point { value: number }

export default function Sparkline({ data, color = '#5F259F' }: { data: Point[]; color?: string }) {
  if (data.length < 2) return null

  return (
    <div className="h-8 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="sparkline-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.25} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={1.5}
            fill="url(#sparkline-fill)"
            isAnimationActive={true}
            animationDuration={500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
