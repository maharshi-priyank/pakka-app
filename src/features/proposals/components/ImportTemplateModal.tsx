import { useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { X, Upload, FileText, Loader2, LayoutTemplate, ChevronLeft, IndianRupee, Check, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useParseTemplate, useCreateTemplate } from '../hooks/useProposalTemplates'
import type { ParsedTemplate } from '../hooks/useProposalTemplates'
import type { ProposalContent } from '../schemas/proposal.schema'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useListDriveFiles, useFetchDocText } from '@/features/settings/hooks/useGoogleDocs'

// Transform the flat AI response shape into the ProposalContent shape the editor expects
function toProposalContent(parsed: ParsedTemplate): ProposalContent {
  const totalAmount = parsed.lineItems.reduce((sum, li) => sum + li.qty * li.rate, 0)
  return {
    scopeItems:      parsed.scopeItems.map(s => ({ title: s })),
    deliverables:    parsed.deliverables.map(s => ({ item: s })),
    exclusions:      parsed.exclusions,
    lineItems:       parsed.lineItems.map(li => ({
      ...li,
      gstRate: ([0, 5, 12, 18, 28].includes(li.gstRate) ? li.gstRate : 18) as 0 | 5 | 12 | 18 | 28,
    })),
    pricingNotes:    parsed.pricingNotes || undefined,
    paymentSchedule: parsed.paymentSchedule.map(p => ({
      milestone: p.milestone,
      amount:    Math.round((p.percentage / 100) * totalAmount),
    })),
    terms: parsed.terms || undefined,
  }
}

interface Props {
  open:               boolean
  onClose:            () => void
  onTemplateCreated?: () => void
}

const CATEGORY_SUGGESTIONS = ['Web Design', 'Branding', 'Marketing', 'Photography', 'Video Production', 'Interior Design', 'Consulting', 'Development', 'Other']


export default function ImportTemplateModal({ open, onClose, onTemplateCreated }: Props) {
  const navigate          = useNavigate()
  const parseMut          = useParseTemplate()
  const createMut         = useCreateTemplate()
  const fileInputRef      = useRef<HTMLInputElement>(null)
  const { data: profile } = useProfile()

  const [step,          setStep]          = useState<'upload' | 'review'>('upload')
  const [reviewTab,     setReviewTab]     = useState<'scope' | 'pricing' | 'terms'>('scope')
  const [importTab,     setImportTab]     = useState<'file' | 'gdocs'>('file')
  const [file,          setFile]          = useState<File | null>(null)
  const [context,       setContext]       = useState('')
  const [parsed,        setParsed]        = useState<ParsedTemplate | null>(null)
  const [name,          setName]          = useState('')
  const [category,      setCategory]      = useState('')
  const [isDragging,    setIsDragging]    = useState(false)
  const [docsQuery,     setDocsQuery]     = useState('')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)

  const { data: driveFiles, isLoading: filesLoading } = useListDriveFiles(
    importTab === 'gdocs' && (profile?.googleDocsConnected ?? false) ? docsQuery : undefined,
  )
  const { data: docText, isLoading: textLoading } = useFetchDocText(selectedDocId)

  function reset() {
    setStep('upload')
    setImportTab('file')
    setFile(null)
    setContext('')
    setParsed(null)
    setName('')
    setCategory('')
    setDocsQuery('')
    setSelectedDocId(null)
    setReviewTab('scope')
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

  async function handleParseFromDoc() {
    if (!docText) return
    const fd = new FormData()
    fd.append('text', docText)
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
        content:     toProposalContent(parsed) as unknown as object,
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
          content:     toProposalContent(parsed),
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
      <div className="relative z-10 w-full max-w-xl glass-modal rounded-2xl overflow-hidden anim-modal-in flex flex-col max-h-[88vh]">

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
                {step === 'upload' ? 'Import Template' : 'Review & Save'}
              </h2>
              <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">
                {step === 'upload' ? 'Upload a file or pick a Google Doc — AI extracts the structure' : 'AI extracted the structure — review and save'}
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
              {/* Source tabs */}
              <div className="flex gap-1 p-1 bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg">
                <button
                  onClick={() => setImportTab('file')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-[12.5px] font-semibold transition-colors',
                    importTab === 'file'
                      ? 'bg-white dark:bg-[#13141A] text-[#344054] dark:text-[#C2C8D8] shadow-sm'
                      : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                  )}
                >
                  <Upload size={12} /> Upload File
                </button>
                <button
                  onClick={() => setImportTab('gdocs')}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-[12.5px] font-semibold transition-colors',
                    importTab === 'gdocs'
                      ? 'bg-white dark:bg-[#13141A] text-[#344054] dark:text-[#C2C8D8] shadow-sm'
                      : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                  )}
                >
                  <FileText size={12} /> Google Docs
                </button>
              </div>

              {/* ── File upload tab ── */}
              {importTab === 'file' && (
                <>
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
                  {parseMut.isError && (
                    <p className="text-[12px] text-[#D92D20]">Failed to parse file — ensure it is a text-based PDF or DOCX and try again.</p>
                  )}
                </>
              )}

              {/* ── Google Docs tab ── */}
              {importTab === 'gdocs' && (
                <>
                  {!profile?.googleDocsConnected ? (
                    <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center">
                        <FileText size={18} className="text-[#98A2B3] dark:text-[#545C74]" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Google Docs not connected</p>
                        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Connect Google Docs in Settings to browse your Drive files.</p>
                      </div>
                      <Link
                        to="/settings?tab=integrations"
                        onClick={handleClose}
                        className="h-8 px-3.5 rounded-lg bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#4F46E5] transition-colors"
                      >
                        Go to Settings
                      </Link>
                    </div>
                  ) : (
                    <>
                      {/* Search */}
                      <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74]" />
                        <input
                          value={docsQuery}
                          onChange={e => { setDocsQuery(e.target.value); setSelectedDocId(null) }}
                          className="w-full h-9 pl-8 pr-3 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]"
                          placeholder="Search Google Docs…"
                        />
                      </div>

                      {/* File list */}
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {filesLoading ? (
                          <div className="flex items-center justify-center py-6">
                            <Loader2 size={16} className="animate-spin text-[#6366F1]" />
                          </div>
                        ) : !driveFiles?.length ? (
                          <p className="text-center text-[12px] text-[#98A2B3] dark:text-[#545C74] py-6">No documents found</p>
                        ) : (
                          driveFiles.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => setSelectedDocId(f.id === selectedDocId ? null : f.id)}
                              className={cn(
                                'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors',
                                selectedDocId === f.id
                                  ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]'
                                  : 'hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] text-[#344054] dark:text-[#C2C8D8]',
                              )}
                            >
                              <FileText size={14} className={selectedDocId === f.id ? 'text-[#6366F1]' : 'text-[#98A2B3] dark:text-[#545C74]'} />
                              <span className="flex-1 text-[12.5px] font-medium truncate">{f.name}</span>
                              {selectedDocId === f.id && textLoading && <Loader2 size={12} className="animate-spin text-[#6366F1] shrink-0" />}
                              {selectedDocId === f.id && !textLoading && docText && <Check size={12} className="text-emerald-500 shrink-0" />}
                            </button>
                          ))
                        )}
                      </div>
                      {parseMut.isError && (
                        <p className="text-[12px] text-[#D92D20]">Failed to parse document — try again.</p>
                      )}
                    </>
                  )}
                </>
              )}

              {/* Context hint (shared) */}
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

              {/* Review tabs */}
              <div className="flex gap-0.5 p-0.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded-lg">
                {([
                  { key: 'scope',   label: 'Scope & Deliverables' },
                  { key: 'pricing', label: 'Pricing' },
                  { key: 'terms',   label: 'Terms' },
                ] as const).map(t => (
                  <button
                    key={t.key}
                    onClick={() => setReviewTab(t.key)}
                    className={cn(
                      'flex-1 h-7 rounded-md text-[12px] font-semibold transition-colors',
                      reviewTab === t.key
                        ? 'bg-white dark:bg-[#13141A] text-[#344054] dark:text-[#C2C8D8] shadow-sm'
                        : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* ── Scope tab ── */}
              {reviewTab === 'scope' && (
                <div className="space-y-4">
                  {parsed.scopeItems.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">
                        Scope of work <span className="font-normal normal-case">({parsed.scopeItems.length} items)</span>
                      </p>
                      <ul className="space-y-1.5">
                        {parsed.scopeItems.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#6366F1] shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.deliverables.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">
                        Deliverables <span className="font-normal normal-case">({parsed.deliverables.length} items)</span>
                      </p>
                      <ul className="space-y-1.5">
                        {parsed.deliverables.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.exclusions.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">
                        Exclusions <span className="font-normal normal-case">({parsed.exclusions.length} items)</span>
                      </p>
                      <ul className="space-y-1.5">
                        {parsed.exclusions.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-[12.5px] text-[#667085] dark:text-[#8B92A8] leading-relaxed">
                            <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[#D0D5DD] dark:border-[#3D4258] shrink-0" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {parsed.scopeItems.length === 0 && parsed.deliverables.length === 0 && parsed.exclusions.length === 0 && (
                    <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] text-center py-4">No scope items extracted</p>
                  )}
                </div>
              )}

              {/* ── Pricing tab ── */}
              {reviewTab === 'pricing' && (
                <div className="space-y-4">
                  {parsed.lineItems.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">Line items</p>
                      <div className="rounded-lg border border-[#F2F4F7] dark:border-[#26283A] overflow-hidden">
                        {parsed.lineItems.map((li, i) => (
                          <div key={i} className={cn(
                            'flex items-center justify-between gap-3 px-3 py-2.5 text-[12.5px]',
                            i < parsed.lineItems.length - 1 && 'border-b border-[#F2F4F7] dark:border-[#26283A]',
                          )}>
                            <div className="flex-1 min-w-0">
                              <p className="text-[#344054] dark:text-[#C2C8D8] font-medium truncate">{li.description}</p>
                              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                                Qty {li.qty} · GST {li.gstRate}%
                              </p>
                            </div>
                            <span className={cn(
                              'font-semibold shrink-0 flex items-center gap-0.5',
                              li.rate > 0 ? 'text-[#344054] dark:text-[#C2C8D8]' : 'text-[#98A2B3] dark:text-[#545C74]',
                            )}>
                              {li.rate > 0 ? (
                                <><IndianRupee size={10} />{Number(li.rate * (li.qty || 1)).toLocaleString('en-IN')}</>
                              ) : '—'}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between px-3 py-2.5 bg-[#F9FAFB] dark:bg-[#1C1D26] text-[12.5px] font-bold text-[#101828] dark:text-[#ECEEF3] border-t border-[#F2F4F7] dark:border-[#26283A]">
                          <span>Total</span>
                          <span className="flex items-center gap-0.5">
                            <IndianRupee size={11} />
                            {parsed.lineItems.reduce((s, li) => s + li.qty * li.rate, 0).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {parsed.paymentSchedule.length > 0 && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">Payment schedule</p>
                      <div className="space-y-1.5">
                        {parsed.paymentSchedule.map((p, i) => (
                          <div key={i} className="flex items-center justify-between gap-2 text-[12.5px]">
                            <span className="text-[#344054] dark:text-[#C2C8D8] flex-1">{p.milestone}</span>
                            <span className="font-semibold text-[#6366F1] shrink-0">{p.percentage}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {parsed.pricingNotes && (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-1.5">Pricing notes</p>
                      <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] leading-relaxed">{parsed.pricingNotes}</p>
                    </div>
                  )}

                  {parsed.lineItems.length === 0 && parsed.paymentSchedule.length === 0 && (
                    <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] text-center py-4">No pricing details extracted</p>
                  )}
                </div>
              )}

              {/* ── Terms tab ── */}
              {reviewTab === 'terms' && (
                <div className="space-y-3">
                  {parsed.terms ? (
                    <div>
                      <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wider mb-2">Terms & conditions</p>
                      <p className="text-[12.5px] text-[#344054] dark:text-[#C2C8D8] leading-[1.75]">{parsed.terms}</p>
                    </div>
                  ) : (
                    <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] text-center py-4">No terms extracted from this document</p>
                  )}
                  <div className="flex items-center gap-1.5 text-[11.5px] text-[#667085] dark:text-[#8B92A8] pt-1 border-t border-[#F2F4F7] dark:border-[#26283A]">
                    <Check size={12} className="text-emerald-500" />
                    AI confidence: {Math.round(parsed.confidence * 100)}%
                  </div>
                </div>
              )}

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
              onClick={importTab === 'gdocs' ? handleParseFromDoc : handleParse}
              disabled={
                parseMut.isPending ||
                (importTab === 'file' ? !file : !docText || textLoading)
              }
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
