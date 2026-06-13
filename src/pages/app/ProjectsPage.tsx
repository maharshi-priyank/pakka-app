import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Plus, Search, X, FolderKanban, Calendar,
  FileText, PenLine, Receipt, Loader2, Building2,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import {
  useProjects, useCreateProject,
  type Project, type ProjectStatus, type CreateProjectInput,
} from '@/features/projects/hooks/useProjects'
import ClientMultiSelect from '@/components/filters/ClientMultiSelect'

const STATUS_TABS: Array<{ value: ProjectStatus | 'ALL'; label: string }> = [
  { value: 'ALL',       label: 'All' },
  { value: 'ACTIVE',    label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD',   label: 'On Hold' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE:    'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  COMPLETED: 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  ON_HOLD:   'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  CANCELLED: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  ACTIVE:    'Active',
  COMPLETED: 'Completed',
  ON_HOLD:   'On Hold',
  CANCELLED: 'Cancelled',
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

const createSchema = z.object({
  name:        z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  clientId:    z.string().optional(),
  status:      z.enum(['ACTIVE', 'COMPLETED', 'ON_HOLD', 'CANCELLED']),
  budget:      z.string().optional(),
  startDate:   z.string().optional(),
  endDate:     z.string().optional(),
})
type CreateValues = z.infer<typeof createSchema>

function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateProject()
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { status: 'ACTIVE' },
  })
  const clientId = watch('clientId')

  async function onSubmit(vals: CreateValues) {
    const input: CreateProjectInput = {
      name:        vals.name,
      description: vals.description || undefined,
      clientId:    vals.clientId    || undefined,
      status:      vals.status,
      budget:      vals.budget ? Number(vals.budget) : undefined,
      startDate:   vals.startDate   || undefined,
      endDate:     vals.endDate     || undefined,
    }
    await mutateAsync(input)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">New Project</h3>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#667085] transition-colors"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Project name *</label>
            <input
              {...register('name')}
              placeholder="e.g. Brand Identity Redesign"
              className="form-input w-full"
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Description</label>
            <textarea
              {...register('description')}
              placeholder="Brief description of the project…"
              rows={2}
              className="form-input w-full resize-none"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">Client</label>
            <ClientMultiSelect
              selected={clientId ? [clientId] : []}
              onChange={ids => setValue('clientId', ids[0] ?? '')}
            />
          </div>

          {/* Status + Budget */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Status</label>
              <select {...register('status')} className="form-input w-full">
                {STATUS_TABS.slice(1).map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Budget (₹)</label>
              <input
                {...register('budget')}
                type="number"
                min={0}
                placeholder="Optional"
                className="form-input w-full"
              />
            </div>
          </div>

          {/* Dates */}
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
              {isPending ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} strokeWidth={2.5} />}
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { format } = useCurrency()
  const budget      = project.budget ? Number(project.budget) : null
  const invoiced    = project.invoiced  ?? 0
  const collected   = project.collected ?? 0
  const outstanding = invoiced - collected
  const progress    = budget && budget > 0 ? Math.min((invoiced / budget) * 100, 100) : null
  const count       = project._count

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-5 hover:border-[#2563EB]/40 dark:hover:border-[#2563EB]/40 hover:shadow-md transition-all group"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] dark:bg-[#1E3A5F] flex items-center justify-center shrink-0">
            <FolderKanban size={18} className="text-[#2563EB]" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate group-hover:text-[#2563EB] transition-colors">
              {project.name}
            </p>
            {project.client && (
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate flex items-center gap-1 mt-0.5">
                <Building2 size={11} />
                {project.client.company || project.client.name}
              </p>
            )}
          </div>
        </div>
        <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0', STATUS_COLORS[project.status])}>
          {STATUS_LABELS[project.status]}
        </span>
      </div>

      {/* Financial summary */}
      {(budget || invoiced > 0) && (
        <div className="mb-4">
          {budget ? (
            <>
              <div className="flex items-end justify-between mb-2">
                <div>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Invoiced</p>
                  <p className="text-[17px] font-bold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">
                    {format(invoiced)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Budget</p>
                  <p className="text-[14px] font-semibold text-[#667085] dark:text-[#8B92A8] tabular-nums leading-none">
                    {format(budget)}
                  </p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all', progress && progress >= 100 ? 'bg-[#D92D20]' : 'bg-[#2563EB]')}
                  style={{ width: `${progress ?? 0}%` }}
                />
              </div>
              <div className="flex items-center justify-between mt-1.5">
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
                  {Math.round(progress ?? 0)}% of budget
                </p>
                {collected > 0 && (
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                    {format(collected)} collected
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-5">
              <div>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Invoiced</p>
                <p className="text-[17px] font-bold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">{format(invoiced)}</p>
              </div>
              {collected > 0 && (
                <div>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Collected</p>
                  <p className="text-[17px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums leading-none">{format(collected)}</p>
                </div>
              )}
              {outstanding > 0 && (
                <div>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Outstanding</p>
                  <p className="text-[17px] font-bold text-amber-600 dark:text-amber-400 tabular-nums leading-none">{format(outstanding)}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="border-t border-[#F2F4F7] dark:border-[#26283A] pt-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {(count?.proposals ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
              <FileText size={12} /> {count!.proposals}
            </span>
          )}
          {(count?.contracts ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
              <PenLine size={12} /> {count!.contracts}
            </span>
          )}
          {(count?.invoices ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
              <Receipt size={12} /> {count!.invoices}
            </span>
          )}
        </div>
        {(project.startDate || project.endDate) && (
          <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
            <Calendar size={11} />
            {project.startDate ? formatDate(project.startDate) : '—'}
            {project.endDate ? ` → ${formatDate(project.endDate)}` : ''}
          </span>
        )}
      </div>
    </button>
  )
}

function ProjectCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-2xl p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="flex-1 space-y-2">
          <div className="h-4 rounded bg-[#F2F4F7] dark:bg-[#21222D] w-2/3" />
          <div className="h-3 rounded bg-[#F2F4F7] dark:bg-[#21222D] w-1/3" />
        </div>
        <div className="h-6 w-16 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between">
          <div className="h-5 w-24 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
          <div className="h-5 w-20 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
        </div>
        <div className="h-2 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
      </div>
      <div className="pt-3 border-t border-[#F2F4F7] dark:border-[#26283A] flex justify-between">
        <div className="h-3 w-20 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="h-3 w-28 rounded bg-[#F2F4F7] dark:bg-[#21222D]" />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate()
  const [showCreate,    setShowCreate]    = useState(false)
  const [search,        setSearch]        = useState('')
  const [statusFilter,  setStatusFilter]  = useState<ProjectStatus | 'ALL'>('ALL')
  const [clientIds,     setClientIds]     = useState<string[]>([])

  const { data, isLoading } = useProjects({
    search:   search.trim() || undefined,
    status:   statusFilter === 'ALL' ? undefined : statusFilter,
    clientId: clientIds.length === 1 ? clientIds[0] : undefined,
    limit:    100,
  })

  const projects    = data?.projects ?? []
  const total       = data?.total    ?? 0
  const hasSearch   = search.trim().length > 0
  const activeCount = projects.filter(p => p.status === 'ACTIVE').length

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Projects</h1>
          {!isLoading && total > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">
              {activeCount} active{total !== activeCount ? ` · ${total} total` : ''}
            </p>
          )}
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Project
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count    = tab.value === 'ALL' ? (data?.total ?? 0) : projects.filter(p => p.status === tab.value).length
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
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search projects…"
            className={cn(
              'w-full h-8 pl-8 pr-7 rounded-lg border text-[12.5px] outline-none transition-colors',
              'bg-white dark:bg-[#13141A] border-[#E4E7EC] dark:border-[#26283A]',
              'text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]',
              'focus:border-[#2563EB]',
            )}
          />
          {hasSearch && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        <ClientMultiSelect selected={clientIds} onChange={setClientIds} />
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
            <FolderKanban size={24} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
            {hasSearch ? `No results for "${search}"` : 'No projects yet'}
          </p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            {hasSearch ? 'Try a different search term.' : 'Group your proposals, contracts and invoices under one project.'}
          </p>
          {!hasSearch && (
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4 text-[13px]">
              <Plus size={13} strokeWidth={2.5} /> New Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
