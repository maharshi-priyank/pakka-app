import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, Mail, Phone, MapPin, Hash, Building2, FileText,
  FileSignature, Receipt, Link2, RotateCcw, Copy, CheckCheck,
  Video, Pencil, X, Loader2, IndianRupee, Users, Clock, FolderKanban, Archive,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useClient, useUpdateClient, useRegeneratePortalToken, useArchiveClient, useUnarchiveClient, useDeleteClient } from '@/features/clients/hooks/useClients'
import type { ClientProject } from '@/features/clients/hooks/useClients'
import { RemoveModal } from '@/components/RemoveModal'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'
import ClientNotesTab from '@/features/clients/components/ClientNotesTab'
import ClientAttachmentsTab from '@/features/clients/components/ClientAttachmentsTab'
import InvoiceQuickView, { type InvoiceSnap } from '@/features/invoices/components/InvoiceQuickView'
import ProposalQuickView, { type ProposalSnap } from '@/features/proposals/components/ProposalQuickView'
import ContractQuickView, { type ContractSnap } from '@/features/contracts/components/ContractQuickView'

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     'bg-[#F2F4F7] dark:bg-[#21222D] text-[#344054] dark:text-[#8B92A8]',
  SENT:      'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  OPENED:    'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  ACCEPTED:  'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  DECLINED:  'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
  SIGNED:    'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  PAID:      'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
  OVERDUE:   'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
  PARTIAL:   'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
  ENQUIRY:       'bg-[#F3F4F6] dark:bg-[#21222D] text-[#6B7280] dark:text-[#8B92A8]',
  PROPOSAL_SENT: 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400',
  NEGOTIATING:   'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400',
  WON:           'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
  LOST:          'bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400',
}

const STAGE_LABELS: Record<string, string> = {
  ENQUIRY: 'Enquiry', PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATING: 'Negotiating', WON: 'Won', LOST: 'Lost',
}

const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram', referral: 'Referral', website: 'Website',
  linkedin: 'LinkedIn', cold_outreach: 'Cold outreach', other: 'Other',
}

type Tab = 'proposals' | 'contracts' | 'invoices' | 'leads' | 'projects' | 'timeline' | 'notes' | 'attachments'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
      STATUS_COLORS[status] ?? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#344054] dark:text-[#8B92A8]',
    )}>
      {STAGE_LABELS[status] ?? status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
    </span>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:      z.string().min(1, 'Name is required'),
  email:     z.string().email('Invalid email').optional().or(z.literal('')),
  phone:     z.string().optional(),
  company:   z.string().optional(),
  gstNumber: z.string().optional(),
  state:     z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

interface EditModalProps {
  clientId: string
  defaults: EditValues
  onClose:  () => void
}

function EditClientModal({ clientId, defaults, onClose }: EditModalProps) {
  const { mutateAsync, isPending } = useUpdateClient()
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaults,
  })

  async function onSubmit(vals: EditValues) {
    await mutateAsync({
      id:        clientId,
      name:      vals.name,
      email:     vals.email     || undefined,
      phone:     vals.phone     || undefined,
      company:   vals.company   || undefined,
      gstNumber: vals.gstNumber || undefined,
      state:     vals.state     || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Edit Client</h3>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#667085] transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {([
            { name: 'name',      label: 'Name *',      placeholder: 'Full name' },
            { name: 'company',   label: 'Company',     placeholder: 'Company name' },
            { name: 'email',     label: 'Email',       placeholder: 'email@example.com' },
            { name: 'phone',     label: 'Phone',       placeholder: '+91 98765 43210' },
            { name: 'state',     label: 'State',       placeholder: 'Maharashtra' },
            { name: 'gstNumber', label: 'GST Number',  placeholder: '27AABCU9603R1ZV' },
          ] as const).map(f => (
            <div key={f.name}>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">{f.label}</label>
              <input
                {...register(f.name)}
                placeholder={f.placeholder}
                className="form-input w-full"
              />
              {errors[f.name] && <p className="text-[11px] text-red-500 mt-1">{errors[f.name]?.message}</p>}
            </div>
          ))}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-ghost text-[13px] px-4 py-2">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-[13px]">
              {isPending ? <><Loader2 size={13} className="animate-spin" /> Saving…</> : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ClientPage() {
  const { id }    = useParams<{ id: string }>()
  const navigate  = useNavigate()

  const [activeTab,    setActiveTab]    = useState<Tab>('proposals')
  const [editOpen,     setEditOpen]     = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [removeOpen,   setRemoveOpen]   = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [qvInvoice,    setQvInvoice]    = useState<InvoiceSnap | null>(null)
  const [qvProposal,   setQvProposal]   = useState<ProposalSnap | null>(null)
  const [qvContract,   setQvContract]   = useState<ContractSnap | null>(null)

  const { data: client, isLoading } = useClient(id!)
  const regenerate  = useRegeneratePortalToken()
  const archiveMut  = useArchiveClient()
  const unarchiveMut = useUnarchiveClient()
  const deleteMut   = useDeleteClient()

  const portalUrl = client?.portalToken ? `${window.location.origin}/portal/${client.portalToken}` : null

  const totalInvoiced    = (client?.invoices ?? []).reduce((s, i) => s + parseFloat(i.total), 0)
  const totalPaid        = (client?.invoices ?? []).filter(i => i.status === 'PAID').reduce((s, i) => s + parseFloat(i.total), 0)
  const totalOutstanding = (client?.invoices ?? []).filter(i => i.status === 'SENT' || i.status === 'OVERDUE').reduce((s, i) => s + parseFloat(i.total), 0)

  const initials = client
    ? (client.company ?? client.name).split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : ''

  function copyPortalLink() {
    if (!portalUrl) return
    navigator.clipboard.writeText(portalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const leads = client?.leads ?? []

  const TABS: { key: Tab; label: string; count: number }[] = client ? [
    { key: 'proposals', label: 'Proposals', count: (client.proposals ?? []).length },
    { key: 'contracts', label: 'Contracts', count: (client.contracts ?? []).length },
    { key: 'invoices',  label: 'Invoices',  count: (client.invoices  ?? []).length },
    { key: 'leads',     label: 'Leads',     count: leads.length },
    { key: 'projects',     label: 'Projects',     count: (client.projects  ?? []).length },
    { key: 'timeline',     label: 'Timeline',     count: (client.proposals ?? []).length + (client.contracts ?? []).length + (client.invoices ?? []).length + leads.length },
    { key: 'notes',        label: 'Notes',        count: 0 },
    { key: 'attachments',  label: 'Attachments',  count: 0 },
  ] : []

  return (
    <div className="space-y-6 max-w-[1100px]">

      {/* Back */}
      <button
        onClick={() => navigate('/clients')}
        className="flex items-center gap-1.5 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors font-medium"
      >
        <ArrowLeft size={14} />
        Clients
      </button>

      {isLoading ? (
        <PageSkeleton />
      ) : client ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/40 border border-[#DBEAFE] dark:border-blue-900/40 flex items-center justify-center shrink-0">
                <span className="text-[18px] font-bold text-[#2563EB] dark:text-[#60A5FA]">{initials}</span>
              </div>
              <div>
                <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">{client.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  {client.company   && <span className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] flex items-center gap-1"><Building2 size={11} />{client.company}</span>}
                  {client.email     && <span className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] flex items-center gap-1"><Mail size={11} />{client.email}</span>}
                  {client.phone     && <span className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] flex items-center gap-1"><Phone size={11} />{client.phone}</span>}
                  {client.state     && <span className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] flex items-center gap-1"><MapPin size={11} />{client.state}</span>}
                  {client.gstNumber && <span className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] font-mono flex items-center gap-1"><Hash size={11} />{client.gstNumber}</span>}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              <button
                onClick={() => setScheduleOpen(true)}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                <Video size={13} /> Schedule Call
              </button>
              {client.archivedAt ? (
                <button
                  onClick={() => unarchiveMut.mutate(client.id, { onSuccess: () => toast.success('Client unarchived') })}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-amber-200 dark:border-amber-800 text-[13px] font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                >
                  <Archive size={13} /> Unarchive
                </button>
              ) : (
                <button
                  onClick={() => setRemoveOpen(true)}
                  className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                >
                  <Archive size={13} /> Remove
                </button>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard
              icon={IndianRupee} label="Total Invoiced"
              value={formatCurrency(totalInvoiced)}
              color="text-[#344054] dark:text-[#C2C8D8]"
              bg="bg-[#F9FAFB] dark:bg-[#21222D]"
            />
            <StatCard
              icon={IndianRupee} label="Total Paid"
              value={formatCurrency(totalPaid)}
              color="text-[#027A48] dark:text-[#34D399]"
              bg="bg-[#ECFDF3] dark:bg-emerald-950/40"
            />
            <StatCard
              icon={IndianRupee} label="Outstanding"
              value={formatCurrency(totalOutstanding)}
              color={totalOutstanding > 0 ? 'text-[#D92D20] dark:text-red-400' : 'text-[#667085] dark:text-[#8B92A8]'}
              bg={totalOutstanding > 0 ? 'bg-[#FEF3F2] dark:bg-red-950/40' : 'bg-[#F9FAFB] dark:bg-[#21222D]'}
            />
            <StatCard
              icon={Users} label="Linked Leads"
              value={String(leads.length)}
              color="text-indigo-600 dark:text-indigo-400"
              bg="bg-[#EEF2FF] dark:bg-[#1E2040]"
            />
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5',
                  activeTab === tab.key
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                {tab.label}
                {tab.key !== 'timeline' && tab.count > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab.key ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]' : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                  )}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div>
            {activeTab === 'proposals' && (
              <MiniTable
                empty={client.proposals.length === 0}
                emptyMsg="No proposals yet"
                headers={['Title', 'Status', 'Amount', 'Created']}
              >
                {client.proposals.map(p => (
                  <tr
                    key={p.id}
                    onClick={() => setQvProposal({ id: p.id, title: p.title, status: p.status, totalAmount: p.totalAmount, createdAt: p.createdAt, clientName: client.name })}
                    className="group cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2A] transition-colors"
                  >
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] group-hover:text-[#6366F1] transition-colors">{p.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(parseFloat(p.totalAmount))}</td>
                    <td className="px-4 py-3 text-[12px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(p.createdAt)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}

            {activeTab === 'contracts' && (
              <MiniTable
                empty={client.contracts.length === 0}
                emptyMsg="No contracts yet"
                headers={['Title', 'Status', 'Created']}
              >
                {client.contracts.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => setQvContract({ id: c.id, title: c.title, status: c.status, createdAt: c.createdAt, clientName: client.name })}
                    className="group cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2A] transition-colors"
                  >
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] group-hover:text-[#6366F1] transition-colors">{c.title}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3 text-[12px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(c.createdAt)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}

            {activeTab === 'invoices' && (
              <MiniTable
                empty={client.invoices.length === 0}
                emptyMsg="No invoices yet"
                headers={['Invoice #', 'Status', 'Total', 'Due']}
              >
                {client.invoices.map(inv => (
                  <tr
                    key={inv.id}
                    onClick={() => setQvInvoice({ id: inv.id, invoiceNumber: inv.invoiceNumber, status: inv.status, total: inv.total, amountPaid: '0', dueDate: inv.dueDate, clientName: client.name })}
                    className="group cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2A] transition-colors"
                  >
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] group-hover:text-[#6366F1] transition-colors font-mono">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3 text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">{formatCurrency(parseFloat(inv.total))}</td>
                    <td className="px-4 py-3 text-[12px] text-[#98A2B3] dark:text-[#545C74]">
                      {inv.dueDate ? formatDate(inv.dueDate) : '—'}
                    </td>
                  </tr>
                ))}
              </MiniTable>
            )}

            {activeTab === 'leads' && (
              <MiniTable
                empty={leads.length === 0}
                emptyMsg="No linked leads"
                headers={['Name', 'Stage', 'Budget', 'Source', 'Added']}
              >
                {leads.map(l => (
                  <tr key={l.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2A] transition-colors">
                    <td className="px-4 py-3 text-[12.5px] font-semibold text-[#101828] dark:text-[#ECEEF3]">{l.name}</td>
                    <td className="px-4 py-3"><StatusBadge status={l.stage} /></td>
                    <td className="px-4 py-3 text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">
                      {l.budget ? formatCurrency(parseFloat(l.budget)) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#667085] dark:text-[#8B92A8]">
                      {l.source ? (SOURCE_LABELS[l.source] ?? l.source) : '—'}
                    </td>
                    <td className="px-4 py-3 text-[12px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(l.createdAt)}</td>
                  </tr>
                ))}
              </MiniTable>
            )}

            {activeTab === 'projects' && (
              <ProjectsTab projects={client.projects ?? []} onNavigate={id => navigate(`/projects/${id}`)} />
            )}

            {activeTab === 'timeline' && (
              <TimelineTab client={client} />
            )}

            {activeTab === 'notes' && (
              <ClientNotesTab clientId={client.id} />
            )}

            {activeTab === 'attachments' && (
              <ClientAttachmentsTab clientId={client.id} />
            )}
          </div>

          {/* Client Portal */}
          <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] p-5">
            <div className="flex items-center gap-2 mb-3">
              <Link2 size={14} className="text-[#667085] dark:text-[#8B92A8]" />
              <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Client Portal</h3>
            </div>
            {portalUrl ? (
              <div className="space-y-3">
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] font-mono bg-[#F4F5F8] dark:bg-[#21222D] rounded-lg px-3 py-2 truncate select-all">
                  {portalUrl}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={copyPortalLink}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
                  >
                    {copied ? <><CheckCheck size={12} /> Copied!</> : <><Copy size={12} /> Copy link</>}
                  </button>
                  <button
                    onClick={() => regenerate.mutateAsync(client.id)}
                    disabled={regenerate.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors disabled:opacity-50"
                  >
                    <RotateCcw size={12} className={regenerate.isPending ? 'animate-spin' : ''} /> Regenerate
                  </button>
                </div>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Share this link with {client.name} so they can view all their documents.</p>
              </div>
            ) : (
              <button
                onClick={() => regenerate.mutateAsync(client.id)}
                disabled={regenerate.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] text-[#4338CA] dark:text-[#A5B4FC] text-[12px] font-semibold hover:bg-[#E0E7FF] dark:hover:bg-[#252850] transition-colors"
              >
                <Link2 size={12} /> Generate portal link
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <p className="text-[14px] text-[#98A2B3]">Client not found.</p>
        </div>
      )}

      {/* Quick-view modals — preview before editing */}
      <InvoiceQuickView  invoice={qvInvoice}   onClose={() => setQvInvoice(null)} />
      <ProposalQuickView proposal={qvProposal} onClose={() => setQvProposal(null)} />
      <ContractQuickView contract={qvContract} onClose={() => setQvContract(null)} />

      {editOpen && client && (
        <EditClientModal
          clientId={client.id}
          defaults={{ name: client.name, email: client.email ?? '', phone: client.phone ?? '', company: client.company ?? '', gstNumber: client.gstNumber ?? '', state: client.state ?? '' }}
          onClose={() => setEditOpen(false)}
        />
      )}

      <ScheduleCallModal
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        contactName={client?.name}
        defaultTitle={client ? `Discovery call with ${client.name}` : ''}
      />

      {client && (
        <RemoveModal
          open={removeOpen}
          onClose={() => setRemoveOpen(false)}
          onArchive={() => {
            archiveMut.mutate(client.id, {
              onSuccess: () => { toast.success('Client archived'); navigate('/clients') },
            })
            setRemoveOpen(false)
          }}
          onDelete={() => {
            deleteMut.mutate(client.id, {
              onSuccess: () => { toast.success('Client deleted'); navigate('/clients') },
            })
            setRemoveOpen(false)
          }}
          entityLabel={client.company ?? client.name}
          entityType="client"
          hasLinkedRecords={
            (client._count?.proposals ?? 0) + (client._count?.contracts ?? 0) +
            (client._count?.invoices ?? 0) + (client.projects?.length ?? 0) > 0
          }
          linkedRecordsSummary={[
            client._count?.proposals && `${client._count.proposals} proposal${client._count.proposals > 1 ? 's' : ''}`,
            client._count?.contracts && `${client._count.contracts} contract${client._count.contracts > 1 ? 's' : ''}`,
            client._count?.invoices  && `${client._count.invoices} invoice${client._count.invoices > 1 ? 's' : ''}`,
          ].filter(Boolean).join(', ') || undefined}
          isArchiving={archiveMut.isPending}
          isDeleting={deleteMut.isPending}
        />
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ icon: Icon, label, value, color, bg }: {
  icon:  React.ComponentType<{ size?: number; className?: string }>
  label: string; value: string; color: string; bg: string
}) {
  return (
    <div className={cn('rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-4', bg)}>
      <div className="flex items-center gap-2 mb-1.5">
        <Icon size={13} className={color} />
        <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">{label}</p>
      </div>
      <p className={cn('text-[18px] font-extrabold', color)}>{value}</p>
    </div>
  )
}

function MiniTable({ headers, children, empty, emptyMsg }: {
  headers: string[]
  children: React.ReactNode
  empty: boolean
  emptyMsg: string
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] py-14 text-center">
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">{emptyMsg}</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] overflow-hidden">
      <div className="overflow-x-auto">
      <table className="w-full min-w-[480px]">
        <thead>
          <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
            {headers.map(h => (
              <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F9FAFB] dark:divide-[#1E1F2A]">
          {children}
        </tbody>
      </table>
      </div>
    </div>
  )
}

const PROJECT_STATUS_COLORS: Record<string, string> = {
  ACTIVE:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  COMPLETED: 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  ON_HOLD:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
}
const PROJECT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Active', COMPLETED: 'Completed', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled',
}

function ProjectsTab({ projects, onNavigate }: { projects: ClientProject[]; onNavigate: (id: string) => void }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] py-14 text-center">
        <FolderKanban size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" strokeWidth={1.5} />
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No projects linked to this client yet</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {projects.map(p => {
        const totalMins  = p.timeEntries.reduce((s, e) => s + e.durationMins, 0)
        const totalHours = totalMins / 60
        const billedValue = p.timeEntries.reduce((s, e) => {
          if (!e.hourlyRate) return s
          return s + (e.durationMins / 60) * Number(e.hourlyRate)
        }, 0)
        const expenseTotal = p.expenses.reduce((s, e) => s + Number(e.amount), 0)

        return (
          <div
            key={p.id}
            onClick={() => onNavigate(p.id)}
            className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] p-4 cursor-pointer hover:border-[#6366F1] dark:hover:border-[#6366F1] transition-colors group"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0">
                  <FolderKanban size={14} className="text-[#6366F1] dark:text-[#818CF8]" />
                </div>
                <p className="text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate group-hover:text-[#6366F1] transition-colors">{p.name}</p>
              </div>
              <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0', PROJECT_STATUS_COLORS[p.status] ?? PROJECT_STATUS_COLORS['ACTIVE'])}>
                {PROJECT_STATUS_LABELS[p.status] ?? p.status}
              </span>
            </div>

            {/* Stats row */}
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              <div className="flex items-center gap-1.5">
                <Clock size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8] font-medium">
                  {totalHours.toFixed(1)}h logged
                </span>
              </div>
              {billedValue > 0 && (
                <div className="flex items-center gap-1.5">
                  <IndianRupee size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                  <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8] font-medium">
                    {formatCurrency(billedValue)} billed value
                  </span>
                </div>
              )}
              {expenseTotal > 0 && (
                <div className="flex items-center gap-1.5">
                  <Receipt size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                  <span className="text-[12px] text-[#344054] dark:text-[#C2C8D8] font-medium">
                    {formatCurrency(expenseTotal)} expenses
                  </span>
                </div>
              )}
              {p.budget && (
                <div className="flex items-center gap-1.5">
                  <IndianRupee size={11} className="text-indigo-400" />
                  <span className="text-[12px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {formatCurrency(Number(p.budget))} budget
                  </span>
                </div>
              )}
            </div>

            {/* Time entries preview */}
            {p.timeEntries.length > 0 && (
              <div className="mt-3 border-t border-[#F2F4F7] dark:border-[#26283A] pt-3 space-y-1.5">
                {p.timeEntries.slice(0, 3).map(e => (
                  <div key={e.id} className="flex items-center justify-between gap-2">
                    <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate">
                      {e.description || 'No description'} — {formatDate(e.date)}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8]">
                        {(e.durationMins / 60).toFixed(1)}h
                      </span>
                      {e.isBilled && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]">Billed</span>
                      )}
                    </div>
                  </div>
                ))}
                {p.timeEntries.length > 3 && (
                  <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">+{p.timeEntries.length - 3} more entries</p>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

type ClientData = NonNullable<ReturnType<typeof useClient>['data']>

function TimelineTab({ client }: { client: ClientData }) {
  type TimelineItem = { id: string; type: 'proposal' | 'contract' | 'invoice' | 'lead' | 'meeting'; title: string; label: string; status: string; date: string; amount?: string }

  const items: TimelineItem[] = []

  client.proposals.forEach(p => {
    items.push({ id: `p-c-${p.id}`, type: 'proposal', label: 'Proposal created', title: p.title, status: p.status, date: p.createdAt, amount: p.totalAmount })
    if (p.acceptedAt) items.push({ id: `p-a-${p.id}`, type: 'proposal', label: 'Proposal accepted', title: p.title, status: 'ACCEPTED', date: p.acceptedAt, amount: p.totalAmount })
  })
  client.contracts.forEach(c => {
    items.push({ id: `c-c-${c.id}`, type: 'contract', label: 'Contract created', title: c.title, status: c.status, date: c.createdAt })
    if (c.sentAt)   items.push({ id: `c-s-${c.id}`, type: 'contract', label: 'Contract sent',   title: c.title, status: 'SENT',   date: c.sentAt })
    if (c.signedAt) items.push({ id: `c-g-${c.id}`, type: 'contract', label: 'Contract signed', title: c.title, status: 'SIGNED', date: c.signedAt })
  })
  client.invoices.forEach(i => {
    items.push({ id: `i-c-${i.id}`, type: 'invoice', label: 'Invoice created', title: i.invoiceNumber, status: i.status, date: i.createdAt, amount: i.total })
    if (i.paidAt) items.push({ id: `i-p-${i.id}`, type: 'invoice', label: 'Invoice paid', title: i.invoiceNumber, status: 'PAID', date: i.paidAt, amount: i.total })
  })
  client.leads?.forEach(l => {
    items.push({ id: `l-${l.id}`, type: 'lead', label: 'Lead added', title: l.name, status: l.stage, date: l.createdAt })
  })
  client.meetings?.forEach(m => {
    items.push({ id: `m-${m.id}`, type: 'meeting', label: 'Meeting scheduled', title: m.title, status: m.status, date: m.scheduledAt })
  })

  items.sort((a, b) => b.date.localeCompare(a.date))

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] py-14 text-center">
        <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No activity yet</p>
      </div>
    )
  }

  const iconMap = { proposal: FileText, contract: FileSignature, invoice: Receipt, lead: Users, meeting: Video }

  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] p-5">
      <div className="space-y-0">
        {items.map((item, idx) => {
          const Icon = iconMap[item.type]
          return (
            <div key={item.id} className="flex gap-3 group">
              <div className="flex flex-col items-center">
                <div className="w-7 h-7 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center shrink-0 mt-0.5">
                  <Icon size={13} className="text-[#667085] dark:text-[#8B92A8]" />
                </div>
                {idx < items.length - 1 && <div className="w-px flex-1 bg-[#F2F4F7] dark:bg-[#26283A] mt-1 mb-0.5" />}
              </div>
              <div className="pb-5 min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">{item.label}</span>
                    <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate mt-0.5">{item.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.amount && (
                      <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                        {formatCurrency(parseFloat(item.amount))}
                      </span>
                    )}
                    <StatusBadge status={item.status} />
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  <Clock size={10} className="text-[#D0D5DD] dark:text-[#3D4258]" />
                  <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(item.date)}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function PageSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="w-14 h-14 rounded-2xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3.5 w-64" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {[1,2,3,4].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
      </div>
      <Skeleton className="h-10 w-full rounded-xl" />
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden">
        {[1,2,3].map(i => <Skeleton key={i} className="h-14 rounded-none border-b border-[#F2F4F7] dark:border-[#26283A]" />)}
      </div>
    </div>
  )
}
