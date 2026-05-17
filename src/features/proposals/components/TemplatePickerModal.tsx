import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Search, LayoutTemplate } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProposalTemplates } from '../hooks/useProposalTemplates'
import TemplateCard from './TemplateCard'
import type { ProposalTemplate } from '../schemas/proposal.schema'

interface Props {
  open:    boolean
  onClose: () => void
}

export default function TemplatePickerModal({ open, onClose }: Props) {
  const [search, setSearch]           = useState('')
  const [activeCategory, setCategory] = useState<string>('All')
  const navigate                      = useNavigate()

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
    onClose()
    navigate('/app/proposals/new', { state: { template } })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-[#13141A] rounded-2xl shadow-2xl overflow-hidden anim-modal-in flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
          <div>
            <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Choose a Template</h2>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Start from a pre-built structure and customise it for your client.</p>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors ml-4">
            <X size={18} />
          </button>
        </div>

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
                    ? 'bg-[#6366F1] text-white'
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
                <TemplateCard key={t.id} template={t} mode="pick" onUse={handleUse} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
