import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileText, Search, X, LayoutGrid, List } from 'lucide-react'
import { usePermissionRedirect } from '@/hooks/usePermissionRedirect'
import { Permission } from '@/types/permissions'
import { cn } from '@/lib/utils'
import { useInvoices, useDeleteInvoice, useVoidInvoice } from '@/features/invoices/hooks/useInvoices'
import InvoiceCard, { InvoiceCardSkeleton } from '@/features/invoices/components/InvoiceCard'
import InvoiceTable, { InvoiceTableSkeleton } from '@/features/invoices/components/InvoiceTable'
import type { SortField, SortDir } from '@/features/invoices/components/InvoiceTable'
import type { Invoice, InvoiceStatus } from '@/features/invoices/schemas/invoice.schema'
import { STATUS_LABELS } from '@/features/invoices/schemas/invoice.schema'
import ClientMultiSelect from '@/components/filters/ClientMultiSelect'
import DateRangePill from '@/components/filters/DateRangePill'
import AmountRangePill from '@/components/filters/AmountRangePill'
import { ConfirmModal } from '@/components/ConfirmModal'

const STATUS_TABS: Array<{ value: InvoiceStatus | 'ALL'; label: string }> = [
  { value: 'ALL',     label: 'All' },
  { value: 'DRAFT',   label: 'Draft' },
  { value: 'SENT',    label: 'Sent' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID',    label: 'Paid' },
]

interface InvoiceFilters {
  clientIds:  string[]
  dateFrom:   string
  dateTo:     string
  amountMin:  string
  amountMax:  string
}

const EMPTY_FILTERS: InvoiceFilters = { clientIds: [], dateFrom: '', dateTo: '', amountMin: '', amountMax: '' }

type ViewMode = 'table' | 'cards'
const VIEW_KEY = 'clearwork:invoices:view'
function getStoredView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'table' } catch { return 'table' }
}

export default function InvoicesPage() {
  usePermissionRedirect(Permission.VIEW_INVOICES)
  const navigate = useNavigate()

  const [statusFilter,  setStatusFilter]  = useState<InvoiceStatus | 'ALL'>('ALL')
  const [search,        setSearch]        = useState('')
  const [view,          setView]          = useState<ViewMode>(getStoredView)
  const [sortBy,        setSortBy]        = useState<SortField>('createdAt')
  const [sortDir,       setSortDir]       = useState<SortDir>('desc')
  const [filters,       setFilters]       = useState<InvoiceFilters>(EMPTY_FILTERS)
  const [deleteTarget,  setDeleteTarget]  = useState<Invoice | null>(null)
  const [voidTarget,    setVoidTarget]    = useState<Invoice | null>(null)

  const searchRef = useRef<HTMLInputElement>(null)
  const deleteMut = useDeleteInvoice()
  const voidMut   = useVoidInvoice()

  const { data, isLoading } = useInvoices({ limit: 500 })
  const allInvoices  = data?.items ?? []
  const paidCount    = allInvoices.filter(i => i.status === 'PAID').length
  const overdueCount = allInvoices.filter(i => i.status === 'OVERDUE').length

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
    let list = allInvoices

    if (statusFilter !== 'ALL') list = list.filter(i => i.status === statusFilter)

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(i =>
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.client?.name    ?? '').toLowerCase().includes(q) ||
        (i.client?.company ?? '').toLowerCase().includes(q) ||
        (i.contract?.title ?? '').toLowerCase().includes(q),
      )
    }

    if (filters.clientIds.length > 0) {
      list = list.filter(i => i.clientId && filters.clientIds.includes(i.clientId))
    }
    if (filters.dateFrom) {
      list = list.filter(i => i.createdAt.slice(0, 10) >= filters.dateFrom)
    }
    if (filters.dateTo) {
      list = list.filter(i => i.createdAt.slice(0, 10) <= filters.dateTo)
    }
    if (filters.amountMin) {
      list = list.filter(i => Number(i.total) >= Number(filters.amountMin))
    }
    if (filters.amountMax) {
      list = list.filter(i => Number(i.total) <= Number(filters.amountMax))
    }

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'invoiceNumber': return dir * a.invoiceNumber.localeCompare(b.invoiceNumber)
        case 'total':         return dir * (Number(a.total) - Number(b.total))
        case 'dueDate':       return dir * ((a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
        case 'createdAt':     return dir * a.createdAt.localeCompare(b.createdAt)
        default:              return 0
      }
    })
  }, [allInvoices, statusFilter, search, filters, sortBy, sortDir])

  const hasSearch = search.trim().length > 0

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Invoices</h1>
          {!isLoading && allInvoices.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">
              {paidCount} paid
              {overdueCount > 0 && <span className="text-[#D92D20]"> · {overdueCount} overdue</span>}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/invoices/new')} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Invoice
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count = tab.value === 'ALL' ? allInvoices.length : allInvoices.filter(i => i.status === tab.value).length
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
                  tab.value === 'OVERDUE'
                    ? 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20]'
                    : isActive ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F] text-[#2563EB]' : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
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
            placeholder="Search invoice, client, contract…"
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
          ? <InvoiceTableSkeleton />
          : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <InvoiceCardSkeleton key={i} />)}
            </div>
      ) : displayed.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
            {hasSearch ? <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" /> : <FileText size={22} className="text-[#D0D5DD] dark:text-[#3D4258]" />}
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            {hasSearch ? `No results for "${search}"` : statusFilter === 'ALL' ? 'No invoices yet' : `No ${STATUS_LABELS[statusFilter as InvoiceStatus]?.toLowerCase()} invoices`}
          </p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            {hasSearch ? 'Try a different search term.' : statusFilter === 'ALL' ? 'Create an invoice manually or generate one from a signed contract.' : 'Try a different filter.'}
          </p>
          {!hasSearch && statusFilter === 'ALL' && (
            <button onClick={() => navigate('/invoices/new')} className="btn-primary mt-4 text-[13px]">
              <Plus size={13} strokeWidth={2.5} /> New Invoice
            </button>
          )}
          {hasSearch && (
            <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
              Clear search
            </button>
          )}
        </div>
      ) : view === 'table' ? (
        <InvoiceTable
          invoices={displayed}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          onOpen={(inv: Invoice) => navigate(`/invoices/${inv.id}`)}
          onDelete={inv => setDeleteTarget(inv)}
          onVoid={inv => setVoidTarget(inv)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {displayed.map(inv => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              onClick={(i: Invoice) => navigate(`/invoices/${i.id}`)}
              onDelete={i => setDeleteTarget(i)}
              onVoid={i => setVoidTarget(i)}
            />
          ))}
        </div>
      )}
      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteMut.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }}
          title={`Delete invoice ${deleteTarget.invoiceNumber}?`}
          description="This draft invoice will be permanently deleted. This cannot be undone."
          confirmLabel="Delete Invoice"
          variant="delete"
          isLoading={deleteMut.isPending}
        />
      )}

      {voidTarget && (
        <ConfirmModal
          open={!!voidTarget}
          onClose={() => setVoidTarget(null)}
          onConfirm={() => {
            voidMut.mutate(voidTarget.id)
            setVoidTarget(null)
          }}
          title={`Void invoice ${voidTarget.invoiceNumber}?`}
          description="This will mark the invoice as CANCELLED. The client payment link will no longer work."
          confirmLabel="Void Invoice"
          variant="void"
          isLoading={voidMut.isPending}
        />
      )}
    </div>
  )
}
