import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useProposal } from '@/features/proposals/hooks/useProposals'
import ProposalEditor from '@/features/proposals/components/ProposalEditor'
import type { Proposal, ProposalTemplate } from '@/features/proposals/schemas/proposal.schema'
import type { Lead } from '@/features/leads/schemas/lead.schema'

export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isNew = !id || id === 'new'
  const state           = location.state as { template?: ProposalTemplate; lead?: Lead } | null
  const templateFromState = state?.template
  const leadFromState     = state?.lead

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
    <div className="flex flex-col h-[calc(100vh-60px)] max-h-[calc(100vh-136px)] lg:max-h-none max-w-full -mx-4 -my-4 lg:-mx-6 lg:-my-6">
      {/* Breadcrumb bar */}
      <div className="flex items-center gap-2 px-6 py-3 border-b border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
        <button
          onClick={() => navigate('/app/proposals')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
        </button>
        <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">Proposals</span>
        <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">/</span>
        <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8]">
          {isNew ? 'New proposal' : (proposal?.title ?? 'Edit proposal')}
        </span>
        {!isNew && proposal && (
          <>
            <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">·</span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              proposal.status === 'DRAFT'    ? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'  :
              proposal.status === 'SENT'     ? 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]'  :
              proposal.status === 'OPENED'   ? 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B45309] dark:text-amber-400'  :
              proposal.status === 'ACCEPTED' ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'  :
              'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400'
            }`}>
              {proposal.status}
            </span>
          </>
        )}
      </div>

      <ProposalEditor
        proposal={!isNew ? proposal : undefined}
        defaultLead={isNew ? leadFromState : undefined}
        defaultTemplate={isNew ? templateFromState : undefined}
        onSaved={handleSaved}
        onDiscard={handleDiscard}
      />
    </div>
  )
}
