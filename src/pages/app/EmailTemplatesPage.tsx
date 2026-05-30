import { useState, useCallback, useEffect, useRef } from 'react'
import { Mail, ChevronRight, CheckCircle2, RotateCcw, Send, Eye, Save, X, Copy, Info } from 'lucide-react'
import Editor from '@monaco-editor/react'
import { cn } from '@/lib/utils'
import {
  useEmailTemplateList,
  useEmailTemplate,
  useUpsertEmailTemplate,
  useResetEmailTemplate,
  useSendTestEmail,
  type EmailTemplateMeta,
  type TemplateCategory,
} from '@/features/email-templates/hooks/useEmailTemplates'
import { api } from '@/lib/api'

const CATEGORY_LABELS: Record<TemplateCategory, string> = {
  invoice:  'Invoices',
  proposal: 'Proposals',
  contract: 'Contracts',
  lead:     'Leads',
  meeting:  'Meetings',
  digest:   'Digests & Alerts',
}

const CATEGORY_ORDER: TemplateCategory[] = ['invoice', 'proposal', 'contract', 'lead', 'meeting', 'digest']

// ─── Preview Pane ──────────────────────────────────────────────────────────────

function PreviewPane({ templateKey, onClose }: { templateKey: string; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // Response interceptor wraps as { data: T }; endpoint returns { subject, html }
      const res = await api.get<{ data: { subject: string; html: string } }>(`/email-templates/${templateKey}/preview`)
      setHtml(res.data.data?.html ?? '')
    } catch {
      setHtml('<p style="padding:24px;color:#666;font-family:sans-serif">Failed to load preview</p>')
    } finally {
      setLoading(false)
    }
  }, [templateKey])

  useEffect(() => { load() }, [load])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
        <span className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] flex items-center gap-2">
          <Eye size={14} className="text-[#6366F1]" />
          Live Preview
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="text-[12px] text-[#667085] hover:text-[#344054] dark:hover:text-[#C2C8D8] px-2 py-1 rounded hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2E] transition-colors"
          >
            Refresh
          </button>
          <button onClick={onClose} className="w-6 h-6 rounded flex items-center justify-center text-[#667085] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2E] transition-colors">
            <X size={14} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden bg-[#F4F5F7] dark:bg-[#161828]">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
          </div>
        ) : (
          <iframe
            srcDoc={html ?? ''}
            className="w-full h-full border-0"
            title="Email preview"
            sandbox="allow-same-origin"
          />
        )}
      </div>
    </div>
  )
}

// ─── Editor Panel ──────────────────────────────────────────────────────────────

function TemplateEditor({ templateKey, onBack }: { templateKey: string; onBack: () => void }) {
  const { data, isLoading } = useEmailTemplate(templateKey)
  const upsert = useUpsertEmailTemplate()
  const reset  = useResetEmailTemplate()
  const sendTest = useSendTestEmail()

  const [subject, setSubject] = useState('')
  const [bodyHtml, setBodyHtml] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [previewWidth, setPreviewWidth] = useState(440)
  const [testEmail, setTestEmail] = useState('')
  const [showTestInput, setShowTestInput] = useState(false)
  const [showVars, setShowVars] = useState(false)
  const [copiedVar, setCopiedVar] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  const dragRef = useRef<{ startX: number; startW: number } | null>(null)

  function startResizePreview(e: React.MouseEvent) {
    e.preventDefault()
    dragRef.current = { startX: e.clientX, startW: previewWidth }
    const onMove = (mv: MouseEvent) => {
      if (!dragRef.current) return
      const delta = dragRef.current.startX - mv.clientX
      setPreviewWidth(Math.max(300, Math.min(800, dragRef.current.startW + delta)))
    }
    const onUp = () => {
      dragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  // Populate state once data loads
  if (data && !loaded) {
    setSubject(data.subject)
    setBodyHtml(data.bodyHtml)
    setLoaded(true)
  }

  function handleSave() {
    upsert.mutate({ templateKey, subject, bodyHtml })
  }

  function handleReset() {
    if (confirm('Reset this template to the system default? Your customizations will be lost.')) {
      reset.mutate(templateKey)
      setLoaded(false)
    }
  }

  function handleSendTest() {
    if (!testEmail.trim()) return
    sendTest.mutate({ templateKey, to: testEmail.trim() })
    setShowTestInput(false)
    setTestEmail('')
  }

  function copyVar(name: string) {
    navigator.clipboard.writeText(`{{${name}}}`)
    setCopiedVar(name)
    setTimeout(() => setCopiedVar(null), 1500)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Editor toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0 flex-wrap gap-y-2">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          ← Templates
        </button>
        <span className="text-[#D0D5DD] dark:text-[#3A3D52] mx-1">/</span>
        <span className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">{data.meta.label}</span>
        {data.isCustomised && (
          <span className="ml-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[11px] font-semibold">
            <CheckCircle2 size={10} />
            Customised
          </span>
        )}

        <div className="flex-1" />

        {/* Actions */}
        <button
          onClick={() => setShowVars(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
            showVars
              ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
              : 'bg-white dark:bg-[#1C1E2E] border-[#D0D5DD] dark:border-[#26283A] text-[#344054] dark:text-[#C2C8D8] hover:border-[#98A2B3] dark:hover:border-[#3A3D52]',
          )}
        >
          <Info size={13} />
          Variables
        </button>

        <button
          onClick={() => setShowPreview(v => !v)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border transition-colors',
            showPreview
              ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]'
              : 'bg-white dark:bg-[#1C1E2E] border-[#D0D5DD] dark:border-[#26283A] text-[#344054] dark:text-[#C2C8D8] hover:border-[#98A2B3] dark:hover:border-[#3A3D52]',
          )}
        >
          <Eye size={13} />
          Preview
        </button>

        {showTestInput ? (
          <div className="flex items-center gap-1">
            <input
              type="email"
              value={testEmail}
              onChange={e => setTestEmail(e.target.value)}
              placeholder="your@email.com"
              onKeyDown={e => e.key === 'Enter' && handleSendTest()}
              className="h-8 px-3 text-[12px] border border-[#D0D5DD] dark:border-[#26283A] rounded-lg bg-white dark:bg-[#1C1E2E] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:border-[#6366F1] w-44"
              autoFocus
            />
            <button
              onClick={handleSendTest}
              disabled={!testEmail.trim() || sendTest.isPending}
              className="h-8 px-3 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] disabled:opacity-50 transition-colors"
            >
              {sendTest.isPending ? '…' : 'Send'}
            </button>
            <button onClick={() => setShowTestInput(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#667085] hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2E] transition-colors">
              <X size={14} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowTestInput(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border bg-white dark:bg-[#1C1E2E] border-[#D0D5DD] dark:border-[#26283A] text-[#344054] dark:text-[#C2C8D8] hover:border-[#98A2B3] dark:hover:border-[#3A3D52] transition-colors"
          >
            <Send size={13} />
            Test
          </button>
        )}

        {data.isCustomised && (
          <button
            onClick={handleReset}
            disabled={reset.isPending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium border bg-white dark:bg-[#1C1E2E] border-[#D0D5DD] dark:border-[#26283A] text-[#344054] dark:text-[#C2C8D8] hover:border-[#F97316] hover:text-[#F97316] transition-colors"
          >
            <RotateCcw size={13} />
            Reset
          </button>
        )}

        <button
          onClick={handleSave}
          disabled={upsert.isPending}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[12px] font-semibold bg-[#101828] dark:bg-[#2563EB] text-white hover:bg-[#1D2939] dark:hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
        >
          <Save size={13} />
          {upsert.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* Main area: editor + optional preview/vars panels */}
      <div className="flex-1 flex min-h-0">

        {/* Editor */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0">
          {/* Subject line */}
          <div className="px-4 py-2.5 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#667085] w-14 shrink-0">Subject</span>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="flex-1 text-[13px] bg-transparent text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none"
                placeholder="Email subject line…"
              />
            </div>
          </div>

          {/* HTML editor */}
          <div className="flex-1 min-h-0">
            <Editor
              height="100%"
              defaultLanguage="html"
              value={bodyHtml}
              onChange={v => setBodyHtml(v ?? '')}
              theme="vs-dark"
              options={{
                minimap:        { enabled: false },
                fontSize:       12,
                lineHeight:     20,
                padding:        { top: 12, bottom: 12 },
                scrollBeyondLastLine: false,
                wordWrap:       'on',
                fontFamily:     '"JetBrains Mono", "Fira Code", monospace',
                renderLineHighlight: 'none',
                overviewRulerLanes: 0,
              }}
            />
          </div>
        </div>

        {/* Variables sidebar */}
        {showVars && (
          <div className="w-64 shrink-0 border-l border-[#EAECF0] dark:border-[#26283A] flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
              <p className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8]">Available Variables</p>
              <p className="text-[11px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Click to copy <code className="font-mono bg-[#F4F5F7] dark:bg-[#1C1E2E] px-1 rounded text-[10px]">{"{{var}}"}</code></p>
            </div>
            <div className="flex-1 overflow-y-auto py-2 space-y-1 px-2">
              {data.meta.vars.map(v => (
                <button
                  key={v.name}
                  onClick={() => copyVar(v.name)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#F4F5F7] dark:hover:bg-[#1C1E2E] transition-colors group"
                >
                  <div className="flex items-center justify-between">
                    <code className="text-[11px] font-mono font-semibold text-[#6366F1]">{`{{${v.name}}}`}</code>
                    <Copy size={11} className={cn('text-[#D0D5DD] group-hover:text-[#6366F1] transition-colors', copiedVar === v.name && 'text-emerald-500')} />
                  </div>
                  <p className="text-[11px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-snug">{v.description}</p>
                  <p className="text-[10px] text-[#98A2B3] dark:text-[#5A5F72] mt-0.5 font-mono truncate">{v.sample}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Preview pane — resizable */}
        {showPreview && (
          <div className="shrink-0 border-l border-[#EAECF0] dark:border-[#26283A] flex min-h-0" style={{ width: previewWidth }}>
            {/* Drag handle */}
            <div
              onMouseDown={startResizePreview}
              className="w-1.5 shrink-0 cursor-col-resize hover:bg-[#6366F1]/30 transition-colors active:bg-[#6366F1]/50 self-stretch"
              title="Drag to resize"
            />
            <div className="flex-1 flex flex-col min-w-0 min-h-0">
              <PreviewPane templateKey={templateKey} onClose={() => setShowPreview(false)} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Template List ─────────────────────────────────────────────────────────────

function TemplateList({ onSelect }: { onSelect: (key: string) => void }) {
  const { data: templates, isLoading } = useEmailTemplateList()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <div className="w-6 h-6 rounded-full border-2 border-[#6366F1] border-t-transparent animate-spin" />
      </div>
    )
  }

  const byCategory = CATEGORY_ORDER.reduce<Record<string, EmailTemplateMeta[]>>((acc, cat) => {
    acc[cat] = (templates ?? []).filter(t => t.category === cat)
    return acc
  }, {} as Record<string, EmailTemplateMeta[]>)

  const customisedCount = (templates ?? []).filter(t => t.isCustomised).length

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-[22px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Email Templates</h1>
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1">
          Customise the emails Rupway sends on your behalf. {customisedCount > 0 && <span className="font-semibold text-[#2563EB]">{customisedCount} customised.</span>}
        </p>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#EFF6FF] border border-[#BFDBFE]">
        <Info size={15} className="text-[#2563EB] shrink-0 mt-0.5" />
        <div className="text-[12px] text-[#1D4ED8] leading-relaxed">
          <strong>How it works:</strong> Each template has a system default. If you customise one, your version is used instead. You can use <code className="font-mono bg-[#DBEAFE] px-1 rounded">{'{{variableName}}'}</code> placeholders — they're replaced automatically with real data when the email sends.
        </div>
      </div>

      {/* Grouped template list */}
      {CATEGORY_ORDER.map(cat => {
        const items = byCategory[cat]
        if (!items?.length) return null
        return (
          <div key={cat}>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#98A2B3] dark:text-[#5A5F72] mb-2">{CATEGORY_LABELS[cat]}</p>
            <div className="bg-white dark:bg-[#13152A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden divide-y divide-[#EAECF0] dark:divide-[#26283A]">
              {items.map(t => (
                <button
                  key={t.key}
                  onClick={() => onSelect(t.key)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 hover:bg-[#F9FAFB] dark:hover:bg-[#1C1E2E] transition-colors text-left group"
                >
                  <div className="w-8 h-8 rounded-lg bg-[#F4F5F7] dark:bg-[#1C1E2E] flex items-center justify-center shrink-0">
                    <Mail size={14} className="text-[#6366F1]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">{t.label}</span>
                      {t.isCustomised && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-[#EFF6FF] text-[#2563EB] text-[10px] font-semibold">
                          <CheckCircle2 size={9} />
                          Custom
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 truncate">{t.description}</p>
                  </div>
                  <ChevronRight size={15} className="text-[#D0D5DD] dark:text-[#3A3D52] group-hover:text-[#667085] dark:group-hover:text-[#8B92A8] transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function EmailTemplatesPage() {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  if (activeKey) {
    return (
      <div className="h-[calc(100vh-60px)] flex flex-col min-h-0 -m-6">
        <TemplateEditor templateKey={activeKey} onBack={() => setActiveKey(null)} />
      </div>
    )
  }

  return (
    <div className="pb-8">
      <TemplateList onSelect={setActiveKey} />
    </div>
  )
}
