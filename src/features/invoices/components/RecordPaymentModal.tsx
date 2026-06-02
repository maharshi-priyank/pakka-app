import { useState, useEffect } from 'react'
import { IndianRupee, X } from 'lucide-react'
import { useRecordPayment } from '../hooks/useInvoices'
import type { Invoice } from '../schemas/invoice.schema'

function fmt(n: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(n)
}

interface Props {
  invoice: Invoice
  onClose: () => void
}

export default function RecordPaymentModal({ invoice, onClose }: Props) {
  const { mutateAsync, isPending } = useRecordPayment()

  const tdsAutoFill = invoice.tdsRate
    ? parseFloat((invoice.total * (invoice.tdsRate / 100)).toFixed(2))
    : 0

  const [amountReceived, setAmountReceived] = useState('')
  const [tdsDeducted, setTdsDeducted] = useState(tdsAutoFill > 0 ? String(tdsAutoFill) : '')
  const [note, setNote] = useState('')

  const total       = invoice.total
  const alreadyPaid = invoice.amountPaid          // includes prior Razorpay + manual
  const outstanding = Math.max(0, total - alreadyPaid)

  const received    = parseFloat(amountReceived) || 0
  const tds         = parseFloat(tdsDeducted) || 0
  const newTotal    = alreadyPaid + received + tds
  const willBePaid  = newTotal >= total

  useEffect(() => {
    // close on Escape
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (received <= 0 && tds <= 0) return
    await mutateAsync({ id: invoice.id, amountReceived: received, tdsDeducted: tds, note: note || undefined })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B23] rounded-2xl shadow-2xl w-full max-w-md border border-[#EAECF0] dark:border-[#26283A]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-[#EAECF0] dark:border-[#26283A]">
          <div>
            <h2 className="text-[16px] font-bold text-[#101828] dark:text-[#ECEEF3]">Record Payment</h2>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
              Invoice {invoice.invoiceNumber} · Outstanding ₹{fmt(outstanding)}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F5F6FA] dark:hover:bg-[#26283A] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Amount Received */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C5CAD6] mb-1.5">
              Amount Received Offline <span className="text-[#667085] font-normal">(UPI / Bank / Cash)</span>
            </label>
            <div className="relative">
              <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={amountReceived}
                onChange={e => setAmountReceived(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 h-10 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4A] bg-white dark:bg-[#13141A] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder-[#98A2B3] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all"
              />
            </div>
          </div>

          {/* TDS Deducted */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C5CAD6] mb-1.5">
              TDS Deducted by Client
              {invoice.tdsRate ? (
                <span className="ml-1.5 text-[#667085] font-normal">(auto-filled @ {invoice.tdsRate}%)</span>
              ) : null}
            </label>
            <div className="relative">
              <IndianRupee size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3]" />
              <input
                type="number"
                min="0"
                step="0.01"
                value={tdsDeducted}
                onChange={e => setTdsDeducted(e.target.value)}
                placeholder="0"
                className="w-full pl-8 pr-4 h-10 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4A] bg-white dark:bg-[#13141A] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder-[#98A2B3] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C5CAD6] mb-1.5">
              Note <span className="text-[#667085] font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="e.g. Paid via HDFC NEFT on 2 Jun"
              className="w-full px-3 h-10 rounded-lg border border-[#D0D5DD] dark:border-[#3A3C4A] bg-white dark:bg-[#13141A] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder-[#98A2B3] focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB] outline-none transition-all"
            />
          </div>

          {/* Preview */}
          {(received > 0 || tds > 0) && (
            <div className={`rounded-xl px-4 py-3 text-[12px] ${willBePaid ? 'bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900' : 'bg-[#F5F6FA] dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A]'}`}>
              <div className="flex items-center justify-between">
                <span className="text-[#667085] dark:text-[#8B92A8]">After recording</span>
                <span className={`font-bold ${willBePaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#344054] dark:text-[#C5CAD6]'}`}>
                  ₹{fmt(Math.min(newTotal, total))} of ₹{fmt(total)} settled
                </span>
              </div>
              <div className={`mt-1 font-semibold ${willBePaid ? 'text-emerald-700 dark:text-emerald-400' : 'text-[#667085] dark:text-[#8B92A8]'}`}>
                → Invoice will be marked <span className="uppercase">{willBePaid ? '✓ PAID' : 'PARTIAL'}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 h-10 rounded-xl border border-[#D0D5DD] dark:border-[#3A3C4A] text-[13px] font-semibold text-[#344054] dark:text-[#C5CAD6] hover:bg-[#F5F6FA] dark:hover:bg-[#26283A] transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (received <= 0 && tds <= 0)}
              className="flex-1 h-10 rounded-xl bg-[#2563EB] text-white text-[13px] font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isPending ? 'Recording…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
