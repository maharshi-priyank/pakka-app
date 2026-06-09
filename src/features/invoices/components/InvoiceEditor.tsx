import { useState, useEffect, useRef } from 'react'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Plus, Trash2, Send, CheckCircle2,
  FileText, Save, Copy, Check, ExternalLink, RefreshCw, Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { invoiceFormSchema, RECURRENCE_CYCLE_LABELS, type InvoiceFormData, type Invoice } from '../schemas/invoice.schema'
import { useCreateInvoice, useUpdateInvoice, useSendInvoice, useMarkPaid } from '../hooks/useInvoices'
import RecordPaymentModal from './RecordPaymentModal'
import InvoiceFilesPanel from './InvoiceFilesPanel'
import FieldInfoPopover from '@/features/ai/components/FieldInfoPopover'
import { useProjects } from '@/features/projects/hooks/useProjects'
import { useClients } from '@/features/clients/hooks/useClients'
import { useProfile } from '@/features/settings/hooks/useProfile'

const GST_RATE_OPTIONS = [0, 5, 12, 18, 28]

interface Props {
  invoice?:           Invoice
  defaultContractId?: string
  defaultClientId?:   string
  defaultProjectId?:  string
  onSaved: (invoice: Invoice) => void
  onDiscard: () => void
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function InvoiceEditor({ invoice, defaultContractId, defaultClientId, defaultProjectId, onSaved, onDiscard }: Props) {
  const isNew     = !invoice
  const isPaid    = invoice?.status === 'PAID'
  const canEdit   = !isPaid
  const [saved,      setSaved]     = useState<Invoice | null>(null)
  const [viewUrl,    setViewUrl]   = useState<string | null>(null)
  const [copied,     setCopied]    = useState(false)
  const [projectId,  setProjectId] = useState(invoice?.projectId ?? defaultProjectId ?? '')

  const displayInvoice = saved ?? invoice

  const { data: profile } = useProfile()

  const {
    register, control, handleSubmit, watch, setValue,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: invoice
      ? {
          clientId:          invoice.clientId   ?? undefined,
          contractId:        invoice.contractId ?? undefined,
          lineItems:         invoice.lineItems.length > 0
            ? invoice.lineItems
            : [{ description: '', qty: 1, rate: 0, gstRate: 18 }],
          gstType:           invoice.gstType,
          tdsRate:           invoice.tdsRate ?? undefined,
          dueDate:           invoice.dueDate ? invoice.dueDate.slice(0, 10) : undefined,
          isRecurring:       invoice.isRecurring,
          recurrenceCycle:   invoice.recurrenceCycle    ?? undefined,
          recurrenceDay:     invoice.recurrenceDay      ?? undefined,
          recurrenceEndDate: invoice.recurrenceEndDate  ? invoice.recurrenceEndDate.slice(0, 10) : undefined,
          currency:          invoice.currency  ?? 'INR',
          lutNumber:         invoice.lutNumber ?? (profile?.defaultLutNumber ?? ''),
        }
      : {
          contractId: defaultContractId,
          clientId:   defaultClientId,
          lineItems:  [{ description: '', qty: 1, rate: 0, gstRate: 18 }],
          gstType:    'IGST',
          currency:   'INR',
          lutNumber:  profile?.defaultLutNumber ?? '',
        },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' })

  const currency       = watch('currency')
  const isExport       = currency !== 'INR'

  const CURRENCY_SYMBOLS: Record<string, string> = {
    INR: '₹', USD: '$', EUR: '€', GBP: '£', AED: 'AED ',
  }
  const currencySymbol = CURRENCY_SYMBOLS[currency] ?? currency

  const lineItems       = watch('lineItems')
  const gstType         = watch('gstType')
  const tdsRate         = watch('tdsRate')
  const isRecurring     = watch('isRecurring')
  const recurrenceCycle = watch('recurrenceCycle')
  const watchedClientId = watch('clientId') ?? ''

  const { data: clientsData } = useClients()
  const { data: projectsData } = useProjects({ clientId: watchedClientId || undefined, limit: 100 })

  const clientSynced = useRef(false)
  useEffect(() => {
    if (clientSynced.current || !clientsData?.clients?.length || !defaultClientId) return
    if (clientsData.clients.some(c => c.id === defaultClientId)) {
      setValue('clientId', defaultClientId)
      clientSynced.current = true
    }
  }, [clientsData?.clients?.length])

  const subtotal  = lineItems.reduce((s, item) => s + (Number(item.qty) * Number(item.rate)), 0)
  const gstAmount = gstType === 'EXEMPT'
    ? 0
    : lineItems.reduce((s, item) => s + (Number(item.qty) * Number(item.rate) * Number(item.gstRate)) / 100, 0)
  const tdsAmount = tdsRate ? (subtotal * Number(tdsRate)) / 100 : 0
  const total     = subtotal + gstAmount - tdsAmount

  const createMutation = useCreateInvoice()
  const updateMutation = useUpdateInvoice(invoice?.id ?? '')
  const sendMutation   = useSendInvoice()
  const paidMutation   = useMarkPaid()

  const [showRecordPayment, setShowRecordPayment] = useState(false)

  async function onSubmit(data: InvoiceFormData) {
    const payload = { ...data, projectId: projectId || null } as InvoiceFormData & { projectId: string | null }
    const result = isNew
      ? await createMutation.mutateAsync(payload)
      : await updateMutation.mutateAsync(payload)
    setSaved(result)
    onSaved(result)
  }

  async function handleSend() {
    const target = saved ?? invoice
    if (!target) return
    const result = await sendMutation.mutateAsync(target.id)
    setSaved(result.invoice)
    setViewUrl(result.viewUrl)
  }

  function copyLink() {
    if (!viewUrl) return
    navigator.clipboard.writeText(viewUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleMarkPaid() {
    const target = saved ?? invoice
    if (!target) return
    const result = await paidMutation.mutateAsync(target.id)
    setSaved(result)
  }

  const isSaving = createMutation.isPending || updateMutation.isPending

  return (
    <>
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-6 space-y-5">

          {/* Paid banner */}
          {isPaid && (
            <div className="bg-[#ECFDF3] border border-[#BBF7D0] rounded-xl p-4 flex items-center gap-3">
              <CheckCircle2 size={18} className="text-[#027A48] shrink-0" />
              <div>
                <p className="text-[13px] font-bold text-[#027A48]">Invoice paid</p>
                {displayInvoice?.paidAt && (
                  <p className="text-[12px] text-[#065F46]">
                    Paid on {new Date(displayInvoice.paidAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Invoice number */}
          {displayInvoice && (
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-[#2563EB]" />
              <span className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">{displayInvoice.invoiceNumber}</span>
              <span className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full ml-1',
                displayInvoice.status === 'PAID'    ? 'bg-[#ECFDF3] text-[#027A48]' :
                displayInvoice.status === 'OVERDUE' ? 'bg-[#FEF3F2] text-[#D92D20]' :
                displayInvoice.status === 'SENT'    ? 'bg-[#EFF6FF] text-[#2563EB]' :
                'bg-[#F2F4F7] text-[#667085]',
              )}>
                {displayInvoice.status}
              </span>
            </div>
          )}

          {/* Client selector */}
          {isNew && (
            <div>
              <label className="form-label">Client *</label>
              <select
                {...register('clientId')}
                disabled={!canEdit}
                className="form-input w-full max-w-xs"
              >
                <option value="">— Select a client —</option>
                {(clientsData?.clients ?? []).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}{c.company ? ` · ${c.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Line items */}
          <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
              <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Line items</h3>
            </div>

            <div className="overflow-x-auto">
            <div className="px-5 py-4 space-y-3 min-w-[480px]">
              {/* Column headers */}
              <div className="grid grid-cols-[72px_1fr_80px_100px_80px_32px] gap-2 text-xs font-medium text-[#667085] uppercase tracking-wide px-1">
                <span>SAC/HSN</span>
                <span>Description</span>
                <span className="text-right">Qty</span>
                <span className="text-right">Rate ({currencySymbol})</span>
                <span className="text-right flex items-center justify-end gap-1">GST % <FieldInfoPopover field="gstRate" /></span>
                <span />
              </div>

              {fields.map((field, idx) => {
                const lineTotal = (Number(lineItems[idx]?.qty) || 0) * (Number(lineItems[idx]?.rate) || 0)
                const lineGst   = gstType !== 'EXEMPT'
                  ? (lineTotal * (Number(lineItems[idx]?.gstRate) || 0)) / 100
                  : 0

                return (
                  <div key={field.id} className="space-y-1 rounded-lg hover:bg-[#F9FAFB] transition-colors duration-150 -mx-1 px-1 py-0.5">
                    <div className="grid grid-cols-[72px_1fr_80px_100px_80px_32px] gap-2 items-start">
                      <input
                        {...register(`lineItems.${idx}.hsnSac`)}
                        disabled={!canEdit}
                        placeholder="SAC"
                        maxLength={8}
                        className="form-input text-[12px] font-mono text-center"
                      />
                      <input
                        {...register(`lineItems.${idx}.description`)}
                        disabled={!canEdit}
                        placeholder="Service description"
                        className="form-input text-[13px]"
                      />
                      <input
                        {...register(`lineItems.${idx}.qty`, { valueAsNumber: true })}
                        disabled={!canEdit}
                        type="number" min="0" step="0.5"
                        className="form-input text-[13px] text-right"
                      />
                      <input
                        {...register(`lineItems.${idx}.rate`, { valueAsNumber: true })}
                        disabled={!canEdit}
                        type="number" min="0"
                        className="form-input text-[13px] text-right"
                      />
                      <select
                        {...register(`lineItems.${idx}.gstRate`, { valueAsNumber: true })}
                        disabled={!canEdit || gstType === 'EXEMPT'}
                        className="form-input text-[13px] text-right pr-1"
                      >
                        {GST_RATE_OPTIONS.map(r => (
                          <option key={r} value={r}>{r}%</option>
                        ))}
                      </select>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          disabled={fields.length === 1}
                          className="w-8 h-9 flex items-center justify-center text-[#D0D5DD] hover:text-[#F04438] transition-colors disabled:opacity-30"
                        >
                          <Trash2 size={13} strokeWidth={2} />
                        </button>
                      )}
                    </div>
                    {(lineTotal > 0) && (
                      <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] text-right pr-10">
                        {currencySymbol}{fmt(lineTotal)}
                        {lineGst > 0 && !isExport && <span className="ml-1 text-[#667085] dark:text-[#8B92A8]">+ {currencySymbol}{fmt(lineGst)} GST</span>}
                        {isExport && <span className="ml-1 text-[#667085] dark:text-[#8B92A8]">+ Nil GST</span>}
                        {' = '}
                        <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{currencySymbol}{fmt(lineTotal + (isExport ? 0 : lineGst))}</span>
                      </p>
                    )}
                    {errors.lineItems?.[idx]?.description && (
                      <p className="form-error">{errors.lineItems[idx]?.description?.message}</p>
                    )}
                  </div>
                )
              })}

              {canEdit && (
                <button
                  type="button"
                  onClick={() => append({ description: '', qty: 1, rate: 0, gstRate: 18, hsnSac: profile?.defaultHsnSac ?? '' })}
                  className="flex items-center gap-1.5 text-[12px] text-[#2563EB] font-medium hover:text-[#1D4ED8] transition-colors"
                >
                  <Plus size={13} strokeWidth={2.5} /> Add line item
                </button>
              )}
            </div>
            </div>

            {/* Totals */}
            <div className="bg-[#FAFAFA] dark:bg-[#21222D] border-t border-[#F2F4F7] dark:border-[#26283A] px-5 py-4 space-y-2">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#667085] dark:text-[#8B92A8]">Subtotal</span>
                <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{currencySymbol}{fmt(subtotal)}</span>
              </div>
              {!isExport && gstType !== 'EXEMPT' && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#667085] dark:text-[#8B92A8]">{gstType === 'IGST' ? 'IGST' : 'CGST + SGST'}</span>
                  <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{currencySymbol}{fmt(gstAmount)}</span>
                </div>
              )}
              {isExport && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#667085] dark:text-[#8B92A8]">IGST</span>
                  <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Nil</span>
                </div>
              )}
              {tdsAmount > 0 && (
                <div className="flex justify-between text-[13px]">
                  <span className="text-[#667085] dark:text-[#8B92A8]">TDS ({tdsRate}%)</span>
                  <span className="font-semibold text-[#D92D20]">−{currencySymbol}{fmt(tdsAmount)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t border-[#EAECF0] dark:border-[#3D4258]">
                <span className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Total</span>
                <span className="flex items-center gap-0.5 text-[18px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">
                  <span className="text-[13px] font-bold">{currencySymbol}</span>{fmt(total)}
                </span>
              </div>
            </div>
          </div>

          {/* Project picker */}
          {(projectsData?.projects?.length ?? 0) > 0 && (
            <div>
              <label className="form-label">Project (optional)</label>
              <select
                value={projectId}
                onChange={e => setProjectId(e.target.value)}
                disabled={!canEdit}
                className="form-input w-full max-w-xs"
              >
                <option value="">— No project —</option>
                {(projectsData?.projects ?? []).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Settings row */}
          <div className="grid grid-cols-3 gap-4">
            {/* Currency selector */}
            <div>
              <label className="form-label">Currency</label>
              <Controller
                control={control}
                name="currency"
                render={({ field }) => (
                  <select {...field} disabled={!canEdit} className="form-input w-full">
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — British Pound</option>
                    <option value="AED">AED — UAE Dirham</option>
                  </select>
                )}
              />
            </div>

            {isExport ? (
              <div>
                <label className="form-label">LUT Reference No.</label>
                <input
                  {...register('lutNumber')}
                  disabled={!canEdit}
                  placeholder="AD220522001234H"
                  className="form-input w-full font-mono text-[12px]"
                />
              </div>
            ) : (
              <div>
                <label className="form-label flex items-center gap-1">GST type <FieldInfoPopover field="gstType" /></label>
                <Controller
                  control={control}
                  name="gstType"
                  render={({ field }) => (
                    <select {...field} disabled={!canEdit} className="form-input w-full">
                      <option value="IGST">IGST (inter-state)</option>
                      <option value="CGST_SGST">CGST + SGST (intra-state)</option>
                      <option value="EXEMPT">GST exempt</option>
                    </select>
                  )}
                />
              </div>
            )}

            <div>
              <label className="form-label flex items-center gap-1">TDS rate (%) <FieldInfoPopover field="tdsRate" /></label>
              <input
                {...register('tdsRate', { valueAsNumber: true })}
                disabled={!canEdit}
                type="number" min="0" max="30" step="0.5"
                placeholder="0"
                className="form-input w-full"
              />
            </div>
          </div>

          {/* Due date row (moved out of grid when currency takes a slot) */}
          <div className="max-w-[220px]">
            <label className="form-label">Due date</label>
            <input
              {...register('dueDate')}
              disabled={!canEdit}
              type="date"
              className="form-input w-full"
            />
          </div>

          {/* Export badge */}
          {isExport && (
            <div className="flex items-center gap-2 px-4 py-2.5 bg-[#F0FDF4] dark:bg-[#0D2418] border border-[#BBF7D0] dark:border-[#166534]/40 rounded-lg">
              <span className="text-[12px] font-semibold text-[#027A48] dark:text-[#4ADE80]">
                Export of Services — Zero Rated (LUT)
              </span>
              <span className="text-[11px] text-[#065F46] dark:text-[#86EFAC]">· GST: Nil · IGST: Nil</span>
            </div>
          )}

          {/* Error summary */}
          {errors.lineItems?.root && (
            <p className="form-error">{errors.lineItems.root.message}</p>
          )}

          {/* Recurring invoice */}
          {canEdit && (
            <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
              <div className="px-5 py-4 flex items-center justify-between border-b border-[#F2F4F7] dark:border-[#26283A]">
                <div className="flex items-center gap-2.5">
                  <RefreshCw size={14} className="text-[#2563EB]" />
                  <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Recurring Invoice</h3>
                </div>
                <Controller
                  control={control}
                  name="isRecurring"
                  render={({ field }) => (
                    <button
                      type="button"
                      onClick={() => field.onChange(!field.value)}
                      className={cn(
                        'relative inline-flex h-5 w-9 items-center rounded-full transition-colors shrink-0',
                        field.value ? 'bg-[#2563EB]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
                      )}
                    >
                      <span className={cn(
                        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
                        field.value ? 'translate-x-4' : 'translate-x-0.5',
                      )} />
                    </button>
                  )}
                />
              </div>

              {isRecurring ? (
                <div className="px-5 py-4 space-y-4">
                  <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
                    A new draft invoice will be automatically created on the schedule below.
                  </p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="form-label">Repeat cycle</label>
                      <Controller
                        control={control}
                        name="recurrenceCycle"
                        render={({ field }) => (
                          <select {...field} value={field.value ?? ''} className="form-input w-full">
                            <option value="" disabled>Select cycle…</option>
                            {(Object.entries(RECURRENCE_CYCLE_LABELS) as [string, string][]).map(([val, label]) => (
                              <option key={val} value={val}>{label}</option>
                            ))}
                          </select>
                        )}
                      />
                    </div>
                    {recurrenceCycle !== 'WEEKLY' && (
                      <div>
                        <label className="form-label">Day of month <span className="font-normal text-[#98A2B3]">(1–28)</span></label>
                        <input
                          {...register('recurrenceDay', { valueAsNumber: true })}
                          type="number" min="1" max="28"
                          placeholder="1"
                          className="form-input w-full"
                        />
                      </div>
                    )}
                  </div>
                  <div className="max-w-[220px]">
                    <label className="form-label">End date <span className="font-normal text-[#98A2B3]">(optional)</span></label>
                    <input
                      {...register('recurrenceEndDate')}
                      type="date"
                      className="form-input w-full"
                    />
                  </div>
                </div>
              ) : (
                <div className="px-5 py-3">
                  <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
                    Enable to auto-generate this invoice on a monthly, quarterly, or yearly schedule.
                  </p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {/* Deliverables */}
      {invoice && invoice.status !== 'DRAFT' && (
        <div className="max-w-3xl mx-auto px-6 pb-6 pt-2 w-full">
          <InvoiceFilesPanel invoice={invoice} />
        </div>
      )}

      {/* Action bar */}
      <div className="shrink-0 border-t border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] px-6 py-3 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onDiscard}
          className="btn-secondary text-[13px]"
        >
          {isNew ? 'Discard' : 'Back'}
        </button>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Share link after send */}
          {viewUrl && (
            <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-1.5">
              <span className="text-[11px] text-[#166534] font-medium truncate max-w-[180px]">{viewUrl}</span>
              <button onClick={copyLink} className="text-[#15803D] hover:text-[#166534] shrink-0">
                {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={2} />}
              </button>
              <a href={viewUrl} target="_blank" rel="noopener noreferrer" className="text-[#15803D] shrink-0">
                <ExternalLink size={12} strokeWidth={2} />
              </a>
            </div>
          )}

          {/* Record Payment / TDS */}
          {displayInvoice && displayInvoice.status !== 'PAID' && displayInvoice.status !== 'DRAFT' && (
            <button
              type="button"
              onClick={() => setShowRecordPayment(true)}
              className="btn-secondary text-[13px] text-[#6941C6] border-[#D6BBFB] hover:bg-[#F4F3FF]"
            >
              <span className="flex items-center gap-1.5">
                <Wallet size={13} strokeWidth={2} /> Record Payment / TDS
              </span>
            </button>
          )}

          {/* Mark paid */}
          {displayInvoice && displayInvoice.status !== 'PAID' && displayInvoice.status !== 'DRAFT' && (
            <button
              type="button"
              onClick={handleMarkPaid}
              disabled={paidMutation.isPending}
              className="btn-secondary text-[13px] text-[#027A48] border-[#6CE9A6] hover:bg-[#ECFDF3]"
            >
              {paidMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-[#027A48] border-t-transparent rounded-full animate-spin" />
                  Marking paid…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={13} strokeWidth={2} /> Mark as paid
                </span>
              )}
            </button>
          )}

          {/* Send */}
          {displayInvoice && displayInvoice.status === 'DRAFT' && (
            <button
              type="button"
              onClick={handleSend}
              disabled={sendMutation.isPending}
              className="btn-secondary text-[13px]"
            >
              {sendMutation.isPending ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-[#344054] border-t-transparent rounded-full animate-spin" />
                  Sending…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send size={13} strokeWidth={2} /> Send invoice
                </span>
              )}
            </button>
          )}

          {/* Save */}
          {canEdit && (
            <button
              type="button"
              onClick={handleSubmit(onSubmit)}
              disabled={isSaving}
              className="btn-primary text-[13px]"
            >
              {isSaving ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Save size={13} strokeWidth={2} />
                  {isNew ? 'Create invoice' : 'Save changes'}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>

    {showRecordPayment && displayInvoice && (
      <RecordPaymentModal invoice={displayInvoice} onClose={() => setShowRecordPayment(false)} />
    )}
    </>
  )
}
