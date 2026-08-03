import { useMemo, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  IndianRupee, CheckCircle2, AlertCircle, Clock, Video,
  FileText, ScrollText, Receipt, TrendingUp,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useUpdateContact } from '@/features/contacts/hooks/useContacts'
import { useContactOverview } from '@/features/contacts/hooks/useContactOverview'
import { useThemeStore } from '@/store/themeStore'
import type { Contact, ContactMeeting } from '@/features/contacts/schemas/contact.schema'

const UNPAID_STATUSES = ['SENT', 'VIEWED', 'PARTIAL', 'OVERDUE']

type RecentDocKind = 'proposal' | 'contract' | 'invoice'

interface RecentDoc {
  id:        string
  kind:      RecentDocKind
  title:     string
  status:    string
  createdAt: string
}

const KIND_LABEL: Record<RecentDocKind, string> = {
  proposal: 'Proposal',
  contract: 'Contract',
  invoice:  'Invoice',
}

const KIND_ICON: Record<RecentDocKind, React.ComponentType<{ size?: number; className?: string }>> = {
  proposal: FileText,
  contract: ScrollText,
  invoice:  Receipt,
}

const STATUS_CHIP: Record<string, string> = {
  DRAFT:    'bg-[#F2F4F7] text-[#344054] dark:bg-[#21222D] dark:text-[#C2C8D8]',
  SENT:     'bg-[#FFFAEB] text-[#B54708] dark:bg-amber-950/40 dark:text-amber-400',
  VIEWED:   'bg-[#FFFAEB] text-[#B54708] dark:bg-amber-950/40 dark:text-amber-400',
  OPENED:   'bg-[#FFFAEB] text-[#B54708] dark:bg-amber-950/40 dark:text-amber-400',
  PARTIAL:  'bg-[#FFFAEB] text-[#B54708] dark:bg-amber-950/40 dark:text-amber-400',
  OVERDUE:  'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/40 dark:text-red-400',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/40 dark:text-red-400',
  VOID:     'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/40 dark:text-red-400',
  EXPIRED:  'bg-[#FEF3F2] text-[#B42318] dark:bg-red-950/40 dark:text-red-400',
  PAID:     'bg-[#ECFDF3] text-[#027A48] dark:bg-emerald-950/40 dark:text-emerald-400',
  SIGNED:   'bg-[#ECFDF3] text-[#027A48] dark:bg-emerald-950/40 dark:text-emerald-400',
  ACCEPTED: 'bg-[#ECFDF3] text-[#027A48] dark:bg-emerald-950/40 dark:text-emerald-400',
}

function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} style={style} />
}

function StatCard({ icon: Icon, label, value }: {
  icon:  React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center">
          <Icon size={13} className="text-[#98A2B3] dark:text-[#545C74]" />
        </div>
        <p className="text-[11px] font-medium text-[#98A2B3] dark:text-[#545C74]">{label}</p>
      </div>
      <p className="text-[19px] font-bold text-[#101828] dark:text-[#ECEEF3]">{value}</p>
    </div>
  )
}

export function ContactOverviewTab({ contact, isOverdueFollowUp }: {
  contact:            Contact
  isOverdueFollowUp:  boolean
}) {
  const { data: overview, isLoading: overviewLoading } = useContactOverview(contact.id)
  const updateContact = useUpdateContact()
  const { isDark } = useThemeStore()

  const currency = contact.currency ?? 'INR'
  const invoices = useMemo(() => contact.invoices ?? [], [contact.invoices])

  const [notes, setNotes] = useState(contact.notes ?? '')

  function handleNotesBlur() {
    if (notes === (contact.notes ?? '')) return
    updateContact.mutate({ id: contact.id, notes })
  }

  const stats = useMemo(() => {
    let totalBilled = 0
    let totalPaid    = 0
    for (const inv of invoices) {
      if (inv.status === 'DRAFT' || inv.status === 'CANCELLED') continue
      totalBilled += Number(inv.total)
      totalPaid   += Number(inv.amountPaid)
    }
    return { totalBilled, totalPaid, outstanding: totalBilled - totalPaid }
  }, [invoices])

  const unpaidCount = useMemo(
    () => invoices.filter(inv => UNPAID_STATUSES.includes(inv.status)).length,
    [invoices],
  )

  const nowIso = new Date().toISOString()
  const nextMeeting: ContactMeeting | undefined = [...(contact.meetings ?? [])]
    .filter(m => m.scheduledAt > nowIso)
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))[0]

  const revenueChart = useMemo(() => {
    const months: { month: string; revenue: number }[] = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const end   = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59)
      const label = start.toLocaleString('en-IN', { month: 'short', year: '2-digit' })
      const revenue = invoices
        .filter(inv => inv.status === 'PAID' && inv.paidAt)
        .filter(inv => {
          const paidAt = new Date(inv.paidAt!)
          return paidAt >= start && paidAt <= end
        })
        .reduce((sum, inv) => sum + Number(inv.total), 0)
      months.push({ month: label, revenue })
    }
    return months
  }, [invoices])

  const recentDocs = useMemo<RecentDoc[]>(() => {
    const docs: RecentDoc[] = [
      ...(contact.proposals ?? []).map(p => ({ id: p.id, kind: 'proposal' as const, title: p.title, status: p.status, createdAt: p.createdAt })),
      ...(contact.contracts ?? []).map(c => ({ id: c.id, kind: 'contract' as const, title: c.title, status: c.status, createdAt: c.createdAt })),
      ...(contact.invoices ?? []).map(i => ({ id: i.id, kind: 'invoice' as const, title: i.invoiceNumber, status: i.status, createdAt: i.createdAt })),
    ]
    return docs.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3)
  }, [contact.proposals, contact.contracts, contact.invoices])

  const revenueCurrentIndex = revenueChart.length - 1
  const hoursCurrentIndex   = (overview?.monthlyHours.length ?? 0) - 1

  const hasUpcoming = isOverdueFollowUp || unpaidCount > 0 || !!nextMeeting

  return (
    <div className="p-4 space-y-4">

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={IndianRupee} label="Total Billed" value={formatCurrency(stats.totalBilled, currency)} />
        <StatCard icon={CheckCircle2} label="Total Paid" value={formatCurrency(stats.totalPaid, currency)} />
        <StatCard icon={AlertCircle} label="Outstanding" value={formatCurrency(stats.outstanding, currency)} />
        <StatCard
          icon={Clock}
          label="Total Hours"
          value={overviewLoading ? <Skeleton className="h-6 w-12" /> : `${overview?.totalHours ?? 0}h`}
        />
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-3">Revenue — last 6 months</p>
          {revenueChart.every(p => p.revenue === 0) ? (
            <div className="flex flex-col items-center justify-center h-[140px]">
              <TrendingUp size={26} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" />
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">No paid revenue yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={revenueChart} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: isDark ? '#545C74' : '#98A2B3', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: isDark ? '#26283A' : '#F4F5F8', radius: 6 }}
                  formatter={(value) => [formatCurrency(value as number, currency), 'Revenue']}
                  contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, color: isDark ? '#ECEEF3' : '#101828', background: isDark ? '#1A1B23' : '#fff' }}
                />
                <Bar dataKey="revenue" radius={[5, 5, 0, 0]}>
                  {revenueChart.map((_, index) => (
                    <Cell key={index} fill={index === revenueCurrentIndex ? '#6366F1' : isDark ? '#2D3367' : '#C7D2FE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-3">Hours logged — last 6 months</p>
          {overviewLoading ? (
            <div className="flex items-end gap-3 h-[140px]">
              {[50, 80, 40, 100, 70, 120].map((h, i) => (
                <Skeleton key={i} className="flex-1 rounded-md" style={{ height: `${h}px` }} />
              ))}
            </div>
          ) : overview?.monthlyHours.every(p => p.hours === 0) ? (
            <div className="flex flex-col items-center justify-center h-[140px]">
              <Clock size={26} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" />
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">No hours logged yet</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={overview?.monthlyHours ?? []} barSize={24} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <XAxis dataKey="month" tick={{ fontSize: 10.5, fill: isDark ? '#545C74' : '#98A2B3', fontWeight: 500 }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: isDark ? '#26283A' : '#F4F5F8', radius: 6 }}
                  formatter={(value) => [`${value}h`, 'Hours']}
                  contentStyle={{ border: `1px solid ${isDark ? '#3D4258' : '#EAECF0'}`, borderRadius: 10, fontSize: 12, color: isDark ? '#ECEEF3' : '#101828', background: isDark ? '#1A1B23' : '#fff' }}
                />
                <Bar dataKey="hours" radius={[5, 5, 0, 0]}>
                  {(overview?.monthlyHours ?? []).map((_, index) => (
                    <Cell key={index} fill={index === hoursCurrentIndex ? '#6366F1' : isDark ? '#2D3367' : '#C7D2FE'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Upcoming actions */}
      {hasUpcoming && (
        <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-3">Upcoming</p>
          <div className="flex flex-wrap gap-3">
            {isOverdueFollowUp && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FEF3F2] dark:bg-red-950/30 text-[#B42318] dark:text-red-400 text-[12.5px] font-medium">
                <AlertCircle size={13} />
                Follow-up overdue
              </div>
            )}
            {unpaidCount > 0 && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400 text-[12.5px] font-medium">
                <Receipt size={13} />
                {unpaidCount} unpaid invoice{unpaidCount !== 1 ? 's' : ''}
              </div>
            )}
            {nextMeeting && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/30 text-[#3538CD] dark:text-indigo-400 text-[12.5px] font-medium">
                <Video size={13} />
                {nextMeeting.title} · {formatDate(nextMeeting.scheduledAt)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notes + Recent documents */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-2">Notes</p>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            onBlur={handleNotesBlur}
            placeholder="Add notes about this contact…"
            rows={5}
            className="w-full resize-none text-[12.5px] text-[#344054] dark:text-[#C2C8D8] bg-transparent border border-[#EAECF0] dark:border-[#26283A] rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-[#6366F1] placeholder:text-[#B0B7C3] dark:placeholder:text-[#545C74]"
          />
        </div>

        <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-2">Recent documents</p>
          {recentDocs.length === 0 ? (
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] py-3 text-center">No documents yet</p>
          ) : (
            <div className="space-y-2">
              {recentDocs.map(doc => {
                const Icon = KIND_ICON[doc.kind]
                return (
                  <div key={`${doc.kind}-${doc.id}`} className="flex items-center gap-2.5">
                    <Icon size={13} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">{doc.title}</p>
                      <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74]">{KIND_LABEL[doc.kind]} · {formatDate(doc.createdAt)}</p>
                    </div>
                    <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0', STATUS_CHIP[doc.status] ?? 'bg-[#F2F4F7] text-[#344054]')}>
                      {doc.status}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
