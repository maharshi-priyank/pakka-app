import { StickyNote, ListChecks } from 'lucide-react'
import type { InvoiceTemplate } from '../schemas/invoice.schema'

// U11/KTD9: rendered inside TemplatePickerShell's `renderPreview` slot -- the
// shell already provides the aside chrome (header, close button, "Use this
// template" footer button), so this component only renders the inner
// content. Mirrors ProposalsPage's TemplatePreviewPanel body sections
// (uppercase tracking-wide labels + bulleted/row lists) but adapted for
// Invoice's much smaller content shape: `notes` (the boilerplate slot,
// KTD6) plus an optional from-scratch `lineItems` starting point (never
// applied during automation/re-apply merges).

interface Props {
  template: InvoiceTemplate
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

export default function InvoiceTemplatePreview({ template }: Props) {
  const notes      = template.content?.notes ?? ''
  const lineItems  = template.content?.lineItems ?? []

  if (!notes && lineItems.length === 0) {
    return (
      <p className="text-[#98A2B3] dark:text-[#545C74] italic">
        This template has no boilerplate content yet.
      </p>
    )
  }

  return (
    <>
      {notes && (
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">
            <StickyNote size={10} strokeWidth={2.5} /> Notes
          </p>
          <p className="text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap">{notes}</p>
        </div>
      )}

      {lineItems.length > 0 && (
        <div>
          <p className="flex items-center gap-1.5 text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">
            <ListChecks size={10} strokeWidth={2.5} /> Starting line items
          </p>
          <div className="space-y-1">
            {lineItems.map((li, i) => (
              <div key={i} className="flex items-start justify-between gap-2">
                <span className="text-[#667085] dark:text-[#8B92A8] leading-snug flex-1">
                  {li.description || 'Untitled item'}
                </span>
                {li.rate > 0 && (
                  <span className="text-[#344054] dark:text-[#C2C8D8] font-semibold shrink-0">
                    {fmt(Number(li.rate) * (Number(li.qty) || 1))}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
