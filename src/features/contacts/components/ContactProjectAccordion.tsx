import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronRight, Plus, FileText, PenLine, Receipt, ExternalLink,
  Clock, CreditCard, StickyNote, Paperclip,
  FileImage, FileArchive, File as FileIcon,
} from 'lucide-react'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import { useProject } from '@/features/projects/hooks/useProjects'
import { useProjectNotes } from '@/features/projects/hooks/useProjectNotes'
import { useAttachments, humanSize } from '@/features/attachments/useAttachments'
import type { ContactProject, ContactStage } from '../schemas/contact.schema'
import { STAGE_LABELS, STAGE_OUTLINE_COLORS } from '../schemas/contact.schema'
import ProposalPreviewDrawer from '@/features/proposals/components/ProposalPreviewDrawer'
import ContractPreviewDrawer from '@/features/contracts/components/ContractPreviewDrawer'
import InvoicePreviewDrawer from '@/features/invoices/components/InvoicePreviewDrawer'
import TimeEntryQuickView, { type TimeEntrySnap } from '@/features/time-entries/components/TimeEntryQuickView'
import ExpenseQuickView, { type ExpenseSnap } from '@/features/expenses/components/ExpenseQuickView'

const PROJECT_STAGE_COLORS: Record<string, string> = {
  SCOPING:       'bg-[#F3F4F6] dark:bg-[#21222D] text-[#6B7280] dark:text-[#8B92A8]',
  PROPOSAL_SENT: 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
  ACTIVE:        'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-emerald-400',
  COMPLETED:     'bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400',
  ON_HOLD:       'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400',
  CANCELLED:     'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#545C74]',
}
const PROJECT_STAGE_LABELS: Record<string, string> = {
  SCOPING: 'Scoping', PROPOSAL_SENT: 'Proposal Sent',
  ACTIVE: 'Active', COMPLETED: 'Completed', ON_HOLD: 'On Hold', CANCELLED: 'Cancelled',
}

function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fileTypeIcon(mimeType: string) {
  if (mimeType.startsWith('image/'))       return <FileImage   size={12} className="text-[#667085] shrink-0" />
  if (mimeType === 'application/pdf')      return <FileText    size={12} className="text-[#D92D20] shrink-0" />
  if (mimeType.includes('zip') || mimeType.includes('tar') || mimeType.includes('rar'))
                                           return <FileArchive size={12} className="text-[#F79009] shrink-0" />
  return <FileIcon size={12} className="text-[#667085] shrink-0" />
}

const MAX_VISIBLE = 4

interface Props {
  project:      ContactProject
  contactId:    string
  contactStage: ContactStage
  contactName?: string
  defaultOpen?: boolean
}

export default function ContactProjectAccordion({ project, contactId, contactStage, contactName, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)
  const navigate = useNavigate()
  const [proposalId,   setProposalId]   = useState<string | null>(null)
  const [contractId,   setContractId]   = useState<string | null>(null)
  const [invoiceId,    setInvoiceId]    = useState<string | null>(null)
  const [timeSnap,     setTimeSnap]     = useState<TimeEntrySnap | null>(null)
  const [expenseSnap,  setExpenseSnap]  = useState<ExpenseSnap | null>(null)

  const { data: detail,      isLoading }       = useProject(open ? project.id : '')
  const { data: notes = [],  isLoading: notesLoading }  = useProjectNotes(open ? project.id : '')
  const { data: files = [],  isLoading: filesLoading }  = useAttachments({ projectId: open ? project.id : '' })

  const timeEntries = detail?.timeEntries ?? []
  const expenses    = detail?.expenses    ?? []

  const hasAnything = (detail?.proposals.length ?? 0) > 0
    || (detail?.contracts.length ?? 0) > 0
    || (detail?.invoices.length  ?? 0) > 0
    || timeEntries.length > 0
    || expenses.length > 0
    || notes.length > 0
    || files.length > 0

  return (
    <div className="border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden bg-white dark:bg-[#13141A]">
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 min-h-[48px] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors text-left"
      >
        {open
          ? <ChevronDown  size={15} className="text-[#667085] shrink-0" />
          : <ChevronRight size={15} className="text-[#98A2B3] shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">
              {project.name}
            </span>
            {/* Contact-stage badge renders first (leftmost) — outlined pill so it stays
                visually distinct from the Project badge even when colors overlap (e.g.
                STAGE_COLORS.CLIENT and PROJECT_STAGE_COLORS.ACTIVE are both green). */}
            <span className={cn(
              'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
              STAGE_OUTLINE_COLORS[contactStage],
            )}>
              {STAGE_LABELS[contactStage]}
            </span>
            {/* Project's own status badge — only rendered when projectStage is set;
                no placeholder when it's null. */}
            {project.projectStage && (
              <span className={cn(
                'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                PROJECT_STAGE_COLORS[project.projectStage],
              )}>
                {PROJECT_STAGE_LABELS[project.projectStage] ?? project.projectStage}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {project.budget && Number(project.budget) > 0 && (
              <span className="text-[12px] text-[#344054] dark:text-[#9CA3AF] font-medium">
                {formatCurrency(Number(project.budget))}
              </span>
            )}
            {(project.startDate || project.endDate) && (
              <span className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
                {project.startDate ? formatDate(project.startDate) : '?'}
                {' '}–{' '}
                {project.endDate ? formatDate(project.endDate) : 'ongoing'}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={e => { e.stopPropagation(); navigate(`/projects/${project.id}`) }}
          className="p-2 -mr-2 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] hover:text-[#2563EB] transition-all shrink-0"
          title="Open project"
        >
          <ExternalLink size={12} />
        </button>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-[#F2F4F7] dark:border-[#26283A] px-4 pb-4 pt-3 space-y-4">
          {isLoading ? (
            <div className="space-y-2 animate-pulse">
              {[1,2,3].map(i => (
                <div key={i} className="h-8 bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg" />
              ))}
            </div>
          ) : detail ? (
            <>
              {/* Proposals */}
              {detail.proposals.length > 0 && (
                <Section icon={<FileText size={12} className="text-[#98A2B3]" />} label="Proposals">
                  {detail.proposals.map(p => (
                    <DocRow
                      key={p.id}
                      onClick={() => setProposalId(p.id)}
                      left={<span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">{p.title}</span>}
                      right={
                        <>
                          {p.totalAmount && Number(p.totalAmount) > 0 && (
                            <span className="text-[12px] font-medium text-[#101828] dark:text-[#ECEEF3]">
                              {formatCurrency(Number(p.totalAmount))}
                            </span>
                          )}
                          <StatusBadge status={p.status} />
                        </>
                      }
                    />
                  ))}
                </Section>
              )}

              {/* Contracts */}
              {detail.contracts.length > 0 && (
                <Section icon={<PenLine size={12} className="text-[#98A2B3]" />} label="Contracts">
                  {detail.contracts.map(c => (
                    <DocRow
                      key={c.id}
                      onClick={() => setContractId(c.id)}
                      left={<span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">{c.title}</span>}
                      right={<StatusBadge status={c.status} />}
                    />
                  ))}
                </Section>
              )}

              {/* Invoices */}
              {detail.invoices.length > 0 && (
                <Section icon={<Receipt size={12} className="text-[#98A2B3]" />} label="Invoices">
                  {detail.invoices.map(inv => (
                    <DocRow
                      key={inv.id}
                      onClick={() => setInvoiceId(inv.id)}
                      left={
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[12px] font-mono text-[#98A2B3] dark:text-[#545C74] shrink-0">{inv.invoiceNumber}</span>
                          <span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">{formatCurrency(Number(inv.total))}</span>
                        </div>
                      }
                      right={
                        <>
                          {inv.dueDate && (
                            <span className={cn(
                              'text-[11px]',
                              new Date(inv.dueDate) < new Date() && inv.status !== 'PAID'
                                ? 'text-[#D92D20]' : 'text-[#98A2B3]',
                            )}>
                              {formatDate(inv.dueDate)}
                            </span>
                          )}
                          <StatusBadge status={inv.status} />
                        </>
                      }
                    />
                  ))}
                </Section>
              )}

              {/* Time entries */}
              {timeEntries.length > 0 && (
                <Section icon={<Clock size={12} className="text-[#98A2B3]" />} label="Time">
                  {timeEntries.slice(0, MAX_VISIBLE).map(t => (
                    <DocRow
                      key={t.id}
                      onClick={() => setTimeSnap({
                        id: t.id,
                        description:  t.description,
                        date:         t.date,
                        durationMins: t.durationMins,
                        hourlyRate:   t.hourlyRate ? Number(t.hourlyRate) : null,
                        isBilled:     t.isBilled,
                        projectName:  project.name,
                        contactName,
                      })}
                      left={
                        <span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">
                          {t.description || 'Time entry'}
                        </span>
                      }
                      right={
                        <>
                          <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] tabular-nums">
                            {fmtDuration(t.durationMins)}
                          </span>
                          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(t.date)}</span>
                          {t.isBilled && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48]">Billed</span>
                          )}
                        </>
                      }
                    />
                  ))}
                  {timeEntries.length > MAX_VISIBLE && (
                    <ViewAll
                      label={`${timeEntries.length - MAX_VISIBLE} more`}
                      onClick={() => navigate(`/projects/${project.id}?tab=time`)}
                    />
                  )}
                </Section>
              )}

              {/* Expenses */}
              {expenses.length > 0 && (
                <Section icon={<CreditCard size={12} className="text-[#98A2B3]" />} label="Expenses">
                  {expenses.slice(0, MAX_VISIBLE).map(e => (
                    <DocRow
                      key={e.id}
                      onClick={() => setExpenseSnap({
                        id:          e.id,
                        description: e.description,
                        category:    e.category,
                        amount:      e.amount,
                        date:        e.date,
                        isBillable:  e.isBillable,
                        isBilled:    e.isBilled,
                        projectName: project.name,
                        contactName,
                      })}
                      left={
                        <span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] truncate">
                          {e.description || e.category}
                        </span>
                      }
                      right={
                        <>
                          <span className="text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] tabular-nums">
                            {formatCurrency(Number(e.amount))}
                          </span>
                          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(e.date)}</span>
                          {e.isBilled && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-[#ECFDF3] text-[#027A48]">Billed</span>
                          )}
                        </>
                      }
                    />
                  ))}
                  {expenses.length > MAX_VISIBLE && (
                    <ViewAll
                      label={`${expenses.length - MAX_VISIBLE} more`}
                      onClick={() => navigate(`/projects/${project.id}?tab=expenses`)}
                    />
                  )}
                </Section>
              )}

              {/* Notes */}
              {(notesLoading || notes.length > 0) && (
                <Section icon={<StickyNote size={12} className="text-[#98A2B3]" />} label="Notes">
                  {notesLoading ? (
                    <div className="h-6 bg-[#F2F4F7] dark:bg-[#21222D] rounded animate-pulse" />
                  ) : (
                    <>
                      {notes.slice(0, MAX_VISIBLE).map(n => (
                        <div
                          key={n.id}
                          onClick={() => navigate(`/projects/${project.id}?tab=notes`)}
                          className="flex items-start gap-2 px-3 py-2 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] cursor-pointer transition-colors"
                        >
                          <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] flex-1 min-w-0 line-clamp-2 leading-snug">
                            {n.content}
                          </p>
                          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0 mt-0.5">{formatDate(n.createdAt)}</span>
                        </div>
                      ))}
                      {notes.length > MAX_VISIBLE && (
                        <ViewAll
                          label={`${notes.length - MAX_VISIBLE} more`}
                          onClick={() => navigate(`/projects/${project.id}?tab=notes`)}
                        />
                      )}
                    </>
                  )}
                </Section>
              )}

              {/* Files */}
              {(filesLoading || files.length > 0) && (
                <Section icon={<Paperclip size={12} className="text-[#98A2B3]" />} label="Files">
                  {filesLoading ? (
                    <div className="h-6 bg-[#F2F4F7] dark:bg-[#21222D] rounded animate-pulse" />
                  ) : (
                    <>
                      {files.slice(0, MAX_VISIBLE).map(f => (
                        <div
                          key={f.id}
                          onClick={() => f.fileUrl && window.open(f.fileUrl, '_blank', 'noreferrer')}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg transition-colors',
                            f.fileUrl
                              ? 'hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] cursor-pointer'
                              : 'opacity-60 cursor-default',
                          )}
                        >
                          {fileTypeIcon(f.mimeType)}
                          <span className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] flex-1 min-w-0 truncate">{f.fileName}</span>
                          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0">{humanSize(f.fileSize)}</span>
                        </div>
                      ))}
                      {files.length > MAX_VISIBLE && (
                        <ViewAll
                          label={`${files.length - MAX_VISIBLE} more`}
                          onClick={() => navigate(`/projects/${project.id}?tab=files`)}
                        />
                      )}
                    </>
                  )}
                </Section>
              )}

              {/* Empty state — only when nothing across all sections */}
              {!hasAnything && notes.length === 0 && files.length === 0 && (
                <p className="text-[12.5px] text-[#98A2B3] dark:text-[#545C74] text-center py-2">
                  No documents yet
                </p>
              )}

              {/* Quick actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
                <button
                  onClick={() => navigate(`/proposals/new?contactId=${contactId}&projectId=${project.id}`)}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  <Plus size={11} /> Proposal
                </button>
                <span className="text-[#E4E7EC] dark:text-[#26283A]">·</span>
                <button
                  onClick={() => navigate(`/contracts/new?contactId=${contactId}&projectId=${project.id}`)}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  <Plus size={11} /> Contract
                </button>
                <span className="text-[#E4E7EC] dark:text-[#26283A]">·</span>
                <button
                  onClick={() => navigate(`/invoices/new?contactId=${contactId}&projectId=${project.id}`)}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  <Plus size={11} /> Invoice
                </button>
                <span className="text-[#E4E7EC] dark:text-[#26283A]">·</span>
                <button
                  onClick={() => navigate(`/time?projectId=${project.id}`)}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  <Plus size={11} /> Time
                </button>
                <span className="text-[#E4E7EC] dark:text-[#26283A]">·</span>
                <button
                  onClick={() => navigate(`/expenses?projectId=${project.id}`)}
                  className="flex items-center gap-1 text-[11.5px] font-medium text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  <Plus size={11} /> Expense
                </button>
              </div>
            </>
          ) : null}
        </div>
      )}

      <ProposalPreviewDrawer id={proposalId}  onClose={() => setProposalId(null)}  />
      <ContractPreviewDrawer id={contractId}  onClose={() => setContractId(null)}  />
      <InvoicePreviewDrawer  id={invoiceId}   onClose={() => setInvoiceId(null)}   />
      <TimeEntryQuickView snap={timeSnap}    onClose={() => setTimeSnap(null)}    onEdit={() => { setTimeSnap(null); navigate(`/projects/${project.id}?tab=time`) }} />
      <ExpenseQuickView   snap={expenseSnap} onClose={() => setExpenseSnap(null)} onEdit={() => { setExpenseSnap(null); navigate(`/projects/${project.id}?tab=expenses`) }} />
    </div>
  )
}

/* ── small sub-components ─────────────────────────────────────────────────── */

function Section({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide">{label}</span>
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function DocRow({
  left, right, onClick,
}: {
  left: React.ReactNode
  right?: React.ReactNode
  onClick?: () => void
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex items-center justify-between px-3 py-2 rounded-lg transition-colors',
        onClick ? 'hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] cursor-pointer' : '',
      )}
    >
      <div className="flex-1 min-w-0">{left}</div>
      {right && <div className="flex items-center gap-2 ml-2 shrink-0">{right}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT:     'bg-[#F2F4F7] text-[#344054]',
    SENT:      'bg-[#EFF6FF] text-[#2563EB]',
    OPENED:    'bg-[#FFFAEB] text-[#B54708]',
    ACCEPTED:  'bg-[#ECFDF3] text-[#027A48]',
    DECLINED:  'bg-[#FEF3F2] text-[#B42318]',
    SIGNED:    'bg-[#ECFDF3] text-[#027A48]',
    PAID:      'bg-[#ECFDF3] text-[#027A48]',
    OVERDUE:   'bg-[#FEF3F2] text-[#B42318]',
    PARTIAL:   'bg-[#FFFAEB] text-[#B54708]',
    CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
  }
  return (
    <span className={cn('text-[10px] font-semibold px-1.5 py-0.5 rounded-full', colors[status] ?? 'bg-[#F2F4F7] text-[#344054]')}>
      {status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, ' ')}
    </span>
  )
}

function ViewAll({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={e => { e.stopPropagation(); onClick() }}
      className="w-full text-left px-3 py-1.5 text-[11.5px] text-[#3538CD] dark:text-indigo-400 hover:text-[#2D31B3] dark:hover:text-indigo-300 font-medium transition-colors"
    >
      View {label} →
    </button>
  )
}
