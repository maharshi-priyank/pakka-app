import { useState, useCallback } from 'react'
import {
  DndContext, PointerSensor, useSensor, useSensors,
  DragOverlay, closestCorners,
} from '@dnd-kit/core'
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { ArrowUpRight, IndianRupee, CalendarDays, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency-symbols'
import {
  PIPELINE_STAGES, STAGE_LABELS,
  type Contact, type ContactStage,
} from '../schemas/contact.schema'
import { useContacts, useUpdateContactStage } from '../hooks/useContacts'

const SOURCE_LABELS: Record<string, string> = {
  instagram:     'Instagram',
  referral:      'Referral',
  website:       'Website',
  linkedin:      'LinkedIn',
  cold_outreach: 'Cold Outreach',
  other:         'Other',
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function relativeDay(iso: string) {
  const d = new Date(iso), now = new Date()
  const diff = Math.round((d.getTime() - now.getTime()) / 86400000)
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return `${d.getDate()} ${d.toLocaleString('en-IN', { month: 'short' })}`
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60)    return `${s}s ago`
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

const COLUMN_ACCENTS: Record<ContactStage, { bar: string; count: string }> = {
  ENQUIRY:       { bar: 'bg-[#667085]',  count: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085]'  },
  PROPOSAL_SENT: { bar: 'bg-[#2563EB]',  count: 'bg-[#EFF6FF] dark:bg-[#1E2040] text-[#175CD3]'  },
  NEGOTIATING:   { bar: 'bg-[#F79009]',  count: 'bg-[#FFFAEB] dark:bg-amber-950/40 text-[#B54708]' },
  CLIENT:        { bar: 'bg-[#12B76A]',  count: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48]' },
  PAST_CLIENT:   { bar: 'bg-[#667085]',  count: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085]'  },
  LOST:          { bar: 'bg-[#F04438]',  count: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20]'  },
}

// ─── Contact Card ─────────────────────────────────────────────────────────────

interface CardProps {
  contact:  Contact
  onClick:  (c: Contact) => void
  overlay?: boolean
}

function ContactCard({ contact, onClick, overlay }: CardProps) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: contact.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity:   isDragging ? 0.4 : 1,
    zIndex:    isDragging ? 50 : undefined,
  }

  return (
    <div
      ref={overlay ? undefined : setNodeRef}
      style={overlay ? undefined : style}
      {...(overlay ? {} : { ...attributes, ...listeners })}
      onClick={() => onClick(contact)}
      className={cn(
        'bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm cursor-pointer select-none',
        'hover:shadow-md hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-all duration-150',
        isDragging && 'shadow-xl ring-2 ring-[#2563EB]/20 rotate-1',
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 px-3.5 pt-3.5 pb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0', avatarColor(contact.name))}>
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-snug">{contact.name}</p>
            {contact.company && (
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate leading-snug">{contact.company}</p>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); onClick(contact) }}
          className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center shrink-0 text-[#98A2B3] hover:text-[#2563EB] transition-colors mt-0.5"
        >
          <ArrowUpRight size={11} strokeWidth={2.5} />
        </button>
      </div>

      {/* Service row */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Service</span>
        {contact.service
          ? <span className="text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8] text-right truncate">{contact.service}</span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      {/* Deal value row */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Value</span>
        {contact.dealValue && Number(contact.dealValue) > 0
          ? <span className="flex items-center gap-0.5 text-[13px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
              {!contact.currency || contact.currency === 'INR'
                ? <IndianRupee size={10} strokeWidth={3} />
                : currencySymbol(contact.currency)}
              {Number(contact.dealValue).toLocaleString('en-IN')}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      {/* Follow-up row */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">Follow-up</span>
        {contact.followUpAt
          ? <span className="flex items-center gap-1 text-[11.5px] font-semibold text-[#D92D20] bg-[#FEF3F2] dark:bg-red-950/40 px-1.5 py-0.5 rounded-md">
              <CalendarDays size={9} strokeWidth={2.5} />
              {relativeDay(contact.followUpAt)}
            </span>
          : <span className="text-[11px] text-[#D0D5DD] dark:text-[#333649] italic">Not set</span>
        }
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#1A1B23] rounded-b-xl">
        <span className="text-[10px] text-[#98A2B3] dark:text-[#545C74]">
          Active {timeAgo(contact.lastActivityAt)}
        </span>
        {contact.source && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-[#667085] dark:text-[#8B92A8] bg-white dark:bg-[#21222D] border border-[#EAECF0] dark:border-[#26283A] px-1.5 py-0.5 rounded-md">
            <Tag size={8} strokeWidth={2} />
            {SOURCE_LABELS[contact.source] ?? contact.source}
          </span>
        )}
      </div>
    </div>
  )
}

export function ContactCardSkeleton() {
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
      <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
      <div className="flex justify-between">
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-10" />
        <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-16" />
      </div>
    </div>
  )
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

interface ColumnProps {
  stage:       ContactStage
  contacts:    Contact[]
  onCardClick: (c: Contact) => void
}

function KanbanColumn({ stage, contacts, onCardClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })
  const accent = COLUMN_ACCENTS[stage]
  const totalValue = contacts.reduce((s, c) => s + (c.dealValue ? Number(c.dealValue) : 0), 0)

  return (
    <div className="flex flex-col w-[260px] shrink-0 rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
      <div className={cn('h-1 shrink-0', accent.bar)} />

      <div className="flex items-center justify-between px-3 py-2.5 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">{STAGE_LABELS[stage]}</span>
          <span className={cn('text-[11px] font-bold min-w-[20px] h-5 px-1.5 rounded-full flex items-center justify-center', accent.count)}>
            {contacts.length}
          </span>
        </div>
        {totalValue > 0 && (
          <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8]">
            ₹{totalValue >= 100000
              ? `${(totalValue / 100000).toFixed(1)}L`
              : `${(totalValue / 1000).toFixed(0)}k`}
          </span>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 min-h-[200px] p-2 space-y-2.5 transition-all duration-150',
          isOver
            ? 'bg-[#EFF6FF] dark:bg-[#1E2040] ring-2 ring-inset ring-[#2563EB]/30'
            : 'bg-[#F5F6FA] dark:bg-[#1A1B23]',
        )}
      >
        <SortableContext items={contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
          {contacts.map(c => (
            <ContactCard key={c.id} contact={c} onClick={onCardClick} />
          ))}
        </SortableContext>
      </div>
    </div>
  )
}

// ─── Main Kanban ──────────────────────────────────────────────────────────────

interface Props {
  search: string
}

export default function ContactsKanban({ search }: Props) {
  const { data, isLoading } = useContacts({ limit: 500 })
  const { mutate: updateStage } = useUpdateContactStage()
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [localContacts, setLocalContacts] = useState<Contact[] | null>(null)
  const [openContact, setOpenContact] = useState<Contact | null>(null)

  const allContacts = localContacts ?? data?.items ?? []

  const filtered = search.trim()
    ? allContacts.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        (c.company ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (c.email   ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : allContacts

  const byStage = useCallback((stage: ContactStage) =>
    filtered.filter(c => c.stage === stage && !c.archivedAt),
    [filtered],
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  )

  function onDragStart(e: DragStartEvent) {
    const contact = allContacts.find(c => c.id === e.active.id)
    if (contact) setActiveContact(contact)
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    const toStage = over.id as ContactStage
    if (!PIPELINE_STAGES.includes(toStage)) return
    const from = allContacts.find(c => c.id === active.id)
    if (!from || from.stage === toStage) return

    setLocalContacts(prev => {
      const base = prev ?? data?.items ?? []
      return base.map(c => c.id === from.id ? { ...c, stage: toStage } : c)
    })
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e
    setActiveContact(null)

    if (!over) { setLocalContacts(null); return }
    const toStage = over.id as ContactStage
    if (!PIPELINE_STAGES.includes(toStage)) { setLocalContacts(null); return }
    const from = (data?.items ?? []).find(c => c.id === active.id)
    if (!from || from.stage === toStage) { setLocalContacts(null); return }

    updateStage({ id: from.id, stage: toStage }, {
      onSuccess: () => setLocalContacts(null),
      onError:   () => setLocalContacts(null),
    })
  }

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {PIPELINE_STAGES.map(stage => (
          <div key={stage} className="w-[260px] shrink-0 space-y-2.5">
            <div className="h-10 bg-[#F2F4F7] dark:bg-[#21222D] rounded-xl animate-pulse" />
            {Array.from({ length: 2 }).map((_, i) => <ContactCardSkeleton key={i} />)}
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
          {PIPELINE_STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              contacts={byStage(stage)}
              onCardClick={setOpenContact}
            />
          ))}
        </div>

        <DragOverlay>
          {activeContact && (
            <ContactCard contact={activeContact} onClick={() => {}} overlay />
          )}
        </DragOverlay>
      </DndContext>

      {/* TODO U12: ContactDrawer goes here */}
      {openContact && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setOpenContact(null)}
        >
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" />
          <div className="relative z-10 bg-white dark:bg-[#13141A] rounded-2xl border border-[#EAECF0] dark:border-[#26283A] shadow-xl p-6 max-w-sm w-full mx-4">
            <p className="text-[14px] font-bold text-[#0D1117] dark:text-[#ECEEF3] mb-1">{openContact.name}</p>
            {openContact.company && <p className="text-[12px] text-[#9CA3AF]">{openContact.company}</p>}
            {openContact.email   && <p className="text-[12px] text-[#9CA3AF] mt-1">{openContact.email}</p>}
            {openContact.phone   && <p className="text-[12px] text-[#9CA3AF]">{openContact.phone}</p>}
          </div>
        </div>
      )}
    </>
  )
}
