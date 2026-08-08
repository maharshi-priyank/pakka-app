import { useState } from 'react'
import {
  FileText, CheckCircle, XCircle, AlertCircle, Clock, Loader2, MessageCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useChangeRequests, useRespondChangeRequest, type ChangeRequest } from '../hooks/useChangeRequests'

interface Props {
  projectId: string
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; classes: string; Icon: React.ElementType }> = {
  PENDING_REVIEW:          { label: 'Pending Review',    classes: 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]', Icon: Clock },
  RESOLVED_IN_SCOPE:       { label: 'In Scope',          classes: 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]', Icon: CheckCircle },
  NOT_FEASIBLE:            { label: 'Not Feasible',      classes: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400', Icon: XCircle },
  APPROVED_INVOICE_SENT:   { label: 'Invoice Sent',      classes: 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]', Icon: CheckCircle },
  REJECTED:                { label: 'Rejected',          classes: 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400', Icon: XCircle },
  ADDITIONAL_COST_PENDING: { label: 'Awaiting Approval', classes: 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400', Icon: AlertCircle },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG['PENDING_REVIEW']
  const { Icon } = cfg
  return (
    <span className={cn('inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full', cfg.classes)}>
      <Icon size={10} />
      {cfg.label}
    </span>
  )
}

// ─── Date helper ──────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 animate-pulse">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="h-3.5 w-40 bg-[#F2F4F7] dark:bg-[#21222D] rounded" />
        <div className="h-5 w-24 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 w-full bg-[#F2F4F7] dark:bg-[#21222D] rounded" />
        <div className="h-3 w-4/5 bg-[#F2F4F7] dark:bg-[#21222D] rounded" />
      </div>
    </div>
  )
}

// ─── Respond panel ────────────────────────────────────────────────────────────

type RespondAction = 'IN_SCOPE' | 'NOT_FEASIBLE' | 'ADDITIONAL_COST' | null

function RespondPanel({
  requestId,
  projectId,
}: {
  requestId: string
  projectId: string
}) {
  const [selected, setSelected] = useState<RespondAction>(null)
  const [note, setNote]         = useState('')
  const [error, setError]       = useState<string | null>(null)

  const respond = useRespondChangeRequest(projectId)

  async function handleSubmit() {
    if (!selected) return
    if ((selected === 'NOT_FEASIBLE' || selected === 'ADDITIONAL_COST') && !note.trim()) {
      setError('A note is required for this response.')
      return
    }
    setError(null)
    try {
      await respond.mutateAsync({
        id: requestId,
        responseType: selected,
        note: note.trim() || undefined,
      })
      setSelected(null)
      setNote('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    }
  }

  function handleActionClick(action: RespondAction) {
    if (action === 'IN_SCOPE') {
      // fire immediately — no note needed
      setError(null)
      respond.mutate(
        { id: requestId, responseType: 'IN_SCOPE' },
        {
          onError: (err) =>
            setError(err instanceof Error ? err.message : 'Something went wrong.'),
        },
      )
      return
    }
    setSelected(prev => (prev === action ? null : action))
    setNote('')
    setError(null)
  }

  const isPending = respond.isPending
  const needsNote = selected === 'NOT_FEASIBLE' || selected === 'ADDITIONAL_COST'

  return (
    <div className="mt-4 pt-4 border-t border-[#F2F4F7] dark:border-[#26283A]">
      <p className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-3">
        Respond
      </p>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => handleActionClick('IN_SCOPE')}
          disabled={isPending}
          className={cn(
            'min-h-[44px] px-4 rounded-lg text-[12.5px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            'border-emerald-500 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30',
          )}
        >
          {isPending && selected === null ? (
            <Loader2 size={12} className="animate-spin inline mr-1" />
          ) : (
            <CheckCircle size={12} className="inline mr-1" />
          )}
          In Scope
        </button>

        <button
          onClick={() => handleActionClick('NOT_FEASIBLE')}
          disabled={isPending}
          className={cn(
            'min-h-[44px] px-4 rounded-lg text-[12.5px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            selected === 'NOT_FEASIBLE'
              ? 'border-red-500 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400'
              : 'border-red-300 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30',
          )}
        >
          <XCircle size={12} className="inline mr-1" />
          Not Feasible
        </button>

        <button
          onClick={() => handleActionClick('ADDITIONAL_COST')}
          disabled={isPending}
          className={cn(
            'min-h-[44px] px-4 rounded-lg text-[12.5px] font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed',
            selected === 'ADDITIONAL_COST'
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400'
              : 'border-indigo-400 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30',
          )}
        >
          <AlertCircle size={12} className="inline mr-1" />
          Additional Cost
        </button>
      </div>

      {/* Note textarea + submit */}
      {needsNote && (
        <div className="mt-3 space-y-2">
          <textarea
            value={note}
            onChange={e => { setNote(e.target.value); setError(null) }}
            placeholder={
              selected === 'NOT_FEASIBLE'
                ? 'Explain why this is not feasible…'
                : 'Describe the additional cost or work required…'
            }
            rows={3}
            className="w-full resize-none px-4 py-3 text-[13px] text-[#0F172A] dark:text-[#ECEEF3] placeholder-[#B8C0CC] dark:placeholder-[#545C74] bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-500 leading-relaxed transition-colors"
          />
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={() => { setSelected(null); setNote(''); setError(null) }}
              disabled={isPending}
              className="text-[12px] text-[#667085] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isPending || !note.trim()}
              className="min-h-[44px] flex items-center gap-1.5 px-5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12.5px] font-semibold rounded-lg transition-all active:scale-[0.97]"
            >
              {isPending && <Loader2 size={12} className="animate-spin" />}
              Submit Response
            </button>
          </div>
        </div>
      )}

      {/* Inline error */}
      {error && (
        <p className="mt-2 text-[12px] text-red-600 dark:text-red-400 flex items-center gap-1">
          <XCircle size={11} />
          {error}
        </p>
      )}
    </div>
  )
}

// ─── Change request card ──────────────────────────────────────────────────────

function ChangeRequestCard({
  cr,
  projectId,
}: {
  cr: ChangeRequest
  projectId: string
}) {
  return (
    <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate">
            {cr.raisedByEmail}
          </p>
          <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            {formatDate(cr.createdAt)}
          </p>
        </div>
        <StatusBadge status={cr.status} />
      </div>

      {/* Description */}
      <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap">
        {cr.description}
      </p>

      {/* Freelancer note (if already responded) */}
      {cr.freelancerNote && cr.status !== 'PENDING_REVIEW' && (
        <div className="mt-3 pt-3 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <div className="flex items-center gap-1.5 mb-1">
            <MessageCircle size={11} className="text-[#98A2B3] dark:text-[#545C74]" />
            <p className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">
              Your note
            </p>
          </div>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] leading-relaxed">
            {cr.freelancerNote}
          </p>
        </div>
      )}

      {/* Respond panel — only for pending */}
      {cr.status === 'PENDING_REVIEW' && (
        <RespondPanel requestId={cr.id} projectId={projectId} />
      )}
    </div>
  )
}

// ─── Tab ──────────────────────────────────────────────────────────────────────

export function ProjectChangeRequestsTab({ projectId }: Props) {
  const { data: changeRequests, isLoading } = useChangeRequests(projectId)

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    )
  }

  if (!changeRequests || changeRequests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-10 h-10 rounded-xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-3">
          <FileText size={18} className="text-[#B8C0CC] dark:text-[#545C74]" />
        </div>
        <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
          No change requests yet
        </p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
          Client-submitted change requests will appear here
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-[13px] font-bold text-[#0F172A] dark:text-[#ECEEF3]">Change Requests</h3>
          <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            {changeRequests.length} request{changeRequests.length !== 1 ? 's' : ''}
            {' · '}
            {changeRequests.filter(cr => cr.status === 'PENDING_REVIEW').length} pending
          </p>
        </div>
      </div>

      {/* Cards */}
      {changeRequests.map(cr => (
        <ChangeRequestCard key={cr.id} cr={cr} projectId={projectId} />
      ))}
    </div>
  )
}

export default ProjectChangeRequestsTab
