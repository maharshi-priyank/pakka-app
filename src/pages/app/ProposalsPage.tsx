import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, IndianRupee, LayoutTemplate, Search, X, LayoutGrid, List } from 'lucide-react'
import AIIcon from '@/features/ai/components/AIIcon'
import AIProposalModal from '@/features/ai/components/AIProposalModal'
import { cn } from '@/lib/utils'
import { useProposals } from '@/features/proposals/hooks/useProposals'
import { useCreateContractFromProposal } from '@/features/contracts/hooks/useContracts'
import ProposalCard, { ProposalCardSkeleton } from '@/features/proposals/components/ProposalCard'
import ProposalTable, { ProposalTableSkeleton } from '@/features/proposals/components/ProposalTable'
import type { SortField, SortDir } from '@/features/proposals/components/ProposalTable'
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

type ViewMode = 'table' | 'cards'
const VIEW_KEY = 'pakka:proposals:view'
function getStoredView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'table' } catch { return 'table' }
}

export default function ProposalsPage() {
  const navigate = useNavigate()

  const [activeTab,          setActiveTab]          = useState<ActiveTab>('ALL')
  const [showAI,             setShowAI]             = useState(false)
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const [saveTemplateFor,    setSaveTemplateFor]    = useState<Proposal | null>(null)
  const [search,             setSearch]             = useState('')
  const [view,               setView]               = useState<ViewMode>(getStoredView)
  const [sortBy,             setSortBy]             = useState<SortField>('createdAt')
  const [sortDir,            setSortDir]            = useState<SortDir>('desc')

  const searchRef     = useRef<HTMLInputElement>(null)
  const convertMutation = useCreateContractFromProposal()
  const statusFilter  = activeTab === 'TEMPLATES' ? 'ALL' : activeTab as ProposalStatus | 'ALL'

  const { data, isLoading } = useProposals({ limit: 500 })
  const allProposals  = data?.items ?? []
  const totalValue    = allProposals.reduce((sum, p) => sum + Number(p.totalAmount), 0)
  const acceptedCount = allProposals.filter(p => p.status === 'ACCEPTED').length

  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f' && activeTab !== 'TEMPLATES') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [activeTab])

  async function handleConvertToContract(p: Proposal) {
    const contract = await convertMutation.mutateAsync(p.id)
    navigate(`/app/contracts/${contract.id}`)
  }

  function handleSort(field: SortField) {
    if (field === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const displayed = useMemo(() => {
    let list = allProposals

    if (statusFilter !== 'ALL') {
      list = list.filter(p => p.status === statusFilter)
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.client?.name    ?? '').toLowerCase().includes(q) ||
        (p.client?.company ?? '').toLowerCase().includes(q) ||
        (p.lead?.name      ?? '').toLowerCase().includes(q),
      )
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'title':       return dir * a.title.localeCompare(b.title)
        case 'totalAmount': return dir * (Number(a.totalAmount) - Number(b.totalAmount))
        case 'validUntil':  return dir * ((a.validUntil ?? '9999').localeCompare(b.validUntil ?? '9999'))
        case 'createdAt':   return dir * a.createdAt.localeCompare(b.createdAt)
        default:            return 0
      }
    })
  }, [allProposals, statusFilter, search, sortBy, sortDir])

  const hasSearch     = search.trim().length > 0
  const showContent   = activeTab !== 'TEMPLATES'

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Proposals</h1>
          {!isLoading && allProposals.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5 flex items-center gap-1">
              <IndianRupee size={10} />
              {totalValue.toLocaleString('en-IN')} in proposals
              {acceptedCount > 0 && ` · ${acceptedCount} accepted`}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
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
            className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
          >
            <LayoutTemplate size={14} />
            From Template
          </button>
          <button onClick={() => navigate('/app/proposals/new')} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            New Proposal
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
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
                  : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Templates tab */}
      {!showContent && <TemplatesTab />}

      {/* Toolbar: search + view toggle (proposals tabs only) */}
      {showContent && (
        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by title, client, lead…"
              className={cn(
                'w-full h-8 pl-8 pr-7 rounded-lg border text-[12.5px] outline-none transition-colors',
                'bg-white dark:bg-[#13141A]',
                'border-[#E4E7EC] dark:border-[#26283A]',
                'text-[#101828] dark:text-[#ECEEF3]',
                'placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]',
                'focus:border-[#6366F1] dark:focus:border-[#6366F1]',
              )}
            />
            {hasSearch && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] dark:hover:text-[#C2C8D8] transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
          {hasSearch && !isLoading && (
            <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74] shrink-0">
              {displayed.length} result{displayed.length !== 1 ? 's' : ''}
            </span>
          )}
          <div className="flex-1" />
          <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
            <button
              onClick={() => setView('table')}
              title="Table view"
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                view === 'table' ? 'bg-white dark:bg-[#13141A] text-[#6366F1] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]',
              )}
            >
              <List size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => setView('cards')}
              title="Card view"
              className={cn(
                'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                view === 'cards' ? 'bg-white dark:bg-[#13141A] text-[#6366F1] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]',
              )}
            >
              <LayoutGrid size={13} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}

      {/* Proposals content */}
      {showContent && (
        isLoading ? (
          view === 'table'
            ? <ProposalTableSkeleton />
            : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => <ProposalCardSkeleton key={i} />)}
              </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
              {hasSearch ? <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" /> : <FileText size={22} className="text-[#D0D5DD] dark:text-[#3D4258]" />}
            </div>
            <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {hasSearch ? `No results for "${search}"` : statusFilter === 'ALL' ? 'No proposals yet' : `No ${STATUS_LABELS[statusFilter as ProposalStatus]?.toLowerCase()} proposals`}
            </p>
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
              {hasSearch ? 'Try a different search term.' : statusFilter === 'ALL' ? 'Create your first proposal to get started.' : 'Try a different status filter.'}
            </p>
            {!hasSearch && statusFilter === 'ALL' && (
              <button onClick={() => navigate('/app/proposals/new')} className="btn-primary mt-4 text-[13px]">
                <Plus size={13} strokeWidth={2.5} /> New Proposal
              </button>
            )}
            {hasSearch && (
              <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : view === 'table' ? (
          <ProposalTable
            proposals={displayed}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onOpen={p => navigate(`/app/proposals/${p.id}`)}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {displayed.map(p => (
              <ProposalCard
                key={p.id}
                proposal={p}
                onClick={openP => navigate(`/app/proposals/${openP.id}`)}
                onConvertToContract={handleConvertToContract}
                onSaveAsTemplate={p => setSaveTemplateFor(p)}
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
      <div>
        <p className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-3">Starter Templates</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {systemTemplates.map(t => <TemplateCard key={t.id} template={t} mode="manage" />)}
        </div>
      </div>
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
            {userTemplates.map(t => <TemplateCard key={t.id} template={t} mode="manage" />)}
          </div>
        )}
      </div>
    </div>
  )
}
