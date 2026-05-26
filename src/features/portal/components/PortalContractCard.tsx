import { useState, useRef } from 'react'
import { ExternalLink, Download, PenLine, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePortalSignContract, type PortalContract } from '../hooks/usePortal'

const ACCENT_BAR: Record<string, string> = {
  SENT:     'bg-[#5925DC]',
  SIGNED:   'bg-[#027A48]',
  DECLINED: 'bg-[#D92D20]',
}

const STATUS_LABEL: Record<string, string> = {
  SENT:     'Awaiting signature',
  SIGNED:   'Signed',
  DECLINED: 'Declined',
}

const STATUS_STYLE: Record<string, string> = {
  SENT:     'bg-[#F4F3FF] text-[#5925DC]',
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

  const accentBar = ACCENT_BAR[localStatus] ?? 'bg-[#98A2B3]'
  const otpFilled = otpDigits.filter(Boolean).length === 6

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
              href={`${appUrl}/sign/${contract.id}`}
              target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <ExternalLink size={11} /> View
            </a>
            <button
              onClick={() => window.open(`${appUrl}/sign/${contract.id}?print=1`, '_blank')}
              className="flex items-center gap-1 text-[11.5px] font-medium text-[#98A2B3] hover:text-[#6366F1] transition-colors"
            >
              <Download size={11} /> PDF
            </button>
          </div>
        </div>

        {/* Title */}
        <p className="text-[17px] font-bold text-[#101828] leading-snug">{contract.title}</p>
        <p className="text-[12px] text-[#98A2B3] mt-1">
          {new Date(contract.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          {contract.signedAt && ` · Signed ${new Date(contract.signedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`}
        </p>

        {/* Sign Contract — full-width CTA */}
        {localStatus === 'SENT' && !showOtp && (
          <div className="mt-5">
            <button
              onClick={openOtp}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#5925DC] hover:bg-[#4A1FB8] text-white text-[14px] font-bold transition-colors"
            >
              <PenLine size={15} strokeWidth={2.5} /> Sign Contract
            </button>
          </div>
        )}

        {/* OTP entry */}
        {localStatus === 'SENT' && showOtp && (
          <div className="mt-5 space-y-4">
            <div>
              <p className="text-[13px] font-semibold text-[#344054]">Enter the OTP sent to your email</p>
              <p className="text-[12px] text-[#98A2B3] mt-0.5">Check your inbox for a 6-digit verification code</p>
            </div>

            {/* 6 individual digit boxes */}
            <div className="flex items-center gap-2 justify-center">
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
                  className="w-11 text-center text-[20px] font-bold text-[#101828] bg-white border-2 border-[#EAECF0] rounded-xl outline-none focus:border-[#5925DC] focus:ring-2 focus:ring-[#F4F3FF] transition-all select-none"
                  style={{ height: '3.25rem' }}
                />
              ))}
            </div>

            {otpError && <p className="text-[12px] text-center text-red-500">{otpError}</p>}

            <div className="flex gap-2">
              <button
                onClick={handleSign}
                disabled={sign.isPending || !otpFilled}
                className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl bg-[#5925DC] hover:bg-[#4A1FB8] text-white text-[13.5px] font-bold transition-colors disabled:opacity-60"
              >
                <PenLine size={13} /> {sign.isPending ? 'Signing…' : 'Confirm & Sign'}
              </button>
              <button
                onClick={cancelOtp}
                className="px-4 py-3 rounded-xl bg-white border border-[#EAECF0] text-[13px] text-[#667085] hover:text-[#344054] font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Signed confirmation */}
        {localStatus === 'SIGNED' && (
          <div className="mt-4 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#ECFDF3]">
            <CheckCircle2 size={14} className="text-[#027A48]" />
            <p className="text-[13px] font-semibold text-[#027A48]">Contract signed</p>
          </div>
        )}
      </div>
    </div>
  )
}
