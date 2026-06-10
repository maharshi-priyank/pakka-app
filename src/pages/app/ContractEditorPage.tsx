import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'
import { useContract } from '@/features/contracts/hooks/useContracts'
import { useCreateInvoiceFromContract } from '@/features/invoices/hooks/useInvoices'
import ContractEditor from '@/features/contracts/components/ContractEditor'
import type { Contract } from '@/features/contracts/schemas/contract.schema'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useExportContractToGoogleDocs } from '@/features/settings/hooks/useGoogleDocs'
import googleDocsSvg from '@/assets/google-docs.svg'

export default function ContractEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'

  const urlProjectId = searchParams.get('projectId') || undefined
  const urlClientId  = searchParams.get('clientId')  || undefined
  const { data: projectFromUrl } = useProject(urlProjectId ?? '')

  const { data: contract, isLoading } = useContract(isNew ? null : id ?? null)
  const generateInvoiceMutation       = useCreateInvoiceFromContract()
  const { data: profile }             = useProfile()
  const exportToGoogleDocs            = useExportContractToGoogleDocs()

  const effectiveProjectId   = urlProjectId ?? contract?.projectId ?? undefined
  const effectiveProjectName = projectFromUrl?.name ?? contract?.project?.name ?? null

  function handleSaved(c: Contract) {
    navigate(`/contracts/${c.id}`, { replace: true })
  }

  async function handleGenerateInvoice() {
    if (!contract) return
    const invoices = await generateInvoiceMutation.mutateAsync(contract.id)
    navigate(`/invoices/${invoices[0].id}`)
  }

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-60px)] max-h-[calc(100dvh-136px)] lg:max-h-none max-w-full -mx-4 -my-4 lg:-mx-6 lg:-my-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0 min-w-0">
        <button
          onClick={() => effectiveProjectId ? navigate(`/projects/${effectiveProjectId}`) : navigate('/contracts')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        {effectiveProjectId && effectiveProjectName ? (
          <>
            <Link to={`/projects/${effectiveProjectId}`} className="text-[12px] text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors">
              {effectiveProjectName}
            </Link>
            <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
          </>
        ) : (
          <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">Contracts</span>
        )}
        <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
        <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8]">
          {isNew ? 'New contract' : (contract?.title ?? 'Edit contract')}
        </span>
        {!isNew && contract && (
          <>
            <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              contract.status === 'DRAFT'    ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'  :
              contract.status === 'SENT'     ? 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]'  :
              contract.status === 'SIGNED'   ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'  :
              'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
            }`}>
              {contract.status}
            </span>
          </>
        )}

        {/* Spacer */}
        <span className="flex-1" />

        {/* Export to Google Docs — only for saved contracts */}
        {!isNew && contract && (
          <button
            onClick={() => {
              if (!profile?.googleDocsConnected) {
                window.location.href = '/settings?tab=integrations'
                return
              }
              exportToGoogleDocs.mutate(contract.id)
            }}
            disabled={exportToGoogleDocs.isPending}
            title={profile?.googleDocsConnected ? 'Export to Google Docs' : 'Connect Google Docs in Settings first'}
            className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors disabled:opacity-50 shrink-0"
          >
            {exportToGoogleDocs.isPending
              ? <Loader2 size={12} className="animate-spin" />
              : <img src={googleDocsSvg} alt="" className="w-3.5 h-3.5" />
            }
            Export to Docs
          </button>
        )}
      </div>

      <ContractEditor
        contract={!isNew ? contract : undefined}
        defaultProjectId={isNew ? urlProjectId : undefined}
        defaultClientId={isNew ? urlClientId : undefined}
        onSaved={handleSaved}
        onDiscard={() => effectiveProjectId ? navigate(`/projects/${effectiveProjectId}`) : navigate('/contracts')}
        onGenerateInvoice={contract?.status === 'SIGNED' ? handleGenerateInvoice : undefined}
      />
    </div>
  )
}
