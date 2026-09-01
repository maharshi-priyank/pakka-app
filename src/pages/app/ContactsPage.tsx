import { useState, useMemo, useEffect, useRef } from 'react'
import { Plus, Search, X, LayoutGrid, List, Archive } from 'lucide-react'
import { AddContactModal, ContactsCards, ContactsTable, ContactsTableSkeleton } from '@/features/contacts'
import { useContacts } from '@/features/contacts'
import { cn, formatCurrency } from '@/lib/utils'
import AIIcon from '@/features/ai/components/AIIcon'
import AIContactModal from '@/features/ai/components/AIContactModal'
import type { ContactStage } from '@/features/contacts/schemas/contact.schema'
import { CONTACT_STAGES, STAGE_LABELS, CONTACT_SOURCES, SOURCE_LABELS } from '@/features/contacts/schemas/contact.schema'
import type { SortField, SortDir } from '@/features/contacts/components/ContactsTable'
import MultiSelectPill from '@/components/filters/MultiSelectPill'
import FollowUpPill from '@/components/filters/FollowUpPill'
import AmountRangePill from '@/components/filters/AmountRangePill'

interface ContactFilters {
  stages:    ContactStage[]
  sources:   string[]
  valueMin:  string
  valueMax:  string
  followUp:  'overdue' | 'this_week' | 'unset' | ''
}

const EMPTY_FILTERS: ContactFilters = { stages: [], sources: [], valueMin: '', valueMax: '', followUp: '' }

type ViewMode = 'cards' | 'table'
const VIEW_KEY = 'clearwork:contacts:view'
function getStoredView(): ViewMode {
  try {
    const v = localStorage.getItem(VIEW_KEY)
    return v === 'table' ? 'table' : 'cards'
  } catch { return 'cards' }
}

export default function ContactsPage() {
  const [search,          setSearch]          = useState('')
  const [view,            setView]            = useState<ViewMode>(getStoredView)
  const [sortBy,          setSortBy]          = useState<SortField>('createdAt')
  const [sortDir,         setSortDir]         = useState<SortDir>('desc')
  const [showAdd,         setShowAdd]         = useState(false)
  const [showAI,          setShowAI]          = useState(false)
  const [filters,         setFilters]         = useState<ContactFilters>(EMPTY_FILTERS)
  const [includeArchived, setIncludeArchived] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useContacts({ limit: 500, includeArchived: includeArchived || undefined })
  const allContacts   = data?.items ?? []
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
    let list = allContacts

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email   ?? '').toLowerCase().includes(q) ||
        (c.service ?? '').toLowerCase().includes(q),
      )
    }

    if (filters.stages.length > 0) {
      list = list.filter(c => filters.stages.includes(c.stage))
    }
    if (filters.sources.length > 0) {
      list = list.filter(c => c.source && filters.sources.includes(c.source))
    }
    if (filters.followUp === 'overdue') {
      list = list.filter(c => c.followUpAt && new Date(c.followUpAt) < new Date())
    } else if (filters.followUp === 'this_week') {
      const now = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end   = new Date(now); end.setDate(end.getDate() + (6 - end.getDay())); end.setHours(23, 59, 59, 999)
      list = list.filter(c => {
        if (!c.followUpAt) return false
        const d = new Date(c.followUpAt)
        return d >= start && d <= end
      })
    } else if (filters.followUp === 'unset') {
      list = list.filter(c => !c.followUpAt)
    }

    if (filters.valueMin) list = list.filter(c => Number(c.dealValue ?? 0) >= Number(filters.valueMin))
    if (filters.valueMax) list = list.filter(c => Number(c.dealValue ?? 0) <= Number(filters.valueMax))

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'name':       return dir * a.name.localeCompare(b.name)
        case 'dealValue':  return dir * ((Number(a.dealValue) || 0) - (Number(b.dealValue) || 0))
        case 'followUpAt': return dir * ((a.followUpAt ?? '9999').localeCompare(b.followUpAt ?? '9999'))
        case 'createdAt':  return dir * a.createdAt.localeCompare(b.createdAt)
        default:           return 0
      }
    })
  }, [allContacts, search, filters, sortBy, sortDir])

  const hasSearch = search.trim().length > 0
  const hasFilters = filters.stages.length > 0 || filters.sources.length > 0 ||
    !!filters.valueMin || !!filters.valueMax || !!filters.followUp

  const isEmpty = !isLoading && displayed.length === 0

  return (
    <div className="flex flex-col gap-4 p-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-tight">Contacts</h1>
          {pipelineValue !== null && pipelineValue > 0 && (
            <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5 flex items-center gap-1">
              <span>{formatCurrency(pipelineValue)} in pipeline</span>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Add with AI */}
          <button
            onClick={() => setShowAI(true)}
            title="Add with AI"
            className="flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg text-[13px] font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md transition-all"
          >
            <AIIcon size={13} />
            <span className="hidden sm:inline">Add with AI</span>
          </button>

          {/* Add Contact */}
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[13px] font-semibold transition-colors shadow-sm"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Contact
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
            placeholder="Search contacts…"
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
          options={CONTACT_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
          selected={filters.stages}
          onChange={vals => setFilters(f => ({ ...f, stages: vals as ContactStage[] }))}
        />
        <MultiSelectPill
          label="Source"
          options={CONTACT_SOURCES.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s }))}
          selected={filters.sources}
          onChange={vals => setFilters(f => ({ ...f, sources: vals }))}
        />
        <AmountRangePill
          label="Value"
          min={filters.valueMin}
          max={filters.valueMax}
          onMin={v => setFilters(f => ({ ...f, valueMin: v }))}
          onMax={v => setFilters(f => ({ ...f, valueMax: v }))}
          onClear={() => setFilters(f => ({ ...f, valueMin: '', valueMax: '' }))}
        />
        <FollowUpPill
          value={filters.followUp}
          onChange={v => setFilters(f => ({ ...f, followUp: v }))}
        />

        {(hasSearch || hasFilters) && !isLoading && (
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

        {/* View toggle: cards / table */}
        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
          <button
            onClick={() => setView('cards')}
            title="Cards view"
            className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'cards' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
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

      {/* Empty state */}
      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
            <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            {hasSearch ? `No results for "${search}"` : 'No contacts yet'}
          </p>
          {hasSearch ? (
            <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              Clear search
            </button>
          ) : (
            <button onClick={() => setShowAdd(true)} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              Add your first contact
            </button>
          )}
        </div>
      )}

      {/* Table view */}
      {view === 'table' && !isEmpty && (
        isLoading ? (
          <ContactsTableSkeleton />
        ) : (
          <ContactsTable
            contacts={displayed}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
          />
        )
      )}

      {/* Cards view */}
      {view === 'cards' && !isEmpty && (
        isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 animate-pulse space-y-3">
                <div className="flex justify-between">
                  <div className="h-3.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-28" />
                  <div className="h-5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full w-20" />
                </div>
                <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
                <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-24" />
              </div>
            ))}
          </div>
        ) : (
          <ContactsCards contacts={displayed} />
        )
      )}

      {/* Add modal */}
      <AddContactModal open={showAdd} onClose={() => setShowAdd(false)} />

      {/* AI contact creation modal */}
      {showAI && <AIContactModal onClose={() => setShowAI(false)} />}
    </div>
  )
}
