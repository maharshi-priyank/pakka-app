import React from 'react'
import { TrendingUp } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useRevenueChart } from '../hooks/useDashboard'
import { useThemeStore } from '@/store/themeStore'
import { useCurrency } from '@/hooks/useCurrency'

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} style={style} />
}

export default function RevenueChartWidget() {
  const { data: chartData, isLoading } = useRevenueChart()
  const { isDark } = useThemeStore()
  const { format } = useCurrency()
  const currentMonthIndex = chartData ? chartData.length - 1 : -1

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Revenue Trend</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Last 6 months · paid invoices only</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#F3EAFB] dark:bg-[#3B1F5C] flex items-center justify-center">
          <TrendingUp size={14} className="text-[#5F259F] dark:text-[#D8B9F5]" strokeWidth={2} />
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
            <TrendingUp size={32} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" />
            <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No revenue data yet</p>
            <p className="text-[12px] text-[#B0B7C3] dark:text-[#545C74] mt-0.5">Mark invoices as paid to see your trend</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData} barSize={28} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3', fontWeight: 500 }}
                axisLine={false} tickLine={false}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: isDark ? '#26283A' : '#F4F5F8', radius: 6 }}
                formatter={(value) => [format(value as number), 'Revenue']}
                contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, color: isDark ? '#ECEEF3' : '#101828', background: isDark ? '#1A1B23' : '#fff' }}
              />
              <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                {(chartData ?? []).map((_, index) => (
                  <Cell key={index} fill={index === currentMonthIndex ? '#5F259F' : isDark ? '#3B1F5C' : '#DDBEF0'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
