import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { CheckCircle, RefreshCw, AlertCircle, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDecideApproval, useResendApprovalOtp, type PortalApprovalRequest } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  PENDING:            'Awaiting sign-off',
  APPROVED:           'Approved',
  REJECTED:           'Rejected',
  REVISION_REQUESTED: 'Revision requested',
  CANCELLED:          'Cancelled',
}

const STATUS_STYLE: Record<string, string> = {
  PENDING:            'bg-[#EFF6FF] text-[#2563EB]',
  APPROVED:           'bg-[#ECFDF3] text-[#027A48]',
  REJECTED:           'bg-[#FEF3F2] text-[#B42318]',
  REVISION_REQUESTED: 'bg-[#FFFAEB] text-[#B54708]',
  CANCELLED:          'bg-[#F2F4F7] text-[#667085]',
}

interface Props {
  approvalRequest: PortalApprovalRequest
  token:           string
}

export default function PortalApprovalCard({ approvalRequest, token }: Props) {
  const queryClient = useQueryClient()

  const [mode,         setMode]         = useState<'idle' | 'otp' | 'revision'>('idle')
  const [otpValue,     setOtpValue]     = useState('')
  const [decisionNote, setDecisionNote] = useState('')
  const [error,        setError]        = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const decide    = useDecideApproval(token)
  const resendOtp = useResendApprovalOtp(token)

  // OTP resend countdown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setInterval(() => setResendCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [resendCooldown])

  async function handleApproveWithOtp() {
    if (otpValue.length !== 6) {
      setError('Please enter the 6-digit OTP.')
      return
    }
    setError('')
    try {
      await decide.mutateAsync({ id: approvalRequest.id, action: 'APPROVE', otp: otpValue })
      queryClient.invalidateQueries({ queryKey: ['portal', token] })
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? ''
      setError(msg || 'Invalid OTP. Please check your email and try again.')
    }
  }

  async function handleRevision() {
    if (!decisionNote.trim()) {
      setError('Please describe the revision needed.')
      return
    }
    setError('')
    try {
      await decide.mutateAsync({ id: approvalRequest.id, action: 'REQUEST_REVISION', decisionNote: decisionNote.trim() })
      queryClient.invalidateQueries({ queryKey: ['portal', token] })
    } catch {
      setError('Failed to submit revision request. Please try again.')
    }
  }

  async function handleResend() {
    setError('')
    try {
      await resendOtp.mutateAsync(approvalRequest.id)
      setResendCooldown(60)
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status
      if (status === 429) {
        setError('Please wait 60 seconds before resending.')
        setResendCooldown(60)
      } else {
        setError('Failed to resend OTP. Please try again.')
      }
    }
  }

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      <div className="p-4">

        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] flex items-center justify-center shrink-0">
              <CheckCircle size={14} className="text-[#16A34A]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#344054]">Project Sign-off Request</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(approvalRequest.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          </div>
          <span className={cn(
            'text-[10.5px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0',
            STATUS_STYLE[approvalRequest.status] ?? 'bg-[#F2F4F7] text-[#667085]',
          )}>
            {STATUS_LABEL[approvalRequest.status] ?? approvalRequest.status}
          </span>
        </div>

        {/* PENDING — action UI */}
        {approvalRequest.status === 'PENDING' && (
          <>
            {/* OTP email warning — only shown when in OTP mode and email failed */}
            {mode === 'otp' && !approvalRequest.otpEmailSent && (
              <div className="flex items-start gap-2 mb-3 p-3 bg-[#FFFAEB] rounded-lg border border-[#FEF0C7]">
                <AlertCircle size={14} className="text-[#B45309] mt-0.5 shrink-0" />
                <p className="text-[12.5px] text-[#92400E]">
                  OTP email failed to send. Click Resend to try again.
                </p>
              </div>
            )}

            {/* Default: two action buttons */}
            {mode === 'idle' && (
              <div className="flex gap-2">
                <button
                  onClick={() => { setMode('otp'); setError('') }}
                  style={{ minHeight: '44px' }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors"
                >
                  <CheckCircle size={13} />
                  Approve with OTP
                </button>
                <button
                  onClick={() => { setMode('revision'); setError('') }}
                  style={{ minHeight: '44px' }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg border border-[#EAECF0] text-[13px] font-medium text-[#667085] hover:text-[#344054] bg-white transition-colors"
                >
                  <RefreshCw size={13} />
                  Request Revision
                </button>
              </div>
            )}

            {/* OTP entry form */}
            {mode === 'otp' && (
              <div className="space-y-3">
                <div>
                  <p className="text-[12.5px] font-semibold text-[#344054]">Enter the OTP sent to your email</p>
                  <p className="text-[12px] text-[#98A2B3] mt-0.5">Check your inbox for a 6-digit verification code</p>
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  pattern="[0-9]*"
                  aria-label="One-time password"
                  autoComplete="one-time-code"
                  value={otpValue}
                  onChange={e => { setOtpValue(e.target.value.replace(/\D/g, '').slice(0, 6)); setError('') }}
                  placeholder="000000"
                  className="w-full px-4 text-center text-[20px] font-bold tracking-widest text-[#101828] bg-white border-2 border-[#EAECF0] rounded-lg outline-none focus:border-[#101828] focus:ring-2 focus:ring-[#F4F6FB] transition-all"
                  style={{ minHeight: '44px' }}
                />
                <div className="flex items-center justify-between">
                  <button
                    onClick={handleResend}
                    disabled={resendCooldown > 0 || resendOtp.isPending}
                    className="flex items-center gap-1 text-[12px] font-medium text-[#2563EB] hover:underline disabled:text-[#98A2B3] disabled:no-underline disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw size={11} />
                    {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                  </button>
                </div>
                {error && (
                  <p className="text-[12px] text-[#D92D20]" role="alert">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleApproveWithOtp}
                    disabled={decide.isPending || otpValue.length !== 6}
                    style={{ minHeight: '44px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {decide.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Confirming…</>
                      : <><CheckCircle size={13} /> Confirm Sign-off</>
                    }
                  </button>
                  <button
                    onClick={() => { setMode('idle'); setOtpValue(''); setError('') }}
                    style={{ minHeight: '44px' }}
                    className="px-4 py-2.5 rounded-lg border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Revision form */}
            {mode === 'revision' && (
              <div className="space-y-3">
                <p className="text-[12.5px] font-semibold text-[#344054]">Describe what needs to be revised</p>
                <textarea
                  value={decisionNote}
                  onChange={e => { setDecisionNote(e.target.value); setError('') }}
                  placeholder="Describe the changes needed before sign-off…"
                  rows={3}
                  className="w-full px-3 py-2 text-[13px] text-[#344054] border border-[#EAECF0] rounded-lg focus:outline-none focus:border-[#667085] resize-none"
                />
                {error && (
                  <p className="text-[12px] text-[#D92D20]" role="alert">{error}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleRevision}
                    disabled={decide.isPending || !decisionNote.trim()}
                    style={{ minHeight: '44px' }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
                  >
                    {decide.isPending
                      ? <><Loader2 size={13} className="animate-spin" /> Submitting…</>
                      : 'Submit Revision Request'
                    }
                  </button>
                  <button
                    onClick={() => { setMode('idle'); setDecisionNote(''); setError('') }}
                    style={{ minHeight: '44px' }}
                    className="px-4 py-2.5 rounded-lg border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* APPROVED — confirmation message */}
        {approvalRequest.status === 'APPROVED' && (
          <div className="flex items-center gap-2 text-[#027A48]">
            <CheckCircle size={16} />
            <p className="text-[13px] font-semibold">Project signed off</p>
            {approvalRequest.decidedAt && (
              <span className="text-[12px] text-[#98A2B3] ml-1">
                · {new Date(approvalRequest.decidedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
          </div>
        )}

        {/* REVISION_REQUESTED — show the note */}
        {approvalRequest.status === 'REVISION_REQUESTED' && (
          <div className="mt-1">
            <p className="text-[11.5px] font-semibold text-[#B54708] mb-1">Revision requested</p>
            {approvalRequest.decisionNote && (
              <p className="text-[13px] text-[#475569]">{approvalRequest.decisionNote}</p>
            )}
          </div>
        )}

      </div>
    </div>
  )
}
