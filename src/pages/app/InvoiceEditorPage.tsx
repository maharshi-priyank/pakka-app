import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInvoice } from '@/features/invoices/hooks/useInvoices'
import InvoiceEditor from '@/features/invoices/components/InvoiceEditor'
import type { Invoice } from '@/features/invoices/schemas/invoice.schema'

export default function InvoiceEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const { data: invoice, isLoading } = useInvoice(isNew ? null : id ?? null)

  function handleSaved(inv: Invoice) {
    navigate(`/app/invoices/${inv.id}`, { replace: true })
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100vh-60px)] max-w-full -mx-6 -my-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] bg-white shrink-0">
        <button
          onClick={() => navigate('/app/invoices')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] text-[#98A2B3]">Invoices</span>
        <span className="text-[12px] text-[#D0D5DD]">/</span>
        <span className="text-[12px] font-medium text-[#344054]">
          {isNew ? 'New invoice' : (invoice?.invoiceNumber ?? 'Edit invoice')}
        </span>
        {!isNew && invoice && (
          <>
            <span className="text-[12px] text-[#D0D5DD]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              invoice.status === 'DRAFT'    ? 'bg-[#F2F4F7] text-[#667085]'  :
              invoice.status === 'SENT'     ? 'bg-[#EFF6FF] text-[#2563EB]'  :
              invoice.status === 'PAID'     ? 'bg-[#ECFDF3] text-[#027A48]'  :
              invoice.status === 'OVERDUE'  ? 'bg-[#FEF3F2] text-[#D92D20]'  :
              'bg-[#F2F4F7] text-[#667085]'
            }`}>
              {invoice.status}
            </span>
          </>
        )}
      </div>

      <InvoiceEditor
        invoice={!isNew ? invoice : undefined}
        onSaved={handleSaved}
        onDiscard={() => navigate('/app/invoices')}
      />
    </div>
  )
}
