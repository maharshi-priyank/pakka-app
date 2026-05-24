import { useState } from 'react'
import { FileText, ExternalLink, Download, ThumbsUp, ThumbsDown, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalAcceptProposal, usePortalDeclineProposal, type PortalProposal } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  SENT:     'Awaiting review',
  OPENED:   'Opened',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED:  'Expired',
}

const STATUS_STYLE: Record<string, string> = {
  SENT:     'bg-[#EEF2FF] text-[#4338CA]',
  OPENED:   'bg-[#FFFAEB] text-[#B54708]',
  ACCEPTED: 'bg-[#ECFDF3] text-[#027A48]',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318]',
  EXPIRED:  'bg-[#F2F4F7] text-[#667085]',
}

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

interface Props {
  proposal: PortalProposal
  appUrl:   string
  onStatusChange: (id: string, status: string) => void
}

export default function PortalProposalCard({ proposal, appUrl, onStatusChange }: Props) {
  const [localStatus, setLocalStatus] = useState(proposal.status)
  const [confirm, setConfirm]         = useState<'accept' | 'decline' | null>(null)

  const accept  = usePortalAcceptProposal()
  const decline = usePortalDeclineProposal()

  async function handleAccept() {
    await accept.mutateAsync(proposal.slug)
    setLocalStatus('ACCEPTED')
    onStatusChange(proposal.id, 'ACCEPTED')
    setConfirm(null)
  }

  async function handleDecline() {
    await decline.mutateAsync(proposal.slug)
    setLocalStatus('DECLINED')
    onStatusChange(proposal.id, 'DECLINED')
    setConfirm(null)
  }

  const canAct = localStatus === 'SENT' || localStatus === 'OPENED'
  const total  = Number(proposal.totalAmount) + Number(proposal.gstAmount)

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
              <FileText size={16} className="text-[#6366F1]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] leading-tight">{proposal.title}</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(proposal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {proposal.validUntil && ` · Valid till ${new Date(proposal.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <p className="text-[18px] font-bold text-[#101828]">₹{fmt(total)}</p>
          <div className="flex items-center gap-2">
            <a
              href={`${appUrl}/p/${proposal.slug}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
            >
              <ExternalLink size={12} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/p/${proposal.slug}?print=1`, '_blank')}
              className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
            >
              <Download size={12} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* Action bar */}
      {canAct && (
        <div className="border-t border-[#F2F4F7] px-5 py-3 flex items-center gap-2 bg-[#FAFBFF]">
          {confirm === null ? (
            <>
              <button
                onClick={() => setConfirm('accept')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#ECFDF3] text-[#027A48] text-[12.5px] font-semibold hover:bg-[#D1FAE5] transition-colors"
              >
                <ThumbsUp size={12} strokeWidth={2.5} /> Accept Proposal
              </button>
              <button
                onClick={() => setConfirm('decline')}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#FEF3F2] text-[#B42318] text-[12.5px] font-semibold hover:bg-[#FECDC9] transition-colors"
              >
                <ThumbsDown size={12} strokeWidth={2.5} /> Decline
              </button>
            </>
          ) : confirm === 'accept' ? (
            <div className="flex items-center gap-2 w-full">
              <p className="text-[12.5px] text-[#344054] flex-1">Accept this proposal?</p>
              <button
                onClick={handleAccept}
                disabled={accept.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
              >
                <CheckCircle2 size={12} /> {accept.isPending ? 'Accepting…' : 'Yes, accept'}
              </button>
              <button onClick={() => setConfirm(null)} className="text-[12px] text-[#667085] hover:text-[#344054] px-2 py-1.5">Cancel</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <p className="text-[12.5px] text-[#344054] flex-1">Decline this proposal?</p>
              <button
                onClick={handleDecline}
                disabled={decline.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D92D20] text-white text-[12px] font-semibold hover:bg-[#B42318] transition-colors disabled:opacity-60"
              >
                <XCircle size={12} /> {decline.isPending ? 'Declining…' : 'Yes, decline'}
              </button>
              <button onClick={() => setConfirm(null)} className="text-[12px] text-[#667085] hover:text-[#344054] px-2 py-1.5">Cancel</button>
            </div>
          )}
        </div>
      )}

      {localStatus === 'ACCEPTED' && (
        <div className="border-t border-[#F2F4F7] px-5 py-2.5 flex items-center gap-2 bg-[#F0FDF4]">
          <CheckCircle2 size={13} className="text-[#027A48]" />
          <p className="text-[12px] font-semibold text-[#027A48]">You accepted this proposal</p>
        </div>
      )}
    </div>
  )
}
