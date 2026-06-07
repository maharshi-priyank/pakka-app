import { useState } from 'react'
import { X, Sparkles, Loader2, Zap, Check, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { useGenerateAutomation, useCreateFromAI, type GeneratedRule } from '../hooks/useAutomations'

const TRIGGER_LABELS: Record<string, string> = {
  'lead.created':       'New lead created',
  'lead.stage_changed': 'Lead stage changed',
  'proposal.accepted':  'Proposal accepted',
  'proposal.sent':      'Proposal sent',
  'contract.signed':    'Contract signed',
  'contract.sent':      'Contract sent',
  'invoice.paid':       'Invoice paid',
  'invoice.sent':       'Invoice sent',
  'invoice.overdue':    'Invoice overdue',
  'meeting.scheduled':  'Meeting scheduled',
}

const ACTION_LABELS: Record<string, string> = {
  'send_email.client': 'Send email to client',
  'send_email.me':     'Send notification to me',
  'create.invoice':    'Auto-create invoice',
  'create.contract':   'Auto-create contract',
  'change_lead_stage': 'Change lead stage',
  'add_note':          'Add note',
}

const CATEGORY_COLORS: Record<string, string> = {
  invoice:  'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400',
  proposal: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400',
  contract: 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-400',
  lead:     'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400',
  business: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-400',
}

const EXAMPLE_PROMPTS = [
  'Send a follow-up email to the client 3 days after the contract is sent but not signed',
  'Alert me when a lead has been inactive for 5 days',
  'Send a thank-you email when an invoice is paid and automatically create the next invoice',
  'Remind me and the client 2 days before an invoice is due',
  'When a proposal is accepted, auto-create a contract and send a welcome email to the client',
]

interface Props {
  onClose: () => void
  onDone?: () => void
}

export default function AIAutomationModal({ onClose, onDone }: Props) {
  const [prompt, setPrompt]         = useState('')
  const [preview, setPreview]       = useState<GeneratedRule[] | null>(null)
  const [selected, setSelected]     = useState<Set<number>>(new Set())
  const [step, setStep]             = useState<'input' | 'preview' | 'done'>('input')

  const generate  = useGenerateAutomation()
  const createAll = useCreateFromAI()

  async function handleGenerate() {
    if (!prompt.trim()) return
    setPreview(null)
    setSelected(new Set())
    try {
      const rules = await generate.mutateAsync(prompt.trim())
      setPreview(rules)
      setSelected(new Set(rules.map((_, i) => i)))
      setStep('preview')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate automations')
    }
  }

  async function handleCreate() {
    if (!preview) return
    const toCreate = preview.filter((_, i) => selected.has(i))
    if (toCreate.length === 0) return
    try {
      await createAll.mutateAsync(toCreate)
      setStep('done')
      toast.success(`${toCreate.length} workflow${toCreate.length > 1 ? 's' : ''} added to My Workflows`)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save automations')
    }
  }

  function toggleSelected(i: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white dark:bg-[#13141C] rounded-2xl shadow-2xl w-full max-w-lg border border-[#EAECF0] dark:border-[#2A2B35] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#EAECF0] dark:border-[#2A2B35] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
              <Sparkles size={15} className="text-white" />
            </div>
            <div>
              <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">AI Automation Builder</h3>
              <p className="text-[11px] text-[#667085] dark:text-[#8B92A8]">Describe your workflow in plain English</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors">
            <X size={16} className="text-[#667085]" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Step: input */}
          {step === 'input' && (
            <>
              <div>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate() }}
                  placeholder="e.g. Send a payment reminder 3 days before an invoice is due, and another one if it goes overdue for a week"
                  rows={4}
                  className="w-full px-3.5 py-3 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] bg-[#F9FAFB] dark:bg-[#1E1F2B] text-[13px] text-[#101828] dark:text-[#ECEEF3] placeholder:text-[#98A2B3] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none transition-colors"
                  autoFocus
                />
                <p className="text-[11px] text-[#98A2B3] mt-1.5">Press ⌘+Enter to generate</p>
              </div>

              <div>
                <p className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wide mb-2">Examples</p>
                <div className="space-y-1.5">
                  {EXAMPLE_PROMPTS.map((ex, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(ex)}
                      className="w-full text-left px-3 py-2 rounded-lg border border-[#EAECF0] dark:border-[#2A2B35] text-[12px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] hover:border-[#6366F1]/40 transition-colors flex items-start gap-2"
                    >
                      <ChevronRight size={13} className="text-[#6366F1] shrink-0 mt-0.5" />
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step: preview */}
          {step === 'preview' && preview && (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">
                  {preview.length} automation{preview.length > 1 ? 's' : ''} generated
                </p>
                <button
                  onClick={() => setStep('input')}
                  className="flex items-center gap-1 text-[12px] text-[#6366F1] hover:text-[#4F46E5] transition-colors"
                >
                  <RefreshCw size={12} /> Regenerate
                </button>
              </div>

              <div className="space-y-3">
                {preview.map((rule, i) => (
                  <div
                    key={i}
                    onClick={() => toggleSelected(i)}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selected.has(i)
                        ? 'border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040]'
                        : 'border-[#EAECF0] dark:border-[#2A2B35] bg-white dark:bg-[#1A1B23] opacity-60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                        selected.has(i) ? 'border-[#6366F1] bg-[#6366F1]' : 'border-[#D0D5DD] dark:border-[#3D4258]'
                      }`}>
                        {selected.has(i) && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">{rule.name}</p>
                          {rule.category && (
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[rule.category] ?? CATEGORY_COLORS.business}`}>
                              {rule.category}
                            </span>
                          )}
                        </div>
                        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mb-2">{rule.description}</p>
                        <div className="flex items-center gap-1.5 text-[11px] text-[#667085] dark:text-[#8B92A8] flex-wrap">
                          <span className="px-2 py-0.5 rounded-md bg-[#F2F4F7] dark:bg-[#21222D] font-medium">
                            {TRIGGER_LABELS[rule.triggerType] ?? rule.triggerType}
                          </span>
                          <ChevronRight size={11} />
                          {(rule.delayValue > 0) && (
                            <>
                              <span className="px-2 py-0.5 rounded-md bg-[#FFF7ED] dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 font-medium">
                                wait {rule.delayValue} {rule.delayUnit}
                              </span>
                              <ChevronRight size={11} />
                            </>
                          )}
                          <span className="px-2 py-0.5 rounded-md bg-[#F2F4F7] dark:bg-[#21222D] font-medium">
                            {ACTION_LABELS[rule.actionType] ?? rule.actionType}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40">
                <AlertCircle size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700 dark:text-amber-300">
                  Added automations start <strong>disabled</strong>. Review and enable the ones you want to activate.
                </p>
              </div>
            </>
          )}

          {/* Step: done */}
          {step === 'done' && (
            <div className="text-center py-8">
              <div className="w-14 h-14 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center mx-auto mb-4">
                <Zap size={24} className="text-[#027A48] dark:text-[#34D399]" />
              </div>
              <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-1">Workflows added!</p>
              <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">Find them in <strong>My Workflows</strong>. Enable the ones you want to run.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#EAECF0] dark:border-[#2A2B35] p-4 shrink-0">
          {step === 'input' && (
            <button
              onClick={handleGenerate}
              disabled={!prompt.trim() || generate.isPending}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[13px] font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {generate.isPending
                ? <><Loader2 size={14} className="animate-spin" /> Generating…</>
                : <><Sparkles size={14} /> Generate automations</>
              }
            </button>
          )}

          {step === 'preview' && (
            <div className="flex gap-2">
              <button
                onClick={() => setStep('input')}
                className="flex-1 py-2.5 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1E1F2B] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={selected.size === 0 || createAll.isPending}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-[13px] font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {createAll.isPending
                  ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
                  : <><Zap size={14} /> Add {selected.size} automation{selected.size !== 1 ? 's' : ''}</>
                }
              </button>
            </div>
          )}

          {step === 'done' && (
            <button
              onClick={() => onDone ? onDone() : onClose()}
              className="w-full py-2.5 rounded-xl bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#4F46E5] transition-colors"
            >
              View in My Workflows
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
