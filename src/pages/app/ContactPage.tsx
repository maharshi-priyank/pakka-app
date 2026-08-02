import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Mail, Phone, IndianRupee, Calendar, Briefcase, Globe, Pencil,
  MoreHorizontal, Archive, Trash2, Copy, CheckCheck, Plus, MessageCircle,
  Video, Clock, Loader2, FolderKanban, AlertCircle, ChevronDown, LayoutDashboard,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useContact, useArchiveContact, useDeleteContact } from '@/features/contacts/hooks/useContacts'
import { useCreateProject } from '@/features/projects/hooks/useProjects'
import {
  useContactThread, useSendContactMessage, useMarkContactThreadRead,
} from '@/features/messages/hooks/useMessages'
import type { Contact, ContactProject } from '@/features/contacts/schemas/contact.schema'
import type { Message } from '@/features/messages/hooks/useMessages'
import { STAGE_LABELS, STAGE_COLORS } from '@/features/contacts/schemas/contact.schema'
import ContactStagePicker from '@/features/contacts/components/ContactStagePicker'
import ContactProjectAccordion from '@/features/contacts/components/ContactProjectAccordion'
import EditContactModal from '@/features/contacts/components/EditContactModal'
import { MessageBubble } from '@/features/messages/components/MessageBubble'
import { ReplyComposer } from '@/features/messages/components/ReplyComposer'
import { ConfirmModal } from '@/components/ConfirmModal'
import { ContactHistoryTab } from '@/features/contacts/components/ContactHistoryTab'
import { ContactOverviewTab } from '@/features/contacts/components/ContactOverviewTab'

type Tab = 'overview' | 'projects' | 'messages' | 'meetings' | 'history'

// ─── Avatar helpers ───────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('')
}

const AVATAR_PALETTES = [
  { bg: 'bg-[#EEF4FF]', text: 'text-[#3538CD]' },
  { bg: 'bg-[#ECFDF3]', text: 'text-[#027A48]' },
  { bg: 'bg-[#FFFAEB]', text: 'text-[#B54708]' },
  { bg: 'bg-[#FDF4FF]', text: 'text-[#6941C6]' },
  { bg: 'bg-[#FFF1F3]', text: 'text-[#C01048]' },
  { bg: 'bg-[#F0F9FF]', text: 'text-[#026AA2]' },
]

function avatarPalette(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length]
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

function FieldRow({ icon: Icon, label, value, className }: {
  icon:      React.ComponentType<{ size?: number; className?: string }>
  label:     string
  value:     React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <div className="w-6 h-6 rounded-md bg-[#F9FAFB] dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] flex items-center justify-center shrink-0 mt-0.5">
        <Icon size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] font-medium leading-none mb-1">{label}</p>
        <div className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-snug">{value}</div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ContactPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: contact, isLoading } = useContact(id ?? null)
  const [activeTab,     setActiveTab]     = useState<Tab>('overview')
  const [showEdit,      setShowEdit]      = useState(false)
  const [showDelete,    setShowDelete]    = useState(false)
  const [menuOpen,      setMenuOpen]      = useState(false)
  const [portalCopied,  setPortalCopied]  = useState(false)

  const archive       = useArchiveContact()
  const deleteContact = useDeleteContact()
  const createProject = useCreateProject()

  const { data: threadData, isLoading: threadLoading } = useContactThread(id ?? null)
  const sendMsg  = useSendContactMessage(id ?? '')
  const markRead = useMarkContactThreadRead(id ?? '')

  const projects: ContactProject[] = contact?.projects
    ? [...contact.projects].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    : []

  function handleCopyPortal() {
    if (!contact?.portalToken) return
    const url = `${window.location.origin}/portal/${contact.portalToken}`
    navigator.clipboard.writeText(url).then(() => {
      setPortalCopied(true)
      setTimeout(() => setPortalCopied(false), 2000)
    })
  }

  async function handleArchive() {
    if (!id) return
    await archive.mutateAsync(id)
    toast.success('Contact archived')
    navigate('/contacts')
  }

  async function handleDelete() {
    if (!id) return
    await deleteContact.mutateAsync(id)
    navigate('/contacts')
  }

  async function handleNewProject() {
    if (!id || !contact) return
    await createProject.mutateAsync({ name: 'New Project', contactId: id, projectStage: 'SCOPING' })
    toast.success('Project created')
  }

  // ── Loading skeleton ─────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
          <Skeleton className="w-7 h-7 rounded-lg" />
          <Skeleton className="w-7 h-7 rounded-lg" />
          <div className="space-y-1.5 flex-1">
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="hidden md:flex md:flex-col md:w-[200px] lg:w-[264px] shrink-0 border-r border-[#F2F4F7] dark:border-[#26283A] p-5 space-y-5">
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton className="w-14 h-14 rounded-2xl" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}
          </div>
          <div className="flex-1 flex flex-col">
            <div className="md:hidden h-[52px] animate-pulse bg-[#F9FAFB] dark:bg-[#1A1B23] border-b border-[#F2F4F7] dark:border-[#26283A]" />
            <Skeleton className="mx-5 mt-4 h-10 rounded-xl" />
            <div className="flex-1 p-5 space-y-3">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-[14px] font-semibold text-[#344054]">Contact not found</p>
          <button onClick={() => navigate('/contacts')} className="mt-3 text-[12px] text-[#2563EB] hover:underline">
            Back to contacts
          </button>
        </div>
      </div>
    )
  }

  const isOverdueFollowUp = !!(contact.followUpAt && new Date(contact.followUpAt) < new Date())
  const palette = avatarPalette(contact.name)
  const inboundUnread = threadData?.messages?.filter(
    (m: { readAt?: string | null; direction?: string }) => !m.readAt && m.direction === 'INBOUND'
  ).length ?? 0

  return (
    <div className="flex flex-col h-full overflow-hidden">

      {/* ── Sticky top header ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-2.5 px-4 py-2.5 border-b border-[#F2F4F7] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0 z-10">
        <button
          onClick={() => navigate('/contacts')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] transition-colors shrink-0"
        >
          <ArrowLeft size={15} strokeWidth={2.5} />
        </button>

        <div className={cn(
          'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold shrink-0',
          palette.bg, palette.text,
        )}>
          {initials(contact.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h1 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate leading-tight">
              {contact.name}
            </h1>
            {contact.company && (
              <span className="text-[12.5px] text-[#98A2B3] dark:text-[#545C74] truncate hidden sm:block">
                · {contact.company}
              </span>
            )}
          </div>
        </div>

        <ContactStagePicker contactId={contact.id} current={contact.stage} />

        <button
          onClick={() => setShowEdit(true)}
          className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
        >
          <Pencil size={12} />
          Edit
        </button>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(o => !o)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 z-50 w-44 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-lg overflow-hidden">
                <button
                  onClick={() => { handleCopyPortal(); setMenuOpen(false) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                >
                  {portalCopied ? <CheckCheck size={13} className="text-[#17B26A]" /> : <Copy size={13} />}
                  Copy portal link
                </button>
                <button
                  onClick={() => { setMenuOpen(false); handleArchive() }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
                >
                  <Archive size={13} />
                  Archive contact
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setShowDelete(true) }}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 text-[12.5px] text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-red-950/20 transition-colors"
                >
                  <Trash2 size={13} />
                  Delete contact
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <aside className="hidden md:flex md:flex-col md:w-[200px] lg:w-[264px] shrink-0 border-r border-[#F2F4F7] dark:border-[#26283A] overflow-y-auto bg-white dark:bg-[#13141A]">

          {/* Profile card */}
          <div className="p-5 pb-4 flex flex-col items-center text-center">
            <div className={cn(
              'w-14 h-14 rounded-2xl flex items-center justify-center text-[20px] font-bold mb-3',
              palette.bg, palette.text,
            )}>
              {initials(contact.name)}
            </div>
            <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-snug">
              {contact.name}
            </p>
            {contact.company && (
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5 leading-snug">
                {contact.company}
              </p>
            )}
            <span className={cn(
              'mt-2.5 text-[10.5px] font-bold px-2.5 py-1 rounded-full',
              STAGE_COLORS[contact.stage],
            )}>
              {STAGE_LABELS[contact.stage]}
            </span>
          </div>

          <div className="mx-4 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />

          {/* Contact info group */}
          <div className="p-4 space-y-3.5">
            {contact.email ? (
              <FieldRow icon={Mail} label="Email" value={
                <a href={`mailto:${contact.email}`} className="text-[#2563EB] hover:underline break-all">
                  {contact.email}
                </a>
              } />
            ) : (
              <FieldRow icon={Mail} label="Email" value={
                <span className="italic text-[#C4C9D4] dark:text-[#3D4258]">Not set</span>
              } />
            )}
            {contact.phone && (
              <FieldRow icon={Phone} label="Phone" value={
                <a href={`tel:${contact.phone}`} className="hover:text-[#2563EB] transition-colors">
                  {contact.phone}
                </a>
              } />
            )}
            {contact.service && (
              <FieldRow icon={Briefcase} label="Service" value={contact.service} />
            )}
          </div>

          {(contact.dealValue || contact.source || contact.followUpAt) && (
            <>
              <div className="mx-4 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <div className="p-4 space-y-3.5">
                {contact.dealValue && Number(contact.dealValue) > 0 && (
                  <FieldRow icon={IndianRupee} label="Deal Value" value={
                    <span className="font-bold text-[#101828] dark:text-[#ECEEF3]">
                      {formatCurrency(Number(contact.dealValue), contact.currency ?? 'INR')}
                    </span>
                  } />
                )}
                {contact.source && (
                  <FieldRow icon={Globe} label="Source" value={
                    <span className="capitalize">{contact.source.replace(/_/g, ' ').toLowerCase()}</span>
                  } />
                )}
                {contact.followUpAt && (
                  <FieldRow
                    icon={isOverdueFollowUp ? AlertCircle : Calendar}
                    label="Follow-up"
                    value={
                      <span className={cn(
                        'font-medium',
                        isOverdueFollowUp ? 'text-[#D92D20]' : 'text-[#344054] dark:text-[#C2C8D8]',
                      )}>
                        {isOverdueFollowUp && 'Overdue · '}
                        {formatDate(contact.followUpAt)}
                      </span>
                    }
                  />
                )}
              </div>
            </>
          )}

          {contact.notes && (
            <>
              <div className="mx-4 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <div className="p-4">
                <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] font-medium mb-1.5">Notes</p>
                <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            </>
          )}

          {contact.portalToken && (
            <>
              <div className="mx-4 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <div className="p-4">
                <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] font-medium mb-2">Client Portal</p>
                <button
                  onClick={handleCopyPortal}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
                >
                  {portalCopied ? <CheckCheck size={12} className="text-[#17B26A]" /> : <Copy size={12} />}
                  {portalCopied ? 'Copied!' : 'Copy portal link'}
                </button>
              </div>
            </>
          )}

          <div className="flex-1" />
          <div className="mx-4 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
          <div className="px-4 py-3 flex items-center gap-1.5 text-[11px] text-[#C4C9D4] dark:text-[#3D4258]">
            <Clock size={11} />
            Added {formatDate(contact.createdAt)}
          </div>
        </aside>

        {/* ── Main content area ─────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-hidden bg-[#F9FAFB] dark:bg-[#0F1017]">

          <MobileProfileStrip
            contact={contact}
            palette={palette}
            isOverdueFollowUp={isOverdueFollowUp}
            portalCopied={portalCopied}
            onCopyPortal={handleCopyPortal}
          />

          {/* Tab bar */}
          <div className="flex items-end gap-0.5 px-4 pt-1 bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A] shrink-0 overflow-x-auto scrollbar-none">
            <TabButton
              active={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              icon={LayoutDashboard}
              label="Overview"
            />
            <TabButton
              active={activeTab === 'projects'}
              onClick={() => setActiveTab('projects')}
              icon={FolderKanban}
              label="Projects"
              count={projects.length > 0 ? projects.length : undefined}
            />
            <TabButton
              active={activeTab === 'messages'}
              onClick={() => setActiveTab('messages')}
              icon={MessageCircle}
              label="Messages"
              count={inboundUnread > 0 ? inboundUnread : undefined}
              countDot
            />
            <TabButton
              active={activeTab === 'meetings'}
              onClick={() => setActiveTab('meetings')}
              icon={Video}
              label="Meetings"
              count={(contact.meetings?.length ?? 0) > 0 ? contact.meetings!.length : undefined}
            />
            <TabButton
              active={activeTab === 'history'}
              onClick={() => setActiveTab('history')}
              icon={Clock}
              label="History"
            />
          </div>

          {/* Tab panels */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'overview' && (
              <ContactOverviewTab contact={contact} isOverdueFollowUp={isOverdueFollowUp} />
            )}
            {activeTab === 'projects' && (
              <ProjectsTab
                projects={projects}
                contactId={contact.id}
                contactStage={contact.stage}
                onNewProject={handleNewProject}
                isPending={createProject.isPending}
              />
            )}
            {activeTab === 'messages' && (
              <MessagesTab
                threadData={threadData}
                threadLoading={threadLoading}
                contactName={contact.name}
                onSend={async body => {
                  await sendMsg.mutateAsync({ body })
                  markRead.mutate()
                }}
                isSending={sendMsg.isPending}
              />
            )}
            {activeTab === 'meetings' && (
              <MeetingsTab meetings={contact.meetings ?? []} />
            )}
            {activeTab === 'history' && (
              <ContactHistoryTab contactId={contact.id} />
            )}
          </div>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────────── */}
      {showEdit && (
        <EditContactModal contact={contact} onClose={() => setShowEdit(false)} />
      )}
      <ConfirmModal
        open={showDelete}
        title="Delete Contact"
        description={`Are you sure you want to delete ${contact.name}? This cannot be undone.`}
        onConfirm={handleDelete}
        onClose={() => setShowDelete(false)}
        isLoading={deleteContact.isPending}
        confirmLabel="Delete"
        variant="delete"
      />
    </div>
  )
}

// ─── Tab button ───────────────────────────────────────────────────────────────

function TabButton({ active, onClick, icon: Icon, label, count, countDot }: {
  active:    boolean
  onClick:   () => void
  icon:      React.ComponentType<{ size?: number; className?: string }>
  label:     string
  count?:    number
  countDot?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-[12.5px] font-semibold transition-colors',
        active
          ? 'text-[#3538CD] dark:text-[#818CF8] border-b-2 border-[#3538CD] dark:border-[#818CF8]'
          : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] border-b-2 border-transparent',
      )}
    >
      <Icon size={13} />
      {label}
      {count !== undefined && (
        countDot ? (
          <span className="w-1.5 h-1.5 rounded-full bg-[#D92D20] absolute -top-0.5 right-1" />
        ) : (
          <span className={cn(
            'text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none',
            active
              ? 'bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400'
              : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74]',
          )}>
            {count}
          </span>
        )
      )}
    </button>
  )
}

// ─── Mobile profile strip ─────────────────────────────────────────────────────

function MobileProfileStrip({ contact, palette, isOverdueFollowUp, portalCopied, onCopyPortal }: {
  contact:           Contact
  palette:           { bg: string; text: string }
  isOverdueFollowUp: boolean
  portalCopied:      boolean
  onCopyPortal:      () => void
}) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="md:hidden bg-white dark:bg-[#13141A] border-b border-[#F2F4F7] dark:border-[#26283A]">
      {/* Summary row */}
      <div className="flex items-center gap-2.5 px-4 py-2.5">
        <div className={cn('w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0', palette.bg, palette.text)}>
          {initials(contact.name)}
        </div>
        <div className="flex-1 min-w-0 flex items-center gap-3 overflow-hidden">
          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="text-[12px] text-[#2563EB] truncate"
              onClick={e => e.stopPropagation()}
            >
              {contact.email}
            </a>
          )}
          {contact.phone && !contact.email && (
            <a
              href={`tel:${contact.phone}`}
              className="text-[12px] text-[#344054] dark:text-[#C2C8D8] truncate"
              onClick={e => e.stopPropagation()}
            >
              {contact.phone}
            </a>
          )}
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors shrink-0"
        >
          Details
          <ChevronDown
            size={13}
            className={cn('transition-transform duration-200', expanded && 'rotate-180')}
          />
        </button>
      </div>

      {/* Collapsible full details */}
      <div className={cn(
        'overflow-hidden transition-all duration-200 ease-in-out',
        expanded ? 'max-h-[600px]' : 'max-h-0',
      )}>
        <div className="px-4 pb-3 space-y-3">
          {contact.email && (
            <FieldRow icon={Mail} label="Email" value={
              <a href={`mailto:${contact.email}`} className="text-[#2563EB] hover:underline break-all">{contact.email}</a>
            } />
          )}
          {contact.phone && (
            <FieldRow icon={Phone} label="Phone" value={
              <a href={`tel:${contact.phone}`} className="hover:text-[#2563EB] transition-colors">{contact.phone}</a>
            } />
          )}
          {contact.service && (
            <FieldRow icon={Briefcase} label="Service" value={contact.service} />
          )}
          {contact.dealValue && Number(contact.dealValue) > 0 && (
            <FieldRow icon={IndianRupee} label="Deal Value" value={
              <span className="font-bold text-[#101828] dark:text-[#ECEEF3]">
                {formatCurrency(Number(contact.dealValue), contact.currency ?? 'INR')}
              </span>
            } />
          )}
          {contact.source && (
            <FieldRow icon={Globe} label="Source" value={
              <span className="capitalize">{contact.source.replace(/_/g, ' ').toLowerCase()}</span>
            } />
          )}
          {contact.followUpAt && (
            <FieldRow
              icon={isOverdueFollowUp ? AlertCircle : Calendar}
              label="Follow-up"
              value={
                <span className={cn('font-medium', isOverdueFollowUp ? 'text-[#D92D20]' : 'text-[#344054] dark:text-[#C2C8D8]')}>
                  {isOverdueFollowUp && 'Overdue · '}
                  {formatDate(contact.followUpAt)}
                </span>
              }
            />
          )}
          {contact.notes && (
            <>
              <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <div>
                <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] font-medium mb-1.5">Notes</p>
                <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap">
                  {contact.notes}
                </p>
              </div>
            </>
          )}
          {contact.portalToken && (
            <>
              <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <button
                onClick={onCopyPortal}
                className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[12px] font-medium text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
              >
                {portalCopied ? <CheckCheck size={12} className="text-[#17B26A]" /> : <Copy size={12} />}
                {portalCopied ? 'Copied!' : 'Copy portal link'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Projects tab ─────────────────────────────────────────────────────────────

function ProjectsTab({ projects, contactId, contactStage, onNewProject, isPending }: {
  projects:     ContactProject[]
  contactId:    string
  contactStage: Contact['stage']
  onNewProject: () => void
  isPending:    boolean
}) {
  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">
          {projects.length === 0 ? 'No projects' : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
        </p>
        <button
          onClick={onNewProject}
          disabled={isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] dark:hover:bg-indigo-950/60 transition-colors disabled:opacity-50"
        >
          {isPending ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
          New Project
        </button>
      </div>

      {projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
            <FolderKanban size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No projects yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1 text-center max-w-[220px] leading-relaxed">
            Track proposals, contracts, and invoices under a project.
          </p>
          <button
            onClick={onNewProject}
            className="mt-4 flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12.5px] font-semibold hover:bg-[#E0EAFF] transition-colors"
          >
            <Plus size={12} />
            Create first project
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((p, i) => (
            <ContactProjectAccordion
              key={p.id}
              project={p}
              contactId={contactId}
              contactStage={contactStage}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Messages tab ─────────────────────────────────────────────────────────────

interface ThreadData {
  thread:   { id: string; subject: string | null }
  messages: Message[]
  contact?: { id: string; name: string; email: string | null } | null
}

function MessagesTab({ threadData, threadLoading, contactName, onSend, isSending }: {
  threadData?:   ThreadData
  threadLoading: boolean
  contactName:   string
  onSend:        (body: string) => Promise<void>
  isSending:     boolean
}) {
  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto">
        {threadLoading ? (
          <div className="p-4 space-y-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
                <div className={cn('h-10 bg-[#F2F4F7] dark:bg-[#21222D] rounded-2xl', i % 2 === 0 ? 'w-64' : 'w-48')} />
              </div>
            ))}
          </div>
        ) : threadData ? (
          <div className="px-4 py-4 flex flex-col gap-2.5">
            {threadData.thread.subject && (
              <p className="text-center text-[11px] text-[#98A2B3] bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-full px-3 py-1 self-center">
                {threadData.thread.subject}
              </p>
            )}
            {threadData.messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
                  <MessageCircle size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
                </div>
                <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No messages yet</p>
                <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
                  Send the first message to {contactName}.
                </p>
              </div>
            )}
            {threadData.messages.map(msg => (
              <MessageBubble
                key={msg.id}
                message={msg}
                clientName={threadData.contact?.name}
              />
            ))}
          </div>
        ) : null}
      </div>

      <div className="border-t border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] shrink-0">
        <ReplyComposer
          isPending={isSending}
          placeholder={`Message ${contactName}…`}
          onSend={onSend}
        />
      </div>
    </div>
  )
}

// ─── Meetings tab ─────────────────────────────────────────────────────────────

interface Meeting {
  id:          string
  title:       string
  scheduledAt: string
  meetLink?:   string | null
}

function MeetingsTab({ meetings }: { meetings: Meeting[] }) {
  return (
    <div className="p-4 space-y-3">
      <p className="text-[11.5px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">
        {meetings.length === 0 ? 'No meetings' : `${meetings.length} meeting${meetings.length !== 1 ? 's' : ''}`}
      </p>

      {meetings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
            <Video size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No meetings scheduled</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
            Meetings with this contact will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {meetings.map(m => (
            <div
              key={m.id}
              className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]"
            >
              <div className="w-9 h-9 rounded-xl bg-[#EEF4FF] dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
                <Video size={14} className="text-[#3538CD] dark:text-indigo-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate">
                  {m.title}
                </p>
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
                  {formatDate(m.scheduledAt)}
                </p>
              </div>
              {m.meetLink && (
                <a
                  href={m.meetLink}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] transition-colors shrink-0"
                >
                  Join
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
