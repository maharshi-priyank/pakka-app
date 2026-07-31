import type { ContractTemplate } from '../schemas/contract.schema'

interface Props {
  template: ContractTemplate
}

// Mirrors TemplatePreviewPanel's visual pattern inside Proposal's
// TemplatePickerModal.tsx, adapted for Contract's content fields (intro,
// scopeItems, clauses) rather than Proposal's (scopeItems, lineItems,
// paymentSchedule). Rendered inside TemplatePickerShell's own preview panel
// chrome (header/close/"Use this template" button already provided by the
// shell) — this component only supplies the scrollable body content.
export default function ContractTemplatePreview({ template }: Props) {
  const c = template.content as Record<string, unknown>
  const intro       = (c.intro as string | undefined) ?? ''
  const scopeItems  = (c.scopeItems as Array<{ title: string; description?: string }> | undefined) ?? []
  const clauses     = (c.clauses    as Array<{ title: string; body: string }> | undefined) ?? []

  const isEmpty = !intro && scopeItems.length === 0 && clauses.length === 0

  if (isEmpty) {
    return (
      <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
        This template has no content yet.
      </p>
    )
  }

  return (
    <>
      {/* Intro */}
      {intro && (
        <div>
          <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Preamble</p>
          <p className="text-[#344054] dark:text-[#C2C8D8] leading-relaxed line-clamp-4">{intro}</p>
        </div>
      )}

      {/* Scope */}
      {scopeItems.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Scope</p>
          <ul className="space-y-1">
            {scopeItems.map((item, i) => (
              <li key={i} className="flex items-start gap-1.5 text-[#344054] dark:text-[#C2C8D8]">
                <span className="mt-1 w-1 h-1 rounded-full bg-[#6366F1] shrink-0" />
                <span>{item.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Clauses */}
      {clauses.length > 0 && (
        <div>
          <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Clauses</p>
          <div className="space-y-2.5">
            {clauses.map((clause, i) => (
              <div key={i}>
                <p className="font-semibold text-[#101828] dark:text-[#ECEEF3]">§{i + 1} {clause.title}</p>
                <p className="text-[#667085] dark:text-[#8B92A8] leading-snug line-clamp-3 mt-0.5">{clause.body}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
