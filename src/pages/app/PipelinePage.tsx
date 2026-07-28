import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners, useDroppable,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import {
  ChevronDown, ChevronRight, CalendarDays, ExternalLink, Users, FolderKanban,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useProjects, useUpdateProject, type Project, type ProjectStage } from '@/features/projects/hooks/useProjects'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import type { Contact } from '@/features/contacts/schemas/contact.schema'
import { STAGE_LABELS, STAGE_COLORS } from '@/features/contacts/schemas/contact.schema'

// ── Constants ──────────────────────────────────────────────────────────────────

const PIPELINE_COLS: ProjectStage[]     = ['SCOPING', 'PROPOSAL_SENT', 'ACTIVE', 'ON_HOLD', 'COMPLETED']
const COL_LABELS: Record<string, string> = {
  SCOPING:       'Scoping',
  PROPOSAL_SENT: 'Proposal Sent',
  ACTIVE:        'Active',
  ON_HOLD:       'On Hold',
  COMPLETED:     'Completed',
}
const COL_ACCENTS: Record<string, { bar: string; count: string }> = {
  SCOPING:       { bar: 'bg-[#667085]',  count: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085]'  },
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

// ── Pipeline Project Card ──────────────────────────────────────────────────────

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
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
            avatarColor(contactName),
          )}>
            {contactName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">
              {project.name}
            </p>
            <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">
              {contactName}
              {project.contact?.company && ` · ${project.contact.company}`}
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

      {/* Budget */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Budget</span>
        {project.budget && Number(project.budget) > 0
          ? <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
              {formatCurrency(Number(project.budget))}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      {/* Due */}
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

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">
          Updated {timeAgo(project.updatedAt)}
        </span>
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

// ── Kanban Column ──────────────────────────────────────────────────────────────

function KanbanColumn({ stage, projects, onCardClick }: {
  stage:       ProjectStage
  projects:    Project[]
  onCardClick: (p: Project) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const accent = COL_ACCENTS[stage]
  const totalValue = projects.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0)

  return (
    <div className="flex flex-col w-[280px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
      <div className={cn('h-1 shrink-0', accent.bar)} />

      <div className="flex items-center justify-between px-3.5 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">
            {COL_LABELS[stage]}
          </span>
          <span className={cn('text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center', accent.count)}>
            {projects.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8]">
            ₹{totalValue >= 100000
              ? `${(totalValue / 100000).toFixed(1)}L`
              : `${(totalValue / 1000).toFixed(0)}k`
            }
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

// ── Negotiating sidebar contact row ───────────────────────────────────────────

function NegotiatingContactRow({ contact, onClick }: { contact: Contact; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-start gap-2.5 px-3.5 py-3 hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] transition-colors text-left group"
    >
      <div className={cn(
        'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5',
        avatarColor(contact.name),
      )}>
        {contact.name.charAt(0).toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[12.5px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug group-hover:text-[#2563EB] transition-colors">
          {contact.name}
        </p>
        {contact.company && (
          <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate">{contact.company}</p>
        )}
        {contact.dealValue && Number(contact.dealValue) > 0 && (
          <p className="text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] mt-0.5">
            {formatCurrency(Number(contact.dealValue))}
          </p>
        )}
      </div>
    </button>
  )
}

// ── Main PipelinePage ─────────────────────────────────────────────────────────

export default function PipelinePage() {
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [activeId,    setActiveId]    = useState<string | null>(null)
  const [localMap,    setLocalMap]    = useState<Record<string, ProjectStage> | null>(null)

  const { data, isLoading } = useProjects({ limit: 200 })
  const { data: negotiatingData } = useContacts({ stage: 'NEGOTIATING', limit: 100 })
  const updateProject = useUpdateProject()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  // Combine server data with local optimistic stage overrides
  const allProjects: Project[] = (data?.projects ?? []).filter(
    p => p.projectStage !== 'CANCELLED',
  )

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

  const stageMap    = projectsByStage()
  const activeProject = activeId ? allProjects.find(p => p.id === activeId) ?? null : null
  const negotiating   = negotiatingData?.items ?? []

  const totalPipelineValue = allProjects.reduce((s, p) => s + (p.budget ? Number(p.budget) : 0), 0)

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#F2F4F7] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-[18px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight leading-tight">
              Pipeline
            </h1>
            {!isLoading && totalPipelineValue > 0 && (
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
                {formatCurrency(totalPipelineValue)} in pipeline
                {negotiating.length > 0 && ` · ${negotiating.length} negotiating`}
              </p>
            )}
          </div>
        </div>

        {/* Sidebar toggle */}
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
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Kanban area */}
        <div className="flex-1 overflow-x-auto overflow-y-auto p-5">
          {isLoading ? (
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
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">No projects in pipeline</p>
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] max-w-xs">
                Create a contact and add a project to get started.
              </p>
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
              <p className="text-[11.5px] font-bold text-[#101828] dark:text-[#ECEEF3] uppercase tracking-wide">
                Negotiating
              </p>
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                Proposal accepted — closing
              </p>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
              {negotiating.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <Users size={20} className="text-[#D0D5DD] dark:text-[#3D4258] mb-2" />
                  <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">No contacts negotiating</p>
                </div>
              ) : (
                negotiating.map(c => (
                  <NegotiatingContactRow
                    key={c.id}
                    contact={c}
                    onClick={() => navigate(`/contacts/${c.id}`)}
                  />
                ))
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  )
}
