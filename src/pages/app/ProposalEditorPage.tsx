import { useState } from 'react'
import { useNavigate, useParams, useLocation, useSearchParams, Link } from 'react-router-dom'
import { ArrowLeft, FileText, Sparkles, LayoutTemplate } from 'lucide-react'
import { useProposal } from '@/features/proposals/hooks/useProposals'
import ProposalEditor from '@/features/proposals/components/ProposalEditor'
import TemplatePickerModal from '@/features/proposals/components/TemplatePickerModal'
import AIProposalModal from '@/features/ai/components/AIProposalModal'
import type { Proposal, ProposalTemplate } from '@/features/proposals/schemas/proposal.schema'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import { useProject } from '@/features/projects/hooks/useProjects'

export default function ProposalEditorPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const isNew = !id || id === 'new'
  const state             = location.state as { template?: ProposalTemplate; lead?: Lead } | null
  const templateFromState = state?.template
  const leadFromState     = state?.lead

  // Start-method picker: shown for new blank proposals only
  const [startMethod,      setStartMethod]      = useState<'blank' | null>(templateFromState ? 'blank' : null)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [showAI,             setShowAI]             = useState(false)

  const urlProjectId = searchParams.get('projectId') || undefined
  const urlClientId  = searchParams.get('clientId')  || undefined
  const { data: projectFromUrl } = useProject(urlProjectId ?? '')

  const { data: proposal, isLoading } = useProposal(isNew ? null : id ?? null)

  const effectiveProjectId   = urlProjectId ?? proposal?.projectId ?? undefined
  const effectiveProjectName = projectFromUrl?.name ?? proposal?.project?.name ?? null

  function handleSaved(p: Proposal) {
    // Stay on the proposal edit page; back arrow returns to the project
    navigate(`/proposals/${p.id}`, { replace: true })
  }

  function handleDiscard() {
    effectiveProjectId ? navigate(`/projects/${effectiveProjectId}`) : navigate('/proposals')
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
          onClick={() => effectiveProjectId ? navigate(`/projects/${effectiveProjectId}`) : navigate('/proposals')}
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
          <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">Proposals</span>
        )}
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

      {/* ── Start-method picker (new blank proposals only) ── */}
      {isNew && startMethod === null && !templateFromState ? (
        <div className="flex-1 flex flex-col items-center justify-center bg-[#F5F6FA] dark:bg-[#0C0D10] px-4 py-12">
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mb-6">How do you want to start?</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl">

            {/* Blank */}
            <button
              onClick={() => setStartMethod('blank')}
              className="flex flex-col items-start gap-3 p-5 bg-white dark:bg-[#13141A] rounded-2xl border border-[#EAECF0] dark:border-[#26283A] hover:border-[#6366F1]/50 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center group-hover:bg-[#EEF2FF] dark:group-hover:bg-[#1E2040] transition-colors">
                <FileText size={18} className="text-[#667085] dark:text-[#8B92A8] group-hover:text-[#6366F1] transition-colors" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Blank proposal</p>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-snug">Start from scratch and fill in each section yourself.</p>
              </div>
            </button>

            {/* AI */}
            <button
              onClick={() => setShowAI(true)}
              className="flex flex-col items-start gap-3 p-5 bg-white dark:bg-[#13141A] rounded-2xl border border-[#EAECF0] dark:border-[#26283A] hover:border-violet-400/60 hover:shadow-md hover:shadow-violet-100/40 transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/40 dark:to-violet-950/40 flex items-center justify-center group-hover:from-indigo-100 group-hover:to-violet-100 transition-colors">
                <Sparkles size={18} className="text-violet-600 dark:text-violet-400" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Draft with AI</p>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-snug">Describe the project and AI fills scope, pricing, and terms.</p>
              </div>
            </button>

            {/* Template */}
            <button
              onClick={() => setShowTemplatePicker(true)}
              className="flex flex-col items-start gap-3 p-5 bg-white dark:bg-[#13141A] rounded-2xl border border-[#EAECF0] dark:border-[#26283A] hover:border-[#6366F1]/50 hover:shadow-md transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center group-hover:bg-[#E0E7FF] dark:group-hover:bg-[#252850] transition-colors">
                <LayoutTemplate size={18} className="text-[#6366F1]" />
              </div>
              <div>
                <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Use a template</p>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-snug">Pick a pre-built structure and customise it for your client.</p>
              </div>
            </button>
          </div>
        </div>
      ) : (
        <ProposalEditor
          proposal={!isNew ? proposal : undefined}
          defaultLead={isNew ? leadFromState : undefined}
          defaultTemplate={isNew ? templateFromState : undefined}
          defaultProjectId={isNew ? urlProjectId : undefined}
          defaultClientId={isNew ? urlClientId : undefined}
          onSaved={handleSaved}
          onDiscard={handleDiscard}
        />
      )}

      {/* Modals */}
      {showAI && (
        <AIProposalModal
          onClose={() => setShowAI(false)}
        />
      )}
      <TemplatePickerModal
        open={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        defaultProjectId={urlProjectId}
        defaultClientId={urlClientId}
      />
    </div>
  )
}
