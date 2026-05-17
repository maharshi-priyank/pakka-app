import { useState, useCallback } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus, Trash2, IndianRupee, GripVertical,
  FileText, Layers, DollarSign, Clock, ScrollText,
  Save, Send, Check, Copy, ExternalLink,
  Star, CheckSquare, XCircle, MessageSquare, Briefcase,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createProposalSchema,
  GST_TYPES, GST_TYPE_LABELS, GST_RATES,
  type CreateProposalInput, type LineItem,
} from '../schemas/proposal.schema'
import type { Proposal, ProposalTemplate } from '../schemas/proposal.schema'
import { useCreateProposal, useUpdateProposal, useSendProposal } from '../hooks/useProposals'
import { useLeads } from '@/features/leads/hooks/useLeads'

type Tab = 'cover' | 'scope' | 'pricing' | 'milestones' | 'terms' | 'credibility'

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'cover',       label: 'Cover',       icon: FileText   },
  { id: 'scope',       label: 'Scope',       icon: Layers     },
  { id: 'pricing',     label: 'Pricing',     icon: DollarSign },
  { id: 'milestones',  label: 'Timeline',    icon: Clock      },
  { id: 'terms',       label: 'Terms',       icon: ScrollText },
  { id: 'credibility', label: 'Credibility', icon: Star       },
]

function calcTotals(lineItems: LineItem[], gstType: string) {
  let subtotal = 0
  let gstAmount = 0
  for (const item of lineItems) {
    const lineTotal = (item.qty ?? 0) * (item.rate ?? 0)
    subtotal += lineTotal
    if (gstType !== 'EXEMPT' && item.gstRate) {
      gstAmount += lineTotal * item.gstRate / 100
    }
  }
  return { subtotal, gstAmount, total: subtotal + gstAmount }
}

interface Props {
  proposal?:        Proposal
  defaultLeadId?:   string
  defaultTemplate?: ProposalTemplate
  onSaved?:         (proposal: Proposal) => void
  onDiscard?:       () => void
}

export default function ProposalEditor({ proposal, defaultLeadId, defaultTemplate, onSaved, onDiscard }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('cover')
  const [shareUrl, setShareUrl]   = useState<string | null>(null)
  const [copied,   setCopied]     = useState(false)

  const createMutation = useCreateProposal()
  const updateMutation = useUpdateProposal()
  const sendMutation   = useSendProposal()
  const { data: leadsData } = useLeads({ limit: 100 })

  const isEdit   = !!proposal
  const isSaving = createMutation.isPending || updateMutation.isPending

  const c = (proposal?.content ?? defaultTemplate?.content ?? {}) as Record<string, unknown>

  const { register, control, handleSubmit, watch, formState: { errors, isDirty } } = useForm<CreateProposalInput>({
    resolver: zodResolver(createProposalSchema),
    defaultValues: {
      title:      proposal?.title ?? defaultTemplate?.name ?? '',
      leadId:     proposal?.leadId ?? defaultLeadId ?? undefined,
      clientId:   proposal?.clientId ?? undefined,
      validUntil: proposal?.validUntil ? proposal.validUntil.slice(0, 10) : '',
      content: {
        intro:           (c.intro         as string)  ?? '',
        whyUs:           (c.whyUs         as string)  ?? '',
        nextSteps:       (c.nextSteps     as string)  ?? '',
        scopeItems:      (c.scopeItems    as [])      ?? [],
        deliverables:    (c.deliverables  as [])      ?? [],
        exclusions:      (c.exclusions    as string[]) ?? [],
        lineItems:       (c.lineItems     as [])      ?? [],
        pricingNotes:    (c.pricingNotes  as string)  ?? '',
        gstType:         (c.gstType       as 'IGST')  ?? 'IGST',
        paymentSchedule: (c.paymentSchedule as [])   ?? [],
        milestones:      (c.milestones    as [])      ?? [],
        terms:           (c.terms         as string)  ?? '',
        caseStudies:     (c.caseStudies   as [])      ?? [],
        faq:             (c.faq           as [])      ?? [],
      },
    },
  })

  const scopeArray      = useFieldArray({ control, name: 'content.scopeItems' })
  const lineItemsArray  = useFieldArray({ control, name: 'content.lineItems' })
  const milestonesArray = useFieldArray({ control, name: 'content.milestones' })
  const deliverablesArray    = useFieldArray({ control, name: 'content.deliverables' })
  const exclusionsArray      = useFieldArray({ control, name: 'content.exclusions' })
  const paymentScheduleArray = useFieldArray({ control, name: 'content.paymentSchedule' })
  const caseStudiesArray     = useFieldArray({ control, name: 'content.caseStudies' })
  const faqArray             = useFieldArray({ control, name: 'content.faq' })

  const watchedLineItems = watch('content.lineItems') ?? []
  const watchedGstType   = watch('content.gstType') ?? 'IGST'
  const { subtotal, gstAmount, total } = calcTotals(watchedLineItems as LineItem[], watchedGstType)

  const onSave = useCallback(async (data: CreateProposalInput) => {
    const cleaned = {
      ...data,
      validUntil: data.validUntil || undefined,
      content: {
        ...data.content,
        lineItems: data.content?.lineItems?.map(item => ({
          ...item,
          qty:  Number(item.qty),
          rate: Number(item.rate),
        })),
        paymentSchedule: data.content?.paymentSchedule?.map(ps => ({
          ...ps,
          amount: Number(ps.amount),
        })),
        caseStudies: data.content?.caseStudies?.map(cs => ({
          ...cs,
          link: cs.link || undefined,
        })),
      },
    }

    if (isEdit && proposal) {
      const updated = await updateMutation.mutateAsync({ id: proposal.id, ...cleaned })
      onSaved?.(updated)
    } else {
      const created = await createMutation.mutateAsync(cleaned)
      onSaved?.(created)
    }
  }, [isEdit, proposal, createMutation, updateMutation, onSaved])

  const onSend = useCallback(async () => {
    if (!proposal) return
    const result = await sendMutation.mutateAsync(proposal.id)
    setShareUrl(result.shareUrl)
  }, [proposal, sendMutation])

  const copyLink = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [shareUrl])

  const canSend = isEdit && proposal?.status === 'DRAFT'
  const isSent  = isEdit && (proposal?.status === 'SENT' || proposal?.status === 'OPENED' || proposal?.status === 'ACCEPTED')

  return (
    <div className="flex flex-col h-full">

      {/* ── Tab nav ── */}
      <div className="flex items-center gap-0.5 px-6 pt-4 border-b border-[#EAECF0] bg-white overflow-x-auto">
        {TABS.map(tab => {
          const Icon     = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 px-3.5 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
                isActive
                  ? 'border-[#2563EB] text-[#2563EB]'
                  : 'border-transparent text-[#667085] hover:text-[#344054]',
              )}
            >
              <Icon size={13} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.label}
            </button>
          )
        })}

        <div className="flex-1" />

        {watchedLineItems.length > 0 && (
          <div className="flex items-center gap-1 text-[12px] text-[#667085] bg-[#F9FAFB] border border-[#EAECF0] rounded-lg px-3 py-1.5 mr-2 shrink-0">
            <IndianRupee size={10} strokeWidth={2.5} />
            <span className="font-extrabold text-[#101828]">
              {total.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </span>
            {gstAmount > 0 && (
              <span className="text-[#98A2B3]">+ GST {gstAmount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</span>
            )}
          </div>
        )}
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 overflow-y-auto bg-[#F5F6FA]">
        <form id="proposal-form" onSubmit={handleSubmit(onSave)} className="max-w-2xl mx-auto px-6 py-6 space-y-5">

          {/* ══ COVER ══════════════════════════════════════════════════════════ */}
          {activeTab === 'cover' && (
            <>
              <Section title="Basic info" description="Proposal title, lead, and validity">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Lead *</label>
                    <select {...register('leadId')} className="form-input w-full">
                      <option value="">— Select a lead —</option>
                      {(leadsData?.items ?? []).map(l => (
                        <option key={l.id} value={l.id}>
                          {l.name}{l.company ? ` · ${l.company}` : ''}
                        </option>
                      ))}
                    </select>
                    {errors.leadId && <p className="form-error">{errors.leadId.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Proposal title *</label>
                    <input
                      {...register('title')}
                      className="form-input w-full"
                      placeholder="e.g. Brand Identity Design for Acme Corp"
                    />
                    {errors.title && <p className="form-error">{errors.title.message}</p>}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Valid until</label>
                      <input type="date" {...register('validUntil')} className="form-input w-full" />
                    </div>
                    <div>
                      <label className="form-label">GST type</label>
                      <select {...register('content.gstType')} className="form-input w-full">
                        {GST_TYPES.map(t => <option key={t} value={t}>{GST_TYPE_LABELS[t]}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="Introduction" description="Opening paragraph — why this project matters">
                <textarea
                  {...register('content.intro')}
                  rows={5}
                  className="form-input w-full resize-none"
                  placeholder="A brief intro about the project, what you'll deliver, and why you're the right choice…"
                />
              </Section>

              <Section title="Why us?" description="Your credentials and what makes you different">
                <textarea
                  {...register('content.whyUs')}
                  rows={4}
                  className="form-input w-full resize-none"
                  placeholder={`e.g.\n• 5+ years building websites for photographers and creative studios\n• All projects delivered on time — 100% track record\n• Dedicated point of contact throughout the project`}
                />
              </Section>

              <Section title="Next steps" description="Clear call to action — what the client should do after reading">
                <textarea
                  {...register('content.nextSteps')}
                  rows={3}
                  className="form-input w-full resize-none"
                  placeholder={`e.g. Ready to proceed? Reply to this proposal or call us at +91-XXXXX to confirm, and we'll send you the advance invoice to kick things off.`}
                />
              </Section>
            </>
          )}

          {/* ══ SCOPE ══════════════════════════════════════════════════════════ */}
          {activeTab === 'scope' && (
            <>
              <FieldArraySection
                title="Scope of work"
                description="What's included in this engagement"
                icon={<Layers size={13} className="text-[#667085]" />}
                onAdd={() => scopeArray.append({ title: '', description: '' })}
                isEmpty={scopeArray.fields.length === 0}
                emptyText="Add scope items — what you'll actually do"
              >
                {scopeArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-[#D0D5DD] mt-2.5 shrink-0 cursor-grab" />
                      <div className="flex-1 space-y-2">
                        <input
                          {...register(`content.scopeItems.${idx}.title`)}
                          className="form-input w-full"
                          placeholder="e.g. Brand strategy & positioning"
                        />
                        <textarea
                          {...register(`content.scopeItems.${idx}.description`)}
                          rows={2}
                          className="form-input w-full resize-none text-[13px]"
                          placeholder="Brief description (optional)"
                        />
                      </div>
                      <RemoveBtn onClick={() => scopeArray.remove(idx)} />
                    </div>
                  </div>
                ))}
              </FieldArraySection>

              <FieldArraySection
                title="Deliverables"
                description="Exactly what the client receives — files, access, documents"
                icon={<CheckSquare size={13} className="text-[#667085]" />}
                onAdd={() => deliverablesArray.append({ item: '', format: '' })}
                isEmpty={deliverablesArray.fields.length === 0}
                emptyText="List what you'll hand over at the end"
              >
                {deliverablesArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-3 flex items-center gap-2">
                    <CheckSquare size={13} className="text-[#2563EB] shrink-0" />
                    <input
                      {...register(`content.deliverables.${idx}.item`)}
                      className="form-input flex-1 text-[13px]"
                      placeholder="e.g. Final Figma source file"
                    />
                    <input
                      {...register(`content.deliverables.${idx}.format`)}
                      className="form-input w-36 text-[13px]"
                      placeholder="Format (.fig, .pdf…)"
                    />
                    <RemoveBtn onClick={() => deliverablesArray.remove(idx)} />
                  </div>
                ))}
              </FieldArraySection>

              <FieldArraySection
                title="Exclusions"
                description="What is NOT included — prevents scope creep"
                icon={<XCircle size={13} className="text-[#D92D20]" />}
                onAdd={() => exclusionsArray.append('')}
                isEmpty={exclusionsArray.fields.length === 0}
                emptyText="List what's out of scope"
              >
                {exclusionsArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-3 flex items-center gap-2">
                    <XCircle size={13} className="text-[#D92D20] shrink-0" />
                    <input
                      {...register(`content.exclusions.${idx}`)}
                      className="form-input flex-1 text-[13px]"
                      placeholder="e.g. Content writing / copywriting"
                    />
                    <RemoveBtn onClick={() => exclusionsArray.remove(idx)} />
                  </div>
                ))}
              </FieldArraySection>
            </>
          )}

          {/* ══ PRICING ════════════════════════════════════════════════════════ */}
          {activeTab === 'pricing' && (
            <>
              <FieldArraySection
                title="Line items"
                description={watchedGstType === 'CGST_SGST' ? 'CGST + SGST applies' : watchedGstType === 'IGST' ? 'IGST applies' : 'GST exempt'}
                icon={<DollarSign size={13} className="text-[#667085]" />}
                onAdd={() => lineItemsArray.append({ description: '', qty: 1, rate: 0, gstRate: 18 })}
                isEmpty={lineItemsArray.fields.length === 0}
                emptyText="Add your services or deliverables"
              >
                {lineItemsArray.fields.map((field, idx) => {
                  const qty     = Number(watchedLineItems[idx]?.qty  ?? 0)
                  const rate    = Number(watchedLineItems[idx]?.rate ?? 0)
                  const gstRate = watchedLineItems[idx]?.gstRate ?? 0
                  const lineTotal = qty * rate
                  const lineGst   = watchedGstType !== 'EXEMPT' ? lineTotal * Number(gstRate) / 100 : 0

                  return (
                    <div key={field.id} className="card p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          {...register(`content.lineItems.${idx}.description`)}
                          className="form-input flex-1 text-[13px]"
                          placeholder="Description"
                        />
                        <RemoveBtn onClick={() => lineItemsArray.remove(idx)} />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="text-[10px] text-[#98A2B3] mb-1 block">Qty</label>
                          <input
                            type="number" step="0.01" min="0"
                            {...register(`content.lineItems.${idx}.qty`, { valueAsNumber: true })}
                            className="form-input w-full text-[13px]"
                            placeholder="1"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#98A2B3] mb-1 block">Rate (₹)</label>
                          <input
                            type="number" step="0.01" min="0"
                            {...register(`content.lineItems.${idx}.rate`, { valueAsNumber: true })}
                            className="form-input w-full text-[13px]"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#98A2B3] mb-1 block">GST %</label>
                          <Controller
                            control={control}
                            name={`content.lineItems.${idx}.gstRate`}
                            render={({ field: f }) => (
                              <select
                                {...f}
                                value={f.value ?? 18}
                                onChange={e => f.onChange(Number(e.target.value))}
                                disabled={watchedGstType === 'EXEMPT'}
                                className="form-input w-full text-[13px] disabled:opacity-50"
                              >
                                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
                              </select>
                            )}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-3 text-[11px] text-[#667085] pt-1">
                        <span>Line: <span className="font-semibold text-[#344054]">₹{lineTotal.toLocaleString('en-IN')}</span></span>
                        {lineGst > 0 && (
                          <span>+ GST: <span className="font-semibold text-[#344054]">₹{lineGst.toLocaleString('en-IN')}</span></span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* Totals */}
                {lineItemsArray.fields.length > 0 && (
                  <div className="card p-4 bg-[#FAFAFA] space-y-2">
                    <div className="flex justify-between text-[12px] text-[#667085]">
                      <span>Subtotal</span>
                      <span className="font-medium text-[#344054]">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {gstAmount > 0 && (
                      <div className="flex justify-between text-[12px] text-[#667085]">
                        <span>{watchedGstType === 'CGST_SGST' ? 'CGST + SGST' : 'IGST'}</span>
                        <span className="font-medium text-[#344054]">₹{gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-[#EAECF0]">
                      <span className="text-[13px] font-bold text-[#101828]">Total</span>
                      <span className="flex items-center gap-0.5 text-[15px] font-extrabold text-[#101828]">
                        <IndianRupee size={11} strokeWidth={3} />
                        {total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                )}
              </FieldArraySection>

              <Section title="Pricing notes" description="Payment terms, conditions, or caveats">
                <textarea
                  {...register('content.pricingNotes')}
                  rows={3}
                  className="form-input w-full resize-none text-[13px]"
                  placeholder="e.g. 50% upfront before work begins, 50% on delivery…"
                />
              </Section>

              <FieldArraySection
                title="Payment schedule"
                description="Milestone-linked instalment breakdown"
                icon={<IndianRupee size={13} className="text-[#667085]" />}
                onAdd={() => paymentScheduleArray.append({ milestone: '', amount: 0, dueOn: '' })}
                isEmpty={paymentScheduleArray.fields.length === 0}
                emptyText="Break payments into milestone-linked instalments"
              >
                {paymentScheduleArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center shrink-0">
                        <span className="text-[9px] font-bold text-[#2563EB]">{idx + 1}</span>
                      </div>
                      <input
                        {...register(`content.paymentSchedule.${idx}.milestone`)}
                        className="form-input flex-1 text-[13px]"
                        placeholder="e.g. On project kickoff"
                      />
                      <RemoveBtn onClick={() => paymentScheduleArray.remove(idx)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#98A2B3] mb-1 block">Amount (₹)</label>
                        <input
                          type="number" min="0" step="0.01"
                          {...register(`content.paymentSchedule.${idx}.amount`, { valueAsNumber: true })}
                          className="form-input w-full text-[13px]"
                          placeholder="0"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#98A2B3] mb-1 block">Due on</label>
                        <input
                          {...register(`content.paymentSchedule.${idx}.dueOn`)}
                          className="form-input w-full text-[13px]"
                          placeholder="e.g. Immediately / 2 days after sign"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </FieldArraySection>
            </>
          )}

          {/* ══ TIMELINE ═══════════════════════════════════════════════════════ */}
          {activeTab === 'milestones' && (
            <FieldArraySection
              title="Project timeline"
              description="Show your client the project phases and durations"
              icon={<Clock size={13} className="text-[#667085]" />}
              onAdd={() => milestonesArray.append({ title: '', duration: '', description: '' })}
              isEmpty={milestonesArray.fields.length === 0}
              emptyText="Add project phases"
            >
              {milestonesArray.fields.map((field, idx) => (
                <div key={field.id} className="card p-4 flex items-start gap-3">
                  <div className="flex flex-col items-center shrink-0 mt-1">
                    <div className="w-6 h-6 rounded-full bg-[#EFF6FF] border-2 border-[#2563EB] flex items-center justify-center">
                      <span className="text-[10px] font-bold text-[#2563EB]">{idx + 1}</span>
                    </div>
                    {idx < milestonesArray.fields.length - 1 && (
                      <div className="w-px h-4 bg-[#EAECF0] mt-1" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        {...register(`content.milestones.${idx}.title`)}
                        className="form-input text-[13px]"
                        placeholder="Phase title"
                      />
                      <input
                        {...register(`content.milestones.${idx}.duration`)}
                        className="form-input text-[13px]"
                        placeholder="Duration (e.g. 1 week)"
                      />
                    </div>
                    <textarea
                      {...register(`content.milestones.${idx}.description`)}
                      rows={2}
                      className="form-input w-full resize-none text-[13px]"
                      placeholder="What gets delivered in this phase?"
                    />
                  </div>
                  <RemoveBtn onClick={() => milestonesArray.remove(idx)} />
                </div>
              ))}
            </FieldArraySection>
          )}

          {/* ══ TERMS ══════════════════════════════════════════════════════════ */}
          {activeTab === 'terms' && (
            <Section title="Terms & conditions" description="Payment terms, IP ownership, revision policy, cancellation">
              <textarea
                {...register('content.terms')}
                rows={18}
                className="form-input w-full resize-none text-[13px] leading-relaxed"
                placeholder={`1. Payment Terms\n   50% upfront before work begins. Remaining 50% due on final delivery.\n\n2. Revisions\n   Up to 2 rounds of revisions included. Additional revisions billed at ₹2,000/hr.\n\n3. Intellectual Property\n   All rights transfer to the client upon full payment.\n\n4. Cancellation\n   Cancellations after kickoff forfeit the advance payment.`}
              />
            </Section>
          )}

          {/* ══ CREDIBILITY ════════════════════════════════════════════════════ */}
          {activeTab === 'credibility' && (
            <>
              <FieldArraySection
                title="Case studies"
                description="Past projects that show your expertise — with real outcomes"
                icon={<Briefcase size={13} className="text-[#667085]" />}
                onAdd={() => caseStudiesArray.append({ title: '', description: '', result: '', link: '' })}
                isEmpty={caseStudiesArray.fields.length === 0}
                emptyText="Add 1–3 past projects relevant to this client"
              >
                {caseStudiesArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-4 space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          {...register(`content.caseStudies.${idx}.title`)}
                          className="form-input w-full font-medium"
                          placeholder="e.g. E-commerce site for FashionCo"
                        />
                        <textarea
                          {...register(`content.caseStudies.${idx}.description`)}
                          rows={2}
                          className="form-input w-full resize-none text-[13px]"
                          placeholder="Brief description of the project and what you built…"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            {...register(`content.caseStudies.${idx}.result`)}
                            className="form-input text-[13px]"
                            placeholder="Result / outcome (e.g. 3× faster load)"
                          />
                          <input
                            {...register(`content.caseStudies.${idx}.link`)}
                            className="form-input text-[13px]"
                            placeholder="Link (https://…)"
                          />
                        </div>
                      </div>
                      <RemoveBtn onClick={() => caseStudiesArray.remove(idx)} />
                    </div>
                  </div>
                ))}
              </FieldArraySection>

              <FieldArraySection
                title="FAQ"
                description="Pre-empt common objections so the client can say yes faster"
                icon={<MessageSquare size={13} className="text-[#667085]" />}
                onAdd={() => faqArray.append({ question: '', answer: '' })}
                isEmpty={faqArray.fields.length === 0}
                emptyText="Answer questions clients always ask before signing"
              >
                {faqArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 space-y-2">
                        <input
                          {...register(`content.faq.${idx}.question`)}
                          className="form-input w-full font-medium"
                          placeholder="e.g. What if I need more revisions?"
                        />
                        <textarea
                          {...register(`content.faq.${idx}.answer`)}
                          rows={2}
                          className="form-input w-full resize-none text-[13px]"
                          placeholder="Your answer…"
                        />
                      </div>
                      <RemoveBtn onClick={() => faqArray.remove(idx)} />
                    </div>
                  </div>
                ))}
              </FieldArraySection>
            </>
          )}
        </form>
      </div>

      {/* ── Footer actions ── */}
      <div className="px-6 py-4 border-t border-[#EAECF0] bg-white flex items-center justify-between gap-3 shrink-0">
        <button type="button" onClick={onDiscard} className="btn-secondary text-[13px]">
          {isDirty ? 'Discard changes' : 'Close'}
        </button>

        <div className="flex items-center gap-2">
          {shareUrl && (
            <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-1.5">
              <span className="text-[11px] text-[#166534] font-medium truncate max-w-[200px]">{shareUrl}</span>
              <button onClick={copyLink} className="text-[#15803D] hover:text-[#166534]">
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              </button>
              <a href={shareUrl} target="_blank" rel="noopener noreferrer" className="text-[#15803D] hover:text-[#166534]">
                <ExternalLink size={12} strokeWidth={2} />
              </a>
            </div>
          )}

          {canSend && (
            <button
              type="button"
              onClick={onSend}
              disabled={sendMutation.isPending}
              className="btn-secondary flex items-center gap-1.5 text-[13px]"
            >
              <Send size={13} strokeWidth={2} />
              {sendMutation.isPending ? 'Sending…' : 'Send to client'}
            </button>
          )}

          {isSent && !shareUrl && (
            <button
              type="button"
              onClick={onSend}
              disabled={sendMutation.isPending}
              className="btn-secondary flex items-center gap-1.5 text-[13px]"
            >
              <ExternalLink size={13} strokeWidth={2} />
              Get share link
            </button>
          )}

          <button
            type="submit"
            form="proposal-form"
            disabled={isSaving}
            className="btn-primary flex items-center gap-1.5 text-[13px]"
          >
            <Save size={13} strokeWidth={2} />
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create proposal'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Reusable layout helpers ──────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <p className="text-[13px] font-bold text-[#101828]">{title}</p>
        {description && <p className="text-[11.5px] text-[#98A2B3] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function FieldArraySection({ title, description, icon, onAdd, isEmpty, emptyText, children }: {
  title: string; description?: string; icon?: React.ReactNode
  onAdd: () => void; isEmpty: boolean; emptyText: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && (
            <div className="w-6 h-6 rounded-lg bg-[#F5F6FA] flex items-center justify-center">
              {icon}
            </div>
          )}
          <div>
            <p className="text-[13px] font-bold text-[#101828]">{title}</p>
            {description && <p className="text-[11px] text-[#98A2B3]">{description}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="btn-secondary text-[12px] px-3 h-8 flex items-center gap-1.5"
        >
          <Plus size={12} strokeWidth={2.5} /> Add
        </button>
      </div>

      {isEmpty ? (
        <div className="text-center py-8 border-2 border-dashed border-[#EAECF0] rounded-xl bg-white">
          <p className="text-[12px] text-[#98A2B3]">{emptyText}</p>
        </div>
      ) : (
        <div className="space-y-2">{children}</div>
      )}
    </div>
  )
}

function RemoveBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-6 h-6 rounded-lg hover:bg-[#FEF3F2] flex items-center justify-center text-[#D0D5DD] hover:text-[#D92D20] transition-colors shrink-0"
    >
      <Trash2 size={12} strokeWidth={2} />
    </button>
  )
}
