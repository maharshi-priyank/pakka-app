import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners, useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  Plus, Search, X, FolderKanban, Calendar,
  FileText, PenLine, Receipt, Loader2, Building2,
  Archive, MoreHorizontal, ChevronDown, ChevronRight,
  CalendarDays, ExternalLink, Users, LayoutGrid, Kanban,
} from 'lucide-react'
import { cn, formatDate, formatCurrency } from '@/lib/utils'
import { useCurrency } from '@/hooks/useCurrency'
import {
  useProjects, useCreateProject, useArchiveProject, useUnarchiveProject,
  useDeleteProject, useUpdateProject,
  type Project, type ProjectStatus, type ProjectStage, type CreateProjectInput,
} from '@/features/projects/hooks/useProjects'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import type { Contact } from '@/features/contacts/schemas/contact.schema'
import { STAGE_LABELS, STAGE_COLORS } from '@/features/contacts/schemas/contact.schema'
import ClientMultiSelect from '@/components/filters/ClientMultiSelect'
import { RemoveModal } from '@/components/RemoveModal'
import { toast } from 'sonner'

// ─── View persistence ──────────────────────────────────────────────────────────

const VIEW_KEY = 'clearwork_projects_view'
type ViewMode = 'pipeline' | 'list'
function getSavedView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'pipeline' } catch { return 'pipeline' }
}
function saveView(v: ViewMode) {
  try { localStorage.setItem(VIEW_KEY, v) } catch { /* */ }
}

// ─── Pipeline kanban constants ─────────────────────────────────────────────────

const PIPELINE_COLS: ProjectStage[] = ['SCOPING', 'PROPOSAL_SENT', 'ACTIVE', 'ON_HOLD', 'COMPLETED']

const COL_LABELS: Record<string, string> = {
  SCOPING:       'Scoping',
  PROPOSAL_SENT: 'Proposal Sent',
  ACTIVE:        'Active',
  ON_HOLD:       'On Hold',
  COMPLETED:     'Completed',
}

const COL_ACCENTS: Record<string, { bar: string; count: string }> = {
  SCOPING:       { bar: 'bg-[#667085]',  count: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085]' },
  PROPOSAL_SENT: { bar: 'bg-[#2563EB]',  count: 'bg-[#EFF6FF] dark:bg-[#1E2040] text-[#175CD3] dark:text-[#818CF8]' },
  ACTIVE:        { bar: 'bg-[#12B76A]',  count: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]' },
  ON_HOLD:       { bar: 'bg-[#F79009]',  count: 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400' },
  COMPLETED:     { bar: 'bg-[#6941C6]',  count: 'bg-[#F4F3FF] dark:bg-violet-950/30 text-[#5925DC] dark:text-violet-400' },
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

// ─── List view constants ───────────────────────────────────────────────────────

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

// ─── Create Modal ──────────────────────────────────────────────────────────────

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
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Project name *</label>
            <input
              {...register('name')}
              placeholder="e.g. Brand Identity Redesign"
              className="form-input w-full"
            />
            {errors.name && <p className="text-[11px] text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Description</label>
            <textarea
              {...register('description')}
              placeholder="Brief description of the project…"
              rows={2}
              className="form-input w-full resize-none"
            />
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">Client</label>
            <ClientMultiSelect
              selected={clientId ? [clientId] : []}
              onChange={ids => setValue('clientId', ids[0] ?? '')}
            />
          </div>

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

// ─── Pipeline view sub-components ─────────────────────────────────────────────

function PipelineCard({ project, onClick }: { project: Project; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: project.id })
  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.4 : 1,
    zIndex:     isDragging ? 50 : undefined,
  }
  const contactName = project.contact?.name ?? 'Unknown'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer select-none',
        'hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all duration-150',
        isDragging && 'shadow-xl ring-2 ring-[#2563EB]/20 rotate-1',
      )}
    >
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0', avatarColor(contactName))}>
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">{project.name}</p>
            <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">
              {contactName}{project.contact?.company && ` · ${project.contact.company}`}
            </p>
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick() }}
          className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center shrink-0 text-[#98A2B3] hover:text-[#2563EB] transition-colors mt-0.5"
        >
          <ExternalLink size={11} strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Budget</span>
        {project.budget && Number(project.budget) > 0
          ? <span className="text-[13px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">{formatCurrency(Number(project.budget))}</span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">End date</span>
        {project.endDate
          ? <span className={cn(
              'flex items-center gap-1 text-[11.5px] font-semibold px-1.5 py-0.5 rounded-md',
              new Date(project.endDate) < new Date()
                ? 'text-[#D92D20] bg-[#FEF3F2] dark:bg-red-950/40'
                : 'text-[#344054] dark:text-[#C2C8D8]',
            )}>
              <CalendarDays size={9} strokeWidth={2.5} />
              {formatDate(project.endDate)}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">Updated {timeAgo(project.updatedAt)}</span>
        {project.contact?.stage && (
          <span className={cn(
            'text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
            STAGE_COLORS[project.contact.stage as keyof typeof STAGE_COLORS] ?? 'bg-[#F2F4F7] text-[#667085]',
          )}>
            {STAGE_LABELS[project.contact.stage as keyof typeof STAGE_LABELS] ?? project.contact.stage}
          </span>
        )}
      </div>
    </div>
  )
}

function PipelineCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-3.5 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-full bg-[#F2F4F7] dark:bg-[#21222D]" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-3/4" />
          <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
        </div>
      </div>
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-12" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
      </div>
    </div>
  )
}

function KanbanColumn({ stage, projects, onCardClick }: {
  stage:       ProjectStage
  projects:    Project[]
  onCardClick: (p: Project) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const accent      = COL_ACCENTS[stage]
  const totalValue  = projects.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0)

  return (
    <div className="flex flex-col w-[280px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
      <div className={cn('h-1 shrink-0', accent.bar)} />
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">{COL_LABELS[stage]}</span>
          <span className={cn('text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center', accent.count)}>
            {projects.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8]">
            ₹{totalValue >= 100000 ? `${(totalValue / 100000).toFixed(1)}L` : `${(totalValue / 1000).toFixed(0)}k`}
          </span>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[300px] p-2 space-y-2.5 transition-all duration-150',
          isOver
            ? 'bg-[#EFF6FF] dark:bg-[#1E2040] ring-2 ring-inset ring-[#2563EB]/30'
            : 'bg-[#F5F6FA] dark:bg-[#1A1B23]',
        )}
      >
        <SortableContext items={projects.map(p => p.id)} strategy={verticalListSortingStrategy}>
          {projects.map(p => (
            <PipelineCard key={p.id} project={p} onClick={() => onCardClick(p)} />
          ))}
        </SortableContext>
        {projects.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1">
            <p className="text-[12px] text-[#D0D5DD] dark:text-[#333649] font-medium">Empty</p>
            <p className="text-[10px] text-[#D0D5DD] dark:text-[#333649]">Drag a project here</p>
          </div>
        )}
      </div>
    </div>
  )
}

function NegotiatingContactRow({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3.5 py-3 hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] transition-colors text-left group"
    >
      <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5', avatarColor(contact.name))}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug group-hover:text-[#2563EB] transition-colors">
          {contact.name}
        </p>
        {contact.company && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate">{contact.company}</p>}
        {contact.dealValue && Number(contact.dealValue) > 0 && (
          <p className="text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mt-0.5">
            {formatCurrency(Number(contact.dealValue), contact.currency ?? 'INR')}
          </p>
        )}
      </div>
    </button>
  )
}

// ─── List view sub-components ──────────────────────────────────────────────────

function ProjectCard({ project, onClick, onRemove, onUnarchive }: {
  project:     Project
  onClick:     () => void
  onRemove:    () => void
  onUnarchive: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { format } = useCurrency()
  const budget      = project.budget ? Number(project.budget) : null
  const invoiced    = project.invoiced  ?? 0
  const collected   = project.collected ?? 0
  const outstanding = invoiced - collected
  const progress    = budget && budget > 0 ? Math.min((invoiced / budget) * 100, 100) : null
  const count       = project._count

  return (
    <div className={cn(
      'relative bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-5 transition-all duration-150 group',
      'hover:border-[#D0D5DD] dark:hover:border-[#344054] hover:shadow-[0_4px_12px_rgba(0,0,0,0.07)] hover:-translate-y-px',
      project.archivedAt && 'opacity-60',
    )}>
      {project.archivedAt && (
        <span className="absolute top-3 right-10 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded-full px-2 py-0.5 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800">
          Archived
        </span>
      )}

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
              {project.archivedAt ? (
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onUnarchive() }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#22243A] text-[#344054] dark:text-[#CDD2E0]"
                >
                  <Archive size={12} /> Unarchive
                </button>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setMenuOpen(false); onRemove() }}
                  className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F9FAFB] dark:hover:bg-[#22243A] text-[#344054] dark:text-[#CDD2E0]"
                >
                  <Archive size={12} /> Remove…
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <button onClick={onClick} className="w-full text-left">
        <div className="flex items-start gap-3 mb-4 pr-6">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1E1F40] flex items-center justify-center shrink-0">
              <FolderKanban size={18} className="text-[#6366F1]" strokeWidth={2} />
            </div>
            <div className="min-w-0">
              <p className="text-[14.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">
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

        {(budget || invoiced > 0) && (
          <div className="mb-4">
            {budget ? (
              <>
                <div className="flex items-end justify-between mb-2">
                  <div>
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Invoiced</p>
                    <p className="text-[17px] font-bold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">{format(invoiced)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mb-0.5">Budget</p>
                    <p className="text-[14px] font-semibold text-[#667085] dark:text-[#8B92A8] tabular-nums leading-none">{format(budget)}</p>
                  </div>
                </div>
                <div className="h-1.5 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] overflow-hidden">
                  <div
                    className={cn('h-full rounded-full transition-all', progress && progress >= 100 ? 'bg-[#EF4444]' : 'bg-[#6366F1]')}
                    style={{ width: `${progress ?? 0}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{Math.round(progress ?? 0)}% of budget</p>
                  {collected > 0 && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">{format(collected)} collected</p>
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
    </div>
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

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const navigate = useNavigate()

  // View toggle
  const [view,        setView]        = useState<ViewMode>(getSavedView)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // Shared
  const [showCreate,  setShowCreate]  = useState(false)

  // List view state
  const [search,          setSearch]          = useState('')
  const [statusFilter,    setStatusFilter]    = useState<ProjectStatus | 'ALL'>('ALL')
  const [clientIds,       setClientIds]       = useState<string[]>([])
  const [includeArchived, setIncludeArchived] = useState(false)
  const [removeTarget,    setRemoveTarget]    = useState<Project | null>(null)

  // Archive / delete
  const archiveMut   = useArchiveProject()
  const unarchiveMut = useUnarchiveProject()
  const deleteMut    = useDeleteProject()

  // List data
  const { data: listData, isLoading: listLoading } = useProjects({
    search:          search.trim() || undefined,
    status:          statusFilter === 'ALL' ? undefined : statusFilter,
    clientId:        clientIds.length === 1 ? clientIds[0] : undefined,
    limit:           100,
    includeArchived: includeArchived || undefined,
  })

  // Pipeline data
  const [activeId,  setActiveId]  = useState<string | null>(null)
  const [localMap,  setLocalMap]  = useState<Record<string, ProjectStage> | null>(null)
  const { data: pipelineData, isLoading: pipelineLoading } = useProjects({ limit: 200 })
  const { data: negotiatingData } = useContacts({ stage: 'NEGOTIATING', limit: 100 })
  const updateProject = useUpdateProject()

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const allProjects: Project[] = (pipelineData?.projects ?? []).filter(p => p.projectStage !== 'CANCELLED')

  const projectsByStage = useCallback((): Record<ProjectStage, Project[]> => {
    const map: Record<ProjectStage, Project[]> = {
      SCOPING: [], PROPOSAL_SENT: [], ACTIVE: [], COMPLETED: [], ON_HOLD: [], CANCELLED: [],
    }
    for (const p of allProjects) {
      const stage = (localMap?.[p.id] ?? p.projectStage) as ProjectStage
      if (stage in map) map[stage].push(p)
    }
    return map
  }, [allProjects, localMap])

  function findStage(id: string): ProjectStage | null {
    return (localMap?.[id] ?? allProjects.find(p => p.id === id)?.projectStage) as ProjectStage | null
  }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    const initial: Record<string, ProjectStage> = {}
    for (const p of allProjects) if (p.projectStage) initial[p.id] = p.projectStage
    setLocalMap(initial)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeStage = findStage(active.id as string)
    const overStage   = (PIPELINE_COLS as readonly string[]).includes(over.id as string)
      ? (over.id as ProjectStage)
      : findStage(over.id as string)
    if (!activeStage || !overStage || activeStage === overStage) return
    setLocalMap(prev => ({ ...(prev ?? {}), [active.id as string]: overStage as ProjectStage }))
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) { setLocalMap(null); return }
    const originalStage = allProjects.find(p => p.id === active.id)?.projectStage
    const overStage     = (PIPELINE_COLS as readonly string[]).includes(over.id as string)
      ? (over.id as ProjectStage)
      : findStage(over.id as string)
    if (overStage && overStage !== originalStage) {
      updateProject.mutate(
        { id: active.id as string, projectStage: overStage },
        { onSuccess: () => setLocalMap(null), onError: () => setLocalMap(null) },
      )
    } else {
      setLocalMap(null)
    }
  }

  function switchView(v: ViewMode) {
    setView(v)
    saveView(v)
  }

  const stageMap      = projectsByStage()
  const activeProject = activeId ? allProjects.find(p => p.id === activeId) ?? null : null
  const negotiating   = negotiatingData?.items ?? []
  const totalPipelineValue = allProjects.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0)

  const listProjects  = listData?.projects ?? []
  const listTotal     = listData?.total    ?? 0
  const hasSearch     = search.trim().length > 0
  const activeCount   = listProjects.filter(p => p.status === 'ACTIVE').length

  // ── View toggle button ─────────────────────────────────────────────────────

  const ViewToggle = (
    <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#1A1B23] rounded-lg border border-[#EAECF0] dark:border-[#26283A]">
      <button
        onClick={() => switchView('pipeline')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all',
          view === 'pipeline'
            ? 'bg-white dark:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8] shadow-sm'
            : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]',
        )}
      >
        <Kanban size={13} strokeWidth={2} />
        Pipeline
      </button>
      <button
        onClick={() => switchView('list')}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[12px] font-medium transition-all',
          view === 'list'
            ? 'bg-white dark:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8] shadow-sm'
            : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]',
        )}
      >
        <LayoutGrid size={13} strokeWidth={2} />
        List
      </button>
    </div>
  )

  // ── Pipeline view ──────────────────────────────────────────────────────────

  if (view === 'pipeline') {
    return (
      <div className="flex flex-col h-full overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
          <div>
            <h1 className="text-[18px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight leading-tight">Projects</h1>
            {!pipelineLoading && totalPipelineValue > 0 && (
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
                {formatCurrency(totalPipelineValue)} in pipeline
                {negotiating.length > 0 && ` · ${negotiating.length} negotiating`}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ViewToggle}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className={cn(
                'flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg border transition-colors',
                sidebarOpen
                  ? 'bg-[#F2F4F7] dark:bg-[#1E2030] border-[#D0D5DD] dark:border-[#333649] text-[#344054] dark:text-[#CDD2E0]'
                  : 'border-transparent text-[#98A2B3] hover:text-[#667085]',
              )}
            >
              <Users size={13} />
              Negotiating {negotiating.length > 0 && `(${negotiating.length})`}
              {sidebarOpen ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
            </button>
            <button onClick={() => setShowCreate(true)} className="btn-primary text-[13px]">
              <Plus size={13} strokeWidth={2.5} />
              New Project
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex flex-1 overflow-hidden">

          {/* Kanban area */}
          <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
            {pipelineLoading ? (
              <div className="flex gap-4">
                {PIPELINE_COLS.map(col => (
                  <div key={col} className="w-[280px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
                    <div className="h-1 bg-[#E4E7EC] dark:bg-[#26283A]" />
                    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
                      <div className="h-3.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-24 animate-pulse" />
                    </div>
                    <div className="bg-[#F5F6FA] dark:bg-[#1A1B23] p-2 space-y-2.5">
                      {[1, 2].map(i => <PipelineCardSkeleton key={i} />)}
                    </div>
                  </div>
                ))}
              </div>
            ) : allProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center">
                  <FolderKanban size={24} className="text-[#2563EB]" />
                </div>
                <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">No projects yet</p>
                <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] max-w-xs">
                  Create a project to start tracking budgets, tasks, and documents.
                </p>
                <button onClick={() => setShowCreate(true)} className="btn-primary mt-1 text-[13px]">
                  <Plus size={13} strokeWidth={2.5} /> New Project
                </button>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragEnd={onDragEnd}
              >
                <div className="flex gap-4">
                  {PIPELINE_COLS.map(col => (
                    <KanbanColumn
                      key={col}
                      stage={col}
                      projects={stageMap[col]}
                      onCardClick={p => navigate(`/projects/${p.id}`)}
                    />
                  ))}
                </div>
                <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
                  {activeProject && (
                    <div className="rotate-1 scale-105 opacity-90">
                      <PipelineCard project={activeProject} onClick={() => {}} />
                    </div>
                  )}
                </DragOverlay>
              </DndContext>
            )}
          </div>

          {/* Negotiating sidebar */}
          {sidebarOpen && (
            <aside className="w-[240px] shrink-0 border-l border-[#F2F4F7] dark:border-[#26283A] bg-white dark:bg-[#13141A] flex flex-col overflow-hidden">
              <div className="px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
                <p className="text-[11.5px] font-bold text-[#101828] dark:text-[#ECEEF3] uppercase tracking-wide">Negotiating</p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Proposal accepted — closing</p>
              </div>
              <div className="flex-1 overflow-y-auto divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
                {negotiating.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                    <Users size={20} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" />
                    <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">No contacts negotiating</p>
                  </div>
                ) : (
                  negotiating.map(c => (
                    <NegotiatingContactRow key={c.id} contact={c} onClick={() => navigate(`/contacts/${c.id}`)} />
                  ))
                )}
              </div>
            </aside>
          )}
        </div>

        {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}
      </div>
    )
  }

  // ── List view ──────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Projects</h1>
          {!listLoading && listTotal > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5">
              {activeCount} active{listTotal !== activeCount ? ` · ${listTotal} total` : ''}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ViewToggle}
          <button onClick={() => setShowCreate(true)} className="btn-primary">
            <Plus size={14} strokeWidth={2.5} />
            New Project
          </button>
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count    = tab.value === 'ALL' ? (listData?.total ?? 0) : listProjects.filter(p => p.status === tab.value).length
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
      {listLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <ProjectCardSkeleton key={i} />)}
        </div>
      ) : listProjects.length === 0 ? (
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
          {listProjects.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              onClick={() => navigate(`/projects/${p.id}`)}
              onRemove={() => setRemoveTarget(p)}
              onUnarchive={() => unarchiveMut.mutate(p.id, { onSuccess: () => toast.success('Project unarchived') })}
            />
          ))}
        </div>
      )}

      {showCreate && <CreateProjectModal onClose={() => setShowCreate(false)} />}

      {removeTarget && (
        <RemoveModal
          open
          onClose={() => setRemoveTarget(null)}
          onArchive={() => {
            archiveMut.mutate(removeTarget.id, { onSuccess: () => toast.success('Project archived') })
            setRemoveTarget(null)
          }}
          onDelete={() => {
            deleteMut.mutate(removeTarget.id, { onSuccess: () => toast.success('Project deleted') })
            setRemoveTarget(null)
          }}
          entityLabel={removeTarget.name}
          entityType="project"
          hasLinkedRecords={
            (removeTarget._count?.proposals ?? 0) + (removeTarget._count?.contracts ?? 0) +
            (removeTarget._count?.invoices   ?? 0) + (removeTarget._count?.timeEntries ?? 0) +
            (removeTarget._count?.expenses   ?? 0) > 0
          }
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
