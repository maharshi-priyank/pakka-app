import { ArrowUpRight, ChevronUp, ChevronDown, ChevronsUpDown, Trash2, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency-symbols'
import type { Invoice } from '../schemas/invoice.schema'
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../schemas/invoice.schema'

export type SortField = 'invoiceNumber' | 'total' | 'dueDate' | 'createdAt'
export type SortDir   = 'asc' | 'desc'

interface Props {
  invoices:  Invoice[]
  sortBy:    SortField
  sortDir:   SortDir
  onSort:    (field: SortField) => void
  onOpen:    (invoice: Invoice) => void
  onDelete?: (invoice: Invoice) => void
  onVoid?:   (invoice: Invoice) => void
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: SortDir }) {
  if (field !== sortBy) return <ChevronsUpDown size={11} className="text-[#D0D5DD] dark:text-[#3D4258] shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp   size={11} className="text-[#6366F1] shrink-0" />
    : <ChevronDown size={11} className="text-[#6366F1] shrink-0" />
}

const COLS: Array<{ label: string; field?: SortField; right?: boolean; cls?: string }> = [
  { label: 'Invoice',  field: 'invoiceNumber', cls: 'min-w-[180px]' },
  { label: 'Status',   cls: 'w-[110px]' },
  { label: 'Total',    field: 'total', right: true, cls: 'w-[120px]' },
  { label: 'Due',      field: 'dueDate', cls: 'w-[120px]' },
  { label: 'Contract', cls: 'max-w-[180px]' },
  { label: 'Created',  field: 'createdAt', cls: 'w-[110px]' },
  { label: '',         cls: 'w-10' },
]

export default function InvoiceTable({ invoices, sortBy, sortDir, onSort, onOpen, onDelete, onVoid }: Props) {
  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden bg-white dark:bg-[#13141A]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#EAECF0] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#1A1B23]">
              {COLS.map(col => (
                <th
                  key={col.label}
                  onClick={() => col.field && onSort(col.field)}
                  className={cn(
                    'px-4 py-2.5 text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] whitespace-nowrap',
                    col.right && 'text-right',
                    col.field && 'cursor-pointer select-none hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                    col.cls,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.field && <SortIcon field={col.field} sortBy={sortBy} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
            {invoices.map(inv => {
              const clientName = inv.contact?.name ?? inv.client?.name ?? 'No client'
              const isOverdue  = inv.status === 'OVERDUE'
              const isPaid     = inv.status === 'PAID'
              const isDraft    = inv.status === 'DRAFT'
              const isVoidable = inv.status === 'SENT' || inv.status === 'OVERDUE' || inv.status === 'PAID'

              return (
                <tr
                  key={inv.id}
                  onClick={() => onOpen(inv)}
                  className="cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors group"
                >
                  {/* Invoice # + Client */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                        avatarColor(clientName),
                      )}>
                        {clientName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] leading-tight">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate">
                          {clientName}{inv.client?.company ? ` · ${inv.client.company}` : ''}
                        </p>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span className={cn(STATUS_BADGE_CLASS[inv.status], 'text-[10.5px] whitespace-nowrap')}>
                      {STATUS_LABELS[inv.status]}
                    </span>
                  </td>

                  {/* Total */}
                  <td className="px-4 py-3 text-right">
                    <span className={cn(
                      'text-[13px] font-bold tabular-nums',
                      isPaid ? 'text-[#027A48]' : isOverdue ? 'text-[#D92D20]' : 'text-[#101828] dark:text-[#ECEEF3]',
                    )}>
                      {currencySymbol(inv.currency)}{fmt(Number(inv.total))}
                    </span>
                  </td>

                  {/* Due / Paid date */}
                  <td className="px-4 py-3">
                    {isPaid && inv.paidAt ? (
                      <span className="text-[12px] font-medium text-[#027A48]">{formatDate(inv.paidAt)}</span>
                    ) : inv.dueDate ? (
                      <span className={cn(
                        'text-[12px] font-medium',
                        isOverdue ? 'text-[#D92D20]' : 'text-[#344054] dark:text-[#C2C8D8]',
                      )}>
                        {formatDate(inv.dueDate)}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                    )}
                  </td>

                  {/* Contract */}
                  <td className="px-4 py-3">
                    {inv.contract ? (
                      <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate block max-w-[180px]">
                        {inv.contract.title}
                      </span>
                    ) : (
                      <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                    )}
                  </td>

                  {/* Created */}
                  <td className="px-4 py-3">
                    <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(inv.createdAt)}</span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                      {onVoid && isVoidable && (
                        <button
                          onClick={e => { e.stopPropagation(); onVoid(inv) }}
                          className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-orange-50 dark:hover:bg-orange-950/30 flex items-center justify-center text-[#98A2B3] hover:text-orange-500 transition-all"
                        >
                          <Ban size={11} strokeWidth={2.5} />
                        </button>
                      )}
                      {onDelete && isDraft && (
                        <button
                          onClick={e => { e.stopPropagation(); onDelete(inv) }}
                          className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center justify-center text-[#98A2B3] hover:text-red-500 transition-all"
                        >
                          <Trash2 size={11} strokeWidth={2.5} />
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); onOpen(inv) }}
                        className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center text-[#98A2B3] hover:text-[#2563EB] transition-all"
                      >
                        <ArrowUpRight size={11} strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function InvoiceTableSkeleton() {
  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden bg-white dark:bg-[#13141A]">
      <div className="border-b border-[#EAECF0] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#1A1B23] px-4 py-2.5">
        <div className="h-3 w-48 bg-[#F2F4F7] dark:bg-[#21222D] rounded animate-pulse" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] last:border-0 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-28" />
            <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
          </div>
          <div className="h-5 w-14 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
          <div className="h-3.5 w-20 bg-[#F2F4F7] dark:bg-[#21222D] rounded ml-auto" />
        </div>
      ))}
    </div>
  )
}
