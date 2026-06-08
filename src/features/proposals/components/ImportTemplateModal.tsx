import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, Upload, FileText, Loader2, LayoutTemplate, ChevronLeft, IndianRupee, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useParseTemplate, useCreateTemplate } from '../hooks/useProposalTemplates'
import type { ParsedTemplate } from '../hooks/useProposalTemplates'

interface Props {
  open:               boolean
  onClose:            () => void
  onTemplateCreated?: () => void
}

const CATEGORY_SUGGESTIONS = ['Web Design', 'Branding', 'Marketing', 'Photography', 'Video Production', 'Interior Design', 'Consulting', 'Development', 'Other']

function fmt(v: number) {
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function ImportTemplateModal({ open, onClose, onTemplateCreated }: Props) {
  const navigate          = useNavigate()
  const parseMut          = useParseTemplate()
  const createMut         = useCreateTemplate()
  const fileInputRef      = useRef<HTMLInputElement>(null)

  const [step,       setStep]       = useState<'upload' | 'review'>('upload')
  const [file,       setFile]       = useState<File | null>(null)
  const [context,    setContext]     = useState('')
  const [parsed,     setParsed]     = useState<ParsedTemplate | null>(null)
  const [name,       setName]       = useState('')
  const [category,   setCategory]   = useState('')
  const [isDragging, setIsDragging] = useState(false)

  function reset() {
    setStep('upload')
    setFile(null)
    setContext('')
    setParsed(null)
    setName('')
    setCategory('')
    parseMut.reset()
    createMut.reset()
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) setFile(dropped)
  }

  async function handleParse() {
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    if (context.trim()) fd.append('context', context.trim())
    const result = await parseMut.mutateAsync(fd)
    setParsed(result)
    setName(result.title || '')
    setStep('review')
  }

  function handleSaveTemplate() {
    if (!parsed || !name.trim()) return
    const totalAmount = parsed.lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0)
    createMut.mutate(
      {
        name:        name.trim(),
        category:    category.trim() || undefined,
        content:     parsed as unknown as object,
        totalAmount,
      },
      {
        onSuccess: () => {
          onTemplateCreated?.()
          handleClose()
        },
      },
    )
  }

  function handleUseForProposal() {
    if (!parsed) return
    const totalAmount = parsed.lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0)
    onClose()
    navigate('/proposals/new', {
      state: {
        template: {
          id:          '__imported__',
          name:        name || parsed.title,
          category:    category || null,
          description: null,
          content:     parsed,
          totalAmount,
          isSystem:    false,
          usageCount:  0,
        },
      },
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] anim-fade" onClick={handleClose} />
      <div className="relative z-10 w-full max-w-lg bg-white dark:bg-[#13141A] rounded-2xl shadow-2xl overflow-hidden anim-modal-in flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
          <div className="flex items-center gap-2.5">
            {step === 'review' && (
              <button
                onClick={() => setStep('upload')}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
            )}
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
              <LayoutTemplate size={13} className="text-[#6366F1]" />
            </div>
            <div>
              <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                {step === 'upload' ? 'Import Template from File' : 'Review & Save'}
              </h2>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
                {step === 'upload' ? 'Upload a PDF or DOCX proposal to extract its structure' : 'AI extracted the structure — review and save'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors ml-2 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {step === 'upload' && (
            <>
              {/* Drop zone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleFileDrop}
                className={cn(
                  'flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-colors',
                  isDragging
                    ? 'border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040]'
                    : file
                      ? 'border-[#6366F1]/50 bg-[#F5F6FA] dark:bg-[#21222D]'
                      : 'border-[#D0D5DD] dark:border-[#3D4258] hover:border-[#6366F1]/60 hover:bg-[#F5F6FA] dark:hover:bg-[#21222D]',
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.doc"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
                      <FileText size={18} className="text-[#6366F1]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{file.name}</p>
                      <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{(file.size / 1024).toFixed(0)} KB · Click to change</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center">
                      <Upload size={18} className="text-[#98A2B3] dark:text-[#545C74]" />
                    </div>
                    <div className="text-center">
                      <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Drop a file here, or click to upload</p>
                      <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Supports PDF and DOCX</p>
                    </div>
                  </>
                )}
              </div>

              {/* Context hint */}
              <div>
                <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">
                  Context hint <span className="text-[#98A2B3] dark:text-[#545C74] font-normal">(optional)</span>
                </label>
                <textarea
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]"
                  placeholder='e.g. "Branding proposal for Indian agencies, rates in INR"'
                />
              </div>

              {parseMut.isError && (
                <p className="text-[12px] text-[#D92D20]">Failed to parse file — ensure it is a text-based PDF or DOCX and try again.</p>
              )}
            </>
          )}

          {step === 'review' && parsed && (
            <>
              {/* Name + category */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">Template name *</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                    placeholder="e.g. Brand Identity"
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">Category <span className="font-normal text-[#98A2B3]">(optional)</span></label>
                  <input
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                    list="import-category-suggestions"
                    className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
                    placeholder="e.g. Branding"
                  />
                  <datalist id="import-category-suggestions">
                    {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
              </div>

              {/* Scope items */}
              {parsed.scopeItems.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Scope ({parsed.scopeItems.length} items)</p>
                  <ul className="space-y-1">
                    {parsed.scopeItems.slice(0, 5).map((item, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-[12px] text-[#344054] dark:text-[#C2C8D8]">
                        <span className="mt-1.5 w-1 h-1 rounded-full bg-[#6366F1] shrink-0" />
                        {item}
                      </li>
                    ))}
                    {parsed.scopeItems.length > 5 && (
                      <li className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] pl-3">+{parsed.scopeItems.length - 5} more…</li>
                    )}
                  </ul>
                </div>
              )}

              {/* Line items */}
              {parsed.lineItems.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Pricing</p>
                  <div className="space-y-1">
                    {parsed.lineItems.map((li, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-[12px]">
                        <span className="text-[#667085] dark:text-[#8B92A8] flex-1">{li.description}</span>
                        {li.rate > 0 && (
                          <span className="text-[#344054] dark:text-[#C2C8D8] font-semibold shrink-0 flex items-center gap-0.5">
                            <IndianRupee size={10} />
                            {Number(li.rate * (li.qty || 1)).toLocaleString('en-IN')}
                          </span>
                        )}
                      </div>
                    ))}
                    <div className="pt-1.5 border-t border-[#F2F4F7] dark:border-[#26283A] flex justify-between text-[12px] font-bold text-[#101828] dark:text-[#ECEEF3]">
                      <span>Total</span>
                      <span>{fmt(parsed.lineItems.reduce((s, li) => s + li.qty * li.rate, 0))}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment schedule */}
              {parsed.paymentSchedule.length > 0 && (
                <div>
                  <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Payment schedule</p>
                  <div className="space-y-1">
                    {parsed.paymentSchedule.map((p, i) => (
                      <div key={i} className="flex items-start justify-between gap-2 text-[12px]">
                        <span className="text-[#667085] dark:text-[#8B92A8] flex-1">{p.milestone}</span>
                        <span className="text-[#344054] dark:text-[#C2C8D8] font-semibold shrink-0">{p.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center gap-1.5 text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
                <Check size={12} className="text-emerald-500" />
                AI confidence: {Math.round(parsed.confidence * 100)}%
              </div>

              {createMut.isError && (
                <p className="text-[12px] text-[#D92D20]">Failed to save template. Please try again.</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#EAECF0] dark:border-[#26283A] flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleClose}
            className="h-8 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
          >
            Cancel
          </button>

          {step === 'upload' ? (
            <button
              type="button"
              onClick={handleParse}
              disabled={!file || parseMut.isPending}
              className="h-8 px-4 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {parseMut.isPending ? (
                <><Loader2 size={12} className="animate-spin" /> Parsing…</>
              ) : (
                <><LayoutTemplate size={12} /> Parse with AI</>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleUseForProposal}
                className="h-8 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                Use for new proposal
              </button>
              <button
                type="button"
                onClick={handleSaveTemplate}
                disabled={!name.trim() || createMut.isPending}
                className="h-8 px-4 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {createMut.isPending ? (
                  <><Loader2 size={12} className="animate-spin" /> Saving…</>
                ) : (
                  <><LayoutTemplate size={12} /> Save as Template</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
