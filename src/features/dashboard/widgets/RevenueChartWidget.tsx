import React from 'react'
import { TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { useRevenueChart } from '../hooks/useDashboard'

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} style={style} />
}

export default function RevenueChartWidget() {
  const { data: chartData, isLoading } = useRevenueChart()
  const currentMonthIndex = chartData ? chartData.length - 1 : -1

  return (
    <div className="card overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828]">Revenue Trend</h2>
          <p className="text-[12px] text-[#98A2B3] mt-0.5">Last 6 months · paid invoices only</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
          <TrendingUp size={14} className="text-[#6366F1]" strokeWidth={2} />
        </div>
      </div>
      <div className="px-4 py-5">
        {isLoading ? (
          <div className="flex items-end gap-3 h-[160px]">
            {[60, 90, 45, 120, 80, 140].map((h, i) => (
              <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}px` }} />
            ))}
          </div>
        ) : chartData?.every(p => p.revenue === 0) ? (
          <div className="flex flex-col items-center justify-center h-[160px]">
            <TrendingUp size={32} className="text-[#D0D5DD] mb-2" />
            <p className="text-[13px] text-[#98A2B3]">No revenue data yet</p>
            <p className="text-[12px] text-[#B0B7C3] mt-0.5">Mark invoices as paid to see your trend</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: '#98A2B3', fontWeight: 500 }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: '#F4F5F8', radius: 6 }}
                formatter={(value) => [formatCurrency(value as number), 'Revenue']}
                contentStyle={{ border: '1px solid #EAECF0', borderRadius: 10, fontSize: 12, color: '#101828' }}
              />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                {(chartData ?? []).map((_, index) => (
                  <Cell key={index} fill={index === currentMonthIndex ? '#6366F1' : '#C7D2FE'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
