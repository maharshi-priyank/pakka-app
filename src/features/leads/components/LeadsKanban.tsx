import { useState, useCallback } from 'react'
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import { LEAD_STAGES, STAGE_LABELS, type Lead, type LeadStage } from '../schemas/lead.schema'
import { useLeads, useUpdateLeadStage } from '../hooks/useLeads'
import LeadCard, { LeadCardSkeleton } from './LeadCard'
import LeadDrawer from './LeadDrawer'
import ConvertLeadModal from './ConvertLeadModal'

const COLUMN_ACCENTS: Record<LeadStage, { bar: string; count: string }> = {
  ENQUIRY:       { bar: 'bg-[#667085]',  count: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'  },
  PROPOSAL_SENT: { bar: 'bg-[#2563EB]',  count: 'bg-[#EFF6FF] dark:bg-[#1E2040] text-[#175CD3] dark:text-[#818CF8]'  },
  NEGOTIATING:   { bar: 'bg-[#F79009]',  count: 'bg-[#FFFAEB] dark:bg-amber-950/40 text-[#B54708]'  },
  WON:           { bar: 'bg-[#12B76A]',  count: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48]'  },
  LOST:          { bar: 'bg-[#F04438]',  count: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20]'  },
}

interface ColumnProps {
  stage:               LeadStage
  leads:               Lead[]
  onCardClick:         (lead: Lead) => void
  onNewProposal?:      (lead: Lead) => void
  onConvertToClient?:  (lead: Lead) => void
  convertingLeadId?:   string | null
}

function KanbanColumn({ stage, leads, onCardClick, onNewProposal, onConvertToClient, convertingLeadId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const accent = COLUMN_ACCENTS[stage]
  const totalValue = leads.reduce((s, l) => s + (l.budget ? Number(l.budget) : 0), 0)

  return (
    <div className="flex flex-col w-[260px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
      {/* Stage color bar */}
      <div className={cn('h-1 shrink-0', accent.bar)} />

      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">{STAGE_LABELS[stage]}</span>
          <span className={cn('text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center', accent.count)}>
            {leads.length}
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

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] p-2 space-y-2.5 transition-all duration-150',
          isOver
            ? 'bg-[#EFF6FF] dark:bg-[#1E2040] ring-2 ring-inset ring-[#2563EB]/30'
            : 'bg-[#F5F6FA] dark:bg-[#1A1B23]',
        )}
      >
        <SortableContext items={leads.map(l => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onClick={onCardClick}
              onNewProposal={onNewProposal}
              onConvertToClient={onConvertToClient}
              convertingLeadId={convertingLeadId}
            />
          ))}
        </SortableContext>
        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 gap-1">
            <p className="text-[12px] text-[#D0D5DD] dark:text-[#333649] font-medium">No leads here</p>
            <p className="text-[10px] text-[#D0D5DD] dark:text-[#333649]">Drag to move</p>
          </div>
        )}
      </div>
    </div>
  )
}

interface Props {
  search:          string
  onNewProposal?: (lead: Lead) => void
}

export default function LeadsKanban({ search, onNewProposal }: Props) {
  const [selectedLead,    setSelectedLead]    = useState<Lead | null>(null)
  const [convertingLead,  setConvertingLead]  = useState<Lead | null>(null)
  const [activeId,        setActiveId]        = useState<string | null>(null)
  const [localLeads,      setLocalLeads]      = useState<Lead[] | null>(null)

  const { data, isLoading } = useLeads({ limit: 200, search: search || undefined })
  const updateStage = useUpdateLeadStage()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  const leads = localLeads ?? data?.items ?? []

  const leadsByStage = useCallback(() => {
    const map: Record<LeadStage, Lead[]> = {
      ENQUIRY: [], PROPOSAL_SENT: [], NEGOTIATING: [], WON: [], LOST: [],
    }
    for (const l of leads) map[l.stage].push(l)
    return map
  }, [leads])

  function findLeadById(id: string)              { return leads.find(l => l.id === id) ?? null }
  function findStageForLead(id: string)          { return leads.find(l => l.id === id)?.stage ?? null }

  function onDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
    setLocalLeads(leads)
  }

  function onDragOver({ active, over }: DragOverEvent) {
    if (!over) return
    const activeStage = findStageForLead(active.id as string)
    const overStage   = (LEAD_STAGES as readonly string[]).includes(over.id as string)
      ? (over.id as LeadStage)
      : findStageForLead(over.id as string)
    if (!activeStage || !overStage || activeStage === overStage) return
    setLocalLeads(prev => (prev ?? leads).map(l =>
      l.id === active.id ? { ...l, stage: overStage } : l,
    ))
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over) { setLocalLeads(null); return }
    const originalStage = data?.items?.find(l => l.id === active.id)?.stage
    const overStage     = (LEAD_STAGES as readonly string[]).includes(over.id as string)
      ? (over.id as LeadStage)
      : findStageForLead(over.id as string)
    if (overStage && overStage !== originalStage) {
      updateStage.mutate(
        { id: active.id as string, stage: overStage },
        { onSuccess: () => setLocalLeads(null), onError: () => setLocalLeads(null) },
      )
    } else {
      setLocalLeads(null)
    }
  }

  const stageMap   = leadsByStage()
  const activeLead = activeId ? findLeadById(activeId) : null

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {LEAD_STAGES.map(stage => (
          <div key={stage} className="w-[260px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
            <div className="h-1 bg-[#E4E7EC] dark:bg-[#26283A]" />
            <div className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
              <div className="h-3.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-24 animate-pulse" />
            </div>
            <div className="bg-[#F5F6FA] dark:bg-[#1A1B23] p-2 space-y-2.5">
              {[1, 2].map(i => <LeadCardSkeleton key={i} />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {LEAD_STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              leads={stageMap[stage]}
              onCardClick={setSelectedLead}
              onNewProposal={onNewProposal}
              onConvertToClient={setConvertingLead}
              convertingLeadId={null}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease' }}>
          {activeLead && (
            <div className="rotate-1 scale-105 opacity-90">
              <LeadCard lead={activeLead} onClick={() => {}} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <LeadDrawer lead={selectedLead} onClose={() => setSelectedLead(null)} />

      {convertingLead && (
        <ConvertLeadModal
          lead={convertingLead}
          open={!!convertingLead}
          onClose={() => setConvertingLead(null)}
        />
      )}
    </>
  )
}
