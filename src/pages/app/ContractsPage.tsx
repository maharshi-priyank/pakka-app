import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileSignature, Search, X, LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContracts } from '@/features/contracts/hooks/useContracts'
import ContractCard, { ContractCardSkeleton } from '@/features/contracts/components/ContractCard'
import ContractTable, { ContractTableSkeleton } from '@/features/contracts/components/ContractTable'
import type { SortField, SortDir } from '@/features/contracts/components/ContractTable'
import type { ContractStatus, Contract } from '@/features/contracts/schemas/contract.schema'
import { STATUS_LABELS } from '@/features/contracts/schemas/contract.schema'
import ClientMultiSelect from '@/components/filters/ClientMultiSelect'
import DateRangePill from '@/components/filters/DateRangePill'
import AmountRangePill from '@/components/filters/AmountRangePill'

const STATUS_TABS: Array<{ value: ContractStatus | 'ALL'; label: string }> = [
  { value: 'ALL',      label: 'All' },
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'SENT',     label: 'Sent' },
  { value: 'SIGNED',   label: 'Signed' },
  { value: 'DECLINED', label: 'Declined' },
]

interface ContractFilters {
  clientIds:  string[]
  dateFrom:   string
  dateTo:     string
  amountMin:  string
  amountMax:  string
}

const EMPTY_FILTERS: ContractFilters = { clientIds: [], dateFrom: '', dateTo: '', amountMin: '', amountMax: '' }

type ViewMode = 'table' | 'cards'
const VIEW_KEY = 'clearwork:contracts:view'
function getStoredView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'table' } catch { return 'table' }
}

export default function ContractsPage() {
  const navigate = useNavigate()

  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')
  const [search,       setSearch]       = useState('')
  const [view,         setView]         = useState<ViewMode>(getStoredView)
  const [sortBy,       setSortBy]       = useState<SortField>('createdAt')
  const [sortDir,      setSortDir]      = useState<SortDir>('desc')
  const [filters,      setFilters]      = useState<ContractFilters>(EMPTY_FILTERS)

  const searchRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useContracts({ limit: 500 })
  const allContracts  = data?.items ?? []
  const signedCount   = allContracts.filter(c => c.status === 'SIGNED').length
  const awaitingCount = allContracts.filter(c => c.status === 'SENT').length

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
    let list = allContracts

    if (statusFilter !== 'ALL') list = list.filter(c => c.status === statusFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        c.title.toLowerCase().includes(q) ||
        (c.client?.name      ?? '').toLowerCase().includes(q) ||
        (c.client?.company   ?? '').toLowerCase().includes(q) ||
        (c.proposal?.title   ?? '').toLowerCase().includes(q),
      )
    }

    if (filters.clientIds.length > 0) {
      list = list.filter(c => c.clientId && filters.clientIds.includes(c.clientId))
    }
    if (filters.dateFrom) {
      list = list.filter(c => c.createdAt.slice(0, 10) >= filters.dateFrom)
    }
    if (filters.dateTo) {
      list = list.filter(c => c.createdAt.slice(0, 10) <= filters.dateTo)
    }
    if (filters.amountMin) {
      const min = Number(filters.amountMin)
      list = list.filter(c => {
        const amt = ((c.content as Record<string, unknown>)?.totalAmount as number) ?? 0
        return amt >= min
      })
    }
    if (filters.amountMax) {
      const max = Number(filters.amountMax)
      list = list.filter(c => {
        const amt = ((c.content as Record<string, unknown>)?.totalAmount as number) ?? 0
        return amt <= max
      })
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      const aAmt = ((a.content as Record<string, unknown>)?.totalAmount as number) ?? 0
      const bAmt = ((b.content as Record<string, unknown>)?.totalAmount as number) ?? 0
      switch (sortBy) {
        case 'title':       return dir * a.title.localeCompare(b.title)
        case 'totalAmount': return dir * (aAmt - bAmt)
        case 'signedAt':    return dir * ((a.signedAt ?? '9999').localeCompare(b.signedAt ?? '9999'))
        case 'createdAt':   return dir * a.createdAt.localeCompare(b.createdAt)
        default:            return 0
      }
    })
  }, [allContracts, statusFilter, search, filters, sortBy, sortDir])

  const hasSearch  = search.trim().length > 0

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Contracts</h1>
          {!isLoading && allContracts.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">
              {signedCount} signed
              {awaitingCount > 0 && ` · ${awaitingCount} awaiting signature`}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/contracts/new')} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Contract
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count = tab.value === 'ALL' ? allContracts.length : allContracts.filter(c => c.status === tab.value).length
          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5',
                isActive ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              {tab.label}
              {count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#2563EB]' : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title, client, proposal…"
            className={cn(
              'w-full h-8 pl-8 pr-7 rounded-lg border text-[12.5px] outline-none transition-colors',
              'bg-white dark:bg-[#13141A] border-[#E4E7EC] dark:border-[#26283A]',
              'text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]',
              'focus:border-[#2563EB] dark:focus:border-[#2563EB]',
            )}
          />
          {hasSearch && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] dark:hover:text-[#C2C8D8] transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        <ClientMultiSelect
          selected={filters.clientIds}
          onChange={ids => setFilters(f => ({ ...f, clientIds: ids }))}
        />
        <DateRangePill
          from={filters.dateFrom} to={filters.dateTo}
          onFrom={v => setFilters(f => ({ ...f, dateFrom: v }))}
          onTo={v => setFilters(f => ({ ...f, dateTo: v }))}
          onClear={() => setFilters(f => ({ ...f, dateFrom: '', dateTo: '' }))}
        />
        <AmountRangePill
          min={filters.amountMin} max={filters.amountMax}
          onMin={v => setFilters(f => ({ ...f, amountMin: v }))}
          onMax={v => setFilters(f => ({ ...f, amountMax: v }))}
          onClear={() => setFilters(f => ({ ...f, amountMin: '', amountMax: '' }))}
        />

        {hasSearch && !isLoading && (
          <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74] shrink-0">
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </span>
        )}
        <div className="flex-1" />
        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
          <button onClick={() => setView('table')} title="Table view" className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'table' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}>
            <List size={13} strokeWidth={2} />
          </button>
          <button onClick={() => setView('cards')} title="Card view" className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'cards' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}>
            <LayoutGrid size={13} strokeWidth={2} />
          </button>
        </div>
      </div>


      {/* Content */}
      {isLoading ? (
        view === 'table'
          ? <ContractTableSkeleton />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <ContractCardSkeleton key={i} />)}
            </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
            {hasSearch ? <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" /> : <FileSignature size={22} className="text-[#D0D5DD] dark:text-[#3D4258]" />}
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            {hasSearch ? `No results for "${search}"` : statusFilter === 'ALL' ? 'No contracts yet' : `No ${STATUS_LABELS[statusFilter as ContractStatus]?.toLowerCase()} contracts`}
          </p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            {hasSearch ? 'Try a different search term.' : statusFilter === 'ALL' ? 'Create a contract manually or generate one from an accepted proposal.' : 'Try a different filter.'}
          </p>
          {!hasSearch && statusFilter === 'ALL' && (
            <button onClick={() => navigate('/contracts/new')} className="btn-primary mt-4 text-[13px]">
              <Plus size={13} strokeWidth={2.5} /> New Contract
            </button>
          )}
          {hasSearch && (
            <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              Clear search
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        <ContractTable
          contracts={displayed}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onOpen={(c: Contract) => navigate(`/contracts/${c.id}`)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayed.map(c => (
            <ContractCard key={c.id} contract={c} onClick={(c: Contract) => navigate(`/contracts/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
