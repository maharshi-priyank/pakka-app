import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Wallet, IndianRupee, BarChart3,
} from 'lucide-react'
import {
  BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
import { useCurrency } from '@/hooks/useCurrency'
import {
  usePlReport,
  type DateRange,
  type PlBasis,
} from '@/features/reports/hooks/useReports'

// ─── Shared primitives ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function PlCard({
  label, value, sub, iconBg, iconColor, valueColor, icon: Icon, loading,
}: {
  label: string; value: string; sub?: string
  iconBg: string; iconColor: string; valueColor?: string; icon: React.ElementType
  loading?: boolean
}) {
  return (
    <div className="card-glass p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', iconBg)}>
          <Icon size={16} className={iconColor} strokeWidth={2} />
        </div>
      </div>
      {loading
        ? <Skeleton className="h-7 w-24 mb-1" />
        : <p className={cn('text-[22px] font-extrabold leading-none tracking-tight tabular-nums', valueColor ?? 'text-[#101828] dark:text-[#ECEEF3]')}>{value}</p>
      }
      <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] font-medium mt-2">{label}</p>
      {sub && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{sub}</p>}
    </div>
  )
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <>
      {[1,2,3,4,5].map(i => (
        <tr key={i} className="border-b border-[#F2F4F7] dark:border-[#26283A]">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
          ))}
        </tr>
      ))}
    </>
  )
}

function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) return <span className="text-[#98A2B3]">—</span>
  const cls = margin >= 50
    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
    : margin >= 20
    ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400'
    : 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
  return (
    <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', cls)}>
      {margin.toFixed(1)}%
    </span>
  )
}

// ─── Basis toggle ──────────────────────────────────────────────────────────────

function BasisToggle({ basis, onChange }: { basis: PlBasis; onChange: (b: PlBasis) => void }) {
  return (
    <div className="flex items-center bg-[#F3F4F6] dark:bg-[#21222D] rounded-full p-0.5">
      {(['accrual', 'cash'] as PlBasis[]).map(b => (
        <button
          key={b}
          onClick={() => onChange(b)}
          className={cn(
            'px-3 py-1 rounded-full text-[11px] font-semibold transition-all capitalize',
            basis === b
              ? 'bg-white dark:bg-[#2D2E3D] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
              : 'text-[#6B7280] dark:text-[#8B92A8] hover:text-[#344054]',
          )}
        >
          {b}
        </button>
      ))}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PlTab({ range }: { range: DateRange }) {
  const [basis, setBasis] = useState<PlBasis>('accrual')
  const { data, isLoading } = usePlReport(range, basis)
  const { isDark } = useThemeStore()
  const { format } = useCurrency()

  const totals    = data?.totals
  const monthly   = data?.monthly   ?? []
  const byProject = data?.byProject ?? []

  const profitValue    = totals?.grossProfit ?? 0
  const profitPositive = profitValue >= 0

  return (
    <>
      {/* Basis toggle */}
      <div className="flex items-center justify-between">
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
          {basis === 'accrual'
            ? 'Revenue = invoiced ex-GST (excluding Draft & Cancelled)'
            : 'Revenue = payments collected'}
        </p>
        <BasisToggle basis={basis} onChange={setBasis} />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <PlCard
          label="Revenue"
          value={format(totals?.revenue ?? 0)}
          iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"
          iconColor="text-[#6366F1]"
          icon={IndianRupee}
          loading={isLoading}
        />
        <PlCard
          label="Expenses"
          value={format(totals?.expenses ?? 0)}
          iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"
          iconColor="text-[#B54708] dark:text-amber-400"
          icon={Wallet}
          loading={isLoading}
        />
        <PlCard
          label="Gross Profit"
          value={format(totals?.grossProfit ?? 0)}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          valueColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={profitPositive ? TrendingUp : TrendingDown}
          loading={isLoading}
        />
        <PlCard
          label="Margin"
          value={totals?.margin !== null && totals?.margin !== undefined ? `${totals.margin.toFixed(1)}%` : '—'}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          valueColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={BarChart3}
          loading={isLoading}
        />
      </div>

      {/* Monthly chart */}
      {!isLoading && monthly.length > 0 && (
        <div className="card-glass p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Monthly P&amp;L</h3>
            <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Bar height = Revenue</span>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={monthly} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="55%">
              <CartesianGrid stroke={isDark ? '#26283A' : '#EAECF0'} strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }}
                axisLine={false}
                tickLine={false}
                dy={4}
              />
              <YAxis hide />
              <Tooltip
                cursor={{ fill: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)', radius: 6 }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null
                  const d = payload[0]?.payload
                  const tip_margin = d.revenue > 0 ? ((d.grossProfit / d.revenue) * 100).toFixed(1) : '0.0'
                  return (
                    <div style={{
                      border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`,
                      borderRadius: 10, fontSize: 12, padding: '10px 14px',
                      background: isDark ? '#1A1B23' : '#fff',
                      color: isDark ? '#ECEEF3' : '#101828',
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
                      minWidth: 160,
                    }}>
                      <p style={{ fontWeight: 700, marginBottom: 6, color: isDark ? '#C2C8D8' : '#344054' }}>{label}</p>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                        <span style={{ color: isDark ? '#8B92A8' : '#667085' }}>Revenue</span>
                        <span style={{ fontWeight: 600 }}>{format(d.revenue)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                        <span style={{ color: '#B54708' }}>Expenses</span>
                        <span style={{ fontWeight: 600, color: '#B54708' }}>{format(d.expenses)}</span>
                      </div>
                      <div style={{ borderTop: `1px dashed ${isDark ? '#3D4258' : '#E4E7EC'}`, margin: '6px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 2 }}>
                        <span style={{ color: d.grossProfit >= 0 ? '#027A48' : '#D92D20' }}>Gross Profit</span>
                        <span style={{ fontWeight: 700, color: d.grossProfit >= 0 ? '#027A48' : '#D92D20' }}>{format(d.grossProfit)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
                        <span style={{ color: isDark ? '#8B92A8' : '#98A2B3' }}>Margin</span>
                        <span style={{ fontWeight: 600, color: isDark ? '#8B92A8' : '#667085' }}>{tip_margin}%</span>
                      </div>
                    </div>
                  )
                }}
              />
              <Legend
                iconType="square"
                iconSize={9}
                wrapperStyle={{ fontSize: 11, color: isDark ? '#8B92A8' : '#667085', paddingTop: 12 }}
                formatter={(value) => value === 'expenses' ? 'Expenses' : 'Gross Profit'}
              />
              {/* Stacked: expenses bottom (amber) + grossProfit top (green/red) = Revenue height */}
              <Bar dataKey="expenses" name="expenses" stackId="pl" maxBarSize={48} radius={[0, 0, 4, 4]} fill="#F59E0B" fillOpacity={0.85} />
              <Bar dataKey="grossProfit" name="grossProfit" stackId="pl" maxBarSize={48} radius={[4, 4, 0, 0]} fill="#12B76A" fillOpacity={0.9}>
                {monthly.map((entry, i) => (
                  <Cell key={`cell-${i}`} fill={entry.grossProfit >= 0 ? '#12B76A' : '#D92D20'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Project breakdown table */}
      <div className="glass-table">
        <div className="px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">By Project</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[600px]">
            <thead>
              <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
                {['Project', 'Client', 'Revenue', 'Expenses', 'Profit', 'Margin'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton cols={6} />}
              {!isLoading && byProject.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-2xl bg-[#F4F5F8] dark:bg-[#21222D] flex items-center justify-center mb-3">
                        <BarChart3 size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
                      </div>
                      <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No projects in this period</p>
                      <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Log expenses or raise invoices linked to a project to see P&amp;L here</p>
                    </div>
                  </td>
                </tr>
              )}
              {byProject.map(r => (
                <tr key={r.projectId} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                  <td className="px-4 py-3">
                    <Link to={`/app/projects/${r.projectId}`} className="font-semibold text-[#344054] dark:text-[#C2C8D8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors">
                      {r.projectName}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.clientName ?? <span className="text-[#D0D5DD]">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-[#344054] dark:text-[#C2C8D8]">{format(r.revenue)}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.expenses > 0 ? format(r.expenses) : <span className="text-[#D0D5DD]">—</span>}</td>
                  <td className={cn('px-4 py-3 font-medium', r.grossProfit >= 0 ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400')}>
                    {format(r.grossProfit)}
                  </td>
                  <td className="px-4 py-3"><MarginBadge margin={r.margin} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
