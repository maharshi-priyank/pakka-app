import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, IndianRupee, LayoutGrid, List } from 'lucide-react'
import AIIcon from '@/features/ai/components/AIIcon'
import { LeadsKanban, AddLeadModal } from '@/features/leads'
import { useLeads } from '@/features/leads'
import { cn } from '@/lib/utils'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import AILeadModal from '@/features/ai/components/AILeadModal'
import LeadProposalPickerModal from '@/features/leads/components/LeadProposalPickerModal'
import LeadTable, { LeadTableSkeleton } from '@/features/leads/components/LeadTable'
import type { SortField, SortDir } from '@/features/leads/components/LeadTable'
import LeadDrawer from '@/features/leads/components/LeadDrawer'

type ViewMode = 'kanban' | 'table'
const VIEW_KEY = 'pakka:leads:view'
function getStoredView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'kanban' } catch { return 'kanban' }
}

export default function LeadsPage() {
  const [search,          setSearch]          = useState('')
  const [view,            setView]            = useState<ViewMode>(getStoredView)
  const [sortBy,          setSortBy]          = useState<SortField>('createdAt')
  const [sortDir,         setSortDir]         = useState<SortDir>('desc')
  const [showAdd,         setShowAdd]         = useState(false)
  const [showAI,          setShowAI]          = useState(false)
  const [proposalForLead, setProposalForLead] = useState<Lead | null>(null)
  const [drawerLead,      setDrawerLead]      = useState<Lead | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useLeads({ limit: 500 })
  const allLeads      = data?.items ?? []
  const pipelineValue = data?.pipelineValue ? Number(data.pipelineValue) : null

  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSort(field: SortField) {
    if (field === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const displayed = useMemo(() => {
    let list = allLeads

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company ?? '').toLowerCase().includes(q) ||
        (l.email   ?? '').toLowerCase().includes(q) ||
        (l.service ?? '').toLowerCase().includes(q),
      )
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'name':       return dir * a.name.localeCompare(b.name)
        case 'budget':     return dir * ((Number(a.budget) || 0) - (Number(b.budget) || 0))
        case 'followUpAt': return dir * ((a.followUpAt ?? '9999').localeCompare(b.followUpAt ?? '9999'))
        case 'createdAt':  return dir * a.createdAt.localeCompare(b.createdAt)
        default:           return 0
      }
    })
  }, [allLeads, search, sortBy, sortDir])

  const hasSearch = search.trim().length > 0

  return (
    <div className="space-y-4 max-w-[1400px]">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Leads</h1>
          {pipelineValue !== null && pipelineValue > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5 flex items-center gap-1">
              <IndianRupee size={10} />
              {pipelineValue.toLocaleString('en-IN')} in pipeline
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className={cn(
                'h-9 pl-8 pr-7 text-[12.5px] bg-white dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3]',
                'border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg outline-none',
                'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 transition-all w-[180px]',
                'placeholder:text-[#C9CDD4] dark:placeholder:text-[#545C74]',
              )}
            />
            {hasSearch && (
              <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors">
                <X size={12} />
              </button>
            )}
          </div>

          {/* View toggle */}
          <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
            <button
              onClick={() => setView('kanban')}
              title="Kanban view"
              className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'kanban' ? 'bg-white dark:bg-[#13141A] text-[#6366F1] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
            >
              <LayoutGrid size={13} strokeWidth={2} />
            </button>
            <button
              onClick={() => setView('table')}
              title="Table view"
              className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'table' ? 'bg-white dark:bg-[#13141A] text-[#6366F1] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
            >
              <List size={13} strokeWidth={2} />
            </button>
          </div>

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
            Add with AI
          </button>

          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        isLoading ? (
          <LeadTableSkeleton />
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
              <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
            </div>
            <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {hasSearch ? `No results for "${search}"` : 'No leads yet'}
            </p>
            {hasSearch && (
              <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#6366F1] font-semibold hover:text-[#4F46E5] transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            {hasSearch && (
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
                {displayed.length} result{displayed.length !== 1 ? 's' : ''}
              </p>
            )}
            <LeadTable
              leads={displayed}
              sortBy={sortBy}
              sortDir={sortDir}
              onSort={handleSort}
              onOpen={lead => setDrawerLead(lead)}
              onNewProposal={lead => setProposalForLead(lead)}
            />
          </>
        )
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <LeadsKanban search={search} onNewProposal={lead => setProposalForLead(lead)} />
      )}

      {/* Modals */}
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} />
      {showAI && <AILeadModal onClose={() => setShowAI(false)} />}
      {proposalForLead && (
        <LeadProposalPickerModal
          lead={proposalForLead}
          onClose={() => setProposalForLead(null)}
        />
      )}
      {drawerLead && (
        <LeadDrawer
          lead={drawerLead}
          onClose={() => setDrawerLead(null)}
        />
      )}
    </div>
  )
}
