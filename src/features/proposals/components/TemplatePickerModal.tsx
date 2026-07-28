import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search, LayoutTemplate, FileUp, IndianRupee } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProposalTemplates, useIncrementTemplateUsage } from '../hooks/useProposalTemplates'
import TemplateCard from './TemplateCard'
import ImportTemplateModal from './ImportTemplateModal'
import type { ProposalTemplate } from '../schemas/proposal.schema'

interface Props {
  open:               boolean
  onClose:            () => void
  defaultProjectId?:  string
  defaultContactId?:  string
}

function fmt(v: number) {
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

function TemplatePreviewPanel({
  template,
  onUse,
  onClose,
}: {
  template: ProposalTemplate
  onUse:    (t: ProposalTemplate) => void
  onClose:  () => void
}) {
  const c = template.content as Record<string, unknown>
  const scopeItems      = (c.scopeItems      as Array<{ title: string; description?: string }> | string[] | undefined) ?? []
  const lineItems       = (c.lineItems       as Array<{ description: string; qty: number; rate: number }> | undefined) ?? []
  const paymentSchedule = (c.paymentSchedule as Array<{ milestone: string; amount?: number; percentage?: number }> | undefined) ?? []

  return (
    <div className="w-[280px] shrink-0 border-l border-[#EAECF0] dark:border-[#26283A] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] shrink-0">
        <p className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8] truncate">{template.name}</p>
        <button onClick={onClose} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors shrink-0 ml-2">
          <X size={13} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-[12px]">
        {/* Scope */}
        {scopeItems.length > 0 && (
          <div>
            <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Scope</p>
            <ul className="space-y-1">
              {scopeItems.map((item, i) => (
                <li key={i} className="flex items-start gap-1.5 text-[#344054] dark:text-[#C2C8D8]">
                  <span className="mt-1 w-1 h-1 rounded-full bg-[#6366F1] shrink-0" />
                  <span>{typeof item === 'string' ? item : item.title}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Line items */}
        {lineItems.length > 0 && (
          <div>
            <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Pricing</p>
            <div className="space-y-1">
              {lineItems.map((li, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <span className="text-[#667085] dark:text-[#8B92A8] leading-snug flex-1">{li.description}</span>
                  {li.rate > 0 && (
                    <span className="text-[#344054] dark:text-[#C2C8D8] font-semibold shrink-0 flex items-center gap-0.5">
                      <IndianRupee size={10} />
                      {Number(li.rate * (li.qty || 1)).toLocaleString('en-IN')}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[#F2F4F7] dark:border-[#26283A] flex justify-between font-bold text-[#101828] dark:text-[#ECEEF3]">
              <span>Total</span>
              <span>{fmt(template.totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Payment schedule */}
        {paymentSchedule.length > 0 && (
          <div>
            <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Payment</p>
            <div className="space-y-1">
              {paymentSchedule.map((p, i) => (
                <div key={i} className="flex items-start justify-between gap-2">
                  <span className="text-[#667085] dark:text-[#8B92A8] leading-snug flex-1">{p.milestone}</span>
                  <span className="text-[#344054] dark:text-[#C2C8D8] font-semibold shrink-0">
                    {p.amount ? fmt(p.amount) : p.percentage ? `${p.percentage}%` : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t border-[#F2F4F7] dark:border-[#26283A] shrink-0">
        <button
          onClick={() => onUse(template)}
          className="w-full h-8 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-bold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
        >
          Use this template
        </button>
      </div>
    </div>
  )
}

export default function TemplatePickerModal({ open, onClose, defaultProjectId, defaultContactId }: Props) {
  const [search,          setSearch]          = useState('')
  const [activeCategory,  setCategory]        = useState<string>('All')
  const [previewTemplate, setPreviewTemplate] = useState<ProposalTemplate | null>(null)
  const [showImport,      setShowImport]      = useState(false)
  const navigate                              = useNavigate()
  const incrementUsage                        = useIncrementTemplateUsage()

  const { data: templates = [], isLoading } = useProposalTemplates()

  const categories = useMemo(() => {
    const cats = templates.map(t => t.category).filter(Boolean) as string[]
    return ['All', ...Array.from(new Set(cats))]
  }, [templates])

  const filtered = useMemo(() => {
    return templates.filter(t => {
      const matchesSearch   = !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.description ?? '').toLowerCase().includes(search.toLowerCase())
      const matchesCategory = activeCategory === 'All' || t.category === activeCategory
      return matchesSearch && matchesCategory
    })
  }, [templates, search, activeCategory])

  function handleUse(template: ProposalTemplate) {
    incrementUsage.mutate(template.id)
    onClose()
    const params = new URLSearchParams()
    if (defaultProjectId)  params.set('projectId', defaultProjectId)
    if (defaultContactId)  params.set('contactId', defaultContactId)
    const qs = params.toString()
    navigate(`/proposals/new${qs ? `?${qs}` : ''}`, { state: { template } })
  }

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
        <div className={cn(
          'relative z-10 w-full glass-modal rounded-2xl overflow-hidden anim-modal-in flex flex-col max-h-[80vh]',
          previewTemplate ? 'max-w-4xl' : 'max-w-3xl',
        )}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
            <div>
              <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Choose a Template</h2>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Start from a pre-built structure and customise it for your client.</p>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors"
              >
                <FileUp size={13} /> Import PDF
              </button>
              <button onClick={onClose} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Body row: grid + optional preview */}
          <div className="flex flex-1 overflow-hidden">
            {/* Left: search + grid */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Search + category filter */}
              <div className="px-6 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] space-y-3 shrink-0">
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search templates…"
                    className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
                  />
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={cn(
                        'px-3 py-1 rounded-full text-[12px] font-semibold whitespace-nowrap transition-colors',
                        activeCategory === cat
                          ? 'bg-[#0D1117] dark:bg-[#6366F1] text-white'
                          : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8] hover:bg-[#E4E7EC] dark:hover:bg-[#26283A] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template grid */}
              <div className="flex-1 overflow-y-auto p-6">
                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {[1, 2, 3].map(i => <div key={i} className="h-40 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] animate-pulse" />)}
                  </div>
                ) : filtered.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <LayoutTemplate size={32} className="text-[#D0D5DD] dark:text-[#3D4258] mb-3" strokeWidth={1.5} />
                    <p className="text-[14px] font-semibold text-[#667085] dark:text-[#8B92A8]">No templates found</p>
                    <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Try a different search or category.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {filtered.map(t => (
                      <TemplateCard
                        key={t.id}
                        template={t}
                        mode="pick"
                        onUse={handleUse}
                        onPreview={setPreviewTemplate}
                        isPreviewActive={previewTemplate?.id === t.id}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right: preview panel */}
            {previewTemplate && (
              <TemplatePreviewPanel
                template={previewTemplate}
                onUse={handleUse}
                onClose={() => setPreviewTemplate(null)}
              />
            )}
          </div>
        </div>
      </div>

      <ImportTemplateModal
        open={showImport}
        onClose={() => setShowImport(false)}
        onTemplateCreated={onClose}
      />
    </>
  )
}
