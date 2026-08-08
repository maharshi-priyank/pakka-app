import { useState } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft, FolderKanban, Building2, Calendar, IndianRupee,
  Clock, Receipt, FileText, PenLine, Wallet, Pencil, Archive,
  X, Loader2, Plus, ChevronDown, ChevronUp, CheckSquare, AlertCircle,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import {
  useProject, useProjectStats, useUpdateProject, useDeleteProject,
  useArchiveProject, useUnarchiveProject,
  type ProjectStatus,
} from '@/features/projects/hooks/useProjects'
import { RemoveModal } from '@/components/RemoveModal'
import { toast } from 'sonner'
import ProjectFilesPanel from '@/features/projects/components/ProjectFilesPanel'
import ProjectPlCard from '@/features/projects/components/ProjectPlCard'
import ProjectNotesTab from '@/features/projects/components/ProjectNotesTab'
import ProjectTasksTab from '@/features/tasks/components/ProjectTasksTab'
import ProjectTeamTab from '@/features/projects/components/ProjectTeamTab'
import ProjectUpdatesTab from '@/features/projects/components/ProjectUpdatesTab'
import ProjectChangeRequestsTab from '@/features/projects/components/ProjectChangeRequestsTab'
import { useRequestSignoff, useProjectApprovalRequests } from '@/features/projects/hooks/useChangeRequests'
import InvoiceQuickView, { type InvoiceSnap } from '@/features/invoices/components/InvoiceQuickView'
import ProposalQuickView, { type ProposalSnap } from '@/features/proposals/components/ProposalQuickView'
import ContractQuickView, { type ContractSnap } from '@/features/contracts/components/ContractQuickView'

const STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  COMPLETED: 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  ON_HOLD:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE: 'Active', COMPLETED: 'Completed', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled',
}

const RECORD_STATUS_COLORS: Record<string, string> = {
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
  VIEWED:    'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn(
      'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
      RECORD_STATUS_COLORS[status] ?? RECORD_STATUS_COLORS['DRAFT'],
    )}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace('_', ' ')}
    </span>
  )
}

// ─── Edit Modal ───────────────────────────────────────────────────────────────

const editSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  status:      z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
  budget:      z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
})
type EditValues = z.infer<typeof editSchema>

function EditProjectModal({
  projectId, defaults, onClose,
}: {
  projectId: string
  defaults:  EditValues
  onClose:   () => void
}) {
  const { mutateAsync, isPending } = useUpdateProject()
  const { register, handleSubmit, formState: { errors } } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: defaults,
  })

  async function onSubmit(vals: EditValues) {
    await mutateAsync({
      id:          projectId,
      name:        vals.name,
      description: vals.description || undefined,
      status:      vals.status,
      budget:      vals.budget ? Number(vals.budget) : undefined,
      startDate:   vals.startDate || undefined,
      endDate:     vals.endDate   || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Edit Project</h3>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#667085] transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Name *</label>
            <input {...register('name')} className="form-input w-full" />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>}
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Description</label>
            <textarea {...register('description')} rows={2} className="form-input w-full resize-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Status</label>
              <select {...register('status')} className="form-input w-full">
                {(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED'] as const).map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Budget (₹)</label>
              <input {...register('budget')} type="number" min={0} placeholder="Optional" className="form-input w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Start date</label>
              <input {...register('startDate')} type="date" className="form-input w-full" />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">End date</label>
              <input {...register('endDate')} type="date" className="form-input w-full" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-[13px]">Cancel</button>
            <button type="submit" disabled={isPending} className="btn-primary text-[13px]">
              {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Save changes
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Share Rate Toggle ────────────────────────────────────────────────────────

function ShareRateToggle({ projectId, value }: { projectId: string; value: boolean }) {
  const { mutateAsync } = useUpdateProject()
  const [pending, setPending] = useState(false)

  async function toggle() {
    setPending(true)
    try { await mutateAsync({ id: projectId, shareRateWithClient: !value }) }
    finally { setPending(false) }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={toggle}
      disabled={pending}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
        value ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
      )}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
        value ? 'translate-x-4' : 'translate-x-0',
      )} />
    </button>
  )
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon: Icon, accent = false }: {
  label: string; value: string; sub?: string
  icon: React.ElementType; accent?: boolean
}) {
  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8]">{label}</p>
        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center',
          accent ? 'bg-[#EFF6FF] dark:bg-[#1E3A5F]' : 'bg-[#F9FAFB] dark:bg-[#21222D]',
        )}>
          <Icon size={13} className={accent ? 'text-[#2563EB]' : 'text-[#667085] dark:text-[#8B92A8]'} />
        </div>
      </div>
      <p className="text-[20px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-none">{value}</p>
      {sub && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1">{sub}</p>}
    </div>
  )
}

// ─── Tab types ────────────────────────────────────────────────────────────────

type Tab = 'overview' | 'documents' | 'time' | 'files' | 'notes' | 'tasks' | 'team' | 'updates' | 'change-requests'
type DocSubTab = 'proposals' | 'contracts' | 'invoices'

const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'overview',        label: 'Overview' },
  { value: 'tasks',           label: 'Tasks' },
  { value: 'updates',         label: 'Updates' },
  { value: 'change-requests', label: 'Change Requests' },
  { value: 'documents',       label: 'Documents' },
  { value: 'time',            label: 'Time & Expenses' },
  { value: 'files',           label: 'Files' },
  { value: 'notes',           label: 'Notes' },
  { value: 'team',            label: 'Team' },
]

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location     = useLocation()
  const isTasksRoute = location.pathname.includes('/tasks')
  const locationState = location.state as { tab?: Tab } | null
  const [tab,       setTab]       = useState<Tab>(locationState?.tab ?? 'overview')
  const [docSubTab, setDocSubTab] = useState<DocSubTab>('proposals')
  const activeTab: Tab = isTasksRoute ? 'tasks' : tab
  const [showEdit,     setShowEdit]     = useState(false)
  const [removeOpen,   setRemoveOpen]   = useState(false)
  const [detailsOpen,  setDetailsOpen]  = useState(false)
  const [qvInvoice,   setQvInvoice]   = useState<InvoiceSnap | null>(null)
  const [qvProposal,  setQvProposal]  = useState<ProposalSnap | null>(null)
  const [qvContract,  setQvContract]  = useState<ContractSnap | null>(null)

  const { data: project, isLoading } = useProject(id!)
  const { data: stats,   isLoading: statsLoading } = useProjectStats(id!)
  const deleteMut    = useDeleteProject()
  const archiveMut   = useArchiveProject()
  const unarchiveMut = useUnarchiveProject()
  const signoffMut   = useRequestSignoff(id!)
  const { data: approvalRequests } = useProjectApprovalRequests(id!)

  if (isLoading) {
    return (
      <div className="space-y-5 max-w-[1400px]">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-[14px] text-[#344054] dark:text-[#C2C8D8] font-semibold">Project not found</p>
        <button onClick={() => navigate('/projects')} className="mt-3 text-[12px] text-[#2563EB] font-medium">
          Back to Projects
        </button>
      </div>
    )
  }

  const budget     = project.budget ? Number(project.budget) : null
  const invoiced   = stats?.invoiced  ?? 0
  const expenseTotal = stats?.expenseTotal ?? 0

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Back */}
      <button
        onClick={() => navigate('/projects')}
        className="flex items-center gap-1.5 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
      >
        <ArrowLeft size={14} /> Projects
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A5F] flex items-center justify-center shrink-0">
            <FolderKanban size={18} className="text-[#2563EB]" strokeWidth={2} />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[19px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">{project.name}</h1>
              <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_COLORS[project.status])}>
                {STATUS_LABELS[project.status]}
              </span>
            </div>
            {project.client && (
              <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5 flex items-center gap-1.5">
                <Building2 size={11} />
                {project.client.company || project.client.name}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {project.status === 'ACTIVE' && (() => {
            const pendingSignoff   = approvalRequests?.find(ar => ar.kind === 'PROJECT_SIGNOFF' && ar.status === 'PENDING')
            const revisionSignoff  = approvalRequests?.find(ar => ar.kind === 'PROJECT_SIGNOFF' && ar.status === 'REVISION_REQUESTED')
            if (pendingSignoff) {
              return (
                <span className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-amber-200 dark:border-amber-800 text-[12px] font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 cursor-default">
                  <Clock size={12} />
                  Awaiting client sign-off
                </span>
              )
            }
            if (revisionSignoff) {
              return (
                <button
                  onClick={() => signoffMut.mutate(undefined, {
                    onSuccess: () => toast.success('Sign-off re-requested'),
                    onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not send sign-off request'),
                  })}
                  disabled={signoffMut.isPending}
                  className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-red-200 dark:border-red-800 text-[12px] font-medium text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950/30 hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title={revisionSignoff.decisionNote ?? 'Client requested revision'}
                >
                  {signoffMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <AlertCircle size={12} />}
                  Revision requested — Re-send
                </button>
              )
            }
            return (
              <button
                onClick={() => signoffMut.mutate(undefined, {
                  onSuccess: () => toast.success('Sign-off request sent to client'),
                  onError:   (e: unknown) => toast.error(e instanceof Error ? e.message : 'Could not send sign-off request'),
                })}
                disabled={signoffMut.isPending}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-indigo-200 dark:border-indigo-800 text-[12px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {signoffMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckSquare size={12} />}
                Request Sign-off
              </button>
            )
          })()}
          <button
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] bg-white dark:bg-[#13141A] hover:border-[#D0D5DD] dark:hover:border-[#3D4258] transition-colors"
          >
            <Pencil size={12} /> Edit
          </button>
          {project.archivedAt ? (
            <button
              onClick={() => unarchiveMut.mutate(project.id, { onSuccess: () => toast.success('Project unarchived') })}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-amber-600 bg-white dark:bg-[#13141A] hover:bg-amber-50 transition-colors"
            >
              <Archive size={12} /> Unarchive
            </button>
          ) : (
            <button
              onClick={() => setRemoveOpen(true)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] bg-white dark:bg-[#13141A] hover:border-[#D0D5DD] dark:hover:border-[#3D4258] transition-colors"
            >
              <Archive size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      {/* Revision note banner — shown when client requested revision on sign-off */}
      {(() => {
        const revisionSignoff = approvalRequests?.find(ar => ar.kind === 'PROJECT_SIGNOFF' && ar.status === 'REVISION_REQUESTED')
        if (!revisionSignoff?.decisionNote) return null
        return (
          <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
            <AlertCircle size={15} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[12.5px] font-semibold text-amber-800 dark:text-amber-300">Client requested revision before sign-off</p>
              <p className="text-[12px] text-amber-700 dark:text-amber-400 mt-0.5 leading-relaxed">{revisionSignoff.decisionNote}</p>
            </div>
          </div>
        )
      })()}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Total Invoiced"
          value={statsLoading ? '—' : formatCurrency(invoiced)}
          sub={stats ? `${formatCurrency(stats.collected)} collected` : undefined}
          icon={Receipt}
          accent
        />
        <StatCard
          label="Outstanding"
          value={statsLoading ? '—' : formatCurrency(stats?.outstanding ?? 0)}
          icon={IndianRupee}
        />
        <StatCard
          label="Hours Logged"
          value={statsLoading ? '—' : `${stats?.totalHours ?? 0}h`}
          sub={stats?.billableValue ? `${formatCurrency(stats.billableValue)} billable` : undefined}
          icon={Clock}
        />
        <StatCard
          label="Expenses"
          value={statsLoading ? '—' : formatCurrency(expenseTotal)}
          sub={stats?.profit !== undefined ? `Net: ${formatCurrency(stats.profit)}` : undefined}
          icon={Wallet}
        />
      </div>

      {/* P&L & Budget */}
      <ProjectPlCard projectId={id!} />

      {/* Collapsible Details */}
      <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
        <button
          onClick={() => setDetailsOpen(v => !v)}
          className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
        >
          <div className="flex items-center gap-3 min-w-0">
            <p className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide shrink-0">Details</p>
            {!detailsOpen && (
              <div className="flex items-center gap-4 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] overflow-hidden">
                {project.client && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Building2 size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                    {project.client.company || project.client.name}
                  </span>
                )}
                {project.startDate && (
                  <span className="flex items-center gap-1.5 shrink-0">
                    <Calendar size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
                    {formatDate(project.startDate)}{project.endDate ? ` → ${formatDate(project.endDate)}` : ''}
                  </span>
                )}
                {budget && (
                  <span className="flex items-center gap-1 shrink-0">
                    {formatCurrency(budget)}
                  </span>
                )}
              </div>
            )}
          </div>
          {detailsOpen
            ? <ChevronUp size={13} className="text-[#98A2B3] shrink-0" />
            : <ChevronDown size={13} className="text-[#98A2B3] shrink-0" />
          }
        </button>
        {detailsOpen && (
          <div className="px-4 pb-4 border-t border-[#F2F4F7] dark:border-[#26283A]">
            <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-4 pt-3">
              {(project.contact || project.client) && (
                <div>
                  <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Contact</dt>
                  <dd className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] mt-0.5">
                    {(project.contact ?? project.client)!.name}
                    {(project.contact ?? project.client)?.company && (
                      <span className="text-[#98A2B3]"> · {(project.contact ?? project.client)!.company}</span>
                    )}
                  </dd>
                </div>
              )}
              {project.startDate && (
                <div>
                  <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Start date</dt>
                  <dd className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] mt-0.5 flex items-center gap-1.5">
                    <Calendar size={11} />{formatDate(project.startDate)}
                  </dd>
                </div>
              )}
              {project.endDate && (
                <div>
                  <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">End date</dt>
                  <dd className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] mt-0.5 flex items-center gap-1.5">
                    <Calendar size={11} />{formatDate(project.endDate)}
                  </dd>
                </div>
              )}
              {budget && (
                <div>
                  <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Budget</dt>
                  <dd className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] mt-0.5 flex items-center gap-1">
                    {formatCurrency(budget)}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Created</dt>
                <dd className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8] mt-0.5">{formatDate(project.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Share rates</dt>
                <dd className="mt-1.5 flex items-center gap-2">
                  <ShareRateToggle projectId={project.id} value={project.shareRateWithClient} />
                  <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Show in portal</span>
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.value}
            onClick={() => {
              if (t.value === 'tasks') {
                navigate(`/projects/${id}/tasks`)
              } else if (isTasksRoute) {
                navigate(`/projects/${id}`, { state: { tab: t.value } })
              } else {
                setTab(t.value)
              }
            }}
            className={cn(
              'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              activeTab === t.value ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {project.description && (
              <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4">
                <p className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-2">Description</p>
                <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed">{project.description}</p>
              </div>
            )}
            <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4">
              <p className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-3">Linked records</p>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {[
                  { label: 'Proposals', count: project._count?.proposals ?? 0,   icon: FileText, action: () => { setTab('documents'); setDocSubTab('proposals') } },
                  { label: 'Contracts', count: project._count?.contracts ?? 0,   icon: PenLine,  action: () => { setTab('documents'); setDocSubTab('contracts') } },
                  { label: 'Invoices',  count: project._count?.invoices ?? 0,    icon: Receipt,  action: () => { setTab('documents'); setDocSubTab('invoices')  } },
                  { label: 'Time log',  count: project._count?.timeEntries ?? 0, icon: Clock,    action: () => setTab('time') },
                  { label: 'Expenses',  count: project._count?.expenses ?? 0,    icon: Wallet,   action: () => setTab('time') },
                ].map(({ label, count, icon: Icon, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#F2F4F7] dark:border-[#26283A] hover:border-[#2563EB]/40 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-all text-center"
                  >
                    <Icon size={16} className="text-[#667085] dark:text-[#8B92A8]" />
                    <p className="text-[18px] font-bold text-[#101828] dark:text-[#ECEEF3]">{count}</p>
                    <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74]">{label}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="space-y-4">
            {/* Sub-tab bar */}
            <div className="flex items-center gap-1 bg-[#F9FAFB] dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-1 w-fit">
              {([
                { value: 'proposals' as DocSubTab, label: 'Proposals',  count: project._count?.proposals ?? 0 },
                { value: 'contracts' as DocSubTab, label: 'Contracts',  count: project._count?.contracts ?? 0 },
                { value: 'invoices'  as DocSubTab, label: 'Invoices',   count: project._count?.invoices  ?? 0 },
              ]).map(st => (
                <button
                  key={st.value}
                  onClick={() => setDocSubTab(st.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[12.5px] font-medium transition-all',
                    docSubTab === st.value
                      ? 'bg-white dark:bg-[#1A1B26] text-[#101828] dark:text-[#ECEEF3] shadow-sm border border-[#EAECF0] dark:border-[#26283A]'
                      : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                  )}
                >
                  {st.label}
                  {st.count > 0 && (
                    <span className={cn(
                      'text-[10px] font-semibold px-1.5 py-0.5 rounded-full min-w-[18px] text-center',
                      docSubTab === st.value
                        ? 'bg-[#F2F4F7] dark:bg-[#26283A] text-[#344054] dark:text-[#C2C8D8]'
                        : 'bg-[#EAECF0] dark:bg-[#26283A] text-[#667085] dark:text-[#8B92A8]',
                    )}>
                      {st.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Sub-tab content */}
            {docSubTab === 'proposals' && (
              <RecordTable
                empty={project.proposals.length === 0}
                emptyLabel="No proposals linked to this project"
                emptyAction={{ label: 'New Proposal', href: `/proposals/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
                addAction={{ label: 'New Proposal', href: `/proposals/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                      <Th>Title</Th><Th>Status</Th><Th>Amount</Th><Th>Date</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                    {project.proposals.map(p => (
                      <tr key={p.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer" onClick={() => setQvProposal({ id: p.id, title: p.title, status: p.status, totalAmount: p.totalAmount, createdAt: p.createdAt })}>
                        <Td className="font-medium text-[#101828] dark:text-[#ECEEF3]">{p.title}</Td>
                        <Td><StatusBadge status={p.status} /></Td>
                        <Td>{formatCurrency(Number(p.totalAmount))}</Td>
                        <Td className="text-[#667085] dark:text-[#8B92A8]">{formatDate(p.createdAt)}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </RecordTable>
            )}

            {docSubTab === 'contracts' && (
              <RecordTable
                empty={project.contracts.length === 0}
                emptyLabel="No contracts linked to this project"
                emptyAction={{ label: 'New Contract', href: `/contracts/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
                addAction={{ label: 'New Contract', href: `/contracts/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                      <Th>Title</Th><Th>Status</Th><Th>Sent</Th><Th>Signed</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                    {project.contracts.map(c => (
                      <tr key={c.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer" onClick={() => setQvContract({ id: c.id, title: c.title, status: c.status, sentAt: c.sentAt, signedAt: c.signedAt })}>
                        <Td className="font-medium text-[#101828] dark:text-[#ECEEF3]">{c.title}</Td>
                        <Td><StatusBadge status={c.status} /></Td>
                        <Td className="text-[#667085] dark:text-[#8B92A8]">{c.sentAt ? formatDate(c.sentAt) : '—'}</Td>
                        <Td className="text-[#667085] dark:text-[#8B92A8]">{c.signedAt ? formatDate(c.signedAt) : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </RecordTable>
            )}

            {docSubTab === 'invoices' && (
              <RecordTable
                empty={project.invoices.length === 0}
                emptyLabel="No invoices linked to this project"
                emptyAction={{ label: 'New Invoice', href: `/invoices/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
                addAction={{ label: 'New Invoice', href: `/invoices/new?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
              >
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                      <Th>#</Th><Th>Status</Th><Th>Total</Th><Th>Paid</Th><Th>Due</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                    {project.invoices.map(inv => (
                      <tr key={inv.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors cursor-pointer" onClick={() => setQvInvoice({ id: inv.id, invoiceNumber: inv.invoiceNumber, status: inv.status, total: inv.total, amountPaid: inv.amountPaid, dueDate: inv.dueDate })}>
                        <Td className="font-medium text-[#101828] dark:text-[#ECEEF3]">{inv.invoiceNumber}</Td>
                        <Td><StatusBadge status={inv.status} /></Td>
                        <Td>{formatCurrency(Number(inv.total))}</Td>
                        <Td>{formatCurrency(Number(inv.amountPaid))}</Td>
                        <Td className="text-[#667085] dark:text-[#8B92A8]">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </RecordTable>
            )}
          </div>
        )}

        {activeTab === 'files' && (
          <div className="max-w-2xl">
            <ProjectFilesPanel projectId={project.id} />
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="max-w-2xl">
            <ProjectNotesTab projectId={project.id} brief={project.description ?? null} />
          </div>
        )}

        {isTasksRoute && (
          <ProjectTasksTab projectId={id!} />
        )}

        {activeTab === 'updates' && !isTasksRoute && (
          <div className="max-w-2xl">
            <ProjectUpdatesTab projectId={project.id} />
          </div>
        )}

        {activeTab === 'change-requests' && !isTasksRoute && (
          <div className="max-w-2xl">
            <ProjectChangeRequestsTab projectId={project.id} />
          </div>
        )}

        {activeTab === 'team' && !isTasksRoute && (
          <div className="max-w-2xl">
            <ProjectTeamTab projectId={project.id} />
          </div>
        )}

        {activeTab === 'time' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Time entries */}
            <RecordTable
              title="Time Entries"
              empty={project.timeEntries.length === 0}
              emptyLabel="No time logged"
              emptyAction={{ label: 'Log Time', href: `/time?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
              addAction={{ label: 'Log Time', href: `/time?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
            >
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                    <Th>Description</Th><Th>Date</Th><Th>Hours</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                  {project.timeEntries.map(t => (
                    <tr key={t.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors">
                      <Td className="text-[#344054] dark:text-[#C2C8D8] max-w-[160px] truncate">{t.description}</Td>
                      <Td className="text-[#667085] dark:text-[#8B92A8] whitespace-nowrap">{formatDate(t.date)}</Td>
                      <Td className="font-medium text-[#101828] dark:text-[#ECEEF3]">{(t.durationMins / 60).toFixed(1)}h</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </RecordTable>

            {/* Expenses */}
            <RecordTable
              title="Expenses"
              empty={project.expenses.length === 0}
              emptyLabel="No expenses logged"
              emptyAction={{ label: 'Add Expense', href: `/expenses?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
              addAction={{ label: 'Add Expense', href: `/expenses?projectId=${id}&contactId=${project.contactId ?? project.clientId ?? ''}` }}
            >
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#EAECF0] dark:border-[#26283A]">
                    <Th>Description</Th><Th>Category</Th><Th>Amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                  {project.expenses.map(e => (
                    <tr key={e.id} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors">
                      <Td className="text-[#344054] dark:text-[#C2C8D8] max-w-[140px] truncate">{e.description}</Td>
                      <Td className="text-[#667085] dark:text-[#8B92A8]">{e.category}</Td>
                      <Td className="font-medium text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(Number(e.amount))}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </RecordTable>
          </div>
        )}
      </div>

      {/* Quick-view modals — preview before editing */}
      <InvoiceQuickView  invoice={qvInvoice}   onClose={() => setQvInvoice(null)} />
      <ProposalQuickView proposal={qvProposal} onClose={() => setQvProposal(null)} />
      <ContractQuickView contract={qvContract} onClose={() => setQvContract(null)} />

      {/* Edit Modal */}
      {showEdit && (
        <EditProjectModal
          projectId={project.id}
          defaults={{
            name:        project.name,
            description: project.description ?? '',
            status:      project.status,
            budget:      project.budget ? String(Math.round(Number(project.budget))) : '',
            startDate:   project.startDate ? project.startDate.slice(0, 10) : '',
            endDate:     project.endDate   ? project.endDate.slice(0, 10)   : '',
          }}
          onClose={() => setShowEdit(false)}
        />
      )}

      <RemoveModal
        open={removeOpen}
        onClose={() => setRemoveOpen(false)}
        onArchive={() => {
          archiveMut.mutate(project.id, {
            onSuccess: () => { toast.success('Project archived'); navigate('/projects') },
          })
          setRemoveOpen(false)
        }}
        onDelete={() => {
          deleteMut.mutate(project.id, {
            onSuccess: () => { toast.success('Project deleted'); navigate('/projects') },
          })
          setRemoveOpen(false)
        }}
        entityLabel={project.name}
        entityType="project"
        hasLinkedRecords={
          (project._count?.proposals ?? 0) + (project._count?.contracts ?? 0) +
          (project._count?.invoices   ?? 0) + (project._count?.timeEntries ?? 0) +
          (project._count?.expenses   ?? 0) > 0
        }
        linkedRecordsSummary={[
          project._count?.proposals   && `${project._count.proposals} proposal${project._count.proposals > 1 ? 's' : ''}`,
          project._count?.contracts   && `${project._count.contracts} contract${project._count.contracts > 1 ? 's' : ''}`,
          project._count?.invoices    && `${project._count.invoices} invoice${project._count.invoices > 1 ? 's' : ''}`,
        ].filter(Boolean).join(', ') || undefined}
        isArchiving={archiveMut.isPending}
        isDeleting={deleteMut.isPending}
      />
    </div>
  )
}

// ─── Table helpers ────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left px-4 py-2.5 text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">{children}</th>
}
function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn('px-4 py-3 text-[13px]', className)}>{children}</td>
}

function RecordTable({
  title, children, empty, emptyLabel, emptyAction, addAction,
}: {
  title?:       string
  children:     React.ReactNode
  empty:        boolean
  emptyLabel:   string
  emptyAction?: { label: string; href: string }
  addAction?:   { label: string; href: string }
}) {
  const navigate = useNavigate()
  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
      {(title || (!empty && addAction)) && (
        <div className="px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] flex items-center justify-between">
          {title
            ? <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{title}</p>
            : <span />
          }
          {!empty && addAction && (
            <button
              onClick={() => navigate(addAction.href)}
              className="flex items-center gap-1 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors"
            >
              <Plus size={12} /> {addAction.label}
            </button>
          )}
        </div>
      )}
      {empty ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">{emptyLabel}</p>
          {emptyAction && (
            <button
              onClick={() => navigate(emptyAction.href)}
              className="mt-2 flex items-center gap-1 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors"
            >
              <Plus size={12} /> {emptyAction.label}
            </button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">{children}</div>
      )}
    </div>
  )
}
