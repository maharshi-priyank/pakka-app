import { useState } from 'react'
import { ExternalLink, Download, CheckCircle2 } from 'lucide-react'
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
  SENT:     'bg-[#EFF6FF] text-[#2563EB]',
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

  const canAct = localStatus === 'SENT' || localStatus === 'OPENED'
  const total  = Number(proposal.totalAmount) + Number(proposal.gstAmount)

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      <div className="p-4">
        {/* Top row: title + status + links */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#344054] truncate">{proposal.title}</p>
            <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
              {new Date(proposal.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {proposal.validUntil && ` · Valid till ${new Date(proposal.validUntil).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`${appUrl}/p/${proposal.slug}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/p/${proposal.slug}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
            <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
              {STATUS_LABEL[localStatus] ?? localStatus}
            </span>
          </div>
        </div>

        {/* Amount */}
        <p className="text-[24px] font-bold text-[#101828]">₹{fmt(total)}</p>

        {/* Action area */}
        {canAct && (
          <div className="mt-4 space-y-2">
            {confirm === null ? (
              <>
                <button
                  onClick={() => setConfirm('accept')}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13.5px] font-semibold transition-colors"
                >
                  <CheckCircle2 size={14} strokeWidth={2} /> Accept Proposal
                </button>
                <button
                  onClick={() => setConfirm('decline')}
                  className="w-full flex items-center justify-center py-2 rounded-lg text-[12.5px] font-medium text-[#98A2B3] hover:text-[#667085] transition-colors"
                >
                  Decline
                </button>
              </>
            ) : confirm === 'accept' ? (
              <div className="rounded-lg bg-[#F9FAFB] border border-[#EAECF0] p-3.5 space-y-3">
                <p className="text-[12.5px] font-semibold text-[#101828]">Accept this proposal for ₹{fmt(total)}?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleAccept}
                    disabled={accept.isPending}
                    className="flex-1 py-2 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[12.5px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {accept.isPending ? 'Accepting…' : 'Yes, accept'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-4 py-2 rounded-lg border border-[#EAECF0] text-[12.5px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-lg bg-[#F9FAFB] border border-[#EAECF0] p-3.5 space-y-3">
                <p className="text-[12.5px] font-semibold text-[#344054]">Decline this proposal?</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleDecline}
                    disabled={decline.isPending}
                    className="flex-1 py-2 rounded-lg bg-[#D92D20] hover:bg-[#B42318] text-white text-[12.5px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {decline.isPending ? 'Declining…' : 'Yes, decline'}
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="px-4 py-2 rounded-lg border border-[#EAECF0] text-[12.5px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {localStatus === 'ACCEPTED' && (
          <div className="mt-3 flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[12.5px] font-semibold text-[#027A48]">You accepted this proposal</p>
          </div>
        )}
      </div>
    </div>
  )
}
