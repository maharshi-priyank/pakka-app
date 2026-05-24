import { useState } from 'react'
import { Plus, Search, Users, Mail, Phone, FileText, FileSignature, Receipt } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useClients, type Client } from '@/features/clients/hooks/useClients'
import AddClientModal from '@/features/clients/components/AddClientModal'
import ClientDrawer from '@/features/clients/components/ClientDrawer'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function ClientsPage() {
  const [search,         setSearch]         = useState('')
  const [showAdd,        setShowAdd]        = useState(false)
  const [selectedClient, setSelectedClient] = useState<string | null>(null)

  const { data, isLoading } = useClients(search || undefined)
  const clients = data?.clients ?? []

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

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, company, or email…"
          className="form-input w-full pl-8 max-w-sm"
        />
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
              onClick={() => setSelectedClient(client.id)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddClientModal onClose={() => setShowAdd(false)} />}

      {selectedClient && (
        <ClientDrawer
          clientId={selectedClient}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  )
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ client, onClick }: { client: Client; onClick: () => void }) {
  const initials = (client.company ?? client.name)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className="card p-5 text-left hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all group"
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/40">
          <span className="text-[13px] font-bold text-[#2563EB] dark:text-[#60A5FA]">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
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
        <div key={i} className="card p-5 space-y-4">
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
      <div className="card p-10 text-center">
        <Search size={32} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" />
        <p className="text-[14px] font-semibold text-[#101828] dark:text-[#ECEEF3]">No clients found</p>
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74] mt-1">No results for "{search}". Try a different search.</p>
      </div>
    )
  }

  return (
    <div className="card p-10 text-center">
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
