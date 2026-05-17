import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, IndianRupee, LayoutTemplate } from 'lucide-react'
import AIIcon from '@/features/ai/components/AIIcon'
import AIProposalModal from '@/features/ai/components/AIProposalModal'
import { cn } from '@/lib/utils'
import { useProposals } from '@/features/proposals/hooks/useProposals'
import { useCreateContractFromProposal } from '@/features/contracts/hooks/useContracts'
import ProposalCard, { ProposalCardSkeleton } from '@/features/proposals/components/ProposalCard'
import TemplatePickerModal from '@/features/proposals/components/TemplatePickerModal'
import TemplateCard from '@/features/proposals/components/TemplateCard'
import SaveTemplateModal from '@/features/proposals/components/SaveTemplateModal'
import { useProposalTemplates } from '@/features/proposals/hooks/useProposalTemplates'
import type { ProposalStatus } from '@/features/proposals/schemas/proposal.schema'
import { STATUS_LABELS } from '@/features/proposals/schemas/proposal.schema'
import type { Proposal } from '@/features/proposals/schemas/proposal.schema'

type ActiveTab = ProposalStatus | 'ALL' | 'TEMPLATES'

const STATUS_TABS: Array<{ value: ActiveTab; label: string }> = [
  { value: 'ALL',       label: 'All' },
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SENT',      label: 'Sent' },
  { value: 'OPENED',    label: 'Opened' },
  { value: 'ACCEPTED',  label: 'Accepted' },
  { value: 'DECLINED',  label: 'Declined' },
  { value: 'TEMPLATES', label: 'Templates' },
]

export default function ProposalsPage() {
  const navigate = useNavigate()
  const [activeTab,      setActiveTab]      = useState<ActiveTab>('ALL')
  const [showAI,         setShowAI]         = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [saveTemplateFor,    setSaveTemplateFor]    = useState<Proposal | null>(null)
  const convertMutation = useCreateContractFromProposal()
  const statusFilter = activeTab === 'TEMPLATES' ? 'ALL' : activeTab as ProposalStatus | 'ALL'

  async function handleConvertToContract(p: Proposal) {
    const contract = await convertMutation.mutateAsync(p.id)
    navigate(`/app/contracts/${contract.id}`)
  }

  const { data, isLoading } = useProposals({ limit: 200 })

  const allProposals  = data?.items ?? []
  const proposals     = statusFilter === 'ALL' ? allProposals : allProposals.filter(p => p.status === statusFilter)

  const totalValue    = allProposals.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const acceptedCount = allProposals.filter(p => p.status === 'ACCEPTED').length

  function openProposal(p: Proposal) {
    navigate(`/app/proposals/${p.id}`)
  }

  function handleSaveAsTemplate(p: Proposal) {
    setSaveTemplateFor(p)
  }

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] tracking-tight">Proposals</h1>
          {!isLoading && proposals.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] mt-0.5 flex items-center gap-1">
              <IndianRupee size={10} />
              {totalValue.toLocaleString('en-IN')} in proposals
              {acceptedCount > 0 && ` · ${acceptedCount} accepted`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* AI button */}
          <button
            onClick={() => setShowAI(true)}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-all',
              'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
              'hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md',
            )}
          >
            <AIIcon size={13} />
            Draft with AI
          </button>

          <button
            onClick={() => setShowTemplatePicker(true)}
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
          >
            <LayoutTemplate size={14} />
            From Template
          </button>

          <button
            onClick={() => navigate('/app/proposals/new')}
            className="btn-primary"
          >
            <Plus size={14} strokeWidth={2.5} />
            New Proposal
          </button>
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = activeTab === tab.value
          const count = tab.value === 'TEMPLATES'
            ? undefined
            : tab.value === 'ALL'
              ? allProposals.length
              : allProposals.filter(p => p.status === tab.value).length

          return (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5',
                isActive
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-[#667085] hover:text-[#344054]',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F2F4F7] text-[#667085]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Templates tab */}
      {activeTab === 'TEMPLATES' && <TemplatesTab />}

      {/* Proposals grid */}
      {activeTab !== 'TEMPLATES' && (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => <ProposalCardSkeleton key={i} />)}
          </div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] flex items-center justify-center mb-4">
              <FileText size={22} className="text-[#D0D5DD]" />
            </div>
            <p className="text-[14px] font-semibold text-[#344054]">
              {statusFilter === 'ALL' ? 'No proposals yet' : `No ${STATUS_LABELS[statusFilter as ProposalStatus]?.toLowerCase()} proposals`}
            </p>
            <p className="text-[12px] text-[#98A2B3] mt-1">
              {statusFilter === 'ALL' ? 'Create your first proposal to get started.' : 'Try a different status filter.'}
            </p>
            {statusFilter === 'ALL' && (
              <button
                onClick={() => navigate('/app/proposals/new')}
                className="btn-primary mt-4 text-[13px]"
              >
                <Plus size={13} strokeWidth={2.5} /> New Proposal
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {proposals.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onClick={openProposal}
                onConvertToContract={handleConvertToContract}
                onSaveAsTemplate={handleSaveAsTemplate}
              />
            ))}
          </div>
        )
      )}

      {/* Modals */}
      {showAI && <AIProposalModal onClose={() => setShowAI(false)} />}
      <TemplatePickerModal open={showTemplatePicker} onClose={() => setShowTemplatePicker(false)} />
      {saveTemplateFor && (
        <SaveTemplateModal
          open={!!saveTemplateFor}
          onClose={() => setSaveTemplateFor(null)}
          proposalId={saveTemplateFor.id}
          defaultName={saveTemplateFor.title}
        />
      )}
    </div>
  )
}

function TemplatesTab() {
  const { data: templates = [], isLoading } = useProposalTemplates()
  const systemTemplates = templates.filter(t => t.isSystem)
  const userTemplates   = templates.filter(t => !t.isSystem)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-44 rounded-xl bg-[#F2F4F7] animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* System templates */}
      <div>
        <p className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-3">Starter Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {systemTemplates.map(t => (
            <TemplateCard key={t.id} template={t} mode="manage" />
          ))}
        </div>
      </div>

      {/* User templates */}
      <div>
        <p className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-3">Your Templates</p>
        {userTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-14 border-2 border-dashed border-[#EAECF0] rounded-xl text-center">
            <LayoutTemplate size={28} className="text-[#D0D5DD] mb-3" strokeWidth={1.5} />
            <p className="text-[13px] font-semibold text-[#667085]">No templates yet</p>
            <p className="text-[12px] text-[#98A2B3] mt-0.5">Open any proposal and use "Save as Template" to add one here.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {userTemplates.map(t => (
              <TemplateCard key={t.id} template={t} mode="manage" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
