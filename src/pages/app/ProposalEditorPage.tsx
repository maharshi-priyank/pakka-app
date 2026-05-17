import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProposal } from '@/features/proposals/hooks/useProposals'
import ProposalEditor from '@/features/proposals/components/ProposalEditor'
import type { Proposal, ProposalTemplate } from '@/features/proposals/schemas/proposal.schema'

export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const defaultLeadId    = searchParams.get('leadId') ?? undefined
  const templateFromState = (location.state as { template?: ProposalTemplate } | null)?.template

  const { data: proposal, isLoading } = useProposal(isNew ? null : id ?? null)

  function handleSaved(p: Proposal) {
    navigate(`/app/proposals/${p.id}`, { replace: true })
  }

  function handleDiscard() {
    navigate('/app/proposals')
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
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] bg-white shrink-0">
        <button
          onClick={() => navigate('/app/proposals')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] text-[#98A2B3]">Proposals</span>
        <span className="text-[12px] text-[#D0D5DD]">/</span>
        <span className="text-[12px] font-medium text-[#344054]">
          {isNew ? 'New proposal' : (proposal?.title ?? 'Edit proposal')}
        </span>
        {!isNew && proposal && (
          <>
            <span className="text-[12px] text-[#D0D5DD]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              proposal.status === 'DRAFT'    ? 'bg-[#F2F4F7] text-[#667085]'  :
              proposal.status === 'SENT'     ? 'bg-[#EFF6FF] text-[#2563EB]'  :
              proposal.status === 'OPENED'   ? 'bg-[#FFFAEB] text-[#B45309]'  :
              proposal.status === 'ACCEPTED' ? 'bg-[#ECFDF3] text-[#027A48]'  :
              'bg-[#FEF3F2] text-[#D92D20]'
            }`}>
              {proposal.status}
            </span>
          </>
        )}
      </div>

      <ProposalEditor
        proposal={!isNew ? proposal : undefined}
        defaultLeadId={defaultLeadId}
        defaultTemplate={isNew ? templateFromState : undefined}
        onSaved={handleSaved}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
