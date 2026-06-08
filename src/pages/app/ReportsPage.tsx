import { useState } from 'react'
import {
  BarChart3, Download, TrendingUp, IndianRupee, Users,
  Wallet, Clock, FileText, Info,
} from 'lucide-react'
import DropdownSelect from '@/components/ui/DropdownSelect'
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { cn, formatCurrency } from '@/lib/utils'
import { exportCsv } from '@/lib/exportCsv'
import { useThemeStore } from '@/store/themeStore'
import {
  useRevenueReport, useGstReport, useClientReport,
  useExpenseReport, useTimeReport,
} from '@/features/reports/hooks/useReports'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab    = 'revenue' | 'gst' | 'clients' | 'expenses' | 'time'
type Preset = 'this_month' | 'last_month' | 'this_quarter' | 'last_quarter' | 'this_fy' | 'last_fy' | 'custom'

interface DateRange { from: string; to: string }

// ─── Date helpers ─────────────────────────────────────────────────────────────

function pad(n: number) { return String(n).padStart(2, '0') }
function iso(d: Date)   { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }

function fyBounds(offset = 0): DateRange {
  const now      = new Date()
  const fyMonth  = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
  const startYear = fyMonth - offset
  return {
    from: `${startYear}-04-01`,
    to:   `${startYear + 1}-03-31`,
  }
}

function presetRange(preset: Preset): DateRange {
  const now   = new Date()
  const y     = now.getFullYear()
  const m     = now.getMonth()

  if (preset === 'this_month') {
    return { from: iso(new Date(y, m, 1)), to: iso(new Date(y, m + 1, 0)) }
  }
  if (preset === 'last_month') {
    return { from: iso(new Date(y, m - 1, 1)), to: iso(new Date(y, m, 0)) }
  }
  if (preset === 'this_quarter') {
    const qStart = Math.floor(m / 3) * 3
    return { from: iso(new Date(y, qStart, 1)), to: iso(new Date(y, qStart + 3, 0)) }
  }
  if (preset === 'last_quarter') {
    const qStart = (Math.floor(m / 3) - 1) * 3
    const qYear  = qStart < 0 ? y - 1 : y
    const qMo    = ((qStart % 12) + 12) % 12
    return { from: iso(new Date(qYear, qMo, 1)), to: iso(new Date(qYear, qMo + 3, 0)) }
  }
  if (preset === 'this_fy')  return fyBounds(0)
  if (preset === 'last_fy')  return fyBounds(1)
  return fyBounds(0)
}

const PRESET_LABELS: Record<Preset, string> = {
  this_month:   'This Month',
  last_month:   'Last Month',
  this_quarter: 'This Quarter',
  last_quarter: 'Last Quarter',
  this_fy:      'This FY',
  last_fy:      'Last FY',
  custom:       'Custom',
}

// ─── Shared components ────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function StatCard({
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
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full" />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

function EmptyState({ message, sub }: { message: string; sub: string }) {
  return (
    <tr>
      <td colSpan={99}>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F4F5F8] dark:bg-[#21222D] flex items-center justify-center mb-3">
            <BarChart3 size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{message}</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">{sub}</p>
        </div>
      </td>
    </tr>
  )
}

// ─── Tab panels ───────────────────────────────────────────────────────────────

function RevenueTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useRevenueReport(range)
  const { isDark } = useThemeStore()

  const rows   = data?.rows   ?? []
  const totals = data?.totals

  const collectionRate = totals && totals.invoiced > 0
    ? Math.round((totals.collected / totals.invoiced) * 100)
    : 0

  function handleExport() {
    exportCsv(
      `revenue-report-${range.from}-${range.to}.csv`,
      ['Period', 'Invoiced (₹)', 'Collected (₹)', 'Outstanding (₹)', '# Invoices'],
      rows.map(r => [r.period, r.invoiced, r.collected, r.outstanding, r.invoiceCount]),
    )
  }

  return (
    <>
      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Invoiced"   value={formatCurrency(totals?.invoiced    ?? 0)} iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"          iconColor="text-[#6366F1]"                          icon={IndianRupee} loading={isLoading} />
        <StatCard label="Total Collected"  value={formatCurrency(totals?.collected   ?? 0)} iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40"      iconColor="text-[#027A48] dark:text-[#34D399]"      icon={TrendingUp}  loading={isLoading} />
        <StatCard label="Outstanding"      value={formatCurrency(totals?.outstanding ?? 0)} iconBg="bg-[#FEF3F2] dark:bg-red-950/40"          iconColor="text-[#D92D20] dark:text-red-400"        icon={FileText}    loading={isLoading} />
        <StatCard label="Collection Rate"  value={`${collectionRate}%`}                     iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"         iconColor="text-[#B54708] dark:text-amber-400"      icon={BarChart3}   loading={isLoading} sub={totals ? `${totals.invoiceCount} invoices` : undefined} />
      </div>

      {/* Chart */}
      {!isLoading && rows.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Monthly Trend</h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="invoicedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="collectedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#12B76A" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#12B76A" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={isDark ? '#26283A' : '#F2F4F7'} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v, name) => [formatCurrency(v as number), name === 'invoiced' ? 'Invoiced' : 'Collected']}
                contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, background: isDark ? '#1A1B23' : '#fff', color: isDark ? '#ECEEF3' : '#101828' }}
              />
              <Area type="monotone" dataKey="invoiced"  stroke="#6366F1" strokeWidth={2} fill="url(#invoicedGrad)"  dot={false} />
              <Area type="monotone" dataKey="collected" stroke="#12B76A" strokeWidth={2} fill="url(#collectedGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-2">
            <span className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#8B92A8]"><span className="w-3 h-0.5 bg-[#6366F1] rounded" /> Invoiced</span>
            <span className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#8B92A8]"><span className="w-3 h-0.5 bg-[#12B76A] rounded" /> Collected</span>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="glass-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Monthly Breakdown</h3>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            <Download size={13} strokeWidth={2.5} /> Export CSV
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
              {['Period', 'Invoiced', 'Collected', 'Outstanding', '# Invoices'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton cols={5} />}
            {!isLoading && rows.length === 0 && (
              <EmptyState message="No invoice data" sub="Create and send invoices to see revenue here" />
            )}
            {rows.map(r => (
              <tr key={r.period} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#344054] dark:text-[#C2C8D8]">{r.period}</td>
                <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.invoiced)}</td>
                <td className="px-4 py-3 text-[#027A48] dark:text-[#34D399] font-medium">{formatCurrency(r.collected)}</td>
                <td className="px-4 py-3 text-[#D92D20] dark:text-red-400">{formatCurrency(r.outstanding)}</td>
                <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.invoiceCount}</td>
              </tr>
            ))}
            {totals && rows.length > 0 && (
              <tr className="bg-[#F8FAFC] dark:bg-[#1E1F2A] font-bold">
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">Total</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.invoiced)}</td>
                <td className="px-4 py-3 text-[#027A48] dark:text-[#34D399]">{formatCurrency(totals.collected)}</td>
                <td className="px-4 py-3 text-[#D92D20] dark:text-red-400">{formatCurrency(totals.outstanding)}</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{totals.invoiceCount}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function GstTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useGstReport(range)

  const rows   = data?.rows   ?? []
  const totals = data?.totals

  function handleExport() {
    exportCsv(
      `gst-report-${range.from}-${range.to}.csv`,
      ['Period', 'Taxable Value (₹)', 'IGST (₹)', 'CGST (₹)', 'SGST (₹)', 'TDS (₹)', 'Total Tax (₹)', '# Invoices'],
      rows.map(r => [r.period, r.taxableValue, r.igst, r.cgst, r.sgst, r.tds, r.totalTax, r.invoiceCount]),
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Taxable Value"  value={formatCurrency(totals?.taxableValue ?? 0)} iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"      iconColor="text-[#6366F1]"                     icon={IndianRupee} loading={isLoading} />
        <StatCard label="IGST Collected" value={formatCurrency(totals?.igst         ?? 0)} iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"   iconColor="text-[#B54708] dark:text-amber-400" icon={IndianRupee} loading={isLoading} />
        <StatCard label="CGST + SGST"    value={formatCurrency((totals?.cgst ?? 0) + (totals?.sgst ?? 0))} iconBg="bg-[#F4F3FF] dark:bg-violet-950/40" iconColor="text-[#5925DC] dark:text-[#A78BFA]" icon={IndianRupee} loading={isLoading} sub={totals ? `CGST ${formatCurrency(totals.cgst)} · SGST ${formatCurrency(totals.sgst)}` : undefined} />
        <StatCard label="TDS Deducted"   value={formatCurrency(totals?.tds          ?? 0)} iconBg="bg-[#FEF3F2] dark:bg-red-950/40"     iconColor="text-[#D92D20] dark:text-red-400"  icon={IndianRupee} loading={isLoading} />
      </div>

      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#F8FAFC] dark:bg-[#1E1F2A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl">
        <Info size={13} className="text-[#667085] shrink-0" strokeWidth={2} />
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">GST shown for all raised invoices in period (accrual basis). Exempt invoices have zero GST.</p>
      </div>

      <div className="glass-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">GST Summary by Month</h3>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            <Download size={13} strokeWidth={2.5} /> Export CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px] min-w-[700px]">
            <thead>
              <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
                {['Period', 'Taxable Value', 'IGST', 'CGST', 'SGST', 'TDS', 'Total Tax', '# Inv'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading && <TableSkeleton cols={8} />}
              {!isLoading && rows.length === 0 && (
                <EmptyState message="No GST data" sub="Send invoices with GST type set to see data here" />
              )}
              {rows.map(r => (
                <tr key={r.period} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#344054] dark:text-[#C2C8D8]">{r.period}</td>
                  <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.taxableValue)}</td>
                  <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{r.igst > 0 ? formatCurrency(r.igst) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{r.cgst > 0 ? formatCurrency(r.cgst) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{r.sgst > 0 ? formatCurrency(r.sgst) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className="px-4 py-3 text-[#D92D20] dark:text-red-400">{r.tds > 0 ? formatCurrency(r.tds) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className="px-4 py-3 font-medium text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.totalTax)}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.invoiceCount}</td>
                </tr>
              ))}
              {totals && rows.length > 0 && (
                <tr className="bg-[#F8FAFC] dark:bg-[#1E1F2A] font-bold">
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">Total</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.taxableValue)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.igst)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.cgst)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.sgst)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.tds)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.totalTax)}</td>
                  <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{totals.invoiceCount}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

function ClientsTab({ range }: { range: DateRange }) {
  const { data: rows = [], isLoading } = useClientReport(range)

  const maxInvoiced = Math.max(...rows.map(r => r.invoiced), 1)
  const totalInvoiced    = rows.reduce((s, r) => s + r.invoiced, 0)
  const totalOutstanding = rows.reduce((s, r) => s + r.outstanding, 0)
  const topClient        = rows[0]

  function handleExport() {
    exportCsv(
      `client-report-${range.from}-${range.to}.csv`,
      ['Client', 'Invoiced (₹)', 'Collected (₹)', 'Outstanding (₹)', '# Invoices'],
      rows.map(r => [r.clientName, r.invoiced, r.collected, r.outstanding, r.invoiceCount]),
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Clients with Invoices" value={String(rows.length)} iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"     iconColor="text-[#6366F1]"                     icon={Users}       loading={isLoading} />
        <StatCard label="Top Client"             value={topClient?.clientName ?? '—'}  iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40" iconColor="text-[#027A48] dark:text-[#34D399]" icon={TrendingUp}  loading={isLoading} sub={topClient ? formatCurrency(topClient.invoiced) : undefined} />
        <StatCard label="Total Invoiced"         value={formatCurrency(totalInvoiced)}    iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"   iconColor="text-[#B54708] dark:text-amber-400" icon={IndianRupee} loading={isLoading} />
        <StatCard label="Total Outstanding"      value={formatCurrency(totalOutstanding)} iconBg="bg-[#FEF3F2] dark:bg-red-950/40"     iconColor="text-[#D92D20] dark:text-red-400"  icon={FileText}    loading={isLoading} />
      </div>

      <div className="glass-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Revenue by Client</h3>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            <Download size={13} strokeWidth={2.5} /> Export CSV
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
              {['Client', 'Invoiced', 'Collected', 'Outstanding', '# Invoices'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton cols={5} />}
            {!isLoading && rows.length === 0 && (
              <EmptyState message="No client data" sub="Invoice your clients to see their revenue breakdown here" />
            )}
            {rows.map(r => (
              <tr key={r.clientId ?? 'none'} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                <td className="px-4 py-3">
                  <div>
                    <p className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{r.clientName}</p>
                    <div className="mt-1 h-1 w-full bg-[#F2F4F7] dark:bg-[#26283A] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6366F1] rounded-full transition-all"
                        style={{ width: `${(r.invoiced / maxInvoiced) * 100}%` }}
                      />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.invoiced)}</td>
                <td className="px-4 py-3 text-[#027A48] dark:text-[#34D399] font-medium">{formatCurrency(r.collected)}</td>
                <td className="px-4 py-3 text-[#D92D20] dark:text-red-400">{r.outstanding > 0 ? formatCurrency(r.outstanding) : <span className="text-[#98A2B3]">—</span>}</td>
                <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.invoiceCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ExpensesTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useExpenseReport(range)
  const { isDark } = useThemeStore()

  const byCategory = data?.byCategory ?? []
  const monthly    = data?.monthly    ?? []
  const totals     = data?.totals

  function handleExport() {
    exportCsv(
      `expense-report-${range.from}-${range.to}.csv`,
      ['Category', 'Count', 'Total (₹)', 'Billable (₹)', 'Non-Billable (₹)'],
      byCategory.map(r => [r.category, r.count, r.total, r.billable, r.nonBillable]),
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Spent"     value={formatCurrency(totals?.total        ?? 0)} iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"      iconColor="text-[#6366F1]"                     icon={Wallet}   loading={isLoading} sub={totals ? `${totals.count} expenses` : undefined} />
        <StatCard label="Billable"        value={formatCurrency(totals?.billable     ?? 0)} iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40" iconColor="text-[#027A48] dark:text-[#34D399]" icon={IndianRupee} loading={isLoading} />
        <StatCard label="Non-Billable"    value={formatCurrency(totals?.nonBillable  ?? 0)} iconBg="bg-[#FEF3F2] dark:bg-red-950/40"     iconColor="text-[#D92D20] dark:text-red-400"  icon={IndianRupee} loading={isLoading} />
        <StatCard label="Categories"      value={String(byCategory.length)}                 iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"    iconColor="text-[#B54708] dark:text-amber-400" icon={BarChart3} loading={isLoading} />
      </div>

      {!isLoading && byCategory.length > 0 && (
        <div className="card-glass p-5">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Spend by Category</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={byCategory} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={isDark ? '#26283A' : '#F2F4F7'} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [formatCurrency(v as number), 'Total']}
                contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, background: isDark ? '#1A1B23' : '#fff', color: isDark ? '#ECEEF3' : '#101828' }}
              />
              <Bar dataKey="total" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
          {monthly.length > 0 && (
            <>
              <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4 mt-6">Monthly Spend</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [formatCurrency(v as number), 'Expenses']}
                    contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, background: isDark ? '#1A1B23' : '#fff', color: isDark ? '#ECEEF3' : '#101828' }}
                  />
                  <Bar dataKey="value" fill="#C7D2FE" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      <div className="glass-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">By Category</h3>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            <Download size={13} strokeWidth={2.5} /> Export CSV
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
              {['Category', 'Count', 'Total', 'Billable', 'Non-Billable', '% of Total'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton cols={6} />}
            {!isLoading && byCategory.length === 0 && (
              <EmptyState message="No expenses logged" sub="Log your first expense to see a breakdown here" />
            )}
            {byCategory.map(r => {
              const pct = totals && totals.total > 0 ? Math.round((r.total / totals.total) * 100) : 0
              return (
                <tr key={r.category} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                  <td className="px-4 py-3 font-semibold text-[#344054] dark:text-[#C2C8D8]">{r.category}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.count}</td>
                  <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(r.total)}</td>
                  <td className="px-4 py-3 text-[#027A48] dark:text-[#34D399]">{formatCurrency(r.billable)}</td>
                  <td className="px-4 py-3 text-[#667085] dark:text-[#8B92A8]">{r.nonBillable > 0 ? formatCurrency(r.nonBillable) : <span className="text-[#98A2B3]">—</span>}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-[#F2F4F7] dark:bg-[#26283A] rounded-full overflow-hidden">
                        <div className="h-full bg-[#6366F1] rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-[11px] text-[#667085] dark:text-[#8B92A8] w-7 text-right">{pct}%</span>
                    </div>
                  </td>
                </tr>
              )
            })}
            {totals && byCategory.length > 0 && (
              <tr className="bg-[#F8FAFC] dark:bg-[#1E1F2A] font-bold">
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">Total</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{totals.count}</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.total)}</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.billable)}</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.nonBillable)}</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">100%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

function TimeTab({ range }: { range: DateRange }) {
  const { data, isLoading } = useTimeReport(range)
  const { isDark } = useThemeStore()

  const byClient = data?.byClient ?? []
  const monthly  = data?.monthly  ?? []
  const totals   = data?.totals

  const totalHours   = totals ? (totals.totalMins / 60).toFixed(1) : '0'
  const billedHours  = totals ? (totals.billedMins / 60).toFixed(1) : '0'
  const unbilledHours = totals ? (totals.unbilledMins / 60).toFixed(1) : '0'

  function handleExport() {
    exportCsv(
      `time-report-${range.from}-${range.to}.csv`,
      ['Client', 'Total Hours', 'Billed Mins', 'Unbilled Mins', 'Billable Value (₹)'],
      byClient.map(r => [r.clientName, r.totalHours, r.billedMins, r.unbilledMins, r.billableValue]),
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Hours"    value={`${totalHours}h`}    iconBg="bg-[#EEF2FF] dark:bg-[#1E2040]"      iconColor="text-[#6366F1]"                     icon={Clock}       loading={isLoading} />
        <StatCard label="Billable Value" value={formatCurrency(totals?.billableValue ?? 0)} iconBg="bg-[#ECFDF3] dark:bg-emerald-950/40" iconColor="text-[#027A48] dark:text-[#34D399]" icon={IndianRupee} loading={isLoading} />
        <StatCard label="Billed Hours"   value={`${billedHours}h`}   iconBg="bg-[#FFFAEB] dark:bg-amber-950/30"   iconColor="text-[#B54708] dark:text-amber-400" icon={Clock}       loading={isLoading} />
        <StatCard label="Unbilled Hours" value={`${unbilledHours}h`} iconBg="bg-[#FEF3F2] dark:bg-red-950/40"     iconColor="text-[#D92D20] dark:text-red-400"   icon={Clock}       loading={isLoading} />
      </div>

      {!isLoading && (byClient.length > 0 || monthly.length > 0) && (
        <div className="card-glass p-5">
          {byClient.length > 0 && (
            <>
              <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">Hours by Client</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={byClient} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={isDark ? '#26283A' : '#F2F4F7'} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="clientName" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`${v}h`, 'Total Hours']}
                    contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, background: isDark ? '#1A1B23' : '#fff', color: isDark ? '#ECEEF3' : '#101828' }}
                  />
                  <Bar dataKey="totalHours" fill="#6366F1" radius={[5, 5, 0, 0]} maxBarSize={48} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
          {monthly.length > 0 && (
            <>
              <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4 mt-6">Monthly Hours</h3>
              <ResponsiveContainer width="100%" height={140}>
                <BarChart data={monthly} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <XAxis dataKey="period" tick={{ fontSize: 11, fill: isDark ? '#545C74' : '#98A2B3' }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    formatter={(v) => [`${v}h`, 'Hours']}
                    contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, background: isDark ? '#1A1B23' : '#fff', color: isDark ? '#ECEEF3' : '#101828' }}
                  />
                  <Bar dataKey="value" fill="#C7D2FE" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </>
          )}
        </div>
      )}

      <div className="glass-table">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <h3 className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">By Client</h3>
          <button onClick={handleExport} className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors">
            <Download size={13} strokeWidth={2.5} /> Export CSV
          </button>
        </div>
        <table className="w-full text-[13px]">
          <thead>
            <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
              {['Client', 'Total Hours', 'Billed', 'Unbilled', 'Billable Value'].map(h => (
                <th key={h} className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wide font-semibold text-[#98A2B3] dark:text-[#545C74]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && <TableSkeleton cols={5} />}
            {!isLoading && byClient.length === 0 && (
              <EmptyState message="No time entries" sub="Log your first time entry to see a breakdown here" />
            )}
            {byClient.map(r => (
              <tr key={r.clientId ?? 'none'} className="border-b border-[#F2F4F7] dark:border-[#26283A] hover:bg-[#F8FAFC] dark:hover:bg-[#1E1F2A] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#344054] dark:text-[#C2C8D8]">{r.clientName}</td>
                <td className="px-4 py-3 font-medium text-[#344054] dark:text-[#C2C8D8]">{r.totalHours}h</td>
                <td className="px-4 py-3 text-[#027A48] dark:text-[#34D399]">{(r.billedMins / 60).toFixed(1)}h</td>
                <td className="px-4 py-3 text-[#D92D20] dark:text-red-400">{r.unbilledMins > 0 ? `${(r.unbilledMins / 60).toFixed(1)}h` : <span className="text-[#98A2B3]">—</span>}</td>
                <td className="px-4 py-3 text-[#344054] dark:text-[#C2C8D8]">{r.billableValue > 0 ? formatCurrency(r.billableValue) : <span className="text-[#98A2B3]">—</span>}</td>
              </tr>
            ))}
            {totals && byClient.length > 0 && (
              <tr className="bg-[#F8FAFC] dark:bg-[#1E1F2A] font-bold">
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">Total</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{totalHours}h</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{billedHours}h</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{unbilledHours}h</td>
                <td className="px-4 py-3 text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(totals.billableValue)}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string; icon: React.ElementType }[] = [
  { key: 'revenue',  label: 'Revenue',  icon: TrendingUp  },
  { key: 'gst',      label: 'GST',      icon: IndianRupee },
  { key: 'clients',  label: 'Clients',  icon: Users       },
  { key: 'expenses', label: 'Expenses', icon: Wallet      },
  { key: 'time',     label: 'Time',     icon: Clock       },
]

const PRESETS: Preset[] = ['this_month', 'last_month', 'this_quarter', 'last_quarter', 'this_fy', 'last_fy', 'custom']

export default function ReportsPage() {
  const [tab,    setTab]    = useState<Tab>('revenue')
  const [preset, setPreset] = useState<Preset>('this_fy')
  const [custom, setCustom] = useState<DateRange>(() => fyBounds(0))

  const range: DateRange = preset === 'custom' ? custom : presetRange(preset)

  function handlePresetChange(p: Preset) {
    setPreset(p)
    if (p !== 'custom') setCustom(presetRange(p))
  }

  return (
    <div className="space-y-5 max-w-[1100px]">

      {/* ── Header ── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Reports</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Financial summaries, GST data, and client analytics</p>
        </div>
      </div>

      {/* ── Tabs + period controls ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#F4F5F8] dark:bg-[#21222D] p-1 rounded-xl">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-[12.5px] font-semibold transition-all',
                  tab === t.key
                    ? 'bg-white dark:bg-[#1A1B23] text-[#101828] dark:text-[#ECEEF3] shadow-sm'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                <Icon size={13} strokeWidth={2} /><span className="hidden sm:inline">{t.label}</span>
              </button>
            )
          })}
        </div>

        {/* Period controls */}
        <div className="flex items-center gap-2">
          <DropdownSelect
            value={preset}
            onChange={v => handlePresetChange(v as Preset)}
            options={PRESETS.map(p => ({ value: p, label: PRESET_LABELS[p] }))}
          />
          {preset === 'custom' && (
            <>
              <input
                type="date"
                value={custom.from}
                onChange={e => setCustom(prev => ({ ...prev, from: e.target.value }))}
                className="form-input text-[12px] py-1.5 h-8 w-[130px]"
              />
              <span className="text-[12px] text-[#98A2B3]">—</span>
              <input
                type="date"
                value={custom.to}
                onChange={e => setCustom(prev => ({ ...prev, to: e.target.value }))}
                className="form-input text-[12px] py-1.5 h-8 w-[130px]"
              />
            </>
          )}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="space-y-5">
        {tab === 'revenue'  && <RevenueTab  range={range} />}
        {tab === 'gst'      && <GstTab      range={range} />}
        {tab === 'clients'  && <ClientsTab  range={range} />}
        {tab === 'expenses' && <ExpensesTab range={range} />}
        {tab === 'time'     && <TimeTab     range={range} />}
      </div>

    </div>
  )
}
