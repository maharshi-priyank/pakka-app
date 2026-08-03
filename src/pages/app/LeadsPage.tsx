import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Plus, Search, X, IndianRupee, LayoutGrid, List, Archive, Telescope, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import AIIcon from '@/features/ai/components/AIIcon'
import { LeadsKanban, AddLeadModal } from '@/features/leads'
import { useLeads } from '@/features/leads'
import { cn } from '@/lib/utils'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import { LEAD_STAGES, LEAD_SOURCES, STAGE_LABELS } from '@/features/leads/schemas/lead.schema'
import type { LeadStage } from '@/features/leads/schemas/lead.schema'
import AILeadModal from '@/features/ai/components/AILeadModal'
import LeadProposalPickerModal from '@/features/leads/components/LeadProposalPickerModal'
import LeadTable, { LeadTableSkeleton } from '@/features/leads/components/LeadTable'
import type { SortField, SortDir } from '@/features/leads/components/LeadTable'
import LeadDrawer from '@/features/leads/components/LeadDrawer'
import MultiSelectPill from '@/components/filters/MultiSelectPill'
import FollowUpPill from '@/components/filters/FollowUpPill'
import AmountRangePill from '@/components/filters/AmountRangePill'

const SOURCE_LABELS: Record<string, string> = {
  instagram:     'Instagram',
  referral:      'Referral',
  website:       'Website',
  linkedin:      'LinkedIn',
  cold_outreach: 'Cold outreach',
  other:         'Other',
}

interface LeadFilters {
  stages:    LeadStage[]
  sources:   string[]
  budgetMin: string
  budgetMax: string
  followUp:  'overdue' | 'this_week' | 'unset' | ''
}

const EMPTY_FILTERS: LeadFilters = { stages: [], sources: [], budgetMin: '', budgetMax: '', followUp: '' }

type ViewMode = 'kanban' | 'table'
const VIEW_KEY = 'clearwork:leads:view'
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
  const [filters,         setFilters]         = useState<LeadFilters>(EMPTY_FILTERS)
  const [includeArchived, setIncludeArchived] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const openLeadFinder = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const base = import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'
    const url = session
      ? `${base}?at=${encodeURIComponent(session.access_token)}&rt=${encodeURIComponent(session.refresh_token)}`
      : base
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const { data, isLoading } = useLeads({ limit: 500, includeArchived: includeArchived || undefined, hasSourceForm: false })
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

    if (filters.stages.length > 0) {
      list = list.filter(l => filters.stages.includes(l.stage))
    }
    if (filters.sources.length > 0) {
      list = list.filter(l => l.source && filters.sources.includes(l.source))
    }
    if (filters.followUp === 'overdue') {
      list = list.filter(l => l.followUpAt && new Date(l.followUpAt) < new Date())
    } else if (filters.followUp === 'this_week') {
      const now   = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end   = new Date(now); end.setDate(end.getDate() + (6 - end.getDay())); end.setHours(23, 59, 59, 999)
      list = list.filter(l => {
        if (!l.followUpAt) return false
        const d = new Date(l.followUpAt)
        return d >= start && d <= end
      })
    } else if (filters.followUp === 'unset') {
      list = list.filter(l => !l.followUpAt)
    }

    if (filters.budgetMin) {
      list = list.filter(l => Number(l.budget ?? 0) >= Number(filters.budgetMin))
    }
    if (filters.budgetMax) {
      list = list.filter(l => Number(l.budget ?? 0) <= Number(filters.budgetMax))
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
  }, [allLeads, search, filters, sortBy, sortDir])

  const hasSearch = search.trim().length > 0

  return (
    <div className="space-y-4 max-w-[1400px]">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Leads</h1>
          {pipelineValue !== null && pipelineValue > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5 flex items-center gap-1">
              <IndianRupee size={10} />
              {pipelineValue.toLocaleString('en-IN')} in pipeline
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Lead Finder link */}
          <a
            href={import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'}
            onClick={openLeadFinder}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
          >
            <Telescope size={13} />
            Find Leads
            <ExternalLink size={10} className="opacity-60" />
          </a>

          {/* AI button */}
          <button
            onClick={() => setShowAI(true)}
            title="Add with AI"
            className={cn(
              'flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg text-[13px] font-semibold transition-all',
              'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
              'hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md',
            )}
          >
            <AIIcon size={13} />
            <span className="hidden sm:inline">Add with AI</span>
          </button>
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className={cn(
              'h-8 pl-8 pr-7 text-[12.5px] bg-white dark:bg-[#13141A] text-[#101828] dark:text-[#ECEEF3]',
              'border border-[#E4E7EC] dark:border-[#26283A] rounded-lg outline-none',
              'focus:border-[#2563EB] transition-colors w-full',
              'placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]',
            )}
          />
          {hasSearch && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        {/* Filter pills */}
        <MultiSelectPill
          label="Stage"
          options={LEAD_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
          selected={filters.stages}
          onChange={vals => setFilters(f => ({ ...f, stages: vals as LeadStage[] }))}
        />
        <MultiSelectPill
          label="Source"
          options={LEAD_SOURCES.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s }))}
          selected={filters.sources}
          onChange={vals => setFilters(f => ({ ...f, sources: vals }))}
        />
        <AmountRangePill
          label="Budget"
          min={filters.budgetMin}
          max={filters.budgetMax}
          onMin={v => setFilters(f => ({ ...f, budgetMin: v }))}
          onMax={v => setFilters(f => ({ ...f, budgetMax: v }))}
          onClear={() => setFilters(f => ({ ...f, budgetMin: '', budgetMax: '' }))}
        />
        <FollowUpPill
          value={filters.followUp}
          onChange={v => setFilters(f => ({ ...f, followUp: v }))}
        />

        {hasSearch && !isLoading && (
          <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex-1" />

        {/* Archive toggle */}
        <button
          onClick={() => setIncludeArchived(prev => !prev)}
          className={cn(
            'flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors',
            includeArchived
              ? 'bg-[#F2F4F7] border-[#D0D5DD] text-[#344054] dark:bg-[#1E2030] dark:border-[#333649] dark:text-[#CDD2E0]'
              : 'border-transparent text-[#98A2B3] hover:text-[#667085]',
          )}
        >
          <Archive size={12} />
          Show archived
        </button>

        {/* View toggle */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
          <button
            onClick={() => setView('kanban')}
            title="Kanban view"
            className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'kanban' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
          >
            <LayoutGrid size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setView('table')}
            title="Table view"
            className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'table' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
          >
            <List size={13} strokeWidth={2} />
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
              <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <LeadTable
            leads={displayed}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onOpen={lead => setDrawerLead(lead)}
            onNewProposal={lead => setProposalForLead(lead)}
          />
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
