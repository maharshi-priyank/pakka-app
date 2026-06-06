import { useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import {
  CheckCircle2, AlertCircle, Lock, FileText, Calendar, Download,
  Building2, Smartphone, FileArchive, FileImage, File as FileIcon,
} from 'lucide-react'
import { humanSize } from '@/features/attachments/useAttachments'
import type { Attachment } from '@/features/attachments/types'

async function fetchAttachments(invoiceId: string): Promise<Attachment[]> {
  const { data } = await publicApi.get<{ data: Attachment[] }>(`/attachments/public/invoice/${invoiceId}`)
  return data.data
}
import { cn } from '@/lib/utils'
import type { LineItem, GstType } from '@/features/invoices/schemas/invoice.schema'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

function deliverableIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))  return <FileImage  size={14} className="text-[#667085] shrink-0" />
  if (mimeType === 'application/pdf') return <FileText   size={14} className="text-[#D92D20] shrink-0" />
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar'))
                                      return <FileArchive size={14} className="text-[#F79009] shrink-0" />
  return <FileIcon size={14} className="text-[#667085] shrink-0" />
}

interface PublicUser {
  name: string; businessName: string | null; email: string
  logoUrl: string | null; gstNumber: string | null
  plan: 'FREE' | 'SOLO' | 'STUDIO'
  bankName: string | null; bankAccountName: string | null
  bankAccountNumber: string | null; bankIfsc: string | null
  upiId: string | null; upiQrUrl: string | null
}
interface PublicClient {
  id: string; name: string; company: string | null; email: string | null; gstNumber: string | null
}
interface PublicInvoice {
  id: string; invoiceNumber: string; status: string
  lineItems: LineItem[]; subtotal: number; gstAmount: number; total: number
  gstType: GstType; tdsRate: number | null; dueDate: string | null; paidAt: string | null
  createdAt: string
  currency: string
  lutNumber: string | null
  user: PublicUser; client: PublicClient | null
}

async function fetchInvoice(id: string): Promise<PublicInvoice> {
  const { data } = await publicApi.get<{ data: PublicInvoice }>(`/invoices/view/${id}`)
  return data.data
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ',
}
function fmtCurrency(v: number, currency: string) {
  const sym = CURRENCY_SYMBOLS[currency] ?? currency + ' '
  return `${sym}${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:   'bg-[#F2F4F7] text-[#667085]',
  SENT:    'bg-[#EFF6FF] text-[#2563EB]',
  VIEWED:  'bg-[#F4F3FF] text-[#5925DC]',
  PARTIAL: 'bg-[#FFFAEB] text-[#B54708]',
  PAID:    'bg-[#ECFDF3] text-[#027A48]',
  OVERDUE: 'bg-[#FEF3F2] text-[#D92D20]',
}

export default function InvoiceViewPage() {
  const { id } = useParams<{ id: string }>()
  const { search } = useLocation()
  const isPrint = new URLSearchParams(search).get('print') === '1'

  const { data: invoice, isLoading, isError } = useQuery({
    queryKey: ['public-invoice', id],
    queryFn:  () => fetchInvoice(id!),
    enabled:  !!id,
    retry:    false,
  })

  const { data: attachments = [] } = useQuery<Attachment[]>({
    queryKey: ['public-invoice-attachments', id],
    queryFn:  () => fetchAttachments(id!),
    enabled:  !!id,
  })

  useEffect(() => {
    if (isPrint && invoice) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrint, invoice])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !invoice) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-[#D0D5DD] mb-3" />
          <p className="text-[16px] font-bold text-[#344054]">Invoice not found</p>
          <p className="text-[13px] text-[#98A2B3] mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  const senderName = invoice.user.businessName ?? invoice.user.name
  const isPaid     = invoice.status === 'PAID'
  const isOverdue  = invoice.status === 'OVERDUE'

  const currency = invoice.currency ?? 'INR'
  const isExport = currency !== 'INR'

  const tdsAmount = invoice.tdsRate
    ? (Number(invoice.subtotal) * Number(invoice.tdsRate)) / 100
    : 0

  return (
    <div className="min-h-screen bg-[#F5F6FA]">

      {/* Watermark (FREE plan) */}
      {invoice.user.plan === 'FREE' && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute whitespace-nowrap text-[64px] font-bold text-black/[0.04]"
              style={{ transform: 'rotate(-35deg)', top: `${i * 18 - 10}%`, left: '-20%', width: '140%' }}
            >
              Rupway • Rupway • Rupway • Rupway • Rupway
            </div>
          ))}
        </div>
      )}

      {/* Brand bar */}
      <div className="bg-white border-b border-[#EAECF0] sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {invoice.user.logoUrl ? (
              <img src={invoice.user.logoUrl} alt={senderName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white text-[13px] font-bold">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[14px] font-bold text-[#101828]">{senderName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EBF2] text-[12px] text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
            >
              <Download size={12} strokeWidth={2} />
              Download PDF
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
              <Lock size={11} strokeWidth={2} />
              Secured by Rupway
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; } }`}</style>

      <div className="max-w-2xl mx-auto px-6 py-8 space-y-4">

        {/* Paid banner */}
        {isPaid && (
          <div className="bg-[#ECFDF3] border border-[#BBF7D0] rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-[#027A48]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#027A48]">Invoice paid</p>
              {invoice.paidAt && (
                <p className="text-[13px] text-[#065F46] mt-0.5">
                  Paid on {fmtDate(invoice.paidAt)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Overdue banner */}
        {isOverdue && (
          <div className="bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl p-5 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#FEE4E2] flex items-center justify-center shrink-0">
              <AlertCircle size={20} className="text-[#D92D20]" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-[#D92D20]">Payment overdue</p>
              {invoice.dueDate && (
                <p className="text-[13px] text-[#912018] mt-0.5">
                  Was due on {fmtDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Header card */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
          <div className="px-7 py-7 border-b border-[#F2F4F7]">
            <div className="flex items-center gap-2 mb-3">
              <FileText size={15} className="text-[#2563EB]" />
              <span className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-widest">Invoice</span>
              <span className={cn(
                'ml-auto text-[11px] font-bold px-2.5 py-0.5 rounded-full',
                STATUS_STYLES[invoice.status] ?? 'bg-[#F2F4F7] text-[#667085]',
              )}>
                {invoice.status}
              </span>
            </div>
            <h1 className="text-[22px] font-extrabold text-[#101828]">
              {invoice.invoiceNumber}
              {currency !== 'INR' && (
                <span className="ml-2 inline-flex items-center text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB]">
                  {currency}
                </span>
              )}
            </h1>
            <p className="text-[13px] text-[#667085] mt-1">{fmtDate(invoice.createdAt)}</p>
          </div>

          {/* From / To */}
          <div className="grid grid-cols-2 divide-x divide-[#F2F4F7] border-b border-[#F2F4F7]">
            <div className="px-7 py-5">
              <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">From</p>
              <p className="text-[13px] font-bold text-[#101828]">{senderName}</p>
              <p className="text-[12px] text-[#667085] mt-0.5">{invoice.user.email}</p>
              {invoice.user.gstNumber && (
                <p className="text-[11px] text-[#98A2B3] mt-0.5">GST: {invoice.user.gstNumber}</p>
              )}
            </div>
            <div className="px-7 py-5">
              <p className="text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-2">Bill to</p>
              {invoice.client ? (
                <>
                  <p className="text-[13px] font-bold text-[#101828]">{invoice.client.name}</p>
                  {invoice.client.company && (
                    <p className="text-[12px] text-[#667085] mt-0.5">{invoice.client.company}</p>
                  )}
                  {invoice.client.email && (
                    <p className="text-[12px] text-[#667085] mt-0.5">{invoice.client.email}</p>
                  )}
                  {invoice.client.gstNumber && (
                    <p className="text-[11px] text-[#98A2B3] mt-0.5">GST: {invoice.client.gstNumber}</p>
                  )}
                </>
              ) : (
                <p className="text-[13px] text-[#98A2B3]">—</p>
              )}
            </div>
          </div>

          {/* Due date */}
          {invoice.dueDate && !isPaid && (
            <div className="px-7 py-4 bg-[#FAFAFA] border-b border-[#F2F4F7] flex items-center gap-2">
              <Calendar size={13} className={isOverdue ? 'text-[#D92D20]' : 'text-[#667085]'} />
              <span className="text-[12px] text-[#667085]">Due date:</span>
              <span className={cn(
                'text-[12px] font-semibold',
                isOverdue ? 'text-[#D92D20]' : 'text-[#344054]',
              )}>
                {fmtDate(invoice.dueDate)}
              </span>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
          <div className="px-7 py-4 border-b border-[#F2F4F7]">
            <h2 className="text-[14px] font-bold text-[#101828]">Line items</h2>
          </div>

          {/* Table header */}
          <div className="grid grid-cols-[70px_1fr_60px_90px_70px_90px] gap-3 px-7 py-2.5 bg-[#FAFAFA] border-b border-[#F2F4F7] text-[10px] font-semibold text-[#98A2B3] uppercase tracking-wider">
            <span>SAC/HSN</span>
            <span>Description</span>
            <span className="text-right">Qty</span>
            <span className="text-right">Rate</span>
            <span className="text-right">GST</span>
            <span className="text-right">Amount</span>
          </div>

          {invoice.lineItems.map((item, idx) => {
            const lineTotal = Number(item.qty) * Number(item.rate)
            const lineGst   = !isExport && invoice.gstType !== 'EXEMPT'
              ? (lineTotal * Number(item.gstRate)) / 100 : 0
            return (
              <div
                key={idx}
                className={cn(
                  'grid grid-cols-[70px_1fr_60px_90px_70px_90px] gap-3 px-7 py-3.5 text-[13px]',
                  idx < invoice.lineItems.length - 1 ? 'border-b border-[#F2F4F7]' : '',
                )}
              >
                <span className="text-[11px] text-[#98A2B3] font-mono self-center">{item.hsnSac ?? '—'}</span>
                <span className="text-[#344054] font-medium">{item.description}</span>
                <span className="text-right text-[#667085]">{item.qty}</span>
                <span className="text-right text-[#667085]">{fmtCurrency(item.rate, currency)}</span>
                <span className="text-right text-[#667085]">
                  {isExport || invoice.gstType === 'EXEMPT' ? 'Nil' : `${item.gstRate}%`}
                </span>
                <span className="text-right font-semibold text-[#101828]">
                  {fmtCurrency(lineTotal + lineGst, currency)}
                </span>
              </div>
            )
          })}

          {/* Totals */}
          <div className="px-7 py-5 bg-[#FAFAFA] border-t border-[#EAECF0] space-y-2">
            <div className="flex justify-between text-[13px]">
              <span className="text-[#667085]">Subtotal</span>
              <span className="font-medium text-[#344054]">{fmtCurrency(Number(invoice.subtotal), currency)}</span>
            </div>
            {!isExport && Number(invoice.gstAmount) > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#667085]">
                  {invoice.gstType === 'IGST' ? 'IGST' : 'CGST + SGST'}
                </span>
                <span className="font-medium text-[#344054]">{fmtCurrency(Number(invoice.gstAmount), currency)}</span>
              </div>
            )}
            {isExport && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#667085]">IGST</span>
                <span className="font-medium text-[#027A48]">Nil</span>
              </div>
            )}
            {tdsAmount > 0 && (
              <div className="flex justify-between text-[13px]">
                <span className="text-[#667085]">TDS ({invoice.tdsRate}%)</span>
                <span className="font-medium text-[#D92D20]">−{fmtCurrency(tdsAmount, currency)}</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-3 border-t border-[#EAECF0]">
              <span className="text-[16px] font-bold text-[#101828]">Total due</span>
              <span className={cn('text-[22px] font-extrabold', isPaid ? 'text-[#027A48]' : 'text-[#101828]')}>
                {fmtCurrency(Number(invoice.total), currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Deliverables */}
        {attachments.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
            <div className="px-7 py-4 border-b border-[#F2F4F7] flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[#101828]">Deliverables</h2>
              {isPaid
                ? <span className="text-[11px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2.5 py-0.5 rounded-full">Unlocked</span>
                : <span className="text-[11px] font-semibold text-[#B54708] bg-[#FFFAEB] px-2.5 py-0.5 rounded-full flex items-center gap-1"><Lock size={10} strokeWidth={2.5} /> Locked</span>
              }
            </div>
            <div className="divide-y divide-[#F2F4F7]">
              {attachments.map((a: Attachment) => (
                <div key={a.id} className="flex items-center gap-3 px-7 py-3.5">
                  {deliverableIcon(a.mimeType)}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#344054] truncate">{a.fileName}</p>
                    <p className="text-[11px] text-[#98A2B3]">{humanSize(a.fileSize)}</p>
                  </div>
                  {a.fileUrl ? (
                    <a
                      href={a.fileUrl}
                      download={a.fileName}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-[12px] font-semibold hover:bg-[#1D4ED8] transition-colors shrink-0"
                    >
                      <Download size={12} strokeWidth={2.5} /> Download
                    </a>
                  ) : (
                    <div className="flex items-center gap-1.5 text-[12px] text-[#98A2B3] shrink-0">
                      <Lock size={12} strokeWidth={2} /> Pay to unlock
                    </div>
                  )}
                </div>
              ))}
            </div>
            {!isPaid && (
              <div className="px-7 py-3 bg-[#FFFAEB] border-t border-[#FEF0C7] flex items-center gap-2">
                <Lock size={12} className="text-[#B54708] shrink-0" strokeWidth={2} />
                <p className="text-[12px] text-[#B54708]">
                  Files are unlocked automatically once this invoice is marked as paid.
                </p>
              </div>
            )}
          </div>
        )}

        {/* LUT / Zero-rated export declaration */}
        {isExport && (
          <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-2xl px-7 py-5">
            <p className="text-[12px] font-semibold text-[#027A48] mb-1">Zero-Rated Export Supply</p>
            <p className="text-[12px] text-[#027A48] leading-relaxed">
              Export of Services — Zero Rated Supply under Bond/LUT as per Section 16(3) of IGST Act 2017.
              {invoice.lutNumber ? ` LUT No: ${invoice.lutNumber}.` : ''} IGST: Nil.
            </p>
          </div>
        )}

        {/* Bank / UPI payment block */}
        {!isPaid && (invoice.user.bankAccountNumber || invoice.user.upiId) && (
          <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
            <div className="px-7 py-4 border-b border-[#F2F4F7]">
              <h2 className="text-[14px] font-bold text-[#101828]">Pay via Bank Transfer / UPI</h2>
            </div>
            <div className="px-7 py-5 flex items-start gap-6">
              <div className="flex-1 space-y-3">
                {invoice.user.upiId && (
                  <div className="flex items-start gap-2.5">
                    <Smartphone size={14} className="text-[#667085] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">UPI ID</p>
                      <p className="text-[13px] font-semibold text-[#101828] mt-0.5">{invoice.user.upiId}</p>
                    </div>
                  </div>
                )}
                {invoice.user.bankAccountNumber && (
                  <div className="flex items-start gap-2.5">
                    <Building2 size={14} className="text-[#667085] mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider">Bank Transfer</p>
                      {invoice.user.bankName && (
                        <p className="text-[13px] font-semibold text-[#101828] mt-0.5">{invoice.user.bankName}</p>
                      )}
                      {invoice.user.bankAccountName && (
                        <p className="text-[12px] text-[#667085]">{invoice.user.bankAccountName}</p>
                      )}
                      <p className="text-[12px] text-[#344054] font-mono mt-0.5">A/C: {invoice.user.bankAccountNumber}</p>
                      {invoice.user.bankIfsc && (
                        <p className="text-[12px] text-[#344054] font-mono">IFSC: {invoice.user.bankIfsc}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {invoice.user.upiQrUrl && (
                <img
                  src={invoice.user.upiQrUrl}
                  alt="UPI QR Code"
                  className="w-[110px] h-[110px] rounded-xl border border-[#EAECF0] object-contain shrink-0"
                />
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-[11px] text-[#D0D5DD]">
          Invoice by {senderName} · {invoice.user.email} · Powered by Rupway
        </div>
      </div>
    </div>
  )
}
