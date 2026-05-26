import { useState, useRef } from 'react'
import { ExternalLink, Download, PenLine, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalSignContract, type PortalContract } from '../hooks/usePortal'

const STATUS_LABEL: Record<string, string> = {
  SENT:     'Awaiting signature',
  SIGNED:   'Signed',
  DECLINED: 'Declined',
}

const STATUS_STYLE: Record<string, string> = {
  SENT:     'bg-[#EFF6FF] text-[#2563EB]',
  SIGNED:   'bg-[#ECFDF3] text-[#027A48]',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318]',
}

interface Props {
  contract:       PortalContract
  appUrl:         string
  onStatusChange: (id: string, status: string) => void
}

export default function PortalContractCard({ contract, appUrl, onStatusChange }: Props) {
  const [localStatus, setLocalStatus] = useState(contract.status)
  const [showOtp,     setShowOtp]     = useState(false)
  const [otpDigits,   setOtpDigits]   = useState<string[]>(Array(6).fill(''))
  const [otpError,    setOtpError]    = useState('')

  const inputRefs = useRef<(HTMLInputElement | null)[]>([])
  const sign = usePortalSignContract()

  function handleOtpChange(index: number, val: string) {
    const digit = val.replace(/\D/g, '').slice(-1)
    const newDigits = [...otpDigits]
    newDigits[index] = digit
    setOtpDigits(newDigits)
    setOtpError('')
    if (digit && index < 5) inputRefs.current[index + 1]?.focus()
  }

  function handleOtpKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  function handleOtpPaste(e: React.ClipboardEvent) {
    e.preventDefault()
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    const newDigits = Array(6).fill('')
    pasted.split('').forEach((d, i) => { newDigits[i] = d })
    setOtpDigits(newDigits)
    inputRefs.current[Math.min(pasted.length, 5)]?.focus()
  }

  async function handleSign() {
    const otp = otpDigits.join('')
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

  function openOtp() {
    setShowOtp(true)
    setTimeout(() => inputRefs.current[0]?.focus(), 50)
  }

  function cancelOtp() {
    setShowOtp(false)
    setOtpDigits(Array(6).fill(''))
    setOtpError('')
  }

  const otpFilled = otpDigits.filter(Boolean).length === 6

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0]">
      <div className="p-4">
        {/* Top row: title + status + links */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-[#344054] truncate">{contract.title}</p>
            <p className="text-[11.5px] text-[#98A2B3] mt-0.5">
              {new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              {contract.signedAt && ` · Signed ${new Date(contract.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <a
              href={`${appUrl}/sign/${contract.id}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/sign/${contract.id}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
            <span className={cn('text-[10.5px] font-semibold px-2.5 py-1 rounded-full', STATUS_STYLE[localStatus] ?? 'bg-[#F2F4F7] text-[#667085]')}>
              {STATUS_LABEL[localStatus] ?? localStatus}
            </span>
          </div>
        </div>

        {/* Sign Contract button */}
        {localStatus === 'SENT' && !showOtp && (
          <button
            onClick={openOtp}
            className="mt-1 w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13.5px] font-semibold transition-colors"
          >
            <PenLine size={14} strokeWidth={2.5} /> Sign Contract
          </button>
        )}

        {/* OTP entry */}
        {localStatus === 'SENT' && showOtp && (
          <div className="mt-3 space-y-4">
            <div>
              <p className="text-[12.5px] font-semibold text-[#344054]">Enter the OTP sent to your email</p>
              <p className="text-[12px] text-[#98A2B3] mt-0.5">Check your inbox for a 6-digit verification code</p>
            </div>

            {/* 6-box OTP input */}
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <input
                  key={i}
                  ref={el => { inputRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={otpDigits[i] ?? ''}
                  onChange={e => handleOtpChange(i, e.target.value)}
                  onKeyDown={e => handleOtpKeyDown(i, e)}
                  onPaste={i === 0 ? handleOtpPaste : undefined}
                  className="flex-1 min-w-0 text-center text-[18px] font-bold text-[#101828] bg-white border-2 border-[#EAECF0] rounded-lg outline-none focus:border-[#101828] focus:ring-2 focus:ring-[#F4F6FB] transition-all"
                  style={{ height: '3rem' }}
                />
              ))}
            </div>

            {otpError && <p className="text-[12px] text-[#D92D20]">{otpError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSign}
                disabled={sign.isPending || !otpFilled}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg bg-[#101828] hover:bg-[#1e293b] text-white text-[13px] font-semibold transition-colors disabled:opacity-60"
              >
                <PenLine size={13} /> {sign.isPending ? 'Signing…' : 'Confirm & Sign'}
              </button>
              <button
                onClick={cancelOtp}
                className="px-4 py-2.5 rounded-lg border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium bg-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {localStatus === 'SIGNED' && (
          <div className="mt-3 flex items-center gap-2 py-2.5 px-3 rounded-lg bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[12.5px] font-semibold text-[#027A48]">Contract signed</p>
          </div>
        )}
      </div>
    </div>
  )
}
