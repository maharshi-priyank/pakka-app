import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, IndianRupee, LayoutGrid, List, SlidersHorizontal, Check } from 'lucide-react'
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
import FilterPanel, { FilterSection } from '@/components/filters/FilterPanel'
import AmountRangeFilter from '@/components/filters/AmountRangeFilter'

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
const VIEW_KEY = 'clinekt:leads:view'
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
  const [filterOpen,      setFilterOpen]      = useState(false)
  const [filters,         setFilters]         = useState<LeadFilters>(EMPTY_FILTERS)

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

    // Stage and source filters only apply in table view
    if (view === 'table') {
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
  }, [allLeads, search, view, filters, sortBy, sortDir])

  const hasSearch = search.trim().length > 0

  const activeCount = (filters.stages.length > 0 ? 1 : 0)
    + (filters.sources.length > 0 ? 1 : 0)
    + (filters.budgetMin || filters.budgetMax ? 1 : 0)
    + (filters.followUp ? 1 : 0)

  const followUpLabels: Record<string, string> = {
    overdue:   'Overdue',
    this_week: 'This week',
    unset:     'Not set',
  }

  const chips = [
    ...(filters.stages.length > 0
      ? [{ key: 'stages', label: `Stage: ${filters.stages.length === 1 ? STAGE_LABELS[filters.stages[0]] : `${filters.stages.length} stages`}`, onRemove: () => setFilters(f => ({ ...f, stages: [] })) }]
      : []),
    ...(filters.sources.length > 0
      ? [{ key: 'sources', label: `Source: ${filters.sources.length === 1 ? SOURCE_LABELS[filters.sources[0]] : `${filters.sources.length} sources`}`, onRemove: () => setFilters(f => ({ ...f, sources: [] })) }]
      : []),
    ...(filters.budgetMin || filters.budgetMax
      ? [{ key: 'budget', label: `Budget: ₹${filters.budgetMin || '0'} – ₹${filters.budgetMax || '∞'}`, onRemove: () => setFilters(f => ({ ...f, budgetMin: '', budgetMax: '' })) }]
      : []),
    ...(filters.followUp
      ? [{ key: 'followup', label: `Follow-up: ${followUpLabels[filters.followUp]}`, onRemove: () => setFilters(f => ({ ...f, followUp: '' })) }]
      : []),
  ]

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

          {/* Filter button — only visible in table view */}
          {view === 'table' && (
            <button
              onClick={() => setFilterOpen(v => !v)}
              className={cn(
                'flex items-center gap-1.5 h-9 px-2.5 rounded-lg border text-[12px] font-medium transition-colors',
                activeCount > 0
                  ? 'border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]'
                  : 'border-[#E8EBF2] dark:border-[#3D4258] text-[#667085] dark:text-[#8B92A8] bg-white dark:bg-[#21222D] hover:border-[#D0D5DD]',
              )}
            >
              <SlidersHorizontal size={12} />
              Filters
              {activeCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-[#6366F1] text-white text-[9px] font-bold flex items-center justify-center">
                  {activeCount}
                </span>
              )}
            </button>
          )}

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

      {/* Filter panel — table view only */}
      {view === 'table' && (
        <FilterPanel open={filterOpen} onClear={() => setFilters(EMPTY_FILTERS)} chips={chips}>
          <FilterSection label="Stage">
            <MultiCheckFilter
              options={LEAD_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
              selected={filters.stages}
              onChange={vals => setFilters(f => ({ ...f, stages: vals as LeadStage[] }))}
            />
          </FilterSection>
          <FilterSection label="Source">
            <MultiCheckFilter
              options={LEAD_SOURCES.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s }))}
              selected={filters.sources}
              onChange={vals => setFilters(f => ({ ...f, sources: vals }))}
            />
          </FilterSection>
          <FilterSection label="Budget">
            <AmountRangeFilter
              min={filters.budgetMin}
              max={filters.budgetMax}
              onMin={v => setFilters(f => ({ ...f, budgetMin: v }))}
              onMax={v => setFilters(f => ({ ...f, budgetMax: v }))}
            />
          </FilterSection>
          <FilterSection label="Follow-up">
            <div className="flex flex-col gap-1">
              {(['', 'overdue', 'this_week', 'unset'] as const).map(val => (
                <label key={val} className="flex items-center gap-2 cursor-pointer group">
                  <div className={cn(
                    'w-3.5 h-3.5 rounded-full border flex items-center justify-center transition-colors',
                    filters.followUp === val
                      ? 'bg-[#6366F1] border-[#6366F1]'
                      : 'border-[#D0D5DD] dark:border-[#3D4258] group-hover:border-[#6366F1]',
                  )}>
                    {filters.followUp === val && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <input type="radio" className="sr-only" checked={filters.followUp === val} onChange={() => setFilters(f => ({ ...f, followUp: val }))} />
                  <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                    {val === '' ? 'Any' : val === 'overdue' ? 'Overdue' : val === 'this_week' ? 'This week' : 'Not set'}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        </FilterPanel>
      )}

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

function MultiCheckFilter({
  options,
  selected,
  onChange,
}: {
  options:  { value: string; label: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
}) {
  function toggle(val: string) {
    onChange(selected.includes(val) ? selected.filter(v => v !== val) : [...selected, val])
  }

  return (
    <div className="flex flex-col gap-1">
      {options.map(opt => {
        const isOn = selected.includes(opt.value)
        return (
          <button
            key={opt.value}
            onClick={() => toggle(opt.value)}
            className="flex items-center gap-2 text-left group"
          >
            <div className={cn(
              'w-3.5 h-3.5 rounded flex items-center justify-center border shrink-0 transition-colors',
              isOn ? 'bg-[#6366F1] border-[#6366F1]' : 'border-[#D0D5DD] dark:border-[#3D4258] group-hover:border-[#6366F1]',
            )}>
              {isOn && <Check size={8} strokeWidth={3} className="text-white" />}
            </div>
            <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8]">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
