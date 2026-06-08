import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import {
  ArrowLeft, GripVertical, Plus, Trash2, ChevronRight, ChevronDown,
  Loader2, Check, Zap, GitBranch, Mail, Send, Tag, ClipboardList,
  FilePlus, FileCheck, StickyNote, Play, CheckCircle2, XCircle, Clock, X,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  useWorkflow, useUpdateWorkflow, useWorkflowRuns,
  TRIGGER_LABELS, ACTION_LABELS, CONDITION_FIELD_LABELS, LEAD_STAGES, MERGE_FIELDS,
  type WorkflowStep, type ActionNode, type ConditionNode, type WorkflowTrigger,
  type WorkflowRun,
} from '@/features/automations/hooks/useWorkflows'
import { useForms } from '@/features/forms/hooks/useForms'

// ─── Constants ────────────────────────────────────────────────────────────────

const TRIGGER_TYPES = Object.entries(TRIGGER_LABELS).map(([type, label]) => ({ type, label }))
const ACTION_TYPES  = Object.entries(ACTION_LABELS).map(([type, label]) => ({ type, label }))
const CONDITION_FIELDS = Object.entries(CONDITION_FIELD_LABELS).map(([field, label]) => ({ field, label }))

const OPERATORS_FOR_FIELD: Record<string, { op: string; label: string }[]> = {
  'lead.budget':     [{ op: 'gt', label: '>' }, { op: 'lt', label: '<' }, { op: 'eq', label: '=' }],
  'lead.stage':      [{ op: 'eq', label: 'is' }, { op: 'ne', label: 'is not' }],
  'lead.source':     [{ op: 'eq', label: 'is' }, { op: 'contains', label: 'contains' }],
  'invoice.total':   [{ op: 'gt', label: '>' }, { op: 'lt', label: '<' }, { op: 'eq', label: '=' }],
  'client.hasEmail': [{ op: 'eq', label: 'is' }],
}

const ACTION_ICONS: Record<string, ReactNode> = {
  'send_email.client': <Mail size={14} />,
  'send_email.me':     <Mail size={14} />,
  'send_form':         <Send size={14} />,
  'change_lead_stage': <Tag size={14} />,
  'create_task':       <ClipboardList size={14} />,
  'add_note':          <StickyNote size={14} />,
  'create.contract':   <FilePlus size={14} />,
  'create.invoice':    <FileCheck size={14} />,
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeActionStep(): ActionNode {
  return {
    id:     nanoid(8),
    type:   'action',
    delay:  { value: 0, unit: 'days' },
    action: { type: 'send_email.client', config: { subject: '', body: '' } },
  }
}

function makeConditionStep(): ConditionNode {
  return {
    id:          nanoid(8),
    type:        'condition',
    condition:   { field: 'lead.budget', operator: 'gt', value: '0' },
    trueBranch:  [],
    falseBranch: [],
  }
}

function updateStepInTree(steps: WorkflowStep[], id: string, patch: Partial<WorkflowStep>): WorkflowStep[] {
  return steps.map(step => {
    if (step.id === id) return { ...step, ...patch } as WorkflowStep
    if (step.type === 'condition') {
      return {
        ...step,
        trueBranch:  updateStepInTree(step.trueBranch,  id, patch),
        falseBranch: updateStepInTree(step.falseBranch, id, patch),
      }
    }
    return step
  })
}

function removeStepFromTree(steps: WorkflowStep[], id: string): WorkflowStep[] {
  return steps
    .filter(s => s.id !== id)
    .map(step => {
      if (step.type === 'condition') {
        return {
          ...step,
          trueBranch:  removeStepFromTree(step.trueBranch,  id),
          falseBranch: removeStepFromTree(step.falseBranch, id),
        }
      }
      return step
    })
}

function insertAfterInTree(
  steps: WorkflowStep[],
  afterId: string | null,
  newStep: WorkflowStep,
  branch?: 'true' | 'false',
  condId?: string,
): WorkflowStep[] {
  if (afterId === null && !condId) return [...steps, newStep]
  return steps.flatMap(step => {
    if (step.id === afterId) return [step, newStep]
    if (step.type === 'condition') {
      if (step.id === condId) {
        if (branch === 'true')  return [{ ...step, trueBranch:  [...step.trueBranch,  newStep] }]
        if (branch === 'false') return [{ ...step, falseBranch: [...step.falseBranch, newStep] }]
      }
      return [{
        ...step,
        trueBranch:  insertAfterInTree(step.trueBranch,  afterId, newStep, branch, condId),
        falseBranch: insertAfterInTree(step.falseBranch, afterId, newStep, branch, condId),
      }]
    }
    return [step]
  })
}

function findStepById(steps: WorkflowStep[], id: string): WorkflowStep | null {
  for (const step of steps) {
    if (step.id === id) return step
    if (step.type === 'condition') {
      const found = findStepById(step.trueBranch, id) ?? findStepById(step.falseBranch, id)
      if (found) return found
    }
  }
  return null
}

// ─── Add Step Button ──────────────────────────────────────────────────────────

function AddStepButton({ onAdd }: { onAdd: (type: 'action' | 'condition') => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-col items-center relative z-10">
      <div className="w-px h-3 bg-[#D0D5DD] dark:bg-[#3D4258]" />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn(
          'flex items-center justify-center w-7 h-7 rounded-full border-2 border-dashed transition-all',
          open
            ? 'border-[#6366F1] bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1] dark:text-[#818CF8] rotate-45'
            : 'border-[#D0D5DD] dark:border-[#3D4258] bg-white dark:bg-[#13141A] text-[#98A2B3] dark:text-[#545C74] hover:border-[#6366F1] dark:hover:border-[#818CF8] hover:text-[#6366F1] dark:hover:text-[#818CF8]',
        )}
      >
        <Plus size={13} />
      </button>
      <div className="w-px h-3 bg-[#D0D5DD] dark:bg-[#3D4258]" />

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-10 z-30 bg-white dark:bg-[#1A1B26] rounded-xl shadow-xl border border-[#EAECF0] dark:border-[#26283A] w-52 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            <button
              type="button"
              onClick={() => { onAdd('action'); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0">
                <Zap size={13} className="text-[#6366F1]" />
              </span>
              <div className="text-left">
                <p className="font-semibold text-[12.5px]">Action</p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Send email, change stage…</p>
              </div>
            </button>
            <div className="h-px bg-[#F2F4F7] dark:bg-[#26283A]" />
            <button
              type="button"
              onClick={() => { onAdd('condition'); setOpen(false) }}
              className="w-full flex items-center gap-3 px-4 py-3 text-[13px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              <span className="w-7 h-7 rounded-lg bg-[#FFF8EC] dark:bg-[#2A2010] flex items-center justify-center shrink-0">
                <GitBranch size={13} className="text-[#F59E0B]" />
              </span>
              <div className="text-left">
                <p className="font-semibold text-[12.5px]">Condition</p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Branch with if/else logic</p>
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Action Step Block ────────────────────────────────────────────────────────

function ActionStepBlock({
  step, selected, onSelect, onRemove,
}: {
  step: ActionNode; selected: boolean; onSelect: () => void; onRemove: () => void
}) {
  const delayStr = step.delay.value === 0
    ? 'Immediately'
    : `After ${step.delay.value} ${step.delay.unit}`

  return (
    <div
      onClick={onSelect}
      className={cn(
        'w-full bg-white dark:bg-[#1A1B26] border rounded-xl p-4 cursor-pointer transition-all group',
        'hover:shadow-md hover:border-[#C7D7FE] dark:hover:border-[#3D4880]',
        selected
          ? 'border-[#6366F1] shadow-[0_0_0_3px_rgba(99,102,241,0.15)] dark:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]'
          : 'border-[#EAECF0] dark:border-[#26283A] shadow-sm',
      )}
    >
      <div className="flex items-start gap-3">
        <GripVertical size={14} className="text-[#D0D5DD] dark:text-[#3D4258] mt-1 shrink-0 cursor-grab" />

        <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0 text-[#6366F1] dark:text-[#818CF8]">
          {ACTION_ICONS[step.action.type] ?? <Zap size={14} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#6366F1] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E2040] px-2 py-0.5 rounded-full">
              <Clock size={9} /> {delayStr}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] leading-snug">
            {ACTION_LABELS[step.action.type] ?? step.action.type}
          </p>
          {step.action.type.startsWith('send_email') && typeof step.action.config.subject === 'string' && step.action.config.subject && (
            <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] truncate mt-0.5">
              {step.action.config.subject}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  )
}

// ─── Condition Block ──────────────────────────────────────────────────────────

function ConditionBlock({
  step, selected, onSelect, onRemove,
  onAddToTrueBranch, onAddToFalseBranch, renderSteps,
}: {
  step:               ConditionNode
  selected:           boolean
  onSelect:           () => void
  onRemove:           () => void
  onAddToTrueBranch:  (type: 'action' | 'condition') => void
  onAddToFalseBranch: (type: 'action' | 'condition') => void
  renderSteps:        (steps: WorkflowStep[]) => ReactNode
}) {
  const fieldLabel = CONDITION_FIELD_LABELS[step.condition.field] ?? step.condition.field
  const opLabel    = OPERATORS_FOR_FIELD[step.condition.field]?.find(o => o.op === step.condition.operator)?.label ?? step.condition.operator

  return (
    <div
      onClick={onSelect}
      className={cn(
        'w-full bg-white dark:bg-[#1A1B26] border rounded-xl overflow-hidden cursor-pointer transition-all group',
        'hover:shadow-md hover:border-[#FDE68A] dark:hover:border-[#5C4A1E]',
        selected
          ? 'border-[#F59E0B] shadow-[0_0_0_3px_rgba(245,158,11,0.15)]'
          : 'border-[#EAECF0] dark:border-[#26283A] shadow-sm',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#FFFBEB] dark:bg-[#1E1A0A] border-b border-[#FDE68A] dark:border-[#3D3010]">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-md bg-[#FEF3C7] dark:bg-[#3D3010] flex items-center justify-center shrink-0">
            <GitBranch size={12} className="text-[#D97706] dark:text-[#F59E0B]" />
          </span>
          <p className="text-[12.5px] font-bold text-[#92400E] dark:text-[#FCD34D]">
            IF{' '}
            <span className="text-[#6366F1] dark:text-[#818CF8]">{fieldLabel}</span>
            {' '}{opLabel}{' '}
            <span className="text-[#6366F1] dark:text-[#818CF8]">{step.condition.value}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:text-red-400 dark:hover:bg-red-950/30 transition-all shrink-0"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Branches */}
      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-[#F2F4F7] dark:divide-[#26283A]">
        {/* YES */}
        <div className="p-4 space-y-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#ECFDF3] dark:bg-emerald-950/40 flex items-center justify-center">
              <Check size={10} className="text-[#027A48] dark:text-[#34D399]" />
            </span>
            <p className="text-[11px] font-bold text-[#027A48] dark:text-[#34D399] uppercase tracking-widest">Yes</p>
          </div>
          {renderSteps(step.trueBranch)}
          <AddStepButton onAdd={onAddToTrueBranch} />
        </div>

        {/* NO */}
        <div className="p-4 space-y-0" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-5 h-5 rounded-full bg-[#FEF3F2] dark:bg-red-950/40 flex items-center justify-center">
              <X size={10} className="text-[#D92D20] dark:text-red-400" />
            </span>
            <p className="text-[11px] font-bold text-[#D92D20] dark:text-red-400 uppercase tracking-widest">No</p>
          </div>
          {renderSteps(step.falseBranch)}
          <AddStepButton onAdd={onAddToFalseBranch} />
        </div>
      </div>
    </div>
  )
}

// ─── Step List (recursive) ────────────────────────────────────────────────────

function StepList({
  steps, selectedId, onSelect, onRemove, onAddAfter, onAddToBranch,
}: {
  steps:         WorkflowStep[]
  selectedId:    string | null
  onSelect:      (id: string) => void
  onRemove:      (id: string) => void
  onAddAfter:    (afterId: string, type: 'action' | 'condition') => void
  onAddToBranch: (condId: string, branch: 'true' | 'false', type: 'action' | 'condition') => void
}) {
  return (
    <>
      {steps.map(step => (
        <div key={step.id} className="flex flex-col items-stretch">
          {step.type === 'action' ? (
            <ActionStepBlock
              step={step}
              selected={selectedId === step.id}
              onSelect={() => onSelect(step.id)}
              onRemove={() => onRemove(step.id)}
            />
          ) : (
            <ConditionBlock
              step={step}
              selected={selectedId === step.id}
              onSelect={() => onSelect(step.id)}
              onRemove={() => onRemove(step.id)}
              onAddToTrueBranch={type  => onAddToBranch(step.id, 'true',  type)}
              onAddToFalseBranch={type => onAddToBranch(step.id, 'false', type)}
              renderSteps={branchSteps => (
                <StepList
                  steps={branchSteps}
                  selectedId={selectedId}
                  onSelect={onSelect}
                  onRemove={onRemove}
                  onAddAfter={onAddAfter}
                  onAddToBranch={onAddToBranch}
                />
              )}
            />
          )}
          <AddStepButton onAdd={type => onAddAfter(step.id, type)} />
        </div>
      ))}
    </>
  )
}

// ─── Trigger Config Panel ─────────────────────────────────────────────────────

function TriggerConfig({
  trigger, onChange, forms,
}: {
  trigger: WorkflowTrigger; onChange: (t: WorkflowTrigger) => void; forms: { id: string; title: string }[]
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center">
          <Zap size={13} className="text-[#6366F1]" />
        </span>
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Trigger</p>
      </div>

      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5 uppercase tracking-wide">When this happens</label>
        <select
          value={trigger.type}
          onChange={e => onChange({ type: e.target.value, config: {} })}
          className="form-input w-full text-[13px]"
        >
          {TRIGGER_TYPES.map(t => <option key={t.type} value={t.type}>{t.label}</option>)}
        </select>
      </div>

      {trigger.type === 'lead.stage_changed' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Specific stage (optional)</label>
          <select
            value={(trigger.config.toStage as string) ?? ''}
            onChange={e => onChange({ ...trigger, config: { toStage: e.target.value || undefined } })}
            className="form-input w-full text-[13px]"
          >
            <option value="">Any stage</option>
            {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {trigger.type === 'form.submitted' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Specific form (optional)</label>
          <select
            value={(trigger.config.formId as string) ?? ''}
            onChange={e => onChange({ ...trigger, config: { formId: e.target.value || undefined } })}
            className="form-input w-full text-[13px]"
          >
            <option value="">Any form</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
      )}
    </div>
  )
}

// ─── Action Step Config Panel ─────────────────────────────────────────────────

function ActionStepConfig({
  step, onChange, forms,
}: {
  step: ActionNode; onChange: (patch: Partial<ActionNode>) => void; forms: { id: string; title: string }[]
}) {
  const textAreaRef  = useRef<HTMLTextAreaElement>(null)
  const isImmediate  = step.delay.value === 0

  function insertMergeField(field: string) {
    const ta = textAreaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const body  = (step.action.config.body as string) ?? ''
    const next  = body.slice(0, start) + field + body.slice(end)
    onChange({ action: { ...step.action, config: { ...step.action.config, body: next } } })
    requestAnimationFrame(() => { ta.setSelectionRange(start + field.length, start + field.length); ta.focus() })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <span className="w-7 h-7 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center text-[#6366F1] dark:text-[#818CF8]">
          {ACTION_ICONS[step.action.type] ?? <Zap size={13} />}
        </span>
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Action Step</p>
      </div>

      {/* Delay */}
      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-2 uppercase tracking-wide">Delay</label>
        <div className="flex items-center gap-2 flex-wrap">
          <label className="flex items-center gap-2 text-[12.5px] font-medium text-[#344054] dark:text-[#C2C8D8] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isImmediate}
              onChange={e => onChange({ delay: e.target.checked ? { value: 0, unit: 'days' } : { value: 1, unit: 'days' } })}
              className="w-3.5 h-3.5 rounded accent-indigo-500"
            />
            Immediately
          </label>
          {!isImmediate && (
            <div className="flex items-center gap-2 flex-1">
              <input
                type="number"
                min={1}
                value={step.delay.value}
                onChange={e => onChange({ delay: { ...step.delay, value: Number(e.target.value) } })}
                className="form-input w-16 text-[12.5px]"
              />
              <select
                value={step.delay.unit}
                onChange={e => onChange({ delay: { ...step.delay, unit: e.target.value as ActionNode['delay']['unit'] } })}
                className="form-input text-[12.5px] flex-1"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Action type */}
      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-2 uppercase tracking-wide">Action</label>
        <select
          value={step.action.type}
          onChange={e => onChange({ action: { type: e.target.value, config: {} } })}
          className="form-input w-full text-[13px]"
        >
          {ACTION_TYPES.map(a => <option key={a.type} value={a.type}>{a.label}</option>)}
        </select>
      </div>

      {/* Email */}
      {(step.action.type === 'send_email.client' || step.action.type === 'send_email.me') && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Subject</label>
            <input
              value={(step.action.config.subject as string) ?? ''}
              onChange={e => onChange({ action: { ...step.action, config: { ...step.action.config, subject: e.target.value } } })}
              className="form-input w-full text-[12.5px]"
              placeholder="Email subject…"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Body</label>
            <textarea
              ref={textAreaRef}
              value={(step.action.config.body as string) ?? ''}
              onChange={e => onChange({ action: { ...step.action, config: { ...step.action.config, body: e.target.value } } })}
              rows={5}
              className="form-input w-full text-[12.5px] resize-none"
              placeholder="Write your email…"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {MERGE_FIELDS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => insertMergeField(f)}
                  className="text-[9.5px] font-mono font-semibold text-[#6366F1] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E2040] px-1.5 py-0.5 rounded hover:opacity-75 transition-opacity"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send form */}
      {step.action.type === 'send_form' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Form</label>
          <select
            value={(step.action.config.formId as string) ?? ''}
            onChange={e => onChange({ action: { ...step.action, config: { formId: e.target.value } } })}
            className="form-input w-full text-[13px]"
          >
            <option value="">Select a form…</option>
            {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}
          </select>
        </div>
      )}

      {/* Lead stage */}
      {step.action.type === 'change_lead_stage' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">New stage</label>
          <select
            value={(step.action.config.stage as string) ?? ''}
            onChange={e => onChange({ action: { ...step.action, config: { stage: e.target.value } } })}
            className="form-input w-full text-[13px]"
          >
            <option value="">Select stage…</option>
            {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      )}

      {/* Create task */}
      {step.action.type === 'create_task' && (
        <div className="space-y-3">
          <div>
            <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Task title</label>
            <input
              value={(step.action.config.title as string) ?? ''}
              onChange={e => onChange({ action: { ...step.action, config: { ...step.action.config, title: e.target.value } } })}
              className="form-input w-full text-[12.5px]"
              placeholder="e.g. Follow up call"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Due in (days)</label>
            <input
              type="number"
              min={0}
              value={(step.action.config.dueOffsetDays as number) ?? 1}
              onChange={e => onChange({ action: { ...step.action, config: { ...step.action.config, dueOffsetDays: Number(e.target.value) } } })}
              className="form-input w-full text-[12.5px]"
            />
          </div>
        </div>
      )}

      {/* Add note */}
      {step.action.type === 'add_note' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Note</label>
          <textarea
            value={(step.action.config.note as string) ?? ''}
            onChange={e => onChange({ action: { ...step.action, config: { note: e.target.value } } })}
            rows={3}
            className="form-input w-full text-[12.5px] resize-none"
            placeholder="Auto-note content…"
          />
        </div>
      )}

      {/* Auto-create */}
      {(step.action.type === 'create.contract' || step.action.type === 'create.invoice') && (
        <div className="flex items-start gap-2.5 bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg p-3">
          <Check size={13} className="text-[#027A48] dark:text-[#34D399] mt-0.5 shrink-0" />
          <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
            This action runs automatically — no extra configuration needed.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Condition Config Panel ───────────────────────────────────────────────────

function ConditionConfig({
  step, onChange,
}: {
  step: ConditionNode; onChange: (patch: Partial<ConditionNode>) => void
}) {
  const operators = OPERATORS_FOR_FIELD[step.condition.field] ?? []

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <span className="w-7 h-7 rounded-lg bg-[#FFF8EC] dark:bg-[#2A2010] flex items-center justify-center">
          <GitBranch size={13} className="text-[#D97706] dark:text-[#F59E0B]" />
        </span>
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Condition (if/else)</p>
      </div>

      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5 uppercase tracking-wide">Check this field</label>
        <select
          value={step.condition.field}
          onChange={e => onChange({ condition: { ...step.condition, field: e.target.value, operator: OPERATORS_FOR_FIELD[e.target.value]?.[0]?.op ?? 'eq', value: '' } })}
          className="form-input w-full text-[13px]"
        >
          {CONDITION_FIELDS.map(f => <option key={f.field} value={f.field}>{f.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Operator</label>
          <select
            value={step.condition.operator}
            onChange={e => onChange({ condition: { ...step.condition, operator: e.target.value } })}
            className="form-input w-full text-[13px]"
          >
            {operators.map(o => <option key={o.op} value={o.op}>{o.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Value</label>
          {step.condition.field === 'lead.stage' ? (
            <select
              value={step.condition.value}
              onChange={e => onChange({ condition: { ...step.condition, value: e.target.value } })}
              className="form-input w-full text-[13px]"
            >
              <option value="">Select…</option>
              {LEAD_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : step.condition.field === 'client.hasEmail' ? (
            <select
              value={step.condition.value}
              onChange={e => onChange({ condition: { ...step.condition, value: e.target.value } })}
              className="form-input w-full text-[13px]"
            >
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          ) : (
            <input
              value={step.condition.value}
              onChange={e => onChange({ condition: { ...step.condition, value: e.target.value } })}
              className="form-input w-full text-[12.5px]"
              placeholder={step.condition.field.includes('budget') || step.condition.field.includes('total') ? '50000' : 'value…'}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Runs Tab ─────────────────────────────────────────────────────────────────

function RunsTab({ workflowId }: { workflowId: string }) {
  const { data: runs, isLoading } = useWorkflowRuns(workflowId)
  const [expanded, setExpanded]   = useState<string | null>(null)

  const STATUS_ICON: Record<WorkflowRun['status'], ReactNode> = {
    RUNNING:   <Clock        size={14} className="text-[#F59E0B]" />,
    COMPLETED: <CheckCircle2 size={14} className="text-[#027A48] dark:text-[#34D399]" />,
    FAILED:    <XCircle      size={14} className="text-[#D92D20] dark:text-red-400" />,
    CANCELLED: <XCircle      size={14} className="text-[#98A2B3] dark:text-[#545C74]" />,
  }

  if (isLoading) return (
    <div className="space-y-2">
      {[1,2,3].map(i => <div key={i} className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-14 rounded-xl" />)}
    </div>
  )

  if (!runs?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-[#D0D5DD] dark:border-[#3D4258]">
        <div className="w-12 h-12 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center mb-3">
          <Play size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
        </div>
        <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">No runs yet</p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Activate this workflow to start collecting runs.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] overflow-hidden shadow-sm">
      <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
        {runs.map(run => {
          const isExpanded = expanded === run.id
          return (
            <div key={run.id}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : run.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors text-left"
              >
                {STATUS_ICON[run.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate">
                    {run.entityType} · {run.entityId.slice(0, 8)}…
                  </p>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(run.startedAt)}</p>
                </div>
                <span className={cn(
                  'text-[10.5px] font-bold px-2.5 py-0.5 rounded-full shrink-0',
                  run.status === 'COMPLETED' && 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
                  run.status === 'FAILED'    && 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400',
                  run.status === 'RUNNING'   && 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
                  run.status === 'CANCELLED' && 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {run.status}
                </span>
                {isExpanded
                  ? <ChevronDown  size={13} className="text-[#98A2B3] shrink-0" />
                  : <ChevronRight size={13} className="text-[#98A2B3] shrink-0" />
                }
              </button>
              {isExpanded && run.log.length > 0 && (
                <div className="px-5 pb-4 pt-2 space-y-2 bg-[#FAFBFF] dark:bg-[#1A1B23] border-t border-[#F2F4F7] dark:border-[#26283A]">
                  {run.log.map((entry, i) => (
                    <div key={i} className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] flex items-start gap-2">
                      <span className="text-[#D0D5DD] dark:text-[#3D4258] font-mono shrink-0">{i + 1}.</span>
                      <span className="flex-1">
                        {entry.actionType ?? entry.type ?? 'step'} →{' '}
                        {entry.error
                          ? <span className="text-[#D92D20]">{entry.error}</span>
                          : <span className="text-[#027A48] dark:text-[#34D399]">{entry.result ?? 'ok'}</span>
                        }
                        <span className="text-[#D0D5DD] dark:text-[#3D4258] ml-2">{formatDate(entry.executedAt)}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkflowBuilderPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: workflow, isLoading } = useWorkflow(id!)
  const { mutateAsync: save, isPending: saving } = useUpdateWorkflow()
  const { data: formsData } = useForms()
  const forms = formsData?.map(f => ({ id: f.id, title: f.title })) ?? []

  const [name,       setName]       = useState('')
  const [trigger,    setTrigger]    = useState<WorkflowTrigger>({ type: 'lead.created', config: {} })
  const [steps,      setSteps]      = useState<WorkflowStep[]>([])
  const [isActive,   setIsActive]   = useState(false)
  const [selectedId, setSelectedId] = useState<string | 'trigger' | null>('trigger')
  const [activeTab,  setActiveTab]  = useState<'builder' | 'runs'>('builder')
  const [saved,      setSaved]      = useState(false)

  useEffect(() => {
    if (workflow) {
      setName(workflow.name)
      setTrigger(workflow.trigger)
      setSteps(workflow.steps)
      setIsActive(workflow.isActive)
    }
  }, [workflow])

  const handleSave = useCallback(async () => {
    if (!id) return
    await save({ id, name, trigger, steps, isActive })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [id, name, trigger, steps, isActive, save])

  function handleToggleActive() {
    const next = !isActive
    setIsActive(next)
    if (id) save({ id, isActive: next })
  }

  function updateStep(stepId: string, patch: Partial<WorkflowStep>) {
    setSteps(prev => updateStepInTree(prev, stepId, patch))
  }

  function removeStep(stepId: string) {
    setSteps(prev => removeStepFromTree(prev, stepId))
    if (selectedId === stepId) setSelectedId(null)
  }

  function addAfterStep(afterId: string, type: 'action' | 'condition') {
    const newStep = type === 'action' ? makeActionStep() : makeConditionStep()
    setSteps(prev => insertAfterInTree(prev, afterId, newStep))
    setSelectedId(newStep.id)
  }

  function addToBranch(condId: string, branch: 'true' | 'false', type: 'action' | 'condition') {
    const newStep = type === 'action' ? makeActionStep() : makeConditionStep()
    setSteps(prev => insertAfterInTree(prev, null, newStep, branch, condId))
    setSelectedId(newStep.id)
  }

  function addFirstStep(type: 'action' | 'condition') {
    const newStep = type === 'action' ? makeActionStep() : makeConditionStep()
    setSteps(prev => [...prev, newStep])
    setSelectedId(newStep.id)
  }

  const selectedStep = selectedId && selectedId !== 'trigger'
    ? findStepById(steps, selectedId)
    : null

  const panelOpen = !!selectedId

  return (
    <div className="flex flex-col h-full">

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3 mb-5 flex-wrap">
        <button
          onClick={() => navigate('/automations')}
          className="flex items-center gap-1.5 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors font-medium shrink-0"
        >
          <ArrowLeft size={14} /> <span className="hidden sm:inline">Automations</span>
        </button>

        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 min-w-[120px] text-[16px] sm:text-[18px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight bg-transparent border-none outline-none placeholder:text-[#D0D5DD] dark:placeholder:text-[#3D4258]"
          placeholder="Workflow name"
        />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Active toggle */}
          <button
            type="button"
            role="switch"
            aria-checked={isActive}
            onClick={handleToggleActive}
            className="flex items-center gap-2 group"
          >
            <span className={cn(
              'relative inline-flex h-5 w-9 rounded-full border-2 border-transparent transition-colors',
              isActive ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
            )}>
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0',
              )} />
            </span>
            <span className="hidden sm:inline text-[12.5px] font-semibold text-[#667085] dark:text-[#8B92A8] group-hover:text-[#344054] dark:group-hover:text-[#C2C8D8] transition-colors">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </button>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-all',
              saved
                ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
                : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] active:scale-95',
            )}
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : saved
                ? <><Check size={13} /> Saved</>
                : 'Save'
            }
          </button>
        </div>
      </div>

      {/* ── Tab bar ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 border-b border-[#EAECF0] dark:border-[#26283A] mb-5">
        {(['builder', 'runs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-4 py-2.5 text-[12.5px] font-semibold border-b-2 -mb-px transition-colors capitalize',
              activeTab === tab
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Loading ──────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="space-y-3 max-w-lg mx-auto w-full">
          {[1,2,3].map(i => <div key={i} className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-16 rounded-xl" />)}
        </div>

      ) : activeTab === 'runs' ? (
        <RunsTab workflowId={id!} />

      ) : (
        /* ── Builder layout ─────────────────────────────────────────────────── */
        <div className={cn(
          'flex gap-5 items-start',
          panelOpen ? 'lg:flex-row flex-col' : '',
        )}>

          {/* Canvas */}
          <div className={cn(
            'flex flex-col items-center w-full',
            panelOpen ? 'lg:flex-1 lg:min-w-0' : 'max-w-xl mx-auto',
          )}>

            {/* Trigger block */}
            <div
              onClick={() => setSelectedId('trigger')}
              className={cn(
                'w-full bg-white dark:bg-[#1A1B26] border rounded-xl p-4 flex items-center gap-3 cursor-pointer transition-all',
                'hover:shadow-md hover:border-[#C7D7FE] dark:hover:border-[#3D4880]',
                selectedId === 'trigger'
                  ? 'border-[#6366F1] shadow-[0_0_0_3px_rgba(99,102,241,0.15)] dark:shadow-[0_0_0_3px_rgba(129,140,248,0.15)]'
                  : 'border-[#EAECF0] dark:border-[#26283A] shadow-sm',
              )}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#6366F1] to-[#818CF8] flex items-center justify-center shrink-0 shadow-sm">
                <Zap size={16} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-widest mb-0.5">Trigger</p>
                <p className="text-[13.5px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">
                  {TRIGGER_LABELS[trigger.type] ?? trigger.type}
                </p>
              </div>
              <ChevronRight size={14} className="text-[#D0D5DD] dark:text-[#3D4258] shrink-0" />
            </div>

            {/* First add button */}
            <AddStepButton onAdd={addFirstStep} />

            {/* Step list */}
            <div className="w-full flex flex-col items-stretch">
              <StepList
                steps={steps}
                selectedId={selectedId as string | null}
                onSelect={setSelectedId}
                onRemove={removeStep}
                onAddAfter={addAfterStep}
                onAddToBranch={addToBranch}
              />
            </div>

            {steps.length === 0 && (
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] text-center py-2">
                Click <strong>+</strong> above to add your first step.
              </p>
            )}
          </div>

          {/* ── Config panel: mobile = bottom sheet, desktop = sticky sidebar ── */}
          {panelOpen && (
            <>
              {/* Mobile backdrop */}
              <div
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setSelectedId(null)}
              />

              {/* Panel */}
              <div className={cn(
                // Mobile: fixed bottom sheet
                'fixed bottom-0 left-0 right-0 z-50 max-h-[78vh] overflow-y-auto',
                'bg-white dark:bg-[#1A1B26] border-t border-[#EAECF0] dark:border-[#26283A]',
                'rounded-t-2xl shadow-2xl px-5 pt-4 pb-8',
                // Desktop: sidebar
                'lg:static lg:bottom-auto lg:left-auto lg:right-auto lg:z-auto',
                'lg:max-h-none lg:rounded-xl lg:border lg:shadow-sm',
                'lg:w-[300px] lg:shrink-0 lg:sticky lg:top-4 lg:px-5 lg:pt-5 lg:pb-5',
              )}>
                {/* Drag handle (mobile only) */}
                <div className="w-10 h-1 bg-[#E4E7EC] dark:bg-[#3D4258] rounded-full mx-auto mb-4 lg:hidden" />

                {/* Close on mobile */}
                <button
                  type="button"
                  onClick={() => setSelectedId(null)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:bg-[#F2F4F7] dark:hover:bg-[#26283A] transition-colors lg:hidden"
                >
                  <X size={15} />
                </button>

                {selectedId === 'trigger' ? (
                  <TriggerConfig trigger={trigger} onChange={setTrigger} forms={forms} />
                ) : selectedStep?.type === 'action' ? (
                  <ActionStepConfig
                    step={selectedStep}
                    onChange={patch => updateStep(selectedStep.id, patch as Partial<WorkflowStep>)}
                    forms={forms}
                  />
                ) : selectedStep?.type === 'condition' ? (
                  <ConditionConfig
                    step={selectedStep}
                    onChange={patch => updateStep(selectedStep.id, patch as Partial<WorkflowStep>)}
                  />
                ) : null}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
