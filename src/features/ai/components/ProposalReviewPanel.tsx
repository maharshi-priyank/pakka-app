import { useState, useRef, useEffect } from 'react'
import { RotateCcw, Check, AlertCircle, Plus, X, IndianRupee } from 'lucide-react'
import AIIcon from './AIIcon'
import { cn } from '@/lib/utils'
import { useClients } from '@/features/clients/hooks/useClients'
import type { ExtractedProposal, ExtractedLineItem, ExtractedPaymentMilestone } from '../hooks/useAIExtract'

export interface ProposalReviewData {
  title:           string
  clientId?:       string
  clientName?:     string
  clientEmail?:    string
  scopeItems:      string[]
  deliverables:    string[]
  exclusions:      string[]
  lineItems:       ExtractedLineItem[]
  paymentSchedule: ExtractedPaymentMilestone[]
  pricingNotes:    string
  terms:           string
  validUntil:      string | null
}

interface Props {
  extracted:  ExtractedProposal
  onConfirm:  (data: ProposalReviewData) => void
  onReset:    () => void
  isCreating: boolean
}

// ─── Editable tag list ────────────────────────────────────────────────────────

function TagList({
  items, onChange, placeholder,
}: {
  items:       string[]
  onChange:    (items: string[]) => void
  placeholder: string
}) {
  const [draft, setDraft] = useState('')

  function add() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onChange([...items, trimmed])
    setDraft('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#F5F6FA] rounded-lg text-[12px] text-[#344054] font-medium"
          >
            {item}
            <button
              onClick={() => onChange(items.filter((_, j) => j !== i))}
              className="text-[#98A2B3] hover:text-red-400 transition-colors ml-0.5"
            >
              <X size={10} strokeWidth={2.5} />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
          className={cn(
            'flex-1 px-2.5 py-1.5 text-[12px] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
            'outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-50 focus:bg-white',
            'placeholder:text-[#D0D5DD] transition-all',
          )}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className="px-2.5 py-1.5 rounded-lg bg-[#F5F6FA] hover:bg-indigo-50 text-[#667085] hover:text-indigo-600 transition-colors disabled:opacity-40"
        >
          <Plus size={12} strokeWidth={2.5} />
        </button>
      </div>
    </div>
  )
}

// ─── Line items table ─────────────────────────────────────────────────────────

function LineItemsTable({
  items, onChange,
}: {
  items:    ExtractedLineItem[]
  onChange: (items: ExtractedLineItem[]) => void
}) {
  function update(i: number, field: keyof ExtractedLineItem, val: string) {
    const updated = items.map((item, j) =>
      j === i ? { ...item, [field]: field === 'description' ? val : Number(val) || 0 } : item,
    )
    onChange(updated)
  }

  function remove(i: number) {
    onChange(items.filter((_, j) => j !== i))
  }

  function addRow() {
    onChange([...items, { description: '', qty: 1, rate: 0, gstRate: 18 }])
  }

  const hasZeroRates = items.some(it => it.rate === 0)

  return (
    <div className="space-y-2">
      {hasZeroRates && (
        <div className="flex items-center gap-1.5 text-[11.5px] text-[#B54708] bg-[#FFFAEB] px-3 py-1.5 rounded-lg">
          <AlertCircle size={11} strokeWidth={2} />
          Fill in the rates below — AI doesn't know your pricing
        </div>
      )}
      <div className="border border-[#E8EBF2] rounded-xl overflow-hidden">
        <table className="w-full text-[12px]">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E8EBF2]">
              <th className="text-left px-3 py-2 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide">Description</th>
              <th className="text-center px-2 py-2 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide w-14">Qty</th>
              <th className="text-right px-3 py-2 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide w-28">Rate (₹)</th>
              <th className="text-center px-2 py-2 text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wide w-20">GST %</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F2F4F7]">
            {items.map((item, i) => (
              <tr key={i} className="group">
                <td className="px-3 py-2">
                  <input
                    value={item.description}
                    onChange={e => update(i, 'description', e.target.value)}
                    className="w-full text-[12.5px] text-[#344054] bg-transparent outline-none focus:bg-indigo-50/30 rounded px-1 -ml-1"
                    placeholder="Description"
                  />
                </td>
                <td className="px-2 py-2 text-center">
                  <input
                    type="number"
                    value={item.qty}
                    onChange={e => update(i, 'qty', e.target.value)}
                    min={1}
                    className="w-12 text-[12.5px] text-[#344054] bg-transparent outline-none focus:bg-indigo-50/30 rounded text-center"
                  />
                </td>
                <td className="px-3 py-2">
                  <div className={cn(
                    'flex items-center gap-1 rounded-lg px-2 py-1 transition-colors',
                    item.rate === 0 ? 'bg-amber-50 border border-amber-200' : 'bg-transparent',
                  )}>
                    <IndianRupee size={10} className={item.rate === 0 ? 'text-amber-500' : 'text-[#98A2B3]'} />
                    <input
                      type="number"
                      value={item.rate || ''}
                      onChange={e => update(i, 'rate', e.target.value)}
                      placeholder="0"
                      className="w-full text-[12.5px] text-[#344054] bg-transparent outline-none text-right"
                    />
                  </div>
                </td>
                <td className="px-2 py-2 text-center">
                  <select
                    value={item.gstRate}
                    onChange={e => update(i, 'gstRate', e.target.value)}
                    className="text-[12px] text-[#344054] bg-transparent outline-none"
                  >
                    {[0, 5, 12, 18, 28].map(r => <option key={r}>{r}</option>)}
                  </select>
                </td>
                <td className="px-2 py-2 text-center">
                  <button
                    onClick={() => remove(i)}
                    className="text-[#D0D5DD] hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X size={12} strokeWidth={2} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <button
          onClick={addRow}
          className="w-full py-2 text-[12px] text-[#98A2B3] hover:text-indigo-600 hover:bg-indigo-50/40 flex items-center justify-center gap-1.5 transition-colors"
        >
          <Plus size={11} strokeWidth={2.5} /> Add line item
        </button>
      </div>
    </div>
  )
}

// ─── Client selector ──────────────────────────────────────────────────────────

function ClientSelector({
  suggested, onSelect,
}: {
  suggested: { name: string | null; email: string | null }
  onSelect:  (clientId: string | undefined, name: string, email: string) => void
}) {
  const [search, setSearch] = useState(suggested.name ?? '')
  const [open,   setOpen]   = useState(false)
  const [picked, setPicked] = useState<{ id?: string; name: string; email: string } | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const { data } = useClients(search.length > 1 ? search : undefined)
  const clients  = data?.clients ?? []

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function pick(c: { id: string; name: string; email: string | null }) {
    const entry = { id: c.id, name: c.name, email: c.email ?? '' }
    setPicked(entry)
    setSearch(c.name)
    setOpen(false)
    onSelect(c.id, c.name, c.email ?? '')
  }

  function clearPick() {
    setPicked(null)
    setSearch('')
    onSelect(undefined, '', '')
  }

  return (
    <div ref={ref} className="relative">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setOpen(true); if (picked) clearPick() }}
            onFocus={() => setOpen(true)}
            placeholder={suggested.name ? `Suggested: ${suggested.name}` : 'Search existing clients…'}
            className={cn(
              'w-full px-3 py-2 text-[13px] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
              'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 focus:bg-white',
              'placeholder:text-[#C9CDD4] transition-all',
            )}
          />
          {picked && (
            <button
              onClick={clearPick}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-red-400"
            >
              <X size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>

      {/* Dropdown */}
      {open && clients.length > 0 && (
        <div className="absolute z-10 top-[calc(100%+4px)] left-0 right-0 bg-white border border-[#E8EBF2] rounded-xl shadow-lg overflow-hidden">
          {clients.slice(0, 5).map((c: { id: string; name: string; email: string | null; company: string | null }) => (
            <button
              key={c.id}
              onClick={() => pick(c)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F5F6FA] transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-[11px] font-bold shrink-0">
                {c.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-[13px] font-semibold text-[#344054]">{c.name}</p>
                {c.company && <p className="text-[11px] text-[#98A2B3]">{c.company}</p>}
              </div>
            </button>
          ))}
          {clients.length === 0 && search.length > 1 && (
            <div className="px-3 py-3 text-[12px] text-[#98A2B3] text-center">
              No existing client found — a new one will be linked by name
            </div>
          )}
        </div>
      )}

      {picked && (
        <p className="text-[11.5px] text-[#027A48] mt-1 flex items-center gap-1">
          <Check size={11} strokeWidth={2.5} /> Linked to existing client
        </p>
      )}
      {!picked && suggested.name && (
        <p className="text-[11.5px] text-[#98A2B3] mt-1">
          AI suggested "{suggested.name}" — search above to link to an existing client
        </p>
      )}
    </div>
  )
}

// ─── Main panel ───────────────────────────────────────────────────────────────

export default function ProposalReviewPanel({ extracted, onConfirm, onReset, isCreating }: Props) {
  const [title,           setTitle]    = useState(extracted.title)
  const [scopeItems,      setScope]    = useState(extracted.scopeItems)
  const [deliverables,    setDeliv]    = useState(extracted.deliverables)
  const [exclusions,      setExcl]     = useState(extracted.exclusions)
  const [lineItems,       setLines]    = useState(extracted.lineItems)
  const [paymentSchedule, setPay]      = useState(extracted.paymentSchedule)
  const [pricingNotes,    setPricing]  = useState(extracted.pricingNotes)
  const [terms,           setTerms]    = useState(extracted.terms)
  const [validUntil,      setValidity] = useState(extracted.validUntil ?? '')
  const [clientId,        setClientId] = useState<string | undefined>()
  const [clientName,      setClientName]  = useState(extracted.suggestedClient.name ?? '')
  const [clientEmail,     setClientEmail] = useState(extracted.suggestedClient.email ?? '')

  const confidence = extracted.confidence
  const confidenceLabel =
    confidence >= 0.8 ? 'High confidence' :
    confidence >= 0.5 ? 'Medium confidence' :
    'Low confidence — review carefully'
  const confidenceColor =
    confidence >= 0.8 ? 'text-[#027A48] bg-[#ECFDF3]' :
    confidence >= 0.5 ? 'text-[#B54708] bg-[#FFFAEB]' :
    'text-[#B42318] bg-[#FEF3F2]'

  function handleConfirm() {
    onConfirm({
      title,
      clientId,
      clientName:  clientName || undefined,
      clientEmail: clientEmail || undefined,
      scopeItems,
      deliverables,
      exclusions,
      lineItems,
      paymentSchedule,
      pricingNotes,
      terms,
      validUntil: validUntil || null,
    })
  }

  const SectionTitle = ({ children }: { children: React.ReactNode }) => (
    <h3 className="text-[11px] font-bold text-[#98A2B3] uppercase tracking-wider mb-2">{children}</h3>
  )

  return (
    <div className="px-6 py-5">
      {/* Confidence + hint */}
      <div className="flex items-center justify-between mb-5">
        <span className={cn('inline-flex items-center gap-1.5 text-[11.5px] font-semibold px-2.5 py-1 rounded-full', confidenceColor)}>
          {confidence >= 0.8 ? <Check size={11} strokeWidth={2.5} /> : <AlertCircle size={11} strokeWidth={2.5} />}
          {confidenceLabel}
        </span>
        <span className="text-[11px] text-[#98A2B3]">All fields are editable</span>
      </div>

      <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">

        {/* Title */}
        <div>
          <SectionTitle>Proposal Title</SectionTitle>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className={cn(
              'w-full px-3 py-2.5 text-[14px] font-semibold text-[#101828] bg-[#FAFAFA] border border-[#E8EBF2] rounded-xl',
              'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 focus:bg-white transition-all',
            )}
          />
        </div>

        {/* Client */}
        <div>
          <SectionTitle>Client</SectionTitle>
          <ClientSelector
            suggested={extracted.suggestedClient}
            onSelect={(id, name, email) => { setClientId(id); setClientName(name); setClientEmail(email) }}
          />
        </div>

        {/* Two-column: scope + deliverables */}
        <div className="grid grid-cols-2 gap-5">
          <div>
            <SectionTitle>Scope <span className="text-[10px] font-normal normal-case">(what's included)</span></SectionTitle>
            <TagList items={scopeItems} onChange={setScope} placeholder="Add scope item…" />
          </div>
          <div>
            <SectionTitle>Deliverables <span className="text-[10px] font-normal normal-case">(what client receives)</span></SectionTitle>
            <TagList items={deliverables} onChange={setDeliv} placeholder="Add deliverable…" />
          </div>
        </div>

        {/* Exclusions */}
        <div>
          <SectionTitle>Exclusions <span className="text-[10px] font-normal normal-case">(not included)</span></SectionTitle>
          <TagList items={exclusions} onChange={setExcl} placeholder="Add exclusion…" />
        </div>

        {/* Line items */}
        <div>
          <SectionTitle>Line Items & Pricing</SectionTitle>
          <LineItemsTable items={lineItems} onChange={setLines} />
        </div>

        {/* Payment schedule */}
        <div>
          <SectionTitle>Payment Schedule</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {paymentSchedule.map((ms, i) => (
              <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#F5F6FA] rounded-lg border border-[#E8EBF2]">
                <input
                  value={ms.percentage}
                  onChange={e => {
                    const updated = paymentSchedule.map((m, j) =>
                      j === i ? { ...m, percentage: Number(e.target.value) || 0 } : m,
                    )
                    setPay(updated)
                  }}
                  className="w-9 text-[13px] font-bold text-[#344054] bg-transparent outline-none text-center"
                  type="number"
                  min={0}
                  max={100}
                />
                <span className="text-[12px] text-[#98A2B3]">%</span>
                <input
                  value={ms.milestone}
                  onChange={e => {
                    const updated = paymentSchedule.map((m, j) =>
                      j === i ? { ...m, milestone: e.target.value } : m,
                    )
                    setPay(updated)
                  }}
                  className="text-[12px] text-[#344054] bg-transparent outline-none min-w-[120px]"
                />
                <button
                  onClick={() => setPay(paymentSchedule.filter((_, j) => j !== i))}
                  className="text-[#D0D5DD] hover:text-red-400 transition-colors"
                >
                  <X size={11} strokeWidth={2} />
                </button>
              </div>
            ))}
            <button
              onClick={() => setPay([...paymentSchedule, { milestone: 'New milestone', percentage: 0 }])}
              className="flex items-center gap-1 px-3 py-2 rounded-lg border border-dashed border-[#D0D5DD] text-[12px] text-[#98A2B3] hover:border-indigo-300 hover:text-indigo-500 transition-colors"
            >
              <Plus size={11} strokeWidth={2.5} /> Add
            </button>
          </div>
        </div>

        {/* Pricing notes + Terms */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <SectionTitle>Pricing Notes</SectionTitle>
            <textarea
              value={pricingNotes}
              onChange={e => setPricing(e.target.value)}
              rows={2}
              className={cn(
                'w-full px-3 py-2 text-[12.5px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
                'outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-50 resize-none transition-all',
              )}
            />
          </div>
          <div>
            <SectionTitle>Terms</SectionTitle>
            <textarea
              value={terms}
              onChange={e => setTerms(e.target.value)}
              rows={2}
              className={cn(
                'w-full px-3 py-2 text-[12.5px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
                'outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-50 resize-none transition-all',
              )}
            />
          </div>
        </div>

        {/* Valid until */}
        <div>
          <SectionTitle>Valid Until</SectionTitle>
          <input
            type="date"
            value={validUntil}
            onChange={e => setValidity(e.target.value)}
            className={cn(
              'px-3 py-2 text-[13px] text-[#344054] bg-[#FAFAFA] border border-[#E8EBF2] rounded-lg',
              'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 transition-all',
            )}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-[#F2F4F7]">
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-[13px] text-[#667085] hover:text-[#344054] font-medium transition-colors"
        >
          <RotateCcw size={13} strokeWidth={2} />
          Try again
        </button>
        <button
          onClick={handleConfirm}
          disabled={!title.trim() || isCreating}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all',
            title.trim() && !isCreating
              ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm'
              : 'bg-[#F2F4F7] text-[#98A2B3] cursor-not-allowed',
          )}
        >
          <AIIcon size={13} />
          {isCreating ? 'Creating…' : 'Create Draft Proposal'}
        </button>
      </div>
    </div>
  )
}
