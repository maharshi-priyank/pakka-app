import { useState } from 'react'
import { FileSignature, ExternalLink, Download, PenLine, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalSignContract, type PortalContract } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  SENT:     'Awaiting signature',
  SIGNED:   'Signed',
  DECLINED: 'Declined',
}

const STATUS_STYLE: Record<string, string> = {
  SENT:     'bg-[#EEF2FF] text-[#4338CA]',
  SIGNED:   'bg-[#ECFDF3] text-[#027A48]',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318]',
}

interface Props {
  contract: PortalContract
  appUrl:   string
  onStatusChange: (id: string, status: string) => void
}

export default function PortalContractCard({ contract, appUrl, onStatusChange }: Props) {
  const [localStatus, setLocalStatus] = useState(contract.status)
  const [showOtp,     setShowOtp]     = useState(false)
  const [otp,         setOtp]         = useState('')
  const [otpError,    setOtpError]    = useState('')

  const sign = usePortalSignContract()

  async function handleSign() {
    if (otp.length !== 6) { setOtpError('Enter the 6-digit OTP sent to your email'); return }
    setOtpError('')
    try {
      await sign.mutateAsync({ id: contract.id, otp })
      setLocalStatus('SIGNED')
      onStatusChange(contract.id, 'SIGNED')
      setShowOtp(false)
    } catch {
      setOtpError('Invalid OTP. Please check your email and try again.')
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F4F3FF] flex items-center justify-center shrink-0">
              <FileSignature size={16} className="text-[#5925DC]" />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] leading-tight">{contract.title}</p>
              <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
                {new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                {contract.signedAt && ` · Signed ${new Date(contract.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
              </p>
            </div>
          </div>
          <span className={cn('text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
            {STATUS_LABEL[localStatus] ?? localStatus}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <a
            href={`${appUrl}/sign/${contract.id}`}
            target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
          >
            <ExternalLink size={12} /> View
          </a>
          <button
            onClick={() => window.open(`${appUrl}/sign/${contract.id}?print=1`, '_blank')}
            className="flex items-center gap-1.5 text-[12px] font-medium text-[#667085] hover:text-[#6366F1] transition-colors"
          >
            <Download size={12} /> PDF
          </button>
        </div>
      </div>

      {/* Sign action */}
      {localStatus === 'SENT' && !showOtp && (
        <div className="border-t border-[#F2F4F7] px-5 py-3 bg-[#FAFBFF]">
          <button
            onClick={() => setShowOtp(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
          >
            <PenLine size={12} strokeWidth={2.5} /> Sign Contract
          </button>
        </div>
      )}

      {localStatus === 'SENT' && showOtp && (
        <div className="border-t border-[#F2F4F7] px-5 py-4 bg-[#FAFBFF] space-y-3">
          <p className="text-[12.5px] text-[#344054] font-medium">Enter the 6-digit OTP sent to your email to sign this contract.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otp}
              onChange={e => { setOtp(e.target.value.replace(/\D/g, '')); setOtpError('') }}
              placeholder="000000"
              className="w-32 px-3 py-2 text-center text-[15px] font-bold tracking-[0.3em] bg-white border border-[#EAECF0] rounded-lg outline-none focus:border-[#6366F1] focus:ring-2 focus:ring-[#EEF2FF]"
            />
            <button
              onClick={handleSign}
              disabled={sign.isPending || otp.length !== 6}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
            >
              <PenLine size={12} /> {sign.isPending ? 'Signing…' : 'Confirm & Sign'}
            </button>
            <button onClick={() => { setShowOtp(false); setOtp(''); setOtpError('') }} className="text-[12px] text-[#667085] hover:text-[#344054]">Cancel</button>
          </div>
          {otpError && <p className="text-[11.5px] text-red-500">{otpError}</p>}
        </div>
      )}

      {localStatus === 'SIGNED' && (
        <div className="border-t border-[#F2F4F7] px-5 py-2.5 flex items-center gap-2 bg-[#F0FDF4]">
          <CheckCircle2 size={13} className="text-[#027A48]" />
          <p className="text-[12px] font-semibold text-[#027A48]">Contract signed</p>
        </div>
      )}
    </div>
  )
}
