import { useState, useRef, useEffect, type ReactNode } from 'react'
import { Info } from 'lucide-react'

type Field = 'gstType' | 'tdsRate' | 'gstRate'

const CONTENT: Record<Field, { title: string; body: ReactNode; aiQuestion: string }> = {
  gstType: {
    title: 'What is GST Type?',
    aiQuestion: 'When should I use IGST vs CGST+SGST on my invoice?',
    body: (
      <div className="space-y-2.5">
        <p className="text-[12px] text-[#475569] leading-relaxed">
          GST splits differently based on whether your client is in the <strong>same state</strong> or a <strong>different state</strong> than you.
        </p>
        <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 text-[11px]">
          <div className="flex gap-2 items-start">
            <span className="bg-[#DBEAFE] text-[#1D4ED8] rounded px-1.5 py-0.5 font-semibold shrink-0">IGST</span>
            <span className="text-[#475569]">Client in a <strong>different state</strong> — one combined 18% tax</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-[#DCFCE7] text-[#15803D] rounded px-1.5 py-0.5 font-semibold shrink-0">CGST+SGST</span>
            <span className="text-[#475569]">Client in <strong>same state</strong> — split 9%+9%</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-[#F3F4F6] text-[#6B7280] rounded px-1.5 py-0.5 font-semibold shrink-0">Exempt</span>
            <span className="text-[#475569]">No GST — e.g. exports, certain services</span>
          </div>
        </div>
        <p className="text-[11px] text-[#92400E] bg-[#FFFBEB] rounded-lg px-3 py-2">
          ClearWork auto-detects this from your client's address.
        </p>
      </div>
    ),
  },
  tdsRate: {
    title: 'What is TDS?',
    aiQuestion: 'What TDS rate applies to my freelance work?',
    body: (
      <div className="space-y-2.5">
        <p className="text-[12px] text-[#475569] leading-relaxed">
          TDS (Tax Deducted at Source) means your client deducts tax before paying you and deposits it with the government on your behalf.
        </p>
        <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 text-[11px]">
          <div className="flex gap-2 items-start">
            <span className="bg-[#EDE9FE] text-[#6D28D9] rounded px-1.5 py-0.5 font-semibold shrink-0 whitespace-nowrap">194J — 10%</span>
            <span className="text-[#475569]">Design, dev, consulting, most professional work</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-[#EDE9FE] text-[#6D28D9] rounded px-1.5 py-0.5 font-semibold shrink-0 whitespace-nowrap">194C — 2%</span>
            <span className="text-[#475569]">Printing, advertising, event execution</span>
          </div>
        </div>
        <p className="text-[11px] text-[#1E3A5F] bg-[#EFF6FF] rounded-lg px-3 py-2">
          TDS is not your loss — you get it back when you file your ITR as advance tax already paid.
        </p>
      </div>
    ),
  },
  gstRate: {
    title: 'What is GST %?',
    aiQuestion: 'What GST percentage should I charge on my freelance services?',
    body: (
      <div className="space-y-2.5">
        <p className="text-[12px] text-[#475569] leading-relaxed">
          This is the GST rate you charge on each line item. It's added on top of your base price.
        </p>
        <div className="bg-[#F8FAFC] rounded-lg p-3 space-y-2 text-[11px]">
          <div className="flex gap-2 items-start">
            <span className="bg-[#FEF3C7] text-[#92400E] rounded px-1.5 py-0.5 font-semibold shrink-0">18%</span>
            <span className="text-[#475569]">Most services — design, dev, consulting, marketing</span>
          </div>
          <div className="flex gap-2 items-start">
            <span className="bg-[#FEF3C7] text-[#92400E] rounded px-1.5 py-0.5 font-semibold shrink-0">0%</span>
            <span className="text-[#475569]">Exports and certain exempt services</span>
          </div>
        </div>
        <p className="text-[11px] text-[#166534] bg-[#F0FDF4] rounded-lg px-3 py-2">
          If you're registered for GST, you must charge 18% on most professional services.
        </p>
      </div>
    ),
  },
}

interface Props {
  field: Field
}

export default function FieldInfoPopover({ field }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { title, body, aiQuestion } = CONTENT[field]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function openAI() {
    setOpen(false)
    window.dispatchEvent(new CustomEvent('open-assistant', { detail: { message: aiQuestion } }))
  }

  return (
    <div ref={ref} className="relative inline-flex items-center">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-[15px] h-[15px] rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#6366F1] flex items-center justify-center hover:bg-[#E0E7FF] transition-colors shrink-0"
        aria-label={`Info about ${field}`}
      >
        <Info size={9} strokeWidth={2.5} />
      </button>

      {open && (
        <div className="absolute left-0 top-6 z-50 w-[260px] bg-white border border-[#E2E8F0] rounded-xl shadow-xl p-4 space-y-3">
          <p className="text-[13px] font-bold text-[#0F172A]">{title}</p>
          {body}
          <button
            type="button"
            onClick={openAI}
            className="w-full text-[11px] font-semibold text-[#6366F1] border border-[#E2E8F0] rounded-lg py-1.5 hover:bg-[#F5F3FF] transition-colors"
          >
            Ask AI about this →
          </button>
        </div>
      )}
    </div>
  )
}
