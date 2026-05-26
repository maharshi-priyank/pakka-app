import { useState } from 'react'
import { ExternalLink, Download, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalAcceptProposal, usePortalDeclineProposal, type PortalProposal } from '../hooks/usePortal'

const ACCENT_BAR: Record<string, string> = {
  SENT:     'bg-[#6366F1]',
  OPENED:   'bg-[#F59E0B]',
  ACCEPTED: 'bg-[#16A34A]',
  DECLINED: 'bg-[#D92D20]',
  EXPIRED:  'bg-[#98A2B3]',
}

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
  proposal:       PortalProposal
  appUrl:         string
  onStatusChange: (id: string, status: string) => void
}

export default function PortalProposalCard({ proposal, appUrl, onStatusChange }: Props) {
  const [localStatus, setLocalStatus] = useState(proposal.status)
  const [confirm,     setConfirm]     = useState<'accept' | 'decline' | null>(null)

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

  const canAct     = localStatus === 'SENT' || localStatus === 'OPENED'
  const total      = Number(proposal.totalAmount) + Number(proposal.gstAmount)
  const accentBar  = ACCENT_BAR[localStatus] ?? 'bg-[#98A2B3]'

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
      {/* Status accent bar */}
      <div className={cn('h-1', accentBar)} />

      <div className="px-5 pt-4 pb-5">
        {/* Top row: status badge + view/pdf links */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
          <div className="flex items-center gap-3">
            <a
              href={`${appUrl}/p/${proposal.slug}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/p/${proposal.slug}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
          </div>
        </div>

        {/* Title + amount hero */}
        <p className="text-[13px] font-medium text-[#667085] mb-1">{proposal.title}</p>
        <p className="text-[30px] font-extrabold text-[#101828] leading-none">₹{fmt(total)}</p>
        <p className="text-[12px] text-[#98A2B3] mt-1.5">
          {new Date(proposal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {proposal.validUntil && ` · Valid till ${new Date(proposal.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </p>

        {/* Action buttons */}
        {canAct && (
          <div className="mt-5 space-y-2">
            {confirm === null ? (
              <>
                <button
                  onClick={() => setConfirm('accept')}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-[14px] font-bold transition-colors"
                >
                  <CheckCircle2 size={15} strokeWidth={2} /> Accept Proposal
                </button>
                <button
                  onClick={() => setConfirm('decline')}
                  className="w-full flex items-center justify-center py-2 rounded-xl text-[12.5px] font-medium text-[#98A2B3] hover:text-[#667085] transition-colors"
                >
                  Decline
                </button>
              </>
            ) : confirm === 'accept' ? (
              <div className="rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] p-4 space-y-3">
                <p className="text-[13px] font-semibold text-[#166534]">Accept this proposal for ₹{fmt(total)}?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={accept.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                  >
                    {accept.isPending ? 'Accepting…' : 'Yes, accept'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-4 py-2.5 rounded-lg bg-white border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-[#FEF2F2] border border-[#FECACA] p-4 space-y-3">
                <p className="text-[13px] font-semibold text-[#991B1B]">Decline this proposal?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDecline}
                    disabled={decline.isPending}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#D92D20] hover:bg-[#B42318] text-white text-[13px] font-bold transition-colors disabled:opacity-60"
                  >
                    {decline.isPending ? 'Declining…' : 'Yes, decline'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-4 py-2.5 rounded-lg bg-white border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Accepted confirmation */}
        {localStatus === 'ACCEPTED' && (
          <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[13px] font-semibold text-[#027A48]">You accepted this proposal</p>
          </div>
        )}
      </div>
    </div>
  )
}
