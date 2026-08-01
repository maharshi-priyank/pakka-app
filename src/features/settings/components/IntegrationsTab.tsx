import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertCircle, Loader2, RefreshCw, ExternalLink, X, Send, Copy, Check, BookOpen, Mail, MessageCircle } from 'lucide-react'
import canvaSvg from '@/assets/canva.svg'
import flodeskSvg from '@/assets/flowdesk.svg'
import outlookSvg from '@/assets/outlook.svg'
import googleFormsSvg from '@/assets/forms.svg'
import { api } from '@/lib/api'
import { useProfile } from '../hooks/useProfile'
import { useConnectClickUp, useDisconnectClickUp, useSyncClickUp } from '../hooks/useClickUp'
import { useConnectFlodesk, useDisconnectFlodesk } from '../hooks/useFlodesk'
import { useConnectCanva, useDisconnectCanva } from '../hooks/useCanva'
import { useConnectGoogleForms, useDisconnectGoogleForms, useGoogleFormsSetup } from '../hooks/useGoogleForms'
import { useConnectGoogleDocs, useDisconnectGoogleDocs } from '../hooks/useGoogleDocs'
import googleDocsSvg from '@/assets/google-docs.svg'
import { useConnectGoogleSheets, useDisconnectGoogleSheets, useInitGoogleSheets } from '../hooks/useGoogleSheets'
import googleSheetsSvg from '@/assets/google-sheets.svg'
import { useWhatsappConnection, useConnectWhatsapp, useDisconnectWhatsapp } from '@/features/whatsapp/hooks/useWhatsappConnection'
import { useWhatsappRules, useToggleWhatsappRule } from '@/features/whatsapp/hooks/useWhatsappRules'

function useConnectGoogle() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/google/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => { window.location.href = authUrl },
  })
}
function useDisconnectGoogle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/google/disconnect'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}
function useConnectOutlook() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/microsoft/connect')
      return data.data.authUrl
    },
    onSuccess: (authUrl) => { window.location.href = authUrl },
  })
}
function useDisconnectOutlook() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/auth/microsoft/disconnect'),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['profile'] }),
  })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function BrandIcon({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="w-7 h-7 object-contain" />
}

function WhatsappIcon() {
  return (
    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#25D366' }}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
        <path d="M12 0C5.373 0 0 5.373 0 12c0 2.126.554 4.124 1.523 5.856L0 24l6.336-1.498A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.782 9.782 0 01-5.002-1.376l-.359-.213-3.722.879.938-3.618-.234-.372A9.787 9.787 0 012.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/>
      </svg>
    </div>
  )
}

// ── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

// ── Integration Card ──────────────────────────────────────────────────────────

type Category = 'all' | 'productivity' | 'communication' | 'design'

interface IntegrationDef {
  id:          string
  icon:        React.ReactNode
  title:       string
  description: string
  category:    Category
  isConnected: boolean
  isLoading:   boolean
  connectPending:    boolean
  disconnectPending: boolean
  onConnect:   () => void
  onDisconnect: () => void
  extraAction?: React.ReactNode
  learnMoreUrl?: string
  error?: string | null
  // Flodesk: API key flow
  apiKeyFlow?: boolean
  onApiKeyConnect?: (key: string) => void
}

function IntegrationCard(props: IntegrationDef) {
  const [confirmDisconnect, setConfirmDisconnect] = useState(false)
  const [showApiInput, setShowApiInput]           = useState(false)
  const [apiKey, setApiKey]                       = useState('')

  const pending = props.connectPending || props.disconnectPending

  function handleToggle() {
    if (props.isLoading || pending) return
    if (props.isConnected) {
      if (confirmDisconnect) {
        props.onDisconnect()
        setConfirmDisconnect(false)
      } else {
        setConfirmDisconnect(true)
      }
    } else {
      if (props.apiKeyFlow) {
        setShowApiInput(true)
      } else {
        props.onConnect()
      }
    }
  }

  function handleApiKeySave() {
    if (!apiKey.trim()) return
    props.onApiKeyConnect?.(apiKey.trim())
    setApiKey('')
    setShowApiInput(false)
  }

  return (
    <div className="bg-white dark:bg-[#13141C] border border-[#EAECF0] dark:border-[#2A2B35] rounded-2xl flex flex-col overflow-hidden hover:shadow-md dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-shadow duration-200">
      {/* Card body */}
      <div className="p-5 flex-1">
        {/* Top row: icon + toggle */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-11 h-11 flex items-center justify-center">
            {props.icon}
          </div>
          <div className="flex flex-col items-end gap-1">
            {props.isLoading || pending ? (
              <Loader2 size={16} className="animate-spin text-[#98A2B3] mt-1" />
            ) : (
              <Toggle
                checked={props.isConnected}
                onChange={handleToggle}
                disabled={props.isLoading || pending}
              />
            )}
            {confirmDisconnect && (
              <div className="flex items-center gap-1.5 mt-1">
                <button
                  onClick={() => setConfirmDisconnect(false)}
                  className="text-[11px] text-[#667085] hover:text-[#344054] dark:text-[#8B92A8] dark:hover:text-[#C2C8D8] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => { props.onDisconnect(); setConfirmDisconnect(false) }}
                  disabled={props.disconnectPending}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[#D92D20] dark:text-red-400 disabled:opacity-50"
                >
                  {props.disconnectPending ? <Loader2 size={10} className="animate-spin" /> : <AlertCircle size={10} />}
                  Confirm
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Title + description */}
        <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-1">{props.title}</p>
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] leading-relaxed">{props.description}</p>

        {/* Error message */}
        {props.error && (
          <div className="mt-2 flex items-start gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#FEF3F2] dark:bg-[#2A1A1A]">
            <AlertCircle size={12} className="text-[#B42318] mt-0.5 flex-shrink-0" />
            <p className="text-[11px] text-[#B42318] leading-snug">{props.error}</p>
          </div>
        )}

        {/* Connected badge */}
        {props.isConnected && (
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399] text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B76A] dark:bg-[#34D399]" />
              Connected
            </span>
            {props.extraAction}
          </div>
        )}

        {/* API key input (Flodesk) */}
        {showApiInput && !props.isConnected && (
          <div className="mt-3 space-y-2">
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApiKeySave()}
              placeholder="Paste your API key"
              className="w-full px-3 py-2 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] bg-[#F9FAFB] dark:bg-[#1E1F2B] text-[12px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleApiKeySave}
                disabled={props.connectPending || !apiKey.trim()}
                className="flex-1 py-1.5 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
              >
                {props.connectPending ? <Loader2 size={12} className="animate-spin" /> : null}
                Save
              </button>
              <button
                onClick={() => { setShowApiInput(false); setApiKey('') }}
                className="px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-[#EAECF0] dark:border-[#2A2B35] px-5 py-3">
        {props.learnMoreUrl ? (
          <a
            href={props.learnMoreUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-[12px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] dark:hover:text-[#A5B4FC] transition-colors"
          >
            View integration
            <ExternalLink size={11} />
          </a>
        ) : (
          <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258] select-none">View integration</span>
        )}
      </div>
    </div>
  )
}

// ── Request Integration Modal ─────────────────────────────────────────────────

function RequestIntegrationModal({ onClose }: { onClose: () => void }) {
  const [tool, setTool]         = useState('')
  const [useCase, setUseCase]   = useState('')
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!tool.trim()) return
    const subject = encodeURIComponent(`Integration Request: ${tool.trim()}`)
    const body    = encodeURIComponent(
      `Hi ClearWork team,\n\nI'd like to request an integration with: ${tool.trim()}\n\nUse case:\n${useCase.trim() || 'Not specified'}\n\nThanks!`
    )
    window.open(`mailto:hello@getclearwork.in?subject=${subject}&body=${body}`)
    setSubmitted(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#13141C] rounded-2xl shadow-2xl w-full max-w-md p-6 border border-[#EAECF0] dark:border-[#2A2B35]">
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="text-[16px] font-bold text-[#101828] dark:text-[#ECEEF3]">Request an integration</h3>
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Tell us which tool you want connected to ClearWork.</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        {submitted ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-3">
              <Send size={20} className="text-[#027A48] dark:text-[#34D399]" />
            </div>
            <p className="text-[14px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Request sent!</p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-1">We'll review your request and get back to you.</p>
            <button
              onClick={onClose}
              className="mt-4 px-4 py-2 rounded-lg bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">
                Tool name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={tool}
                onChange={(e) => setTool(e.target.value)}
                placeholder="e.g. Notion, Zapier, Stripe..."
                className="w-full px-3 py-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] bg-[#F9FAFB] dark:bg-[#1E1F2B] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-colors"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">
                How would you use it? <span className="text-[#98A2B3] font-normal">(optional)</span>
              </label>
              <textarea
                value={useCase}
                onChange={(e) => setUseCase(e.target.value)}
                placeholder="Describe your use case..."
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] bg-[#F9FAFB] dark:bg-[#1E1F2B] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-colors resize-none"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!tool.trim()}
                className="flex-1 py-2.5 rounded-lg bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send size={13} />
                Send request
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

// ── Google Forms Setup Modal ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <button
      onClick={handleCopy}
      className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold border border-[#EAECF0] dark:border-[#3D4258] text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors"
    >
      {copied ? <Check size={11} className="text-[#12B76A]" /> : <Copy size={11} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function GoogleFormsSetupModal({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useGoogleFormsSetup(true)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#13141C] rounded-2xl shadow-2xl w-full max-w-lg border border-[#EAECF0] dark:border-[#2A2B35] max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-start justify-between p-6 pb-4 sticky top-0 bg-white dark:bg-[#13141C] z-10 border-b border-[#EAECF0] dark:border-[#2A2B35]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/40">
              <img src={googleFormsSvg} alt="Google Forms" className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Google Forms — Setup Guide</h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">One-time setup per form. Takes ~2 minutes.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 size={20} className="animate-spin text-[#6366F1]" />
            </div>
          ) : (
            <>
              {/* Step 1 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] font-bold flex items-center justify-center shrink-0">1</span>
                  <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Open your Google Form</p>
                </div>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] pl-7">
                  Go to <a href="https://forms.google.com" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] hover:underline">forms.google.com</a> and open the form you want to connect.
                </p>
              </div>

              {/* Step 2 */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] font-bold flex items-center justify-center shrink-0">2</span>
                  <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Open the Script Editor</p>
                </div>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] pl-7">
                  Click the <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">⋮ More options</span> menu (top-right) → <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Script editor</span>.
                </p>
              </div>

              {/* Step 3 — Script snippet */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] font-bold flex items-center justify-center shrink-0">3</span>
                  <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Paste this script</p>
                </div>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] pl-7">
                  Replace all existing code in the editor with the snippet below, then click <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Save</span> (Ctrl+S).
                </p>
                <div className="ml-7 rounded-xl border border-[#EAECF0] dark:border-[#2A2B35] overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-[#F9FAFB] dark:bg-[#1A1B26] border-b border-[#EAECF0] dark:border-[#2A2B35]">
                    <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8]">Apps Script</span>
                    {data && <CopyButton text={data.scriptSnippet} />}
                  </div>
                  <pre className="p-3 text-[11px] text-[#344054] dark:text-[#C2C8D8] font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all bg-white dark:bg-[#13141C]">
                    {data?.scriptSnippet ?? ''}
                  </pre>
                </div>
              </div>

              {/* Step 4 — Trigger */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-[#6366F1] text-white text-[10px] font-bold flex items-center justify-center shrink-0">4</span>
                  <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">Add a form-submit trigger</p>
                </div>
                <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] pl-7">
                  In the Script editor, click <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Triggers</span> (clock icon in the sidebar) → <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">+ Add Trigger</span>.<br />
                  Set: <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Function = onFormSubmit</span>, <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">Event type = On form submit</span>. Save.
                </p>
              </div>

              {/* Webhook URL reference */}
              <div className="rounded-xl border border-[#EAECF0] dark:border-[#2A2B35] p-4 bg-[#F9FAFB] dark:bg-[#1A1B26] space-y-2">
                <p className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Your unique webhook URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-[11px] text-[#6366F1] dark:text-[#818CF8] font-mono break-all">
                    {data?.webhookUrl ?? ''}
                  </code>
                  {data && <CopyButton text={data.webhookUrl} />}
                </div>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#5A6078]">This URL is already embedded in the script above. Keep it private.</p>
              </div>

              {/* Done */}
              <div className="rounded-xl border border-[#D1FAE5] dark:border-emerald-900/50 bg-[#ECFDF3] dark:bg-emerald-950/30 p-4">
                <p className="text-[12px] font-semibold text-[#027A48] dark:text-[#34D399]">All set!</p>
                <p className="text-[12px] text-[#065F46] dark:text-[#6EE7B7] mt-0.5">
                  Every new Google Form submission will automatically create a lead in ClearWork. Repeat steps 2–4 for any other forms you want to connect.
                </p>
              </div>
            </>
          )}
        </div>

        <div className="px-6 pb-6">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

// ── WhatsApp Notifications Modal ──────────────────────────────────────────────

const WA_EVENT_LABELS: Record<string, string> = {
  'wa.proposal.sent':    'Proposal Shared',
  'wa.contract.sent':    'Contract Sent',
  'wa.contract.signed':  'Contract Signed',
  'wa.invoice.sent':     'Invoice Sent',
  'wa.invoice.due_soon': 'Payment Reminder (3 days before due)',
  'wa.invoice.paid':     'Payment Received',
  'wa.project.completed':'Project Completed',
}

const WA_EVENT_ORDER = [
  'wa.proposal.sent', 'wa.contract.sent', 'wa.contract.signed',
  'wa.invoice.sent',  'wa.invoice.due_soon', 'wa.invoice.paid', 'wa.project.completed',
]

function WhatsappNotificationsModal({ displayPhone, onClose }: { displayPhone?: string; onClose: () => void }) {
  const { data: rules = [], isLoading } = useWhatsappRules()
  const toggleMutation = useToggleWhatsappRule()

  const sorted = WA_EVENT_ORDER
    .map((key) => rules.find((r) => r.key === key))
    .filter(Boolean) as typeof rules

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#13141C] rounded-2xl shadow-2xl w-full max-w-lg border border-[#EAECF0] dark:border-[#2A2B35]">

        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-[#EAECF0] dark:border-[#2A2B35]">
          <div className="flex items-center gap-3">
            <WhatsappIcon />
            <div>
              <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">WhatsApp Notifications</h3>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
                {displayPhone ? `Sending from ${displayPhone}` : 'Toggle per-event WhatsApp notifications'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        {/* Table */}
        <div>
          {/* Column headers */}
          <div className="grid grid-cols-[1fr_72px_72px] px-5 py-2.5 border-b border-[#F1F3F8] dark:border-[#26283A]">
            <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Event</span>
            <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide text-center flex items-center justify-center gap-1">
              <Mail size={11} /> Email
            </span>
            <span className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide text-center flex items-center justify-center gap-1">
              <MessageCircle size={11} /> WA
            </span>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={18} className="animate-spin text-[#D0D5DD] dark:text-[#3D4258]" />
            </div>
          ) : (
            sorted.map((rule, i) => (
              <div
                key={rule.id}
                className={`grid grid-cols-[1fr_72px_72px] px-5 py-3 items-center ${
                  i < sorted.length - 1 ? 'border-b border-[#F9FAFB] dark:border-[#1E1F2A]' : ''
                }`}
              >
                <span className="text-[13px] text-[#374151] dark:text-[#C2C8D8]">
                  {WA_EVENT_LABELS[rule.key] ?? rule.name}
                </span>

                {/* Email — always on */}
                <div className="flex items-center justify-center">
                  <div className="w-5 h-5 rounded bg-[#6366F1]/10 flex items-center justify-center">
                    <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="#6366F1" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                </div>

                {/* WhatsApp toggle */}
                <div className="flex items-center justify-center">
                  <button
                    role="switch"
                    aria-checked={rule.isActive}
                    disabled={toggleMutation.isPending && toggleMutation.variables?.id === rule.id}
                    onClick={() => toggleMutation.mutate({ id: rule.id, isActive: !rule.isActive })}
                    className={`relative inline-flex h-5 w-9 cursor-pointer rounded-full transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#25D366] focus-visible:ring-offset-1 disabled:opacity-50 ${
                      rule.isActive ? 'bg-[#25D366]' : 'bg-[#E5E7EB] dark:bg-[#3D4258]'
                    }`}
                  >
                    <span
                      className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm transition-transform duration-150 mt-[3px] ${
                        rule.isActive ? 'translate-x-[18px]' : 'translate-x-[3px]'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 pb-5 pt-3 border-t border-[#EAECF0] dark:border-[#2A2B35]">
          <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] leading-relaxed">
            Messages use pre-approved WhatsApp Business templates sent from your verified number.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Tab filter ────────────────────────────────────────────────────────────────

const TABS: { id: Category | 'all'; label: string }[] = [
  { id: 'all',           label: 'View all' },
  { id: 'productivity',  label: 'Productivity' },
  { id: 'communication', label: 'Communication' },
  { id: 'design',        label: 'Design' },
]

// ── Main component ────────────────────────────────────────────────────────────

export default function IntegrationsTab() {
  const [activeTab, setActiveTab]               = useState<Category | 'all'>('all')
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showSetupModal, setShowSetupModal]     = useState(false)
  const [showWaModal, setShowWaModal]           = useState(false)
  const [waError, setWaError]                   = useState<string | null>(null)

  const { data: profile, isLoading } = useProfile()
  const waConnection     = useWhatsappConnection()
  const connectWa        = useConnectWhatsapp()
  const disconnectWa     = useDisconnectWhatsapp()
  const connectGoogle        = useConnectGoogle()
  const disconnectGoogle     = useDisconnectGoogle()
  const connectOutlook       = useConnectOutlook()
  const disconnectOutlook    = useDisconnectOutlook()
  const connectClickUp       = useConnectClickUp()
  const disconnectClickUp    = useDisconnectClickUp()
  const syncClickUp          = useSyncClickUp()
  const connectFlodesk       = useConnectFlodesk()
  const disconnectFlodesk    = useDisconnectFlodesk()
  const connectCanva         = useConnectCanva()
  const disconnectCanva      = useDisconnectCanva()
  const connectGoogleForms    = useConnectGoogleForms()
  const disconnectGoogleForms = useDisconnectGoogleForms()
  const connectGoogleDocs     = useConnectGoogleDocs()
  const disconnectGoogleDocs  = useDisconnectGoogleDocs()
  const connectGoogleSheets   = useConnectGoogleSheets()
  const disconnectGoogleSheets = useDisconnectGoogleSheets()
  const initGoogleSheets      = useInitGoogleSheets()

  // After OAuth redirect, create the spreadsheet.
  // sheetsInitFired prevents the effect from firing twice:
  //   - once when profile is undefined (condition: !undefined = true)
  //   - again when profile loads with googleSheetsConnected:false (dep change)
  const { search } = useLocation()
  const sheetsInitFired = useRef(false)
  useEffect(() => {
    const params = new URLSearchParams(search)
    if (params.get('googleSheetsConnected') === 'true' && !sheetsInitFired.current) {
      sheetsInitFired.current = true
      initGoogleSheets.mutate()
    }
  }, [search])

  const integrations: IntegrationDef[] = [
    {
      id:          'google',
      icon:        <BrandIcon src="/brand-icons/google-calendar.svg" alt="Google Calendar" />,
      title:       'Google Calendar',
      description: 'Auto-generate Google Meet links and send calendar invites to clients when scheduling calls.',
      category:    'productivity',
      isConnected: profile?.googleCalendarConnected ?? false,
      isLoading,
      connectPending:    connectGoogle.isPending,
      disconnectPending: disconnectGoogle.isPending,
      onConnect:   () => connectGoogle.mutate(),
      onDisconnect: () => disconnectGoogle.mutate(),
      learnMoreUrl: 'https://calendar.google.com',
    },
    {
      id:          'outlook',
      icon:        <BrandIcon src={outlookSvg} alt="Outlook" />,
      title:       'Outlook Calendar',
      description: 'Auto-generate Microsoft Teams links and send calendar invites. Connects via your Microsoft 365 account.',
      category:    'productivity',
      isConnected: profile?.outlookConnected ?? false,
      isLoading,
      connectPending:    connectOutlook.isPending,
      disconnectPending: disconnectOutlook.isPending,
      onConnect:   () => connectOutlook.mutate(),
      onDisconnect: () => disconnectOutlook.mutate(),
      learnMoreUrl: 'https://outlook.live.com/calendar',
    },
    {
      id:          'clickup',
      icon:        <BrandIcon src="/brand-icons/icons8-clickup.svg" alt="ClickUp" />,
      title:       'ClickUp',
      description: 'Import ClickUp lists as projects, sync time entries, and pull workspace members as clients.',
      category:    'productivity',
      isConnected: profile?.clickUpConnected ?? false,
      isLoading,
      connectPending:    connectClickUp.isPending,
      disconnectPending: disconnectClickUp.isPending,
      onConnect:   () => connectClickUp.mutate(),
      onDisconnect: () => disconnectClickUp.mutate(),
      extraAction: (
        <button
          onClick={() => syncClickUp.mutate()}
          disabled={syncClickUp.isPending}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] transition-colors disabled:opacity-50"
        >
          {syncClickUp.isPending ? <Loader2 size={10} className="animate-spin" /> : <RefreshCw size={10} />}
          {syncClickUp.isPending ? 'Syncing…' : 'Sync Now'}
        </button>
      ),
      learnMoreUrl: 'https://clickup.com',
    },
    {
      id:          'flodesk',
      icon:        <BrandIcon src={flodeskSvg} alt="Flodesk" />,
      title:       'Flodesk',
      description: 'Sync clients, leads, and paying customers to Flodesk subscriber segments for email marketing.',
      category:    'communication',
      isConnected: profile?.flodeskConnected ?? false,
      isLoading,
      connectPending:    connectFlodesk.isPending,
      disconnectPending: disconnectFlodesk.isPending,
      onConnect:   () => {},
      onDisconnect: () => disconnectFlodesk.mutate(),
      apiKeyFlow:  true,
      onApiKeyConnect: (key) => connectFlodesk.mutate(key),
      learnMoreUrl: 'https://flodesk.com',
    },
    {
      id:          'canva',
      icon:        <BrandIcon src={canvaSvg} alt="Canva" />,
      title:       'Canva',
      description: 'Browse and attach your Canva designs directly inside proposals and contracts.',
      category:    'design',
      isConnected: profile?.canvaConnected ?? false,
      isLoading,
      connectPending:    connectCanva.isPending,
      disconnectPending: disconnectCanva.isPending,
      onConnect:   () => connectCanva.mutate(),
      onDisconnect: () => disconnectCanva.mutate(),
      learnMoreUrl: 'https://canva.com',
    },
    {
      id:          'google-forms',
      icon:        <BrandIcon src={googleFormsSvg} alt="Google Forms" />,
      title:       'Google Forms',
      description: 'Send Google Form responses directly to ClearWork to create leads or client inquiries automatically.',
      category:    'productivity',
      isConnected: profile?.googleFormsConnected ?? false,
      isLoading,
      connectPending:    connectGoogleForms.isPending,
      disconnectPending: disconnectGoogleForms.isPending,
      onConnect:   () => connectGoogleForms.mutate(),
      onDisconnect: () => disconnectGoogleForms.mutate(),
      extraAction: (
        <button
          onClick={() => setShowSetupModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] transition-colors"
        >
          <BookOpen size={10} />
          Setup guide
        </button>
      ),
      learnMoreUrl: 'https://forms.google.com',
    },
    {
      id:          'google-docs',
      icon:        <BrandIcon src={googleDocsSvg} alt="Google Docs" />,
      title:       'Google Docs',
      description: 'Import Google Docs as proposal templates and export proposals or contracts to your Google Drive.',
      category:    'productivity',
      isConnected: profile?.googleDocsConnected ?? false,
      isLoading,
      connectPending:    connectGoogleDocs.isPending,
      disconnectPending: disconnectGoogleDocs.isPending,
      onConnect:   () => connectGoogleDocs.mutate(),
      onDisconnect: () => disconnectGoogleDocs.mutate(),
      learnMoreUrl: 'https://docs.google.com',
    },
    {
      id:          'google-sheets',
      icon:        <BrandIcon src={googleSheetsSvg} alt="Google Sheets" />,
      title:       'Google Sheets',
      description: 'Auto-track leads, clients, invoices and proposals in a Google Sheet. Every ClearWork event syncs a row in real time.',
      category:    'productivity',
      isConnected: profile?.googleSheetsConnected ?? false,
      isLoading:   isLoading || initGoogleSheets.isPending,
      connectPending:    connectGoogleSheets.isPending,
      disconnectPending: disconnectGoogleSheets.isPending,
      onConnect:    () => connectGoogleSheets.mutate(),
      onDisconnect: () => disconnectGoogleSheets.mutate(),
      extraAction: profile?.googleSheetsConnected && profile.googleSheetsId ? (
        <a
          href={`https://docs.google.com/spreadsheets/d/${profile.googleSheetsId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] transition-colors"
        >
          <ExternalLink size={10} />
          Open Sheet
        </a>
      ) : undefined,
      learnMoreUrl: 'https://sheets.google.com',
    },
    {
      id:          'whatsapp',
      icon:        <WhatsappIcon />,
      title:       'WhatsApp Business',
      description: 'Send event notifications — proposals, invoices, contracts — from your own WhatsApp Business number. Clients see your name and number, not ClearWork.',
      category:    'communication' as Category,
      isConnected: waConnection.data?.connected ?? false,
      isLoading:   waConnection.isLoading,
      connectPending:    connectWa.isPending,
      disconnectPending: disconnectWa.isPending,
      onConnect: () => {
        setWaError(null)
        // TODO(WhatsApp): Replace with FB.login() Embedded Signup flow once Meta App is registered.
        // See src/features/settings/components/CommunicationTab.tsx for the commented-out FB.login() block.
        connectWa.mutate('__placeholder__', {
          onError: (err) => setWaError((err as Error).message),
        })
      },
      onDisconnect: () => {
        setWaError(null)
        disconnectWa.mutate(undefined, {
          onError: (err) => setWaError((err as Error).message),
        })
      },
      error: waError,
      extraAction: waConnection.data?.connected ? (
        <button
          onClick={() => setShowWaModal(true)}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:text-[#4F46E5] transition-colors"
        >
          <MessageCircle size={10} />
          Configure notifications
        </button>
      ) : undefined,
    },
  ]

  const filtered = activeTab === 'all'
    ? integrations
    : integrations.filter((i) => i.category === activeTab)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Integrations and connected apps</h3>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Supercharge your workflow and connect the tools you use every day.</p>
        </div>
        <button
          onClick={() => setShowRequestModal(true)}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors"
        >
          + Request integration
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#2A2B35]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 text-[13px] font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#6366F1] text-[#6366F1] dark:text-[#818CF8] dark:border-[#818CF8]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((integration) => (
          <IntegrationCard key={integration.id} {...integration} />
        ))}
      </div>

      {showRequestModal && (
        <RequestIntegrationModal onClose={() => setShowRequestModal(false)} />
      )}
      {showSetupModal && (
        <GoogleFormsSetupModal onClose={() => setShowSetupModal(false)} />
      )}
      {showWaModal && (
        <WhatsappNotificationsModal
          displayPhone={waConnection.data?.displayPhone}
          onClose={() => setShowWaModal(false)}
        />
      )}
    </div>
  )
}
