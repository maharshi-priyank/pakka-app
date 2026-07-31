import { useState } from 'react'
import { RotateCcw, Check, AlertCircle } from 'lucide-react'
import AIIcon from './AIIcon'
import { cn } from '@/lib/utils'
import type { ExtractedLead } from '../hooks/useAIExtract'
import type { ContactStage } from '@/features/contacts/schemas/contact.schema'
import { CONTACT_STAGES, CONTACT_SOURCES, CONTACT_CURRENCIES, STAGE_LABELS, type ContactCurrency } from '@/features/contacts/schemas/contact.schema'
import { ALL_COUNTRIES, getCountryDefaults } from '@/lib/countryDefaults'
import { currencySymbol } from '@/lib/currency-symbols'

const SOURCE_OPTIONS = CONTACT_SOURCES as readonly string[]

export interface EditableContact {
  name:      string
  email:     string
  phone:     string
  company:   string
  service:   string
  budget:    string
  source:    string
  notes:     string
  stage:     ContactStage
  country:   string
  currency:  ContactCurrency | ''
}

interface Props {
  extracted:  ExtractedLead
  onConfirm:  (data: EditableContact) => void
  onReset:    () => void
  isCreating: boolean
}

function ConfidencePip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
  const color = value >= 0.8 ? 'bg-[#12B76A]' : value >= 0.5 ? 'bg-[#F79009]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]'
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', color)} title={`${Math.round(value * 100)}% confidence`} />
  )
}

const inputCls = cn(
  'px-3 py-2 text-[13px] text-[#344054] dark:text-[#ECEEF3] bg-[#FAFAFA] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg',
  'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:bg-white dark:focus:bg-[#1A1B23]',
  'transition-all placeholder:text-[#C9CDD4] dark:placeholder:text-[#545C74]',
)

function Field({
  label, value, onChange, pip, type = 'text', as,
}: {
  label:    string
  value:    string
  onChange: (v: string) => void
  pip:      number | null
  type?:    string
  as?:      'textarea'
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <label className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">{label}</label>
        <ConfidencePip value={pip} />
      </div>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className={cn(inputCls, 'resize-none')}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inputCls}
        />
      )}
    </div>
  )
}

export default function ContactReviewPanel({ extracted, onConfirm, onReset, isCreating }: Props) {
  const [form, setForm] = useState<EditableContact>({
    name:    extracted.name    ?? '',
    email:   extracted.email   ?? '',
    phone:   extracted.phone   ?? '',
    company: extracted.company ?? '',
    service: extracted.service ?? '',
    budget:  extracted.budget  != null ? String(extracted.budget) : '',
    source:  extracted.source  ?? 'other',
    notes:   extracted.notes   ?? '',
    stage:   'ENQUIRY',
    // R2/R6/KTD8: no default — extraction has no reliable signal for this,
    // so it's forced onto the freelancer during review, same as AddContactModal.
    country:  '',
    currency: '',
  })

  const set = (key: keyof EditableContact) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  function handleCountryChange(code: string) {
    setForm(f => {
      const suggested = getCountryDefaults(code).currency
      const currency = ((CONTACT_CURRENCIES as readonly string[]).includes(suggested) ? suggested : '') as ContactCurrency | ''
      return { ...f, country: code, currency }
    })
  }

  const confidence = extracted.confidence
  const confidenceLabel =
    confidence >= 0.8 ? 'High confidence' :
    confidence >= 0.5 ? 'Medium confidence' :
    'Low confidence — review carefully'
  const confidenceColor =
    confidence >= 0.8 ? 'text-[#027A48] bg-[#ECFDF3] dark:bg-emerald-950/40 dark:text-[#34D399]' :
    confidence >= 0.5 ? 'text-[#B54708] bg-[#FFFAEB] dark:bg-amber-950/30 dark:text-amber-400' :
    'text-[#B42318] bg-[#FEF3F2] dark:bg-red-950/40 dark:text-red-400'

  const pip = (val: string | null) =>
    val ? extracted.confidence : (extracted.confidence > 0.7 ? 0.4 : null)

  return (
    <div className="px-6 py-5">
      {/* Confidence badge */}
      <div className="flex items-center justify-between mb-5">
        <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full', confidenceColor)}>
          {confidence >= 0.8 ? <Check size={11} strokeWidth={2.5} /> : <AlertCircle size={11} strokeWidth={2.5} />}
          {confidenceLabel}
        </span>
        <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
          All fields are editable
        </span>
      </div>

      {/* Form grid */}
      <div className="grid grid-cols-2 gap-x-5 gap-y-4">
        <div className="col-span-2 sm:col-span-1">
          <Field label="Name *"   value={form.name}    onChange={set('name')}    pip={pip(extracted.name)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Email"    value={form.email}   onChange={set('email')}   pip={pip(extracted.email)}   type="email" />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Phone"    value={form.phone}   onChange={set('phone')}   pip={pip(extracted.phone)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Company"  value={form.company} onChange={set('company')} pip={pip(extracted.company)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label="Service"  value={form.service} onChange={set('service')} pip={pip(extracted.service)} />
        </div>
        <div className="col-span-2 sm:col-span-1">
          <Field label={`Deal Value (${currencySymbol(form.currency)})`} value={form.budget} onChange={set('budget')} pip={pip(extracted.budget ? String(extracted.budget) : null)} type="number" />
        </div>

        {/* Country select */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Country *</label>
          <select
            value={form.country}
            onChange={e => handleCountryChange(e.target.value)}
            className={inputCls}
          >
            <option value="">Select country</option>
            {ALL_COUNTRIES.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Currency select */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Currency *</label>
          <select
            value={form.currency}
            onChange={e => set('currency')(e.target.value)}
            className={inputCls}
          >
            <option value="">Select currency</option>
            {CONTACT_CURRENCIES.map(code => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </div>

        {/* Source select */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Source</label>
            <ConfidencePip value={pip(extracted.source)} />
          </div>
          <select
            value={form.source}
            onChange={e => set('source')(e.target.value)}
            className={cn(inputCls, 'capitalize')}
          >
            {SOURCE_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1).replace('_', ' ')}</option>
            ))}
          </select>
        </div>

        {/* Stage select */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Stage</label>
          <select
            value={form.stage}
            onChange={e => set('stage')(e.target.value)}
            className={inputCls}
          >
            {CONTACT_STAGES.map(s => (
              <option key={s} value={s}>{STAGE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <Field label="Notes" value={form.notes} onChange={set('notes')} pip={pip(extracted.notes)} as="textarea" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-[13px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] font-medium transition-colors"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Try again
        </button>
        <button
          onClick={() => onConfirm(form)}
          disabled={!form.name.trim() || !form.country || !form.currency || isCreating}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all',
            form.name.trim() && form.country && form.currency && !isCreating
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm'
              : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed',
          )}
        >
          <AIIcon size={13} />
          {isCreating ? 'Creating…' : 'Create Contact'}
        </button>
      </div>
    </div>
  )
}
