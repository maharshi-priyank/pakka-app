import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Users, Mail, Phone, FileText, FileSignature, Receipt, ChevronDown } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { AddContactModal } from '@/features/contacts'
import type { Contact } from '@/features/contacts/schemas/contact.schema'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

export default function ClientsPage() {
  const [search,        setSearch]        = useState('')
  const [showAdd,       setShowAdd]       = useState(false)
  const [pastExpanded,  setPastExpanded]  = useState(false)
  const navigate = useNavigate()

  const { data: clientData,     isLoading: loadingClients }    = useContacts({ stage: 'CLIENT',      search: search || undefined, limit: 100 })
  const { data: pastClientData, isLoading: loadingPastClients } = useContacts({ stage: 'PAST_CLIENT', search: search || undefined, limit: 100 })

  const clients     = clientData?.items     ?? []
  const pastClients = pastClientData?.items ?? []
  const isLoading   = loadingClients || loadingPastClients

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Clients</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            {isLoading ? 'Loading…' : `${clients.length} active · ${pastClients.length} past`}
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
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74]" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search clients…"
          className="form-input w-full pl-8"
        />
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingGrid />
      ) : clients.length === 0 && pastClients.length === 0 ? (
        <EmptyState search={search} onAdd={() => setShowAdd(true)} />
      ) : (
        <div className="space-y-8">

          {/* Active clients */}
          {clients.length > 0 && (
            <section>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {clients.map(c => (
                  <ClientCard key={c.id} contact={c} onClick={() => navigate(`/contacts/${c.id}`)} />
                ))}
              </div>
            </section>
          )}

          {clients.length === 0 && search && (
            <div className="card-glass p-8 text-center">
              <Search size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No active clients matching "{search}"</p>
            </div>
          )}

          {clients.length === 0 && !search && (
            <div className="card-glass p-8 text-center">
              <Users size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" />
              <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No active clients</p>
              <p className="text-[12px] text-[#98A2B3] mt-1">Contacts become clients when their stage is set to Client.</p>
            </div>
          )}

          {/* Past clients — collapsible */}
          {pastClients.length > 0 && (
            <section>
              <button
                onClick={() => setPastExpanded(e => !e)}
                className="flex items-center gap-2 mb-4 text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
              >
                <ChevronDown
                  size={14}
                  className={cn('transition-transform duration-200', !pastExpanded && '-rotate-90')}
                />
                Past Clients
                <span className="ml-1 text-[11px] font-medium bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74] px-2 py-0.5 rounded-full">
                  {pastClients.length}
                </span>
              </button>

              {pastExpanded && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pastClients.map(c => (
                    <ClientCard key={c.id} contact={c} onClick={() => navigate(`/contacts/${c.id}`)} past />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {showAdd && <AddContactModal open onClose={() => setShowAdd(false)} />}
    </div>
  )
}

// ─── Client Card ──────────────────────────────────────────────────────────────

function ClientCard({ contact, onClick, past }: { contact: Contact; onClick: () => void; past?: boolean }) {
  const initials = (contact.company ?? contact.name)
    .split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <button
      onClick={onClick}
      className={cn(
        'card-glass p-5 text-left hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all group w-full',
        past && 'opacity-70 hover:opacity-90',
      )}
    >
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center shrink-0 border border-[#DBEAFE] dark:border-blue-900/40">
          <span className="text-[13px] font-bold text-[#2563EB] dark:text-[#60A5FA]">{initials}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate group-hover:text-[#2563EB] dark:group-hover:text-[#60A5FA] transition-colors">
            {contact.name}
          </p>
          {contact.company && (
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">{contact.company}</p>
          )}
        </div>
      </div>

      <div className="space-y-1.5 mb-4">
        {contact.email && (
          <div className="flex items-center gap-2">
            <Mail size={11} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
            <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">{contact.email}</span>
          </div>
        )}
        {contact.phone && (
          <div className="flex items-center gap-2">
            <Phone size={11} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
            <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">{contact.phone}</span>
          </div>
        )}
        {!contact.email && !contact.phone && (
          <p className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">No contact info</p>
        )}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <CountPill icon={FileText}      count={contact._count?.proposals ?? 0} label="proposals" />
        <CountPill icon={FileSignature} count={contact._count?.contracts  ?? 0} label="contracts" />
        <CountPill icon={Receipt}       count={contact._count?.invoices   ?? 0} label="invoices" />
      </div>

      <p className="text-[11px] text-[#D0D5DD] dark:text-[#3D4258] mt-3">
        Added {formatDate(contact.createdAt)}
      </p>
    </button>
  )
}

function CountPill({ icon: Icon, count, label }: {
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
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74] mt-1">No results for "{search}"</p>
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
        Add contacts and move them to the Client stage when you start working together.
      </p>
      <button
        onClick={onAdd}
        className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 bg-[#0D1117] dark:bg-[#6366F1] text-white rounded-lg text-[13px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
      >
        <Plus size={14} strokeWidth={2.5} />
        Add Contact
      </button>
    </div>
  )
}
