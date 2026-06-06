import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import {
  CheckCircle2, AlertCircle, FileSignature, IndianRupee,
  CheckSquare, XCircle, Shield, Lock, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContractContent, ContractScopeItem, ContractDeliverable, ContractPaymentMilestone, ContractClause } from '@/features/contracts/schemas/contract.schema'
import DocumentHeader from '@/components/documents/DocumentHeader'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

interface PublicContractUser {
  name: string; businessName: string | null; email: string; logoUrl: string | null
}
interface PublicContractClient {
  id: string; name: string; company: string | null; email: string | null
}
interface PublicContract {
  id: string; title: string; status: string; content: ContractContent
  signedAt: string | null; auditLog: Record<string, unknown> | null
  createdAt: string
  user: PublicContractUser; client: PublicContractClient | null
}

async function fetchContract(id: string): Promise<PublicContract> {
  const { data } = await publicApi.get<{ data: PublicContract }>(`/contracts/sign/${id}`)
  return data.data
}

async function submitOtp(id: string, otp: string): Promise<PublicContract> {
  const { data } = await publicApi.post<{ data: PublicContract }>(`/contracts/sign/${id}`, { otp })
  return data.data
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ContractSignPage() {
  const { id } = useParams<{ id: string }>()
  const { search } = useLocation()
  const isPrint = new URLSearchParams(search).get('print') === '1'
  const [otp,    setOtp]    = useState('')
  const [signed, setSigned] = useState<PublicContract | null>(null)
  const [otpError, setOtpError] = useState('')

  const { data: contract, isLoading, isError } = useQuery({
    queryKey: ['public-contract', id],
    queryFn:  () => fetchContract(id!),
    enabled:  !!id,
    retry:    false,
  })

  const signMutation = useMutation({
    mutationFn: (otp: string) => submitOtp(id!, otp),
    onSuccess:  (result) => setSigned(result),
    onError:    () => {
      setOtpError('Incorrect OTP. Please check and try again.')
      setOtp('')
    },
  })

  useEffect(() => {
    if (isPrint && !isLoading) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPrint, isLoading])

  function handleSign() {
    setOtpError('')
    if (otp.length !== 6) {
      setOtpError('OTP must be 6 digits')
      return
    }
    signMutation.mutate(otp)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !contract) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-[#D0D5DD] mb-3" />
          <p className="text-[16px] font-bold text-[#344054]">Contract not found</p>
          <p className="text-[13px] text-[#98A2B3] mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  const c          = contract.content as ContractContent
  const senderName = contract.user.businessName ?? contract.user.name
  const isAlreadySigned = contract.status === 'SIGNED' || !!signed
  const displayContract = signed ?? contract

  const scopeItems     = (c.scopeItems     ?? []) as ContractScopeItem[]
  const deliverables   = (c.deliverables   ?? []) as ContractDeliverable[]
  const exclusions     = (c.exclusions     ?? []) as string[]
  const paymentSchedule = (c.paymentSchedule ?? []) as ContractPaymentMilestone[]
  const clauses        = (c.clauses        ?? []) as ContractClause[]

  return (
    <div className="min-h-screen bg-[#F5F6FA]">

      {/* Brand bar */}
      <div className="bg-white border-b border-[#EAECF0] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {contract.user.logoUrl ? (
              <img src={contract.user.logoUrl} alt={senderName} className="h-8 object-contain" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white text-[13px] font-bold">
                {senderName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className="text-[14px] font-bold text-[#101828]">{senderName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="print:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EBF2] text-[12px] text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors"
            >
              <Download size={12} strokeWidth={2} />
              Download PDF
            </button>
            <div className="flex items-center gap-1.5 text-[11px] text-[#667085]">
              <Lock size={11} strokeWidth={2} />
              Secure · Powered by ClearWork
            </div>
          </div>
        </div>
      </div>

      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; } }`}</style>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Signed confirmation banner */}
        {isAlreadySigned && (
          <div className="bg-[#ECFDF3] border border-[#BBF7D0] rounded-2xl p-6 flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0">
              <CheckCircle2 size={20} className="text-[#027A48]" />
            </div>
            <div>
              <p className="text-[16px] font-bold text-[#027A48]">Contract signed successfully</p>
              <p className="text-[13px] text-[#065F46] mt-1">
                Signed on {fmtDateTime(displayContract.signedAt ?? new Date().toISOString())}
              </p>
              {displayContract.auditLog && (
                <p className="text-[11px] text-[#059669] mt-1">
                  IP: {(displayContract.auditLog as Record<string, unknown>).ipAddress as string ?? 'recorded'} · OTP verified
                </p>
              )}
            </div>
          </div>
        )}

        {/* Hero */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
          <DocumentHeader
            logoUrl={contract.user.logoUrl}
            senderName={senderName}
            senderEmail={contract.user.email}
            docType="Contract"
            docIdentifier={contract.title}
            docDate={contract.createdAt}
            statusBadge={
              <span className={cn(
                'text-[10px] font-bold px-2.5 py-0.5 rounded-full',
                isAlreadySigned ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#F9F5FF] text-[#6941C6]',
              )}>
                {isAlreadySigned ? 'SIGNED' : contract.status}
              </span>
            }
          />
          <div className="px-8 py-8 border-b border-[#F2F4F7]">
            <h1 className="text-[22px] font-extrabold text-[#101828] leading-tight">{contract.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[12px] text-[#667085]">
              <span>From <span className="font-semibold text-[#344054]">{senderName}</span></span>
              {contract.client && (
                <>
                  <span className="text-[#D0D5DD]">·</span>
                  <span>To <span className="font-semibold text-[#344054]">{contract.client.name}</span></span>
                </>
              )}
              <span className="text-[#D0D5DD]">·</span>
              <span>{fmtDate(contract.createdAt)}</span>
            </div>
          </div>

          {/* Contract value */}
          {c.totalAmount && c.totalAmount > 0 && (
            <div className="px-8 py-5 bg-[#FAFAFA] flex items-center justify-between">
              <div>
                <p className="text-[11px] text-[#98A2B3] uppercase tracking-wider mb-1">Contract value</p>
                <div className="flex items-center gap-1">
                  <IndianRupee size={15} strokeWidth={3} className="text-[#101828]" />
                  <span className="text-[26px] font-extrabold text-[#101828] leading-none">{fmt(c.totalAmount)}</span>
                </div>
                {c.gstAmount && c.gstAmount > 0 && (
                  <p className="text-[11px] text-[#98A2B3] mt-0.5">incl. GST ₹{fmt(c.gstAmount)}</p>
                )}
              </div>
              <span className={cn(
                'px-3.5 py-1.5 rounded-full text-[12px] font-bold',
                isAlreadySigned ? 'bg-[#ECFDF3] text-[#027A48]' : 'bg-[#EFF6FF] text-[#2563EB]',
              )}>
                {isAlreadySigned ? 'SIGNED' : contract.status}
              </span>
            </div>
          )}
        </div>

        {/* Intro */}
        {c.intro && (
          <ContractSection title="Agreement">
            <p className="text-[14px] text-[#344054] leading-relaxed">{c.intro}</p>
            {c.projectDescription && (
              <p className="text-[13px] text-[#667085] mt-2 leading-relaxed">{c.projectDescription}</p>
            )}
          </ContractSection>
        )}

        {/* Scope */}
        {scopeItems.length > 0 && (
          <ContractSection title="Scope of work">
            <ul className="space-y-2 mt-1">
              {scopeItems.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-[#2563EB]">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-[#101828]">{item.title}</p>
                    {item.description && <p className="text-[12px] text-[#667085] mt-0.5">{item.description}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </ContractSection>
        )}

        {/* Deliverables + Exclusions */}
        {(deliverables.length > 0 || exclusions.length > 0) && (
          <div className={cn('grid gap-4', deliverables.length > 0 && exclusions.length > 0 ? 'grid-cols-2' : 'grid-cols-1')}>
            {deliverables.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EAECF0] p-6">
                <div className="flex items-center gap-2 mb-3">
                  <CheckSquare size={14} className="text-[#027A48]" />
                  <h3 className="text-[14px] font-bold text-[#101828]">Deliverables</h3>
                </div>
                <ul className="space-y-2">
                  {deliverables.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px]">
                      <CheckCircle2 size={13} className="text-[#12B76A] shrink-0 mt-0.5" />
                      <span className="text-[#344054]">{d.item}
                        {d.format && <span className="text-[#98A2B3] ml-1">({d.format})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {exclusions.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EAECF0] p-6">
                <div className="flex items-center gap-2 mb-3">
                  <XCircle size={14} className="text-[#D92D20]" />
                  <h3 className="text-[14px] font-bold text-[#101828]">Not included</h3>
                </div>
                <ul className="space-y-2">
                  {exclusions.map((ex, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px]">
                      <XCircle size={13} className="text-[#F04438] shrink-0 mt-0.5" />
                      <span className="text-[#667085]">{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Payment schedule */}
        {paymentSchedule.length > 0 && (
          <ContractSection title="Payment schedule">
            <div className="space-y-2 mt-1">
              {paymentSchedule.map((ps, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-[#FAFAFA] rounded-xl border border-[#F2F4F7]">
                  <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center shrink-0">
                    <span className="text-[9px] font-bold text-[#2563EB]">{idx + 1}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#344054]">{ps.milestone}</p>
                    {ps.dueOn && <p className="text-[11px] text-[#98A2B3]">{ps.dueOn}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 font-extrabold text-[#101828]">
                    <IndianRupee size={10} strokeWidth={3} />
                    <span className="text-[14px]">{fmt(ps.amount)}</span>
                  </div>
                </div>
              ))}
            </div>
          </ContractSection>
        )}

        {/* Clauses */}
        {clauses.length > 0 && (
          <ContractSection title="Terms & conditions">
            <div className="space-y-4 mt-1">
              {clauses.map((clause, idx) => (
                <div key={idx}>
                  <p className="text-[13px] font-bold text-[#344054]">
                    <span className="text-[#98A2B3] mr-1">§{idx + 1}</span> {clause.title}
                  </p>
                  <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">{clause.body}</p>
                </div>
              ))}
            </div>
          </ContractSection>
        )}

        {/* ── OTP Signing box ── */}
        {!isAlreadySigned ? (
          <div className="print:hidden bg-white rounded-2xl border-2 border-[#2563EB] shadow-sm p-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center">
                <Shield size={18} className="text-[#2563EB]" />
              </div>
              <div>
                <p className="text-[15px] font-bold text-[#101828]">Sign this contract</p>
                <p className="text-[12px] text-[#667085]">Enter the 6-digit OTP shared by {senderName}</p>
              </div>
            </div>

            <div className="space-y-4">
              {c.signerName && (
                <div className="bg-[#F9FAFB] rounded-xl p-3 text-[13px] text-[#344054]">
                  Signing as <span className="font-semibold">{c.signerName}</span>
                  {c.signerEmail && <span className="text-[#667085]"> · {c.signerEmail}</span>}
                </div>
              )}

              <div>
                <label className="form-label">One-time password (OTP)</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={e => e.key === 'Enter' && handleSign()}
                  className={cn(
                    'form-input w-full text-center text-[22px] font-extrabold tracking-[0.4em] h-14',
                    otpError && 'border-[#F04438] focus:border-[#F04438]',
                  )}
                  placeholder="000000"
                  disabled={signMutation.isPending}
                />
                {otpError && <p className="form-error">{otpError}</p>}
              </div>

              <button
                onClick={handleSign}
                disabled={otp.length !== 6 || signMutation.isPending}
                className="btn-primary w-full h-12 text-[15px] font-bold justify-center"
              >
                {signMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileSignature size={16} strokeWidth={2} />
                    Sign contract
                  </span>
                )}
              </button>

              <p className="text-[11px] text-[#98A2B3] text-center leading-relaxed">
                By signing, you agree to all terms stated in this contract. This constitutes a legally binding electronic signature.
              </p>
            </div>
          </div>
        ) : (
          /* Post-sign audit trail */
          <div className="bg-[#F9FAFB] rounded-2xl border border-[#EAECF0] p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield size={14} className="text-[#667085]" />
              <p className="text-[13px] font-bold text-[#344054]">Signature audit trail</p>
            </div>
            <div className="space-y-1.5 text-[12px] text-[#667085]">
              <p>✓ OTP verified electronically</p>
              <p>✓ Signed: {fmtDateTime(displayContract.signedAt ?? new Date().toISOString())}</p>
              {displayContract.auditLog && (
                <p>✓ IP address recorded: {(displayContract.auditLog as Record<string, unknown>).ipAddress as string ?? 'captured'}</p>
              )}
              <p>✓ Contract bound to both parties</p>
            </div>
          </div>
        )}

        <div className="text-center py-4 text-[11px] text-[#D0D5DD]">
          Contract by {senderName} · {contract.user.email} · Powered by ClearWork
        </div>
      </div>
    </div>
  )
}

function ContractSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-8">
      <h2 className="text-[15px] font-bold text-[#101828] mb-4">{title}</h2>
      {children}
    </div>
  )
}
