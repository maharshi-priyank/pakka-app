import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { MessageCircle, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDecideApproval, type PortalChangeRequest } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  PENDING:   'Pending',
  APPROVED:  'Approved',
  REJECTED:  'Rejected',
  CANCELLED: 'Cancelled',
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:   'bg-[#EFF6FF] text-[#2563EB]',
  APPROVED:  'bg-[#ECFDF3] text-[#027A48]',
  REJECTED:  'bg-[#FEF3F2] text-[#B42318]',
  CANCELLED: 'bg-[#F2F4F7] text-[#667085]',
}

interface Props {
  changeRequest: PortalChangeRequest
  token:         string
}

export default function PortalChangeRequestCard({ changeRequest, token }: Props) {
  const queryClient  = useQueryClient()
  const [showReject, setShowReject] = useState(false)
  const [decisionNote, setDecisionNote] = useState('')
  const [error, setError] = useState('')

  const decide = useDecideApproval(token)

  // The nested approval that needs client action (CHANGE_REQUEST_COST kind, PENDING)
  const costApproval = changeRequest.approvalRequests.find(
    ar => ar.kind === 'CHANGE_REQUEST_COST' && ar.status === 'PENDING',
  )

  async function handleApprove() {
    if (!costApproval) return
    setError('')
    try {
      await decide.mutateAsync({ id: costApproval.id, action: 'APPROVE' })
      queryClient.invalidateQueries({ queryKey: ['portal', token] })
    } catch {
      setError('Failed to approve. Please try again.')
    }
  }

  async function handleReject() {
    if (!costApproval) return
    if (!decisionNote.trim()) {
      setError('Please provide a reason for rejection.')
      return
    }
    setError('')
    try {
      await decide.mutateAsync({ id: costApproval.id, action: 'REJECT', decisionNote: decisionNote.trim() })
      queryClient.invalidateQueries({ queryKey: ['portal', token] })
      setShowReject(false)
      setDecisionNote('')
    } catch {
      setError('Failed to reject. Please try again.')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      <div className="p-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F0F9FF] flex items-center justify-center shrink-0">
              <MessageCircle size={14} className="text-[#0369A1]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#344054]">Change Request</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(changeRequest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <span className={cn(
            'text-[10.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0',
            STATUS_STYLE[changeRequest.status] ?? 'bg-[#F2F4F7] text-[#667085]',
          )}>
            {STATUS_LABEL[changeRequest.status] ?? changeRequest.status}
          </span>
        </div>

        {/* Description */}
        <p className="text-[13px] text-[#475569] leading-relaxed mb-3 whitespace-pre-wrap">
          {changeRequest.description}
        </p>

        {/* Cost approval actions */}
        {costApproval && (
          <div className="space-y-3">
            {!showReject ? (
              <div className="flex gap-2">
                <button
                  onClick={handleApprove}
                  disabled={decide.isPending}
                  style={{ minHeight: '44px' }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                >
                  <CheckCircle size={13} />
                  {decide.isPending ? 'Processing…' : 'Approve'}
                </button>
                <button
                  onClick={() => { setShowReject(true); setError('') }}
                  disabled={decide.isPending}
                  style={{ minHeight: '44px' }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[#EAECF0] text-[13px] font-medium text-[#667085] hover:text-[#344054] bg-white transition-colors"
                >
                  <XCircle size={13} />
                  Reject
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  value={decisionNote}
                  onChange={e => { setDecisionNote(e.target.value); setError('') }}
                  placeholder="Reason for rejection (required)"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] text-[#344054] border border-[#EAECF0] rounded-lg focus:outline-none focus:border-[#667085] resize-none"
                />
                {error && (
                  <p className="text-[12px] text-[#D92D20]" role="alert">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleReject}
                    disabled={decide.isPending || !decisionNote.trim()}
                    style={{ minHeight: '44px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#D92D20] hover:bg-[#B42318] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {decide.isPending ? 'Submitting…' : 'Submit Rejection'}
                  </button>
                  <button
                    onClick={() => { setShowReject(false); setDecisionNote(''); setError('') }}
                    style={{ minHeight: '44px' }}
                    className="px-4 py-2 rounded-lg border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {!showReject && error && (
          <p className="text-[12px] text-[#D92D20] mt-2" role="alert">{error}</p>
        )}

        {/* Freelancer note */}
        {changeRequest.freelancerNote && (
          <div className="mt-3 pt-3 border-t border-[#F0F4F8]">
            <p className="text-[11.5px] font-semibold text-[#667085] mb-1">Freelancer response</p>
            <p className="text-[13px] text-[#475569]">{changeRequest.freelancerNote}</p>
          </div>
        )}

      </div>
    </div>
  )
}
