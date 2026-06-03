import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useInvoice } from '@/features/invoices/hooks/useInvoices'
import InvoiceEditor from '@/features/invoices/components/InvoiceEditor'
import InvoiceFilesPanel from '@/features/invoices/components/InvoiceFilesPanel'
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
    <div className="flex flex-col h-[calc(100vh-60px)] lg:h-[calc(100vh-60px)] max-h-[calc(100vh-136px)] lg:max-h-none max-w-full -mx-4 -my-4 lg:-mx-6 lg:-my-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
        <button
          onClick={() => navigate('/app/invoices')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">Invoices</span>
        <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
        <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8]">
          {isNew ? 'New invoice' : (invoice?.invoiceNumber ?? 'Edit invoice')}
        </span>
        {!isNew && invoice && (
          <>
            <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              invoice.status === 'DRAFT'    ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'  :
              invoice.status === 'SENT'     ? 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]'  :
              invoice.status === 'PAID'     ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'  :
              invoice.status === 'OVERDUE'  ? 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'  :
              'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'
            }`}>
              {invoice.status}
            </span>
          </>
        )}
      </div>

      {/* Editor takes the available height; deliverables panel scrolls below on non-draft invoices */}
      <div className="flex-1 overflow-y-auto">
        <div className={isNew || !invoice || invoice.status === 'DRAFT' ? 'h-full' : ''}>
          <InvoiceEditor
            invoice={!isNew ? invoice : undefined}
            onSaved={handleSaved}
            onDiscard={() => navigate('/app/invoices')}
          />
        </div>

        {!isNew && invoice && invoice.status !== 'DRAFT' && (
          <div className="max-w-3xl mx-auto px-6 pb-8 pt-2">
            <InvoiceFilesPanel invoice={invoice} />
          </div>
        )}
      </div>
    </div>
  )
}
