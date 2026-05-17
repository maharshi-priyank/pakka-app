import { useState } from 'react'
import { RotateCcw, Check, AlertCircle } from 'lucide-react'
import AIIcon from './AIIcon'
import { cn } from '@/lib/utils'
import type { ExtractedLead } from '../hooks/useAIExtract'

const SOURCE_OPTIONS = ['whatsapp', 'email', 'instagram', 'referral', 'website', 'linkedin', 'other']

interface EditableLead {
  name:    string
  email:   string
  phone:   string
  company: string
  service: string
  budget:  string
  source:  string
  notes:   string
}

interface Props {
  extracted:  ExtractedLead
  onConfirm:  (data: EditableLead) => void
  onReset:    () => void
  isCreating: boolean
}

function ConfidencePip({ value }: { value: number | null }) {
  if (value === null) return <span className="text-[11px] text-[#D0D5DD]">—</span>
  const color = value >= 0.8 ? 'bg-[#12B76A]' : value >= 0.5 ? 'bg-[#F79009]' : 'bg-[#D0D5DD]'
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full shrink-0', color)} title={`${Math.round(value * 100)}% confidence`} />
  )
}

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
        <label className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">{label}</label>
        <ConfidencePip value={pip} />
      </div>
      {as === 'textarea' ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          rows={2}
          className={cn(
            'px-3 py-2 text-[13px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
            'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 focus:bg-white',
            'resize-none transition-all',
          )}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className={cn(
            'px-3 py-2 text-[13px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
            'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 focus:bg-white',
            'transition-all',
          )}
        />
      )}
    </div>
  )
}

export default function LeadReviewPanel({ extracted, onConfirm, onReset, isCreating }: Props) {
  const [form, setForm] = useState<EditableLead>({
    name:    extracted.name    ?? '',
    email:   extracted.email   ?? '',
    phone:   extracted.phone   ?? '',
    company: extracted.company ?? '',
    service: extracted.service ?? '',
    budget:  extracted.budget  != null ? String(extracted.budget) : '',
    source:  extracted.source  ?? 'other',
    notes:   extracted.notes   ?? '',
  })

  const set = (key: keyof EditableLead) => (v: string) =>
    setForm(f => ({ ...f, [key]: v }))

  const confidence = extracted.confidence
  const confidenceLabel =
    confidence >= 0.8 ? 'High confidence' :
    confidence >= 0.5 ? 'Medium confidence' :
    'Low confidence — review carefully'
  const confidenceColor =
    confidence >= 0.8 ? 'text-[#027A48] bg-[#ECFDF3]' :
    confidence >= 0.5 ? 'text-[#B54708] bg-[#FFFAEB]' :
    'text-[#B42318] bg-[#FEF3F2]'

  // field-level confidence: approximate based on whether value was found
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
        <span className="text-[11px] text-[#98A2B3]">
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
          <Field label="Budget (₹)" value={form.budget} onChange={set('budget')} pip={pip(extracted.budget ? String(extracted.budget) : null)} type="number" />
        </div>

        {/* Source select */}
        <div className="col-span-2 sm:col-span-1 flex flex-col gap-1">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">Source</label>
            <ConfidencePip value={pip(extracted.source)} />
          </div>
          <select
            value={form.source}
            onChange={e => set('source')(e.target.value)}
            className={cn(
              'px-3 py-2 text-[13px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
              'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 focus:bg-white',
              'transition-all capitalize',
            )}
          >
            {SOURCE_OPTIONS.map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="col-span-2">
          <Field label="Notes" value={form.notes} onChange={set('notes')} pip={pip(extracted.notes)} as="textarea" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F2F4F7]">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-[13px] text-[#667085] hover:text-[#344054] font-medium transition-colors"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Try again
        </button>
        <button
          onClick={() => onConfirm(form)}
          disabled={!form.name.trim() || isCreating}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all',
            form.name.trim() && !isCreating
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm'
              : 'bg-[#F2F4F7] text-[#98A2B3] cursor-not-allowed',
          )}
        >
          <AIIcon size={13} />
          {isCreating ? 'Creating…' : 'Create Lead'}
        </button>
      </div>
    </div>
  )
}
