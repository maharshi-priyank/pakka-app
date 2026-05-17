import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'
import { useInvoices } from '@/features/invoices/hooks/useInvoices'
import { FileText } from 'lucide-react'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] rounded', className)} />
}

const STATUS_CONFIG = [
  { key: 'PAID',    label: 'Paid',    color: '#12B76A', bg: '#ECFDF3', text: '#027A48' },
  { key: 'SENT',    label: 'Sent',    color: '#6366F1', bg: '#EEF2FF', text: '#4338CA' },
  { key: 'OVERDUE', label: 'Overdue', color: '#F04438', bg: '#FEF3F2', text: '#B42318' },
  { key: 'DRAFT',   label: 'Draft',   color: '#D0D5DD', bg: '#F2F4F7', text: '#667085' },
]

export default function InvoiceStatusWidget() {
  const { data, isLoading } = useInvoices({ limit: 200 })
  const items = data?.items ?? []

  const chartData = STATUS_CONFIG.map(s => ({
    ...s,
    count: items.filter(i => i.status === s.key).length,
    amount: items.filter(i => i.status === s.key).reduce((sum, i) => sum + Number(i.total), 0),
  })).filter(d => d.count > 0)

  const total = items.length

  return (
    <div className="card overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828]">Invoice Status</h2>
          <p className="text-[12px] text-[#98A2B3] mt-0.5">{total} total invoice{total !== 1 ? 's' : ''}</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#FFFAEB] flex items-center justify-center">
          <FileText size={14} className="text-[#B54708]" strokeWidth={2} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-6 px-5 py-5">
          <Skeleton className="w-[120px] h-[120px] rounded-full shrink-0" />
          <div className="flex-1 space-y-2.5">
            {[1,2,3,4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
          </div>
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center py-10">
          <FileText size={28} className="text-[#D0D5DD] mb-2" />
          <p className="text-[13px] text-[#98A2B3]">No invoices yet</p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 px-5 py-4">
          {/* Donut */}
          <div className="relative shrink-0">
            <ResponsiveContainer width={120} height={120}>
              <PieChart>
                <Pie
                  data={chartData}
                  cx={55} cy={55}
                  innerRadius={36} outerRadius={54}
                  dataKey="count"
                  startAngle={90} endAngle={-270}
                  paddingAngle={2}
                >
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} strokeWidth={0} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => [value, '']}
                  contentStyle={{ border: '1px solid #EAECF0', borderRadius: 8, fontSize: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-[16px] font-extrabold text-[#101828] leading-none">{total}</p>
              <p className="text-[9px] text-[#98A2B3] mt-0.5 font-medium">TOTAL</p>
            </div>
          </div>

          {/* Legend */}
          <div className="flex-1 w-full space-y-2">
            {STATUS_CONFIG.map(s => {
              const count = items.filter(i => i.status === s.key).length
              const pct   = total > 0 ? Math.round((count / total) * 100) : 0
              return (
                <div key={s.key} className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color }} />
                  <span className="text-[12px] text-[#667085] flex-1">{s.label}</span>
                  <span className="text-[12px] font-semibold text-[#344054]">{count}</span>
                  <span className="text-[10px] text-[#98A2B3] w-8 text-right">{pct}%</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
