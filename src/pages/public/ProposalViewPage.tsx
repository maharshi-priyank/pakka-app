import { useEffect, useRef, useState } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import {
  IndianRupee, CheckCircle2, Clock, ScrollText, Layers, FileText,
  AlertCircle, CheckSquare, XCircle, Star, MessageSquare, Briefcase,
  ExternalLink, ChevronDown, ArrowRight, Download, ThumbsUp, ThumbsDown,
  Loader2, CreditCard, Lock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type {
  Proposal, ProposalContent, LineItem, ScopeItem, Milestone,
  Deliverable, PaymentMilestone, CaseStudy, FaqItem,
} from '@/features/proposals/schemas/proposal.schema'
import { GST_TYPE_LABELS } from '@/features/proposals/schemas/proposal.schema'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

interface PublicProposalUser {
  name:         string
  businessName: string | null
  email:        string
  logoUrl:      string | null
  plan:         'FREE' | 'SOLO' | 'STUDIO'
}

interface PublicProposal extends Proposal {
  user:            PublicProposalUser
  depositAmount:   string | null
  depositPaid:     boolean
  depositPaidAt:   string | null
  depositOrderId?: string | null
}

interface DepositOrder {
  orderId:   string
  amount:    number
  currency:  string
  keyId:     string
  milestone: string
}

interface AcceptResponse {
  proposal:     PublicProposal
  depositOrder: DepositOrder | null
}

async function fetchPublicProposal(slug: string): Promise<PublicProposal> {
  const { data } = await publicApi.get<{ data: PublicProposal }>(`/proposals/view/${slug}`)
  return data.data
}

async function recordOpen(slug: string) {
  try { await publicApi.post(`/proposals/view/${slug}/open`) } catch { /* ignore */ }
}

async function acceptProposal(slug: string): Promise<AcceptResponse> {
  const { data } = await publicApi.post<{ data: AcceptResponse }>(`/proposals/view/${slug}/accept`)
  return data.data
}

async function declineProposal(slug: string): Promise<PublicProposal> {
  const { data } = await publicApi.post<{ data: PublicProposal }>(`/proposals/view/${slug}/decline`)
  return data.data
}

async function verifyDepositPayment(
  slug: string,
  dto: { orderId: string; paymentId: string; signature: string },
) {
  await publicApi.post(`/proposals/view/${slug}/verify-deposit`, dto)
}

function fmt(value: string | number) {
  return Number(value).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ProposalViewPage() {
  const { slug } = useParams<{ slug: string }>()
  const { search } = useLocation()
  const isPrint = new URLSearchParams(search).get('print') === '1'
  const openRecorded = useRef(false)
  const queryClient  = useQueryClient()
  const [actionDone,    setActionDone]    = useState<'accepted' | 'declined' | null>(null)
  const [depositOrder,  setDepositOrder]  = useState<DepositOrder | null>(null)
  const [depositPaid,   setDepositPaid]   = useState(false)
  const [payError,      setPayError]      = useState('')
  const [payLoading,    setPayLoading]    = useState(false)

  const { data: proposal, isLoading, isError } = useQuery({
    queryKey: ['public-proposal', slug],
    queryFn:  () => fetchPublicProposal(slug!),
    enabled:  !!slug,
    retry:    false,
  })

  const acceptMutation = useMutation({
    mutationFn: () => acceptProposal(slug!),
    onSuccess: (res) => {
      setActionDone('accepted')
      if (res.depositOrder) setDepositOrder(res.depositOrder)
      queryClient.invalidateQueries({ queryKey: ['public-proposal', slug] })
    },
  })

  const declineMutation = useMutation({
    mutationFn: () => declineProposal(slug!),
    onSuccess: () => {
      setActionDone('declined')
      queryClient.invalidateQueries({ queryKey: ['public-proposal', slug] })
    },
  })

  // If the page is loaded for an already-accepted proposal with a pending deposit,
  // re-call accept (idempotent) to retrieve the existing deposit order info
  useEffect(() => {
    if (
      proposal?.status === 'ACCEPTED' &&
      proposal.depositAmount &&
      !proposal.depositPaid &&
      !depositPaid &&
      !depositOrder &&
      slug
    ) {
      acceptProposal(slug).then(res => {
        if (res.depositOrder) setDepositOrder(res.depositOrder)
      }).catch(() => {})
    }
    if (proposal?.depositPaid) setDepositPaid(true)
  }, [proposal])

  async function handlePayDeposit() {
    if (!depositOrder || !slug) return
    setPayError('')
    setPayLoading(true)
    try {
      const rzp = new (window as any).Razorpay({
        key:         depositOrder.keyId,
        order_id:    depositOrder.orderId,
        amount:      depositOrder.amount,
        currency:    depositOrder.currency,
        name:        proposal?.user.businessName ?? proposal?.user.name ?? 'Rupway',
        description: `Deposit — ${depositOrder.milestone}`,
        theme:       { color: '#2563EB' },
        modal:       { ondismiss: () => setPayLoading(false) },
        handler: async (response: {
          razorpay_payment_id: string
          razorpay_order_id:   string
          razorpay_signature:  string
        }) => {
          try {
            await verifyDepositPayment(slug, {
              orderId:   response.razorpay_order_id,
              paymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            })
            setDepositPaid(true)
            setDepositOrder(null)
          } catch {
            setPayError('Payment verification failed. Please contact the sender.')
          } finally {
            setPayLoading(false)
          }
        },
      })
      rzp.open()
    } catch {
      setPayError('Could not open payment. Please try again.')
      setPayLoading(false)
    }
  }

  useEffect(() => {
    if (proposal && slug && !openRecorded.current) {
      openRecorded.current = true
      recordOpen(slug)
    }
  }, [proposal, slug])

  useEffect(() => {
    if (isPrint && proposal) {
      const t = setTimeout(() => window.print(), 800)
      return () => clearTimeout(t)
    }
  }, [isPrint, proposal])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !proposal) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-[#D0D5DD] mb-3" />
          <p className="text-[16px] font-bold text-[#344054]">Proposal not found</p>
          <p className="text-[13px] text-[#98A2B3] mt-1">This link may have expired or been removed.</p>
        </div>
      </div>
    )
  }

  const content = proposal.content as ProposalContent
  const lineItems      = (content.lineItems      ?? []) as LineItem[]
  const scopeItems     = (content.scopeItems     ?? []) as ScopeItem[]
  const milestones     = (content.milestones     ?? []) as Milestone[]
  const deliverables   = (content.deliverables   ?? []) as Deliverable[]
  const exclusions     = (content.exclusions     ?? []) as string[]
  const paymentSchedule = (content.paymentSchedule ?? []) as PaymentMilestone[]
  const caseStudies    = (content.caseStudies    ?? []) as CaseStudy[]
  const faq            = (content.faq            ?? []) as FaqItem[]
  const gstType        = content.gstType ?? 'IGST'

  const subtotal   = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const gstAmount  = gstType !== 'EXEMPT'
    ? lineItems.reduce((s, i) => s + (i.qty * i.rate * (i.gstRate ?? 0)) / 100, 0)
    : 0
  const total = subtotal + gstAmount

  const senderName  = proposal.user.businessName ?? proposal.user.name
  const status      = actionDone === 'accepted' ? 'ACCEPTED' : actionDone === 'declined' ? 'DECLINED' : proposal.status
  const isExpired   = status === 'EXPIRED' || status === 'DECLINED'
  const isAccepted  = status === 'ACCEPTED'
  const canAct      = !actionDone && (proposal.status === 'SENT' || proposal.status === 'OPENED')

  return (
    <div className="min-h-screen bg-[#F5F6FA]">

      {/* Watermark (FREE plan) */}
      {proposal.user.plan === 'FREE' && (
        <div className="fixed inset-0 pointer-events-none z-40 overflow-hidden select-none">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="absolute whitespace-nowrap text-[64px] font-bold text-black/[0.04]"
              style={{ transform: 'rotate(-35deg)', top: `${i * 18 - 10}%`, left: '-20%', width: '140%' }}
            >
              Rupway • Rupway • Rupway • Rupway • Rupway
            </div>
          ))}
        </div>
      )}

      {/* Brand bar */}
      <div className="bg-white border-b border-[#EAECF0] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {proposal.user.logoUrl ? (
              <img src={proposal.user.logoUrl} alt={senderName} className="h-8 object-contain" />
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
            <span className="text-[11px] text-[#98A2B3]">Powered by Rupway</span>
          </div>
        </div>
      </div>

      <style>{`@media print { .print\\:hidden { display: none !important; } body { background: white !important; } }`}</style>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">

        {/* Status banners */}
        {isAccepted && (
          <div className="flex items-center gap-2.5 bg-[#ECFDF3] border border-[#BBF7D0] rounded-xl px-4 py-3">
            <CheckCircle2 size={16} className="text-[#027A48] shrink-0" />
            <p className="text-[13px] font-medium text-[#027A48]">This proposal has been accepted.</p>
          </div>
        )}
        {isExpired && (
          <div className="flex items-center gap-2.5 bg-[#FEF3F2] border border-[#FECDCA] rounded-xl px-4 py-3">
            <AlertCircle size={16} className="text-[#D92D20] shrink-0" />
            <p className="text-[13px] font-medium text-[#D92D20]">This proposal is no longer active.</p>
          </div>
        )}

        {/* ── Deposit paid banner ── */}
        {depositPaid && (
          <div className="print:hidden flex items-center gap-3 bg-[#ECFDF3] border border-[#BBF7D0] rounded-xl px-5 py-4">
            <div className="w-8 h-8 rounded-full bg-[#D1FAE5] flex items-center justify-center shrink-0">
              <CheckCircle2 size={16} className="text-[#027A48]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#027A48]">Deposit paid successfully</p>
              <p className="text-[12px] text-[#065F46] mt-0.5">Your payment has been received. The sender has been notified.</p>
            </div>
          </div>
        )}

        {/* ── Deposit payment card ── */}
        {isAccepted && depositOrder && !depositPaid && (
          <div className="print:hidden bg-white border-2 border-[#2563EB] rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-xl bg-[#EFF6FF] flex items-center justify-center shrink-0">
                  <CreditCard size={16} className="text-[#2563EB]" />
                </div>
                <div>
                  <p className="text-[15px] font-extrabold text-[#101828]">Pay your deposit</p>
                  <p className="text-[12px] text-[#667085] mt-0.5">Secure the project by paying the first milestone now</p>
                </div>
              </div>

              <div className="bg-[#F8FAFF] rounded-xl border border-[#E0E7FF] px-4 py-3 mb-4">
                <p className="text-[11px] font-semibold text-[#667085] uppercase tracking-wider mb-1">
                  {depositOrder.milestone}
                </p>
                <div className="flex items-center gap-1">
                  <IndianRupee size={14} strokeWidth={3} className="text-[#101828]" />
                  <span className="text-[22px] font-extrabold text-[#101828]">
                    {(depositOrder.amount / 100).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                onClick={handlePayDeposit}
                disabled={payLoading}
                className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#2563EB] text-white text-[14px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-60"
              >
                {payLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <>
                    <Lock size={14} strokeWidth={2.5} />
                    Pay ₹{(depositOrder.amount / 100).toLocaleString('en-IN')} securely
                  </>
                )}
              </button>
              {payError && (
                <p className="text-[12px] text-red-500 mt-2 text-center">{payError}</p>
              )}
              <p className="text-[11px] text-[#98A2B3] text-center mt-2 flex items-center justify-center gap-1">
                <Lock size={9} strokeWidth={2} /> Secured by Razorpay
              </p>
            </div>
          </div>
        )}

        {/* ── Hero ── */}
        <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm overflow-hidden">
          <div className="px-8 py-8 border-b border-[#F2F4F7]">
            <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-widest mb-2">Proposal</p>
            <h1 className="text-[26px] font-extrabold text-[#101828] leading-tight">{proposal.title}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-3 text-[12px] text-[#667085]">
              <span>From <span className="font-semibold text-[#344054]">{senderName}</span></span>
              <span className="text-[#D0D5DD]">·</span>
              <span>Created {fmtDate(proposal.createdAt)}</span>
              {proposal.validUntil && (
                <>
                  <span className="text-[#D0D5DD]">·</span>
                  <span>Valid until <span className="font-semibold text-[#344054]">{fmtDate(proposal.validUntil)}</span></span>
                </>
              )}
            </div>
          </div>
          <div className="px-8 py-5 bg-[#FAFAFA] flex items-center justify-between">
            <div>
              <p className="text-[11px] text-[#98A2B3] uppercase tracking-wider mb-1">Total value</p>
              <div className="flex items-center gap-1">
                <IndianRupee size={16} strokeWidth={3} className="text-[#101828]" />
                <span className="text-[30px] font-extrabold text-[#101828] leading-none">{fmt(proposal.totalAmount)}</span>
              </div>
              {Number(proposal.gstAmount) > 0 && (
                <p className="text-[11px] text-[#98A2B3] mt-0.5">incl. GST ₹{fmt(proposal.gstAmount)}</p>
              )}
            </div>
            <span className={cn(
              'px-3.5 py-1.5 rounded-full text-[12px] font-bold',
              isAccepted ? 'bg-[#ECFDF3] text-[#027A48]' :
              isExpired  ? 'bg-[#FEF3F2] text-[#D92D20]' :
              'bg-[#EFF6FF] text-[#2563EB]',
            )}>
              {proposal.status}
            </span>
          </div>
        </div>

        {/* ── Introduction ── */}
        {content.intro && (
          <ViewCard icon={FileText} title="Introduction">
            <p className="text-[14px] text-[#344054] leading-relaxed whitespace-pre-wrap">{content.intro}</p>
          </ViewCard>
        )}

        {/* ── Why Us ── */}
        {content.whyUs && (
          <ViewCard icon={Star} title="Why work with us">
            <p className="text-[14px] text-[#344054] leading-relaxed whitespace-pre-wrap">{content.whyUs}</p>
          </ViewCard>
        )}

        {/* ── Scope ── */}
        {scopeItems.length > 0 && (
          <ViewCard icon={Layers} title="Scope of work">
            <div className="space-y-3 mt-1">
              {scopeItems.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-[9px] font-bold text-[#2563EB]">{idx + 1}</span>
                  </div>
                  <div>
                    <p className="text-[14px] font-semibold text-[#101828]">{item.title}</p>
                    {item.description && (
                      <p className="text-[13px] text-[#667085] mt-0.5 leading-relaxed">{item.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ViewCard>
        )}

        {/* ── Deliverables + Exclusions (side-by-side if both exist) ── */}
        {(deliverables.length > 0 || exclusions.length > 0) && (
          <div className={cn(
            'grid gap-4',
            deliverables.length > 0 && exclusions.length > 0 ? 'grid-cols-2' : 'grid-cols-1',
          )}>
            {deliverables.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#ECFDF3] flex items-center justify-center">
                    <CheckSquare size={13} strokeWidth={2} className="text-[#027A48]" />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#101828]">Deliverables</h3>
                </div>
                <ul className="space-y-2">
                  {deliverables.map((d, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px]">
                      <CheckCircle2 size={14} className="text-[#12B76A] shrink-0 mt-0.5" />
                      <span className="text-[#344054] font-medium">{d.item}
                        {d.format && <span className="text-[#98A2B3] font-normal ml-1">({d.format})</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {exclusions.length > 0 && (
              <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-6 h-6 rounded-lg bg-[#FEF3F2] flex items-center justify-center">
                    <XCircle size={13} strokeWidth={2} className="text-[#D92D20]" />
                  </div>
                  <h3 className="text-[14px] font-bold text-[#101828]">Not included</h3>
                </div>
                <ul className="space-y-2">
                  {exclusions.map((ex, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-[13px]">
                      <XCircle size={14} className="text-[#F04438] shrink-0 mt-0.5" />
                      <span className="text-[#667085]">{ex}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Pricing ── */}
        {lineItems.length > 0 && (
          <ViewCard icon={IndianRupee} title="Pricing breakdown">
            <div className="overflow-x-auto mt-1">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#F2F4F7]">
                    <th className="text-left py-2.5 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wide">Description</th>
                    <th className="text-right py-2.5 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wide">Qty</th>
                    <th className="text-right py-2.5 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wide">Rate</th>
                    {gstType !== 'EXEMPT' && (
                      <th className="text-right py-2.5 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wide">GST</th>
                    )}
                    <th className="text-right py-2.5 text-[11px] font-bold text-[#98A2B3] uppercase tracking-wide">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {lineItems.map((item, idx) => {
                    const lineTotal = item.qty * item.rate
                    const lineGst   = gstType !== 'EXEMPT' ? lineTotal * (item.gstRate ?? 0) / 100 : 0
                    return (
                      <tr key={idx} className="border-b border-[#F9FAFB]">
                        <td className="py-3 text-[#344054] font-medium">{item.description}</td>
                        <td className="py-3 text-right text-[#667085]">{item.qty}</td>
                        <td className="py-3 text-right text-[#667085]">₹{fmt(item.rate)}</td>
                        {gstType !== 'EXEMPT' && (
                          <td className="py-3 text-right text-[#667085]">{item.gstRate ?? 0}%</td>
                        )}
                        <td className="py-3 text-right font-semibold text-[#101828]">₹{fmt(lineTotal + lineGst)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="mt-4 border-t border-[#EAECF0] pt-4 space-y-2">
              <div className="flex justify-between text-[12px] text-[#667085]">
                <span>Subtotal</span>
                <span className="font-medium text-[#344054]">₹{fmt(subtotal)}</span>
              </div>
              {gstAmount > 0 && (
                <div className="flex justify-between text-[12px] text-[#667085]">
                  <span>{GST_TYPE_LABELS[gstType]}</span>
                  <span className="font-medium text-[#344054]">₹{fmt(gstAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#EAECF0]">
                <span className="text-[14px] font-bold text-[#101828]">Total</span>
                <span className="flex items-center gap-0.5 text-[17px] font-extrabold text-[#101828]">
                  <IndianRupee size={12} strokeWidth={3} />
                  {fmt(total)}
                </span>
              </div>
            </div>
            {content.pricingNotes && (
              <p className="mt-4 text-[12px] text-[#667085] bg-[#FAFAFA] rounded-lg p-3 leading-relaxed">
                {content.pricingNotes}
              </p>
            )}
          </ViewCard>
        )}

        {/* ── Payment schedule ── */}
        {paymentSchedule.length > 0 && (
          <ViewCard icon={IndianRupee} title="Payment schedule">
            <div className="space-y-3 mt-1">
              {paymentSchedule.map((ps, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 bg-[#FAFAFA] rounded-xl border border-[#F2F4F7]">
                  <div className="w-7 h-7 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center shrink-0">
                    <span className="text-[10px] font-bold text-[#2563EB]">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#344054]">{ps.milestone}</p>
                    {ps.dueOn && <p className="text-[11px] text-[#98A2B3]">{ps.dueOn}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 text-[15px] font-extrabold text-[#101828] shrink-0">
                    <IndianRupee size={11} strokeWidth={3} />
                    {fmt(ps.amount)}
                  </div>
                </div>
              ))}
            </div>
          </ViewCard>
        )}

        {/* ── Timeline ── */}
        {milestones.length > 0 && (
          <ViewCard icon={Clock} title="Project timeline">
            <div className="space-y-4 mt-1">
              {milestones.map((m, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="flex flex-col items-center shrink-0">
                    <div className="w-7 h-7 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#2563EB]">{idx + 1}</span>
                    </div>
                    {idx < milestones.length - 1 && <div className="w-px flex-1 bg-[#EAECF0] mt-1 min-h-[24px]" />}
                  </div>
                  <div className="pb-4">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-bold text-[#101828]">{m.title}</p>
                      {m.duration && (
                        <span className="text-[11px] font-medium text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full">{m.duration}</span>
                      )}
                    </div>
                    {m.description && (
                      <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">{m.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ViewCard>
        )}

        {/* ── Case Studies ── */}
        {caseStudies.length > 0 && (
          <ViewCard icon={Briefcase} title="Our work">
            <div className="space-y-4 mt-1">
              {caseStudies.map((cs, idx) => (
                <div key={idx} className="p-4 bg-[#FAFAFA] rounded-xl border border-[#F2F4F7]">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[14px] font-bold text-[#101828]">{cs.title}</p>
                    {cs.link && (
                      <a href={cs.link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[11px] text-[#2563EB] hover:underline shrink-0">
                        View project <ExternalLink size={10} />
                      </a>
                    )}
                  </div>
                  <p className="text-[13px] text-[#667085] mt-1 leading-relaxed">{cs.description}</p>
                  {cs.result && (
                    <div className="flex items-center gap-1.5 mt-2 text-[12px] font-semibold text-[#027A48] bg-[#ECFDF3] px-2.5 py-1 rounded-lg w-fit">
                      <ArrowRight size={11} strokeWidth={2.5} />
                      {cs.result}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ViewCard>
        )}

        {/* ── Terms ── */}
        {content.terms && (
          <ViewCard icon={ScrollText} title="Terms & conditions">
            <p className="text-[13px] text-[#667085] leading-relaxed whitespace-pre-wrap mt-1">{content.terms}</p>
          </ViewCard>
        )}

        {/* ── FAQ ── */}
        {faq.length > 0 && (
          <ViewCard icon={MessageSquare} title="Frequently asked questions">
            <div className="space-y-2 mt-1">
              {faq.map((item, idx) => (
                <FaqAccordion key={idx} question={item.question} answer={item.answer} />
              ))}
            </div>
          </ViewCard>
        )}

        {/* ── Next Steps ── */}
        {content.nextSteps && (
          <div className="bg-[#2563EB] rounded-2xl p-8 text-center">
            <p className="text-[12px] font-semibold text-blue-200 uppercase tracking-widest mb-2">Ready to move forward?</p>
            <p className="text-[15px] font-medium text-white leading-relaxed">{content.nextSteps}</p>
          </div>
        )}

        {/* ── Accept / Decline ── */}
        {canAct && (
          <div className="print:hidden bg-white rounded-2xl border-2 border-[#2563EB] shadow-sm p-8">
            <h2 className="text-[17px] font-extrabold text-[#101828] mb-1">Ready to move forward?</h2>
            <p className="text-[13px] text-[#667085] mb-6">Accept this proposal to proceed, or decline if it doesn't match your needs.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => acceptMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 h-12 rounded-xl bg-[#0D1117] text-white hover:bg-[#1a1d2e] transition-colors disabled:opacity-60"
              >
                {acceptMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ThumbsUp size={16} strokeWidth={2} />
                    Accept proposal
                  </>
                )}
              </button>
              <button
                onClick={() => declineMutation.mutate()}
                disabled={acceptMutation.isPending || declineMutation.isPending}
                className="sm:w-auto flex items-center justify-center gap-2 h-12 px-6 rounded-xl border border-[#EAECF0] text-[14px] font-semibold text-[#667085] hover:bg-[#F9FAFB] hover:text-[#344054] transition-colors disabled:opacity-60"
              >
                {declineMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-[#667085] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <ThumbsDown size={15} strokeWidth={2} />
                    Decline
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Post-action confirmation */}
        {actionDone === 'declined' && (
          <div className="print:hidden bg-[#FEF3F2] border border-[#FECDCA] rounded-2xl p-6 text-center">
            <XCircle size={28} className="mx-auto text-[#D92D20] mb-2" />
            <p className="text-[15px] font-bold text-[#D92D20]">Proposal declined</p>
            <p className="text-[13px] text-[#912018] mt-1">The sender has been notified.</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4 text-[11px] text-[#D0D5DD]">
          Sent by {senderName} · {proposal.user.email} · Powered by Rupway
        </div>
      </div>
    </div>
  )
}

function ViewCard({ icon: Icon, title, children }: {
  icon: typeof FileText; title: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-8">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-[#F5F6FA] flex items-center justify-center">
          <Icon size={14} strokeWidth={2} className="text-[#667085]" />
        </div>
        <h2 className="text-[15px] font-bold text-[#101828]">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function FaqAccordion({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-[#EAECF0] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-[#FAFAFA] transition-colors"
      >
        <span className="text-[13px] font-semibold text-[#344054]">{question}</span>
        <ChevronDown
          size={15}
          strokeWidth={2}
          className={cn('text-[#98A2B3] shrink-0 transition-transform', open && 'rotate-180')}
        />
      </button>
      {open && (
        <div className="px-4 pb-4 border-t border-[#F2F4F7]">
          <p className="text-[13px] text-[#667085] leading-relaxed pt-3">{answer}</p>
        </div>
      )}
    </div>
  )
}
