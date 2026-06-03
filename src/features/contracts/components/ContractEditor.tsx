import { useState, useCallback } from 'react'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus, Trash2, GripVertical, Save, Send, Check, Copy, ExternalLink,
  FileText, Layers, IndianRupee, ScrollText, User, CheckSquare, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  createContractSchema,
  type CreateContractInput,
  type ContractClause,
} from '../schemas/contract.schema'
import type { Contract, SendContractResponse } from '../schemas/contract.schema'
import { useCreateContract, useUpdateContract, useSendContract } from '../hooks/useContracts'
import { useProjects } from '@/features/projects/hooks/useProjects'

type Tab = 'parties' | 'scope' | 'financials' | 'clauses'

const TABS: { id: Tab; label: string; icon: typeof FileText }[] = [
  { id: 'parties',    label: 'Parties',    icon: User        },
  { id: 'scope',      label: 'Scope',      icon: Layers      },
  { id: 'financials', label: 'Financials', icon: IndianRupee },
  { id: 'clauses',    label: 'Clauses',    icon: ScrollText  },
]

interface Props {
  contract?:          Contract
  defaultProjectId?:  string
  defaultClientId?:   string
  onSaved?:           (contract: Contract) => void
  onDiscard?:         () => void
  onGenerateInvoice?: () => void
}

export default function ContractEditor({ contract, defaultProjectId, defaultClientId, onSaved, onDiscard, onGenerateInvoice }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('parties')
  const [sendResult, setSendResult] = useState<SendContractResponse | null>(null)
  const [copied,     setCopied]     = useState(false)
  const [projectId,  setProjectId]  = useState(contract?.projectId ?? defaultProjectId ?? '')

  const createMutation = useCreateContract()
  const updateMutation = useUpdateContract()
  const sendMutation   = useSendContract()

  const isEdit   = !!contract
  const isSaving = createMutation.isPending || updateMutation.isPending

  const c = (contract?.content ?? {}) as Record<string, unknown>

  const { register, control, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<CreateContractInput>({
    resolver: zodResolver(createContractSchema),
    defaultValues: {
      title:      contract?.title ?? '',
      clientId:   contract?.clientId ?? defaultClientId ?? undefined,
      proposalId: contract?.proposalId ?? undefined,
      content: {
        intro:              (c.intro              as string) ?? 'This agreement is entered into between the service provider ("Agency") and the client ("Client") for the services described below.',
        projectDescription: (c.projectDescription as string) ?? '',
        totalAmount:        (c.totalAmount        as number) ?? undefined,
        gstAmount:          (c.gstAmount          as number) ?? undefined,
        gstType:            (c.gstType            as 'IGST') ?? 'IGST',
        signerName:         (c.signerName         as string) ?? '',
        signerEmail:        (c.signerEmail        as string) ?? contract?.client?.email ?? '',
        signerPhone:        (c.signerPhone        as string) ?? '',
        scopeItems:         (c.scopeItems         as [])     ?? [],
        deliverables:       (c.deliverables       as [])     ?? [],
        exclusions:         (c.exclusions         as string[]) ?? [],
        paymentSchedule:    (c.paymentSchedule    as [])     ?? [],
        clauses:            (c.clauses            as ContractClause[]) ?? [
          { title: 'Payment Terms',      body: '50% advance required before work begins. Remaining 50% due on final delivery prior to handover.' },
          { title: 'Intellectual Property', body: 'All intellectual property rights in the deliverables transfer to the Client upon receipt of full payment.' },
          { title: 'Revisions',          body: 'Two rounds of revisions are included. Additional revisions will be billed at the agreed hourly rate.' },
          { title: 'Confidentiality',    body: 'Both parties agree to keep confidential all non-public information shared during this engagement.' },
          { title: 'Cancellation',       body: 'Cancellation after project kickoff forfeits the advance payment. Work completed to date will be invoiced.' },
        ],
      },
    },
  })

  const scopeArray      = useFieldArray({ control, name: 'content.scopeItems' })
  const deliverablesArr = useFieldArray({ control, name: 'content.deliverables' })
  const paymentArr      = useFieldArray({ control, name: 'content.paymentSchedule' })

  const watchedClientId = watch('clientId') ?? ''
  const { data: projectsData } = useProjects({ clientId: watchedClientId || undefined, limit: 100 })

  const exclusions = (watch('content.exclusions') ?? []) as string[]
  function addExclusion() { setValue('content.exclusions' as never, [...exclusions, ''] as never) }
  function removeExclusion(i: number) { setValue('content.exclusions' as never, exclusions.filter((_, j) => j !== i) as never) }
  const clausesArr      = useFieldArray({ control, name: 'content.clauses' })

  const onSave = useCallback(async (data: CreateContractInput) => {
    const cleaned = {
      ...data,
      content: {
        ...data.content,
        paymentSchedule: data.content?.paymentSchedule?.map(ps => ({
          ...ps, amount: Number(ps.amount),
        })),
        totalAmount: data.content?.totalAmount ? Number(data.content.totalAmount) : undefined,
        gstAmount:   data.content?.gstAmount   ? Number(data.content.gstAmount)   : undefined,
      },
    }
    if (isEdit && contract) {
      const updated = await updateMutation.mutateAsync({ id: contract.id, ...cleaned, projectId: projectId || null })
      onSaved?.(updated)
    } else {
      const created = await createMutation.mutateAsync({ ...cleaned, projectId: projectId || undefined })
      onSaved?.(created)
    }
  }, [isEdit, contract, createMutation, updateMutation, onSaved])

  const onSend = useCallback(async () => {
    if (!contract) return
    const result = await sendMutation.mutateAsync(contract.id)
    setSendResult(result)
  }, [contract, sendMutation])

  const copyLink = useCallback(() => {
    if (!sendResult) return
    navigator.clipboard.writeText(sendResult.signUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [sendResult])

  const canSend = isEdit && (contract?.status === 'DRAFT' || contract?.status === 'SENT')
  const isSigned = isEdit && contract?.status === 'SIGNED'

  return (
    <div className="flex flex-col h-full">

      {/* Tab nav */}
      <div className="flex items-center gap-0.5 px-6 pt-4 border-b border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A]">
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
                  : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
              )}
            >
              <Icon size={13} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.label}
            </button>
          )
        })}
        <div className="flex-1" />
        {isSigned && (
          <div className="flex items-center gap-1.5 bg-[#ECFDF3] text-[#027A48] text-[11px] font-bold px-3 py-1.5 rounded-lg mr-2">
            <Check size={11} strokeWidth={3} /> Signed
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-[#F5F6FA] dark:bg-[#0C0D10]">
        <form id="contract-form" onSubmit={handleSubmit(onSave)} className="max-w-2xl mx-auto px-6 py-6 space-y-5">

          {/* ══ PARTIES ════════════════════════════════════════════════════════ */}
          {activeTab === 'parties' && (
            <>
              <CSection title="Contract details" description="Title and preamble">
                <div className="space-y-4">
                  <div>
                    <label className="form-label">Contract title *</label>
                    <input
                      {...register('title')}
                      className="form-input w-full"
                      placeholder="e.g. Contract — Photography Website for Studio Lens"
                    />
                    {errors.title && <p className="form-error">{errors.title.message}</p>}
                  </div>
                  <div>
                    <label className="form-label">Preamble / Introduction</label>
                    <textarea
                      {...register('content.intro')}
                      rows={3}
                      className="form-input w-full resize-none text-[13px]"
                    />
                  </div>
                </div>
              </CSection>

              <CSection title="Signer details" description="The person who will sign on behalf of the client">
                <div className="space-y-3">
                  <div>
                    <label className="form-label">Signer full name</label>
                    <input
                      {...register('content.signerName')}
                      className="form-input w-full"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Email</label>
                      <input
                        {...register('content.signerEmail')}
                        className="form-input w-full"
                        placeholder="rahul@example.com"
                      />
                    </div>
                    <div>
                      <label className="form-label">Phone (for OTP delivery)</label>
                      <input
                        {...register('content.signerPhone')}
                        className="form-input w-full"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                </div>
              </CSection>

              <CSection title="Project" description="Brief description of the engagement">
                <div className="space-y-3">
                  {(projectsData?.projects?.length ?? 0) > 0 && (
                    <div>
                      <label className="form-label">Link to project (optional)</label>
                      <select
                        value={projectId}
                        onChange={e => setProjectId(e.target.value)}
                        className="form-input w-full"
                      >
                        <option value="">— No project —</option>
                        {(projectsData?.projects ?? []).map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="form-label">Project description</label>
                    <textarea
                      {...register('content.projectDescription')}
                      rows={3}
                      className="form-input w-full resize-none text-[13px]"
                      placeholder="e.g. Design and development of a photography portfolio website including gallery, contact form, and CMS integration."
                    />
                  </div>
                </div>
              </CSection>
            </>
          )}

          {/* ══ SCOPE ══════════════════════════════════════════════════════════ */}
          {activeTab === 'scope' && (
            <>
              <CFieldArray
                title="Scope of work"
                description="What is included in this contract"
                onAdd={() => scopeArray.append({ title: '', description: '' })}
                isEmpty={scopeArray.fields.length === 0}
                emptyText="Add scope items"
              >
                {scopeArray.fields.map((field, idx) => (
                  <div key={field.id} className="card p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <GripVertical size={14} className="text-[#D0D5DD] mt-2.5 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <input
                          {...register(`content.scopeItems.${idx}.title`)}
                          className="form-input w-full"
                          placeholder="Scope item title"
                        />
                        <textarea
                          {...register(`content.scopeItems.${idx}.description`)}
                          rows={2}
                          className="form-input w-full resize-none text-[13px]"
                          placeholder="Description (optional)"
                        />
                      </div>
                      <RemoveBtn onClick={() => scopeArray.remove(idx)} />
                    </div>
                  </div>
                ))}
              </CFieldArray>

              <CFieldArray
                title="Deliverables"
                description="Exactly what the client receives"
                icon={<CheckSquare size={13} className="text-[#667085]" />}
                onAdd={() => deliverablesArr.append({ item: '', format: '' })}
                isEmpty={deliverablesArr.fields.length === 0}
                emptyText="List all deliverables"
              >
                {deliverablesArr.fields.map((field, idx) => (
                  <div key={field.id} className="card p-3 flex items-center gap-2">
                    <CheckSquare size={13} className="text-[#2563EB] shrink-0" />
                    <input
                      {...register(`content.deliverables.${idx}.item`)}
                      className="form-input flex-1 text-[13px]"
                      placeholder="Deliverable"
                    />
                    <input
                      {...register(`content.deliverables.${idx}.format`)}
                      className="form-input w-32 text-[13px]"
                      placeholder="Format"
                    />
                    <RemoveBtn onClick={() => deliverablesArr.remove(idx)} />
                  </div>
                ))}
              </CFieldArray>

              <CFieldArray
                title="Exclusions"
                description="What is NOT included — protects both parties"
                icon={<XCircle size={13} className="text-[#D92D20]" />}
                onAdd={addExclusion}
                isEmpty={exclusions.length === 0}
                emptyText="List exclusions"
              >
                {exclusions.map((_, idx) => (
                  <div key={idx} className="card p-3 flex items-center gap-2">
                    <XCircle size={13} className="text-[#D92D20] shrink-0" />
                    <input
                      {...register(`content.exclusions.${idx}` as never)}
                      className="form-input flex-1 text-[13px]"
                      placeholder="e.g. Content writing / copywriting"
                    />
                    <RemoveBtn onClick={() => removeExclusion(idx)} />
                  </div>
                ))}
              </CFieldArray>
            </>
          )}

          {/* ══ FINANCIALS ═════════════════════════════════════════════════════ */}
          {activeTab === 'financials' && (
            <>
              <CSection title="Contract value">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Total (₹)</label>
                    <input
                      type="number" min="0" step="0.01"
                      {...register('content.totalAmount', { valueAsNumber: true })}
                      className="form-input w-full"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="form-label">GST amount (₹)</label>
                    <input
                      type="number" min="0" step="0.01"
                      {...register('content.gstAmount', { valueAsNumber: true })}
                      className="form-input w-full"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="form-label">GST type</label>
                    <select {...register('content.gstType')} className="form-input w-full">
                      <option value="IGST">IGST</option>
                      <option value="CGST_SGST">CGST + SGST</option>
                      <option value="EXEMPT">Exempt</option>
                    </select>
                  </div>
                </div>
              </CSection>

              <CFieldArray
                title="Payment schedule"
                description="Milestone-linked instalment breakdown"
                icon={<IndianRupee size={13} className="text-[#667085]" />}
                onAdd={() => paymentArr.append({ milestone: '', amount: 0, dueOn: '' })}
                isEmpty={paymentArr.fields.length === 0}
                emptyText="Add payment milestones"
              >
                {paymentArr.fields.map((field, idx) => (
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
                      <RemoveBtn onClick={() => paymentArr.remove(idx)} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] text-[#98A2B3] mb-1 block">Amount (₹)</label>
                        <input
                          type="number" min="0" step="0.01"
                          {...register(`content.paymentSchedule.${idx}.amount`, { valueAsNumber: true })}
                          className="form-input w-full text-[13px]"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-[#98A2B3] mb-1 block">Due on</label>
                        <input
                          {...register(`content.paymentSchedule.${idx}.dueOn`)}
                          className="form-input w-full text-[13px]"
                          placeholder="e.g. Immediately"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </CFieldArray>
            </>
          )}

          {/* ══ CLAUSES ════════════════════════════════════════════════════════ */}
          {activeTab === 'clauses' && (
            <CFieldArray
              title="Contract clauses"
              description="Legal terms — drag to reorder"
              onAdd={() => clausesArr.append({ title: '', body: '' })}
              isEmpty={clausesArr.fields.length === 0}
              emptyText="Add contract clauses"
            >
              {clausesArr.fields.map((field, idx) => (
                <div key={field.id} className="card p-4 space-y-2">
                  <div className="flex items-start gap-2">
                    <GripVertical size={14} className="text-[#D0D5DD] mt-2.5 shrink-0 cursor-grab" />
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-bold text-[#98A2B3]">§{idx + 1}</span>
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        {...register(`content.clauses.${idx}.title`)}
                        className="form-input w-full font-medium"
                        placeholder="Clause title"
                      />
                      <textarea
                        {...register(`content.clauses.${idx}.body`)}
                        rows={3}
                        className="form-input w-full resize-none text-[13px] leading-relaxed"
                        placeholder="Clause text…"
                      />
                    </div>
                    <RemoveBtn onClick={() => clausesArr.remove(idx)} />
                  </div>
                </div>
              ))}
            </CFieldArray>
          )}
        </form>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] flex items-center justify-between gap-3 shrink-0">
        <button type="button" onClick={onDiscard} className="btn-secondary text-[13px]">
          {isDirty ? 'Discard changes' : 'Close'}
        </button>

        <div className="flex items-center gap-2">
          {/* OTP + sign link result */}
          {sendResult && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 bg-[#FFFAEB] border border-[#FEF0C7] rounded-lg px-3 py-1.5">
                <span className="text-[10px] text-[#B54708] font-medium">OTP for client:</span>
                <span className="text-[14px] font-extrabold text-[#B54708] tracking-widest">{sendResult.otp}</span>
              </div>
              <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-1.5">
                <span className="text-[11px] text-[#166534] font-medium truncate max-w-[160px]">{sendResult.signUrl}</span>
                <button onClick={copyLink} className="text-[#15803D] hover:text-[#166534]">
                  {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
                </button>
                <a href={sendResult.signUrl} target="_blank" rel="noopener noreferrer" className="text-[#15803D]">
                  <ExternalLink size={12} strokeWidth={2} />
                </a>
              </div>
            </div>
          )}

          {isSigned && onGenerateInvoice && (
            <button
              type="button"
              onClick={onGenerateInvoice}
              className="btn-secondary flex items-center gap-1.5 text-[13px] text-[#2563EB] border-[#93C5FD] hover:bg-[#EFF6FF]"
            >
              <FileText size={13} strokeWidth={2} />
              Generate Invoice
            </button>
          )}

          {canSend && !isSigned && (
            <button
              type="button"
              onClick={onSend}
              disabled={sendMutation.isPending}
              className="btn-secondary flex items-center gap-1.5 text-[13px]"
            >
              <Send size={13} strokeWidth={2} />
              {sendMutation.isPending ? 'Sending…' : contract?.status === 'SENT' ? 'Resend' : 'Send for signing'}
            </button>
          )}

          <button
            type="submit"
            form="contract-form"
            disabled={isSaving || isSigned}
            className="btn-primary flex items-center gap-1.5 text-[13px]"
          >
            <Save size={13} strokeWidth={2} />
            {isSaving ? 'Saving…' : isEdit ? 'Save changes' : 'Create contract'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CSection({ title, description, children }: {
  title: string; description?: string; children: React.ReactNode
}) {
  return (
    <div className="card p-5 space-y-4">
      <div>
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">{title}</p>
        {description && <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  )
}

function CFieldArray({ title, description, icon, onAdd, isEmpty, emptyText, children }: {
  title: string; description?: string; icon?: React.ReactNode
  onAdd: () => void; isEmpty: boolean; emptyText: string; children: React.ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon && <div className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center">{icon}</div>}
          <div>
            <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">{title}</p>
            {description && <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{description}</p>}
          </div>
        </div>
        <button type="button" onClick={onAdd} className="btn-secondary text-[12px] px-3 h-8 flex items-center gap-1.5">
          <Plus size={12} strokeWidth={2.5} /> Add
        </button>
      </div>
      {isEmpty ? (
        <div className="text-center py-8 border-2 border-dashed border-[#EAECF0] dark:border-[#3D4258] rounded-xl bg-white dark:bg-transparent">
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">{emptyText}</p>
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
