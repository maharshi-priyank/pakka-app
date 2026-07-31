import { ArrowUpRight, IndianRupee, CheckCircle2, Clock, AlertCircle, Trash2, Ban } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency-symbols'
import type { Invoice } from '../schemas/invoice.schema'
import { STATUS_LABELS, STATUS_BADGE_CLASS } from '../schemas/invoice.schema'

interface Props {
  invoice:   Invoice
  onClick:   (invoice: Invoice) => void
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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

export default function InvoiceCard({ invoice, onClick, onDelete, onVoid }: Props) {
  const symbol     = currencySymbol(invoice.currency)
  const clientName = invoice.contact?.name ?? invoice.client?.name ?? 'No client'
  const isOverdue  = invoice.status === 'OVERDUE'
  const isPaid     = invoice.status === 'PAID'
  const isDraft    = invoice.status === 'DRAFT'
  const isVoidable = invoice.status === 'SENT' || invoice.status === 'OVERDUE' || invoice.status === 'PAID'

  return (
    <div
      onClick={() => onClick(invoice)}
      className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all duration-150"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0',
            avatarColor(clientName),
          )}>
            {clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">
              {invoice.invoiceNumber}
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">{clientName}</p>
              {invoice.project && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA] shrink-0">
                  {invoice.project.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0 group">
          <span className={cn(STATUS_BADGE_CLASS[invoice.status], 'text-[10px] px-1.5 py-0.5')}>
            {STATUS_LABELS[invoice.status]}
          </span>
          {onVoid && isVoidable && (
            <button
              onClick={e => { e.stopPropagation(); onVoid(invoice) }}
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] hover:bg-orange-50 hover:text-orange-500 transition-all"
            >
              <Ban size={11} strokeWidth={2.5} />
            </button>
          )}
          {onDelete && isDraft && (
            <button
              onClick={e => { e.stopPropagation(); onDelete(invoice) }}
              className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 flex items-center justify-center text-[#98A2B3] hover:bg-red-50 hover:text-red-500 transition-all"
            >
              <Trash2 size={11} strokeWidth={2.5} />
            </button>
          )}
          <button
            onClick={e => { e.stopPropagation(); onClick(invoice) }}
            className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:text-[#2563EB] transition-colors"
          >
            <ArrowUpRight size={11} strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Total</span>
        <span className={cn(
          'flex items-center gap-0.5 text-[14px] font-extrabold',
          isPaid ? 'text-[#027A48]' : isOverdue ? 'text-[#D92D20]' : 'text-[#101828] dark:text-[#ECEEF3]',
        )}>
          <IndianRupee size={10} strokeWidth={3} />
          {fmt(Number(invoice.total))}
        </span>
      </div>

      {/* GST */}
      {Number(invoice.gstAmount) > 0 && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">GST ({invoice.gstType === 'IGST' ? 'IGST' : 'CGST+SGST'})</span>
          <span className="text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8]">{symbol}{fmt(Number(invoice.gstAmount))}</span>
        </div>
      )}

      {/* Due date */}
      {invoice.dueDate && !isPaid && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Due</span>
          <span className={cn(
            'text-[11.5px] font-semibold',
            isOverdue ? 'text-[#D92D20]' : 'text-[#344054] dark:text-[#C2C8D8]',
          )}>
            {formatDate(invoice.dueDate)}
          </span>
        </div>
      )}

      {/* Paid date */}
      {isPaid && invoice.paidAt && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Paid</span>
          <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#027A48] bg-[#ECFDF3] dark:bg-emerald-950/40 px-1.5 py-0.5 rounded-md">
            <CheckCircle2 size={9} strokeWidth={2.5} />
            {formatDate(invoice.paidAt)}
          </span>
        </div>
      )}

      {/* Linked contract */}
      {invoice.contract && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-1.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Contract</span>
          <span className="text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8] truncate max-w-[150px]">
            {invoice.contract.title}
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(invoice.createdAt)}</span>
        <span className="flex items-center gap-1 text-[10px] font-medium text-[#667085] dark:text-[#8B92A8]">
          {isPaid
            ? <><CheckCircle2 size={8} strokeWidth={2} className="text-[#12B76A]" /> Paid</>
            : isOverdue
            ? <><AlertCircle size={8} strokeWidth={2} className="text-[#D92D20]" /> Overdue</>
            : <><Clock size={8} strokeWidth={2} /> {STATUS_LABELS[invoice.status]}</>
          }
        </span>
      </div>
    </div>
  )
}

export function InvoiceCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-3.5 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-3/4" />
          <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
        </div>
        <div className="h-5 w-12 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-16" />
        <div className="h-3.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-12" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-24" />
      </div>
    </div>
  )
}
