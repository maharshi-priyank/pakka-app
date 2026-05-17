import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useContract } from '@/features/contracts/hooks/useContracts'
import { useCreateInvoiceFromContract } from '@/features/invoices/hooks/useInvoices'
import ContractEditor from '@/features/contracts/components/ContractEditor'
import type { Contract } from '@/features/contracts/schemas/contract.schema'

export default function ContractEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id || id === 'new'

  const { data: contract, isLoading } = useContract(isNew ? null : id ?? null)
  const generateInvoiceMutation = useCreateInvoiceFromContract()

  function handleSaved(c: Contract) {
    navigate(`/app/contracts/${c.id}`, { replace: true })
  }

  async function handleGenerateInvoice() {
    if (!contract) return
    const invoice = await generateInvoiceMutation.mutateAsync(contract.id)
    navigate(`/app/invoices/${invoice.id}`)
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
          onClick={() => navigate('/app/contracts')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] text-[#98A2B3]">Contracts</span>
        <span className="text-[12px] text-[#D0D5DD]">/</span>
        <span className="text-[12px] font-medium text-[#344054]">
          {isNew ? 'New contract' : (contract?.title ?? 'Edit contract')}
        </span>
        {!isNew && contract && (
          <>
            <span className="text-[12px] text-[#D0D5DD]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              contract.status === 'DRAFT'    ? 'bg-[#F2F4F7] text-[#667085]'  :
              contract.status === 'SENT'     ? 'bg-[#EFF6FF] text-[#2563EB]'  :
              contract.status === 'SIGNED'   ? 'bg-[#ECFDF3] text-[#027A48]'  :
              'bg-[#FEF3F2] text-[#D92D20]'
            }`}>
              {contract.status}
            </span>
          </>
        )}
      </div>

      <ContractEditor
        contract={!isNew ? contract : undefined}
        onSaved={handleSaved}
        onDiscard={() => navigate('/app/contracts')}
        onGenerateInvoice={contract?.status === 'SIGNED' ? handleGenerateInvoice : undefined}
      />
    </div>
  )
}
