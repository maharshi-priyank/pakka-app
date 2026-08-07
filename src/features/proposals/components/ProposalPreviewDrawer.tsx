import { useNavigate } from 'react-router-dom'
import { User, Briefcase, Calendar, CheckCircle, Clock, FileText, ArrowRight, PenLine } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { currencySymbol } from '@/lib/currency-symbols'
import DocumentPreviewDrawer from '@/components/shared/DocumentPreviewDrawer'
import { useProposal } from '../hooks/useProposals'
import { GST_TYPE_LABELS } from '../schemas/proposal.schema'
import type { GstType } from '../schemas/proposal.schema'

function fmt(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

const STATUS_STYLES: Record<string, string> = {
  DRAFT:    'bg-[#F2F4F7] text-[#344054]',
  SENT:     'bg-[#EFF6FF] text-[#2563EB]',
  OPENED:   'bg-[#FFFAEB] text-[#B54708]',
  ACCEPTED: 'bg-[#ECFDF3] text-[#027A48]',
  DECLINED: 'bg-[#FEF3F2] text-[#B42318]',
  EXPIRED:  'bg-[#FEF3F2] text-[#B42318]',
}

interface Props {
  id: string | null
  onClose: () => void
}

export default function ProposalPreviewDrawer({ id, onClose }: Props) {
  const navigate  = useNavigate()
  const { data: proposal, isLoading } = useProposal(id)

  const open = !!id

  const content       = proposal?.content
  const lineItems     = content?.lineItems     ?? []
  const scopeItems    = content?.scopeItems    ?? []
  const deliverables  = content?.deliverables  ?? []
  const milestones    = content?.milestones    ?? []
  const paySchedule   = content?.paymentSchedule ?? []
  const caseStudies   = content?.caseStudies   ?? []
  const faq           = content?.faq           ?? []
  const gstType       = (content?.gstType ?? 'IGST') as GstType
  const symbol        = currencySymbol(proposal?.currency)

  const subtotal  = lineItems.reduce((s, i) => s + i.qty * i.rate, 0)
  const gstAmount = gstType !== 'EXEMPT'
    ? lineItems.reduce((s, i) => s + (i.qty * i.rate * (i.gstRate ?? 0)) / 100, 0)
    : 0
  const total = subtotal + gstAmount

  const clientName  = (proposal?.client?.name ?? proposal?.contact?.name ?? proposal?.lead?.name) ?? undefined
  const clientCo    = proposal?.client?.company ?? proposal?.contact?.company ?? undefined
  const contractId  = proposal?.contracts?.[0]?.id

  const statusBadge = proposal ? (
    <span className={cn(
      'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
      STATUS_STYLES[proposal.status] ?? 'bg-[#F2F4F7] text-[#344054]',
    )}>
      {proposal.status.charAt(0) + proposal.status.slice(1).toLowerCase()}
    </span>
  ) : undefined

  const metaRow = proposal ? (
    <>
      {clientName && (
        <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
          <User size={11} className="shrink-0" />
          {clientName}{clientCo ? ` · ${clientCo}` : ''}
        </span>
      )}
      {proposal.project && (
        <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
          <Briefcase size={11} className="shrink-0" />
          {proposal.project.name}
        </span>
      )}
      <span className="flex items-center gap-1 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
        <Calendar size={11} className="shrink-0" />
        {formatDate(proposal.createdAt)}
      </span>
    </>
  ) : undefined

  return (
    <DocumentPreviewDrawer
      open={open}
      onClose={onClose}
      onEdit={proposal ? () => { onClose(); navigate(`/proposals/${proposal.id}`) } : undefined}
      onDownload={proposal?.slug ? () => window.open(`/p/${proposal.slug}`, '_blank', 'noreferrer') : undefined}
      title={proposal?.title ?? 'Proposal'}
      statusBadge={statusBadge}
      metaRow={metaRow}
      editLabel="Edit Proposal"
      isLoading={isLoading || (open && !proposal)}
    >
      {proposal && (
        <div className="px-5 py-5 space-y-6">

          {/* Total amount summary */}
          {Number(proposal.totalAmount) > 0 && (
            <div className="bg-[#F8F9FF] dark:bg-[#1A1B2E] border border-[#E0E4FF] dark:border-[#2D3060] rounded-xl p-4">
              <div className="flex items-baseline gap-1">
                <span className="text-[26px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tabular-nums leading-none">
                  {symbol}{fmt(proposal.totalAmount)}
                </span>
              </div>
              {Number(proposal.gstAmount) > 0 && (
                <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
                  incl. GST {symbol}{fmt(proposal.gstAmount)}
                </p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                {proposal.validUntil && (
                  <span className="flex items-center gap-1 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
                    <Clock size={11} /> Valid until {formatDate(proposal.validUntil)}
                  </span>
                )}
                {proposal.acceptedAt && (
                  <span className="flex items-center gap-1 text-[11.5px] text-[#027A48] dark:text-emerald-400">
                    <CheckCircle size={11} /> Accepted {formatDate(proposal.acceptedAt)}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Contract-ready CTA — shown when proposal is accepted and a contract draft exists */}
          {proposal.status === 'ACCEPTED' && contractId && (
            <div className="flex items-center gap-3 p-3.5 bg-[#ECFDF3] dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                <PenLine size={13} className="text-emerald-700 dark:text-emerald-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-semibold text-emerald-800 dark:text-emerald-300 leading-snug">
                  Contract draft ready
                </p>
                <p className="text-[11.5px] text-emerald-700/70 dark:text-emerald-400/70 mt-0.5">
                  Send it to {clientName ?? 'the client'} for signing
                </p>
              </div>
              <button
                type="button"
                onClick={() => { onClose(); navigate(`/contracts/${contractId}`) }}
                className="flex items-center gap-1 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-900 dark:hover:text-emerald-200 shrink-0 transition-colors"
              >
                View contract <ArrowRight size={12} />
              </button>
            </div>
          )}

          {/* Intro */}
          {content?.intro && (
            <Section title="Introduction">
              <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-line">{content.intro}</p>
            </Section>
          )}

          {/* Line items / pricing */}
          {lineItems.length > 0 && (
            <Section title="Pricing">
              <div className="overflow-x-auto -mx-1">
                <table className="w-full min-w-[380px] text-[12.5px]">
                  <thead>
                    <tr className="border-b border-[#F2F4F7] dark:border-[#26283A]">
                      <th className="text-left py-2 pr-3 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide">Description</th>
                      <th className="text-right py-2 px-3 w-12 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Qty</th>
                      <th className="text-right py-2 px-3 w-24 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Rate</th>
                      {gstType !== 'EXEMPT' && (
                        <th className="text-right py-2 px-3 w-14 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">GST</th>
                      )}
                      <th className="text-right py-2 pl-3 w-24 text-[10.5px] font-bold text-[#98A2B3] uppercase tracking-wide whitespace-nowrap">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const lineTotal = item.qty * item.rate
                      const lineGst   = gstType !== 'EXEMPT' ? lineTotal * (item.gstRate ?? 0) / 100 : 0
                      return (
                        <tr key={idx} className="border-b border-[#F9FAFB] dark:border-[#1A1B23]">
                          <td className="py-2.5 pr-3 text-[#344054] dark:text-[#C2C8D8] font-medium leading-snug align-top">{item.description}</td>
                          <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] tabular-nums align-top">{item.qty}</td>
                          <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] whitespace-nowrap tabular-nums align-top">{symbol}{fmt(item.rate)}</td>
                          {gstType !== 'EXEMPT' && (
                            <td className="py-2.5 px-3 text-right text-[#667085] dark:text-[#8B92A8] tabular-nums align-top">{item.gstRate ?? 0}%</td>
                          )}
                          <td className="py-2.5 pl-3 text-right font-semibold text-[#101828] dark:text-[#ECEEF3] whitespace-nowrap tabular-nums align-top">{symbol}{fmt(lineTotal + lineGst)}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 border-t border-[#EAECF0] dark:border-[#26283A] pt-3 space-y-1.5">
                <Row label="Subtotal" value={`${symbol}${fmt(subtotal)}`} />
                {gstAmount > 0 && <Row label={GST_TYPE_LABELS[gstType]} value={`${symbol}${fmt(gstAmount)}`} />}
                <div className="flex items-center justify-between pt-1.5 border-t border-[#EAECF0] dark:border-[#26283A]">
                  <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Total</span>
                  <span className="flex items-center gap-0.5 text-[16px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tabular-nums">
                    {symbol}{fmt(total)}
                  </span>
                </div>
              </div>
              {content?.pricingNotes && (
                <p className="mt-3 text-[11.5px] text-[#667085] dark:text-[#8B92A8] bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg p-3 leading-relaxed">{content.pricingNotes}</p>
              )}
            </Section>
          )}

          {/* Payment schedule */}
          {paySchedule.length > 0 && (
            <Section title="Payment Schedule">
              <div className="space-y-2">
                {paySchedule.map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-[#F2F4F7] dark:border-[#26283A] last:border-0">
                    <div>
                      <p className="text-[12.5px] font-medium text-[#344054] dark:text-[#C2C8D8]">{m.milestone}</p>
                      {m.dueOn && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{m.dueOn}</p>}
                    </div>
                    <span className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] tabular-nums">{symbol}{fmt(m.amount)}</span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Scope items */}
          {scopeItems.length > 0 && (
            <Section title="Scope of Work">
              <div className="space-y-2">
                {scopeItems.map((s, i) => (
                  <div key={i}>
                    <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{s.title}</p>
                    {s.description && <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">{s.description}</p>}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Deliverables */}
          {deliverables.length > 0 && (
            <Section title="Deliverables">
              <ul className="space-y-1">
                {deliverables.map((d, i) => (
                  <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8]">
                    <span className="text-[#3538CD] dark:text-indigo-400 mt-0.5 shrink-0">→</span>
                    <span>{d.item}{d.format ? <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] ml-1.5">({d.format})</span> : null}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {/* Milestones / timeline */}
          {milestones.length > 0 && (
            <Section title="Timeline">
              <div className="space-y-2">
                {milestones.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-2 h-2 rounded-full bg-[#3538CD] dark:bg-indigo-400 mt-1.5 shrink-0" />
                      {i < milestones.length - 1 && <div className="w-px flex-1 bg-[#E4E7EC] dark:bg-[#26283A] mt-1" />}
                    </div>
                    <div className="pb-3">
                      <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{m.title}</p>
                      {m.duration && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{m.duration}</p>}
                      {m.description && <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">{m.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Why us */}
          {content?.whyUs && (
            <Section title="Why Us">
              <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-line">{content.whyUs}</p>
            </Section>
          )}

          {/* Case studies */}
          {caseStudies.length > 0 && (
            <Section title="Case Studies">
              <div className="space-y-3">
                {caseStudies.map((c, i) => (
                  <div key={i} className="bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg p-3">
                    <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{c.title}</p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">{c.description}</p>
                    {c.result && (
                      <p className="text-[12px] text-[#027A48] dark:text-emerald-400 mt-1.5 font-medium">{c.result}</p>
                    )}
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Terms */}
          {content?.terms && (
            <Section title="Terms & Conditions">
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] leading-relaxed whitespace-pre-line">{content.terms}</p>
            </Section>
          )}

          {/* FAQ */}
          {faq.length > 0 && (
            <Section title="FAQ">
              <div className="space-y-3">
                {faq.map((f, i) => (
                  <div key={i}>
                    <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{f.question}</p>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-1 leading-relaxed">{f.answer}</p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Next steps */}
          {content?.nextSteps && (
            <Section title="Next Steps">
              <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-line">{content.nextSteps}</p>
            </Section>
          )}

          {/* No content fallback */}
          {lineItems.length === 0 && scopeItems.length === 0 && !content?.intro && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileText size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mb-3" />
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">No content added yet</p>
            </div>
          )}

        </div>
      )}
    </DocumentPreviewDrawer>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-widest mb-3">{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-[12px] text-[#667085] dark:text-[#8B92A8]">
      <span>{label}</span>
      <span className="font-medium text-[#344054] dark:text-[#C2C8D8] tabular-nums">{value}</span>
    </div>
  )
}
