import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, Mail, Phone, FileText, FileSignature, Receipt, MoreHorizontal, Archive } from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatDate } from '@/lib/utils'
import { useClients, useDeleteClient, useArchiveClient, useUnarchiveClient, type Client } from '@/features/clients/hooks/useClients'
import AddClientModal from '@/features/clients/components/AddClientModal'
import { RemoveModal } from '@/components/RemoveModal'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function ClientsPage() {
  const [search,          setSearch]          = useState('')
  const [includeArchived, setIncludeArchived] = useState(false)
  const [showAdd,         setShowAdd]         = useState(false)
  const [removeTarget,    setRemoveTarget]    = useState<Client | null>(null)
  const navigate = useNavigate()

  const { data, isLoading } = useClients(search || undefined, includeArchived)
  const clients = data?.clients ?? []

  const archiveMut   = useArchiveClient()
  const unarchiveMut = useUnarchiveClient()
  const deleteMut    = useDeleteClient()

  const handleArchive = (client: Client) => {
    if (client.archivedAt) {
      unarchiveMut.mutate(client.id, { onSuccess: () => toast.success('Client unarchived') })
    } else {
      archiveMut.mutate(client.id, { onSuccess: () => toast.success('Client archived') })
    }
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Clients</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            {data ? `${data.total} client${data.total !== 1 ? 's' : ''}` : 'Manage your client relationships'}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0D1117] dark:bg-[#6366F1] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
        >
          <Plus size={15} strokeWidth={2.5} />
          Add Client
        </button>
      </div>

      {/* Search + archive toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, company, or email…"
            className="form-input w-full pl-8"
          />
        </div>
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
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingGrid />
      ) : clients.length === 0 ? (
        <EmptyState search={search} onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map(client => (
            <ClientCard
              key={client.id}
              client={client}
              onClick={() => navigate(`/clients/${client.id}`)}
              onRemove={() => setRemoveTarget(client)}
              onUnarchive={() => handleArchive(client)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}

      {removeTarget && (
        <RemoveModal
          open
          onClose={() => setRemoveTarget(null)}
          onArchive={() => {
            archiveMut.mutate(removeTarget.id, { onSuccess: () => toast.success('Client archived') })
            setRemoveTarget(null)
          }}
          onDelete={() => {
            deleteMut.mutate(removeTarget.id, { onSuccess: () => toast.success('Client deleted') })
            setRemoveTarget(null)
          }}
          entityLabel={removeTarget.company ?? removeTarget.name}
          entityType="client"
          hasLinkedRecords={(removeTarget._count?.proposals ?? 0) + (removeTarget._count?.contracts ?? 0) + (removeTarget._count?.invoices ?? 0) > 0}
          linkedRecordsSummary={[
            removeTarget._count?.proposals && `${removeTarget._count.proposals} proposal${removeTarget._count.proposals > 1 ? 's' : ''}`,
            removeTarget._count?.contracts && `${removeTarget._count.contracts} contract${removeTarget._count.contracts > 1 ? 's' : ''}`,
            removeTarget._count?.invoices  && `${removeTarget._count.invoices} invoice${removeTarget._count.invoices > 1 ? 's' : ''}`,
          ].filter(Boolean).join(', ') || undefined}
          isArchiving={archiveMut.isPending}
          isDeleting={deleteMut.isPending}
        />
      )}
    </div>
  )
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({
  client,
  onClick,
  onRemove,
  onUnarchive,
}: {
  client: Client
  onClick: () => void
  onRemove: () => void
  onUnarchive: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const initials = (client.company ?? client.name)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div
      className={cn(
        'card-glass p-5 text-left hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all group relative',
        client.archivedAt && 'opacity-60',
      )}
    >
      {/* Archived chip */}
      {client.archivedAt && (
        <span className="absolute top-3 right-10 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          Archived
        </span>
      )}

      {/* Kebab menu */}
      <div className="absolute top-3 right-3">
        <button
          onClick={e => { e.stopPropagation(); setMenuOpen(v => !v) }}
          className="p-1 rounded-lg text-[#98A2B3] hover:bg-[#F2F4F7] dark:hover:bg-[#1E2030] hover:text-[#344054] transition-colors"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-7 z-20 w-36 bg-white dark:bg-[#1A1C2A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-lg py-1 text-[12.5px]">
              {client.archivedAt ? (
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onUnarchive() }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#22243A] text-[#344054] dark:text-[#CDD2E0]"
                >
                  <Archive size={12} />
                  Unarchive
                </button>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onRemove() }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#22243A] text-[#344054] dark:text-[#CDD2E0]"
                >
                  <Archive size={12} />
                  Remove…
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/40">
            <span className="text-[13px] font-bold text-[#2563EB] dark:text-[#60A5FA]">{initials}</span>
          </div>
          <div className="min-w-0 flex-1 pr-14">
            <p className="text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
              {client.name}
            </p>
            {client.company && (
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">{client.company}</p>
            )}
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          {client.email && (
            <div className="flex items-center gap-2">
              <Mail size={11} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
              <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-2">
              <Phone size={11} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
              <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">{client.phone}</span>
            </div>
          )}
          {!client.email && !client.phone && (
            <p className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">No contact info</p>
          )}
        </div>

        <div className="flex items-center gap-3 pt-3 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <CountPill icon={FileText}      count={client._count?.proposals ?? 0} label="proposals" />
          <CountPill icon={FileSignature} count={client._count?.contracts  ?? 0} label="contracts" />
          <CountPill icon={Receipt}       count={client._count?.invoices   ?? 0} label="invoices" />
        </div>

        <p className="text-[11px] text-[#D0D5DD] dark:text-[#3D4258] mt-3">Added {formatDate(client.createdAt)}</p>
      </button>
    </div>
  )
}

function CountPill({
  icon: Icon, count, label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  count: number
  label: string
}) {
  return (
    <div className="flex items-center gap-1">
      <Icon size={10} className="text-[#98A2B3] dark:text-[#545C74]" />
      <span className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8]">{count}</span>
      <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{label}</span>
    </div>
  )
}

// ─── Loading & Empty ──────────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="card-glass p-5 space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5 flex-1">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
          <Skeleton className="h-3 w-full" />
        </div>
      ))}
    </div>
  )
}

function EmptyState({ search, onAdd }: { search: string; onAdd: () => void }) {
  if (search) {
    return (
      <div className="card-glass p-10 text-center">
        <Search size={32} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-[#101828] dark:text-[#ECEEF3]">No clients found</p>
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74] mt-1">No results for "{search}". Try a different search.</p>
      </div>
    )
  }

  return (
    <div className="card-glass p-10 text-center">
      <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center mx-auto mb-4">
        <Users size={24} className="text-[#2563EB] dark:text-[#60A5FA]" />
      </div>
      <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">No clients yet</p>
      <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74] mt-1 max-w-xs mx-auto">
        Add your first client to keep track of all their proposals, contracts, and invoices in one place.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1117] dark:bg-[#6366F1] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
      >
        <Plus size={14} strokeWidth={2.5} />
        Add First Client
      </button>
    </div>
  )
}
