import { useState, useRef, useCallback, type ReactNode } from 'react'
import { X, Upload, ImageIcon, FileText } from 'lucide-react'
import AIIcon from './AIIcon'
import { cn } from '@/lib/utils'

export type AIModalMode = 'lead' | 'proposal' | 'contact'
export type AIModalPhase = 'input' | 'extracting' | 'review'

interface Props {
  mode:      AIModalMode
  phase:     AIModalPhase
  onClose:   () => void
  onExtract: (payload: { text?: string; imageBase64?: string; mimeType?: string; pricingContext?: string }) => void
  children?: ReactNode  // review panel (phase 3)
}

const MODE_CONFIG = {
  lead: {
    title:    'Extract Lead with AI',
    subtitle: 'Paste a conversation, email, or describe the lead',
    textPlaceholder: 'Paste a WhatsApp conversation, email thread, or describe the lead in your own words…\n\nExamples:\n• "Ritu needs a website for her cafe, budget ~80k, ritu@gmail.com"\n• "hi bhai need logo design for startup, budget flexible"\n• Forward an email thread here',
    examples: [
      '"Website for my cafe, budget ~₹80k"',
      '"Need branding + social media kit"',
      '"iOS app for delivery startup, ₹3L budget"',
    ],
    showPricingContext: false,
  },
  proposal: {
    title:    'Draft Proposal with AI',
    subtitle: 'Describe the project or paste the client brief',
    textPlaceholder: 'Describe the project scope, paste the client\'s requirements, or forward a brief email…\n\nExamples:\n• "5-page website for cafe, contact form, 3 revisions, 45 days"\n• "Brand identity: logo + stationery + social kit, logo in 2 weeks"\n• Paste client\'s full requirements email here',
    examples: [
      '"5-page website, 3 revisions, 45 days"',
      '"Brand identity: logo + stationery + guidelines"',
      '"Mobile app MVP, 3 months, React Native"',
    ],
    showPricingContext: true,
  },
  contact: {
    title:    'Extract Contact with AI',
    subtitle: 'Paste a conversation, email, or describe the contact',
    textPlaceholder: 'Paste a WhatsApp message, email, or describe the contact…\n\nExamples:\n• "Ritu runs a cafe, ritu@gmail.com, looking for a website"\n• "Met Arjun at a conference, needs brand identity for his startup"\n• Forward an email introduction here',
    examples: [
      '"Cafe owner, needs website, budget ~₹80k"',
      '"Need brand identity for startup"',
      '"Intro email from potential client"',
    ],
    showPricingContext: false,
  },
}

const EXTRACT_STATUS = [
  'Reading input…',
  'Identifying details…',
  'Structuring data…',
  'Almost done…',
]

function fileToBase64(file: File): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve({
      base64:   (reader.result as string).split(',')[1],
      mimeType: file.type,
    })
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export default function AIModal({ mode, phase, onClose, onExtract, children }: Props) {
  const cfg = MODE_CONFIG[mode]

  const [text,           setTextState]    = useState('')
  const [pricingContext, setPricingCtx]   = useState('')
  const [image,          setImage]        = useState<{ base64: string; mimeType: string; name: string } | null>(null)
  const [dragOver,       setDragOver]     = useState(false)
  const [extractStatus,  setExtractStatus]= useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Cycle status text during extraction
  const statusRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function startStatusCycle() {
    setExtractStatus(0)
    statusRef.current = setInterval(() => {
      setExtractStatus(s => Math.min(s + 1, EXTRACT_STATUS.length - 1))
    }, 900)
  }

  function stopStatusCycle() {
    if (statusRef.current) clearInterval(statusRef.current)
  }

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return
    const { base64, mimeType } = await fileToBase64(file)
    setImage({ base64, mimeType, name: file.name })
  }, [])

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  function handleExtractClick() {
    if (!text.trim() && !image) return
    startStatusCycle()
    onExtract({
      text:          text.trim() || undefined,
      imageBase64:   image?.base64,
      mimeType:      image?.mimeType,
      pricingContext: pricingContext.trim() || undefined,
    })
  }

  // Stop cycle when phase changes away from extracting
  if (phase !== 'extracting') stopStatusCycle()

  const canExtract = !!(text.trim() || image)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[#0D1117]/60 backdrop-blur-[2px] anim-fade"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative glass-modal rounded-2xl w-full transition-all duration-300 anim-modal-in',
          phase === 'review' ? 'max-w-3xl' : 'max-w-[580px]',
        )}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
              <AIIcon size={13} className="text-white" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-none">{cfg.title}</h2>
              {phase === 'input' && (
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{cfg.subtitle}</p>
              )}
              {phase === 'review' && (
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Review and edit before saving</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        {/* ── Phase 1: Input ───────────────────────────────────────────── */}
        {phase === 'input' && (
          <div className="px-6 py-5 space-y-4">

            {/* Drag & drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={cn(
                'relative border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all',
                dragOver
                  ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20'
                  : image
                  ? 'border-indigo-300 bg-indigo-50/40 dark:bg-indigo-950/10'
                  : 'border-[#E8EBF2] dark:border-[#3D4258] hover:border-indigo-300 hover:bg-[#F9FAFB] dark:hover:border-indigo-600/50 dark:hover:bg-[#1A1B23]',
              )}
            >
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
              />
              {image ? (
                <div className="flex items-center justify-center gap-2.5">
                  <ImageIcon size={16} className="text-indigo-500" strokeWidth={1.8} />
                  <span className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">{image.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setImage(null) }}
                    className="text-[11px] text-red-400 hover:text-red-600 font-medium ml-1"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div>
                  <Upload size={18} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-2" strokeWidth={1.5} />
                  <p className="text-[13px] font-medium text-[#344054] dark:text-[#C2C8D8]">Drop a screenshot here</p>
                  <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">WhatsApp, email, any image — or click to browse</p>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
              <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] font-medium">or type below</span>
              <div className="flex-1 h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
            </div>

            {/* Text area */}
            <textarea
              value={text}
              onChange={e => setTextState(e.target.value)}
              placeholder={cfg.textPlaceholder}
              rows={6}
              className={cn(
                'w-full px-4 py-3 text-[13px] text-[#344054] dark:text-[#ECEEF3] bg-[#FAFAFA] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-xl',
                'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:bg-white dark:focus:bg-[#1A1B23]',
                'placeholder:text-[#C9CDD4] dark:placeholder:text-[#545C74] resize-none transition-all leading-relaxed',
              )}
            />

            {/* Pricing context (proposals only) */}
            {cfg.showPricingContext && (
              <div>
                <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5 uppercase tracking-wide">
                  Your pricing context <span className="font-normal normal-case">(optional)</span>
                </label>
                <input
                  value={pricingContext}
                  onChange={e => setPricingCtx(e.target.value)}
                  placeholder='e.g. "I charge ₹800/hr" or "website projects start at ₹50k"'
                  className={cn(
                    'w-full px-3 py-2.5 text-[13px] text-[#344054] dark:text-[#ECEEF3] bg-[#FAFAFA] dark:bg-[#21222D] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg',
                    'outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 focus:bg-white dark:focus:bg-[#1A1B23]',
                    'placeholder:text-[#C9CDD4] dark:placeholder:text-[#545C74] transition-all',
                  )}
                />
              </div>
            )}

            {/* Example chips */}
            <div className="flex flex-wrap gap-1.5">
              {cfg.examples.map(ex => (
                <button
                  key={ex}
                  onClick={() => setTextState(ex.slice(1, -1))}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-[#E8EBF2] dark:border-[#3D4258]',
                    'text-[11.5px] text-[#667085] dark:text-[#8B92A8] hover:border-indigo-300 dark:hover:border-indigo-500/50 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20',
                    'transition-all',
                  )}
                >
                  <FileText size={10} strokeWidth={2} />
                  {ex}
                </button>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={onClose}
                className="text-[13px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExtractClick}
                disabled={!canExtract}
                className={cn(
                  'flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-bold transition-all',
                  canExtract
                    ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md'
                    : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#98A2B3] dark:text-[#545C74] cursor-not-allowed',
                )}
              >
                <AIIcon size={13} />
                Extract Details
              </button>
            </div>
          </div>
        )}

        {/* ── Phase 2: Extracting ──────────────────────────────────────── */}
        {phase === 'extracting' && (
          <div className="px-6 py-16 flex flex-col items-center justify-center gap-6">
            {/* Animated orb */}
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse opacity-20" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 animate-pulse opacity-40" style={{ animationDelay: '0.2s' }} />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
                <AIIcon size={14} className="text-white" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                {EXTRACT_STATUS[extractStatus]}
              </p>
              <p className="text-[12.5px] text-[#98A2B3] dark:text-[#545C74] mt-1">Gemini AI is reading your input</p>
            </div>
            {/* Dots */}
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Phase 3: Review — injected as children ───────────────────── */}
        {phase === 'review' && children}
      </div>
    </div>
  )
}
