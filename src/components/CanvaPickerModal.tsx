import { useState } from 'react'
import { Search, X, Loader2, ExternalLink, ImageOff } from 'lucide-react'
import { useCanvaDesigns, type CanvaDesign } from '@/features/settings/hooks/useCanva'
import canvaSvg from '@/assets/canva.svg'

interface Props {
  onSelect:   (design: CanvaDesign) => void
  onClose:    () => void
  isPicking?: boolean   // true while the export + upload is in progress
}

export default function CanvaPickerModal({ onSelect, onClose, isPicking }: Props) {
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')

  const { data, isLoading, isError } = useCanvaDesigns(search || undefined, true)
  const designs = data?.designs ?? []

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setSearch(query)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-2xl bg-white dark:bg-[#13141C] rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0] dark:border-[#2A2B35]">
          <div className="flex items-center gap-2.5">
            <img src={canvaSvg} alt="Canva" className="w-6 h-6 rounded" />
            <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Pick a Canva design</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F2F4F7] dark:hover:bg-[#1E1F2B] transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="px-5 py-3 border-b border-[#EAECF0] dark:border-[#2A2B35]">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] bg-[#F9FAFB] dark:bg-[#1E1F2B] focus-within:ring-2 focus-within:ring-[#6366F1]/30 focus-within:border-[#6366F1]">
            <Search size={14} className="text-[#98A2B3] shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your designs…"
              className="flex-1 bg-transparent text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none"
              autoFocus
            />
            {query && (
              <button type="button" onClick={() => { setQuery(''); setSearch('') }}>
                <X size={12} className="text-[#98A2B3] hover:text-[#667085]" />
              </button>
            )}
          </div>
        </form>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 size={24} className="animate-spin text-[#6366F1]" />
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">Loading your designs…</p>
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <p className="text-[13px] font-semibold text-[#D92D20]">Failed to load designs</p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">Make sure your Canva account is still connected.</p>
            </div>
          ) : designs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <ImageOff size={32} className="text-[#D0D5DD] dark:text-[#3D4258]" />
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">
                {search ? 'No designs match your search.' : 'No designs found in your Canva account.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {designs.map((design) => (
                <DesignCard
                  key={design.id}
                  design={design}
                  onSelect={onSelect}
                  disabled={isPicking}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EAECF0] dark:border-[#2A2B35] flex items-center justify-between">
          {isPicking ? (
            <div className="flex items-center gap-2 text-[12px] text-[#6366F1] dark:text-[#818CF8]">
              <Loader2 size={13} className="animate-spin" />
              Exporting PDF — this takes a few seconds…
            </div>
          ) : (
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
              {!isLoading && designs.length > 0 && `${designs.length} design${designs.length !== 1 ? 's' : ''} · Attaches as PDF`}
            </p>
          )}
          <a
            href="https://www.canva.com/design"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 text-[12px] text-[#6366F1] dark:text-[#818CF8] hover:underline"
          >
            Open Canva <ExternalLink size={11} />
          </a>
        </div>
      </div>
    </div>
  )
}

function DesignCard({ design, onSelect, disabled }: { design: CanvaDesign; onSelect: (d: CanvaDesign) => void; disabled?: boolean }) {
  return (
    <button
      onClick={() => onSelect(design)}
      disabled={disabled}
      className="group text-left rounded-xl border border-[#EAECF0] dark:border-[#2A2B35] overflow-hidden hover:border-[#6366F1] dark:hover:border-[#6366F1] hover:shadow-md transition-all disabled:opacity-50 bg-white dark:bg-[#1A1B23]"
    >
      {/* Thumbnail */}
      <div className="aspect-video bg-[#F2F4F7] dark:bg-[#1E1F2B] overflow-hidden">
        {design.thumbnailUrl ? (
          <img
            src={design.thumbnailUrl}
            alt={design.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <img src={canvaSvg} alt="Canva" className="w-10 h-10 opacity-20" />
          </div>
        )}
      </div>
      {/* Label */}
      <div className="px-3 py-2.5">
        <p className="text-[12px] font-semibold text-[#344054] dark:text-[#C5CAD6] truncate">{design.title}</p>
        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
          {new Date(design.updatedAt).toLocaleDateString()}
        </p>
      </div>
    </button>
  )
}
