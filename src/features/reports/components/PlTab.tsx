import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingUp, Wallet, IndianRupee, BarChart3,
} from 'lucide-react'
import {
  ComposedChart, Area, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { useThemeStore } from '@/store/themeStore'
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
  label, value, sub, iconBg, iconColor, icon: Icon, loading,
}: {
  label: string; value: string; sub?: string
  iconBg: string; iconColor: string; icon: React.ElementType
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
        : <p className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] leading-none tracking-tight">{value}</p>
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
          value={formatCurrency(totals?.revenue ?? 0)}
          iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"
          iconColor="text-[#6366F1]"
          icon={IndianRupee}
          loading={isLoading}
        />
        <PlCard
          label="Expenses"
          value={formatCurrency(totals?.expenses ?? 0)}
          iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"
          iconColor="text-[#B54708] dark:text-amber-400"
          icon={Wallet}
          loading={isLoading}
        />
        <PlCard
          label="Gross Profit"
          value={formatCurrency(totals?.grossProfit ?? 0)}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={TrendingUp}
          loading={isLoading}
        />
        <PlCard
          label="Margin"
          value={totals?.margin !== null && totals?.margin !== undefined ? `${totals.margin.toFixed(1)}%` : '—'}
          iconBg={profitPositive ? 'bg-[#ECFDF3] dark:bg-emerald-950/40' : 'bg-[#FEF3F2] dark:bg-red-950/40'}
          iconColor={profitPositive ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400'}
          icon={BarChart3}
          loading={isLoading}
        />
      </div>

      {/* Monthly chart */}
      {!isLoading && monthly.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Monthly P&amp;L</h3>
          <ResponsiveContainer width="100%" height={200}>
            <ComposedChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="plRevGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="plExpGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#F59E0B" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={isDark ? '#26283A' : '#F2F4F7'} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v, name) => [
                  formatCurrency(v as number),
                  name === 'revenue' ? 'Revenue' : name === 'expenses' ? 'Expenses' : 'Profit',
                ]}
                contentStyle={{
                  border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`,
                  borderRadius: 10, fontSize: 12,
                  background: isDark ? '#1A1B23' : '#fff',
                  color: isDark ? '#ECEEF3' : '#101828',
                }}
              />
              <Legend
                iconType="line"
                iconSize={12}
                wrapperStyle={{ fontSize: 11, color: isDark ? '#8B92A8' : '#667085', paddingTop: 8 }}
              />
              <Area type="monotone" dataKey="revenue"  name="revenue"  stroke="#6366F1" strokeWidth={2} fill="url(#plRevGrad)" dot={false} />
              <Area type="monotone" dataKey="expenses" name="expenses" stroke="#F59E0B" strokeWidth={2} fill="url(#plExpGrad)" dot={false} />
              <Bar dataKey="grossProfit" name="profit" maxBarSize={28} radius={[4,4,0,0]}>
                {monthly.map((entry, i) => (
                  <Cell key={i} fill={entry.grossProfit >= 0 ? '#12B76A' : '#D92D20'} />
                ))}
              </Bar>
            </ComposedChart>
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
                  <td className="px-4 py-3 font-medium text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.revenue)}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.expenses > 0 ? formatCurrency(r.expenses) : <span className="text-[#D0D5DD]">—</span>}</td>
                  <td className={cn('px-4 py-3 font-medium', r.grossProfit >= 0 ? 'text-[#027A48] dark:text-[#34D399]' : 'text-[#D92D20] dark:text-red-400')}>
                    {formatCurrency(r.grossProfit)}
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
