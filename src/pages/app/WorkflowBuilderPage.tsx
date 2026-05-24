import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { nanoid } from 'nanoid'
import {
  ArrowLeft, GripVertical, Plus, Trash2, ChevronRight, ChevronDown,
  Loader2, Check, Zap, GitBranch, Mail, Send, Tag, ClipboardList,
  FilePlus, FileCheck, StickyNote, Play, CheckCircle2, XCircle, Clock,
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

const ACTION_TYPES = Object.entries(ACTION_LABELS).map(([type, label]) => ({ type, label }))

const CONDITION_FIELDS = Object.entries(CONDITION_FIELD_LABELS).map(([field, label]) => ({ field, label }))

const OPERATORS_FOR_FIELD: Record<string, { op: string; label: string }[]> = {
  'lead.budget':    [{ op: 'gt', label: '>' }, { op: 'lt', label: '<' }, { op: 'eq', label: '=' }],
  'lead.stage':     [{ op: 'eq', label: 'is' }, { op: 'ne', label: 'is not' }],
  'lead.source':    [{ op: 'eq', label: 'is' }, { op: 'contains', label: 'contains' }],
  'invoice.total':  [{ op: 'gt', label: '>' }, { op: 'lt', label: '<' }, { op: 'eq', label: '=' }],
  'client.hasEmail': [{ op: 'eq', label: 'is' }],
}

const ACTION_ICONS: Record<string, ReactNode> = {
  'send_email.client': <Mail size={13} />,
  'send_email.me':     <Mail size={13} />,
  'send_form':         <Send size={13} />,
  'change_lead_stage': <Tag size={13} />,
  'create_task':       <ClipboardList size={13} />,
  'add_note':          <StickyNote size={13} />,
  'create.contract':   <FilePlus size={13} />,
  'create.invoice':    <FileCheck size={13} />,
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
    id:        nanoid(8),
    type:      'condition',
    condition: { field: 'lead.budget', operator: 'gt', value: '0' },
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

function insertAfterInTree(steps: WorkflowStep[], afterId: string | null, newStep: WorkflowStep, branch?: 'true' | 'false', condId?: string): WorkflowStep[] {
  if (afterId === null && !condId) {
    return [...steps, newStep]
  }
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

// ─── Add Step Button ──────────────────────────────────────────────────────────

function AddStepButton({
  onAdd,
}: {
  onAdd: (type: 'action' | 'condition') => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative flex justify-center">
      {/* Connector line */}
      <div className="absolute top-0 left-1/2 -translate-x-px w-px h-4 bg-[#D0D5DD] dark:bg-[#3D4258]" />
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="relative mt-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full border border-dashed border-[#D0D5DD] dark:border-[#3D4258] text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:border-[#6366F1] hover:text-[#6366F1] dark:hover:border-[#818CF8] dark:hover:text-[#818CF8] bg-white dark:bg-[#13141A] transition-colors"
      >
        <Plus size={11} /> Add step
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <div className="absolute top-9 z-30 bg-white dark:bg-[#1A1B26] rounded-xl shadow-lg border border-[#EAECF0] dark:border-[#26283A] w-44 overflow-hidden">
            <button
              type="button"
              onClick={() => { onAdd('action'); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
            >
              <Zap size={13} className="text-[#6366F1]" /> Action
            </button>
            <button
              type="button"
              onClick={() => { onAdd('condition'); setOpen(false) }}
              className="w-full flex items-center gap-2 px-4 py-2.5 text-[12.5px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
            >
              <GitBranch size={13} className="text-[#F59E0B]" /> Condition (if/else)
            </button>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Action Step Block ────────────────────────────────────────────────────────

function ActionStepBlock({
  step,
  selected,
  onSelect,
  onRemove,
}: {
  step:     ActionNode
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}) {
  const delayStr = step.delay.value === 0
    ? 'Immediately'
    : `After ${step.delay.value} ${step.delay.unit}`

  return (
    <div
      onClick={onSelect}
      className={cn(
        'card p-3.5 flex items-start gap-2.5 cursor-pointer transition-all group',
        selected && 'ring-2 ring-[#6366F1] dark:ring-[#818CF8]',
      )}
    >
      <GripVertical size={14} className="text-[#D0D5DD] dark:text-[#3D4258] mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#6366F1] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E2040] px-1.5 py-0.5 rounded">
            <Clock size={9} /> {delayStr}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
          <span className="text-[#6366F1] dark:text-[#818CF8]">{ACTION_ICONS[step.action.type] ?? <Zap size={13} />}</span>
          {ACTION_LABELS[step.action.type] ?? step.action.type}
        </div>
        {step.action.type.startsWith('send_email') && step.action.config.subject && (
          <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate mt-0.5">
            {step.action.config.subject as string}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="opacity-0 group-hover:opacity-100 text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] dark:hover:text-red-400 transition-all shrink-0 mt-0.5"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ─── Condition Block ──────────────────────────────────────────────────────────

function ConditionBlock({
  step,
  selected,
  onSelect,
  onRemove,
  onAddToTrueBranch,
  onAddToFalseBranch,
  renderSteps,
}: {
  step:               ConditionNode
  selected:           boolean
  onSelect:           () => void
  onRemove:           () => void
  onAddToTrueBranch:  (type: 'action' | 'condition') => void
  onAddToFalseBranch: (type: 'action' | 'condition') => void
  renderSteps:        (steps: WorkflowStep[]) => React.ReactNode
}) {
  const fieldLabel = CONDITION_FIELD_LABELS[step.condition.field] ?? step.condition.field
  const opLabel    = OPERATORS_FOR_FIELD[step.condition.field]?.find(o => o.op === step.condition.operator)?.label ?? step.condition.operator

  return (
    <div
      onClick={onSelect}
      className={cn(
        'card overflow-hidden cursor-pointer transition-all group',
        selected && 'ring-2 ring-[#F59E0B]',
      )}
    >
      {/* Condition header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div className="flex items-center gap-2">
          <GitBranch size={14} className="text-[#F59E0B]" />
          <span className="text-[12.5px] font-bold text-[#344054] dark:text-[#C2C8D8]">
            IF <span className="text-[#6366F1] dark:text-[#818CF8]">{fieldLabel}</span> {opLabel} <span className="text-[#6366F1] dark:text-[#818CF8]">{step.condition.value}</span>
          </span>
        </div>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="opacity-0 group-hover:opacity-100 text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] dark:hover:text-red-400 transition-all"
        >
          <Trash2 size={13} />
        </button>
      </div>

      {/* Two branches */}
      <div className="grid grid-cols-2 divide-x divide-[#F2F4F7] dark:divide-[#26283A]">
        {/* YES branch */}
        <div className="p-3 space-y-2">
          <p className="text-[10.5px] font-bold text-[#027A48] dark:text-[#34D399] uppercase tracking-wide">YES</p>
          {renderSteps(step.trueBranch)}
          <AddStepButton onAdd={onAddToTrueBranch} />
        </div>
        {/* NO branch */}
        <div className="p-3 space-y-2">
          <p className="text-[10.5px] font-bold text-[#D92D20] dark:text-red-400 uppercase tracking-wide">NO</p>
          {renderSteps(step.falseBranch)}
          <AddStepButton onAdd={onAddToFalseBranch} />
        </div>
      </div>
    </div>
  )
}

// ─── Step List (recursive) ────────────────────────────────────────────────────

function StepList({
  steps,
  selectedId,
  onSelect,
  onRemove,
  onAddAfter,
  onAddToBranch,
}: {
  steps:        WorkflowStep[]
  selectedId:   string | null
  onSelect:     (id: string) => void
  onRemove:     (id: string) => void
  onAddAfter:   (afterId: string, type: 'action' | 'condition') => void
  onAddToBranch:(condId: string, branch: 'true' | 'false', type: 'action' | 'condition') => void
}) {
  return (
    <>
      {steps.map(step => (
        <div key={step.id} className="space-y-0">
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

// ─── Trigger Config ───────────────────────────────────────────────────────────

function TriggerConfig({
  trigger,
  onChange,
  forms,
}: {
  trigger:  WorkflowTrigger
  onChange: (t: WorkflowTrigger) => void
  forms:    { id: string; title: string }[]
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Trigger</h3>
      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">When this happens</label>
        <select
          value={trigger.type}
          onChange={e => onChange({ type: e.target.value, config: {} })}
          className="form-input w-full text-[13px]"
        >
          {TRIGGER_TYPES.map(t => (
            <option key={t.type} value={t.type}>{t.label}</option>
          ))}
        </select>
      </div>

      {trigger.type === 'lead.stage_changed' && (
        <div>
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Stage (optional — leave blank for any stage)</label>
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
          <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Form (optional — leave blank for any form)</label>
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

// ─── Action Step Config ───────────────────────────────────────────────────────

function ActionStepConfig({
  step,
  onChange,
  forms,
}: {
  step:     ActionNode
  onChange: (patch: Partial<ActionNode>) => void
  forms:    { id: string; title: string }[]
}) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null)

  function insertMergeField(field: string) {
    const ta  = textAreaRef.current
    if (!ta) return
    const start = ta.selectionStart
    const end   = ta.selectionEnd
    const body  = (step.action.config.body as string) ?? ''
    const next  = body.slice(0, start) + field + body.slice(end)
    onChange({ action: { ...step.action, config: { ...step.action.config, body: next } } })
    requestAnimationFrame(() => { ta.setSelectionRange(start + field.length, start + field.length); ta.focus() })
  }

  const isImmediate = step.delay.value === 0

  return (
    <div className="space-y-4">
      <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Action Step</h3>

      {/* Delay */}
      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Delay</label>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-[12px] font-medium text-[#344054] dark:text-[#C2C8D8] cursor-pointer">
            <input
              type="checkbox"
              checked={isImmediate}
              onChange={e => onChange({ delay: e.target.checked ? { value: 0, unit: 'days' } : { value: 1, unit: 'days' } })}
              className="w-3.5 h-3.5 rounded"
            />
            Immediately
          </label>
          {!isImmediate && (
            <>
              <input
                type="number"
                min={1}
                value={step.delay.value}
                onChange={e => onChange({ delay: { ...step.delay, value: Number(e.target.value) } })}
                className="form-input w-20 text-[12px]"
              />
              <select
                value={step.delay.unit}
                onChange={e => onChange({ delay: { ...step.delay, unit: e.target.value as ActionNode['delay']['unit'] } })}
                className="form-input text-[12px] flex-1"
              >
                <option value="minutes">minutes</option>
                <option value="hours">hours</option>
                <option value="days">days</option>
              </select>
            </>
          )}
        </div>
      </div>

      {/* Action type */}
      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Action</label>
        <select
          value={step.action.type}
          onChange={e => onChange({ action: { type: e.target.value, config: {} } })}
          className="form-input w-full text-[13px]"
        >
          {ACTION_TYPES.map(a => (
            <option key={a.type} value={a.type}>{a.label}</option>
          ))}
        </select>
      </div>

      {/* Email config */}
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
              placeholder="Write your email body…"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {MERGE_FIELDS.map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => insertMergeField(f)}
                  className="text-[10px] font-mono font-semibold text-[#6366F1] dark:text-[#818CF8] bg-[#EEF2FF] dark:bg-[#1E2040] px-1.5 py-0.5 rounded hover:opacity-80 transition-opacity"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Send form config */}
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

      {/* Change lead stage config */}
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

      {/* Create task config */}
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

      {/* Add note config */}
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

      {/* Auto-create info */}
      {(step.action.type === 'create.contract' || step.action.type === 'create.invoice') && (
        <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg p-3">
          This action runs automatically with no extra configuration needed.
        </p>
      )}
    </div>
  )
}

// ─── Condition Config ─────────────────────────────────────────────────────────

function ConditionConfig({
  step,
  onChange,
}: {
  step:     ConditionNode
  onChange: (patch: Partial<ConditionNode>) => void
}) {
  const operators = OPERATORS_FOR_FIELD[step.condition.field] ?? []

  return (
    <div className="space-y-4">
      <h3 className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8]">Condition (if/else)</h3>

      <div>
        <label className="block text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] mb-1.5">Check this field</label>
        <select
          value={step.condition.field}
          onChange={e => onChange({ condition: { ...step.condition, field: e.target.value, operator: OPERATORS_FOR_FIELD[e.target.value]?.[0]?.op ?? 'eq', value: '' } })}
          className="form-input w-full text-[13px]"
        >
          {CONDITION_FIELDS.map(f => (
            <option key={f.field} value={f.field}>{f.label}</option>
          ))}
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
            {operators.map(o => (
              <option key={o.op} value={o.op}>{o.label}</option>
            ))}
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

  if (isLoading) return <div className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded-xl h-32" />

  if (!runs?.length) {
    return (
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] py-14 text-center">
        <Play size={24} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-2" />
        <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">No runs yet</p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Activate this workflow to start collecting runs.</p>
      </div>
    )
  }

  const STATUS_ICON: Record<WorkflowRun['status'], React.ReactNode> = {
    RUNNING:   <Clock     size={14} className="text-[#F59E0B]"                    />,
    COMPLETED: <CheckCircle2 size={14} className="text-[#027A48] dark:text-[#34D399]" />,
    FAILED:    <XCircle   size={14} className="text-[#D92D20] dark:text-red-400"   />,
    CANCELLED: <XCircle   size={14} className="text-[#98A2B3] dark:text-[#545C74]" />,
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] overflow-hidden">
      <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
        {runs.map(run => {
          const isExpanded = expanded === run.id
          return (
            <div key={run.id}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : run.id)}
                className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors text-left"
              >
                {STATUS_ICON[run.status]}
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate">
                    {run.entityType} · {run.entityId.slice(0, 8)}…
                  </p>
                  <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(run.startedAt)}</p>
                </div>
                <span className={cn(
                  'text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                  run.status === 'COMPLETED' && 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
                  run.status === 'FAILED'    && 'bg-[#FEF3F2] dark:bg-red-950/40 text-[#D92D20] dark:text-red-400',
                  run.status === 'RUNNING'   && 'bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400',
                  run.status === 'CANCELLED' && 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                )}>
                  {run.status}
                </span>
                {isExpanded ? <ChevronDown size={13} className="text-[#98A2B3] shrink-0" /> : <ChevronRight size={13} className="text-[#98A2B3] shrink-0" />}
              </button>
              {isExpanded && run.log.length > 0 && (
                <div className="px-5 pb-3 space-y-1.5 bg-[#FAFBFF] dark:bg-[#1A1B23] border-t border-[#F2F4F7] dark:border-[#26283A]">
                  {run.log.map((entry, i) => (
                    <div key={i} className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] flex items-start gap-2">
                      <span className="text-[#D0D5DD] dark:text-[#3D4258] font-mono">{i + 1}.</span>
                      <span>
                        {entry.actionType ?? entry.type ?? 'step'} → {entry.error ? <span className="text-[#D92D20]">{entry.error}</span> : <span className="text-[#027A48] dark:text-[#34D399]">{entry.result ?? 'ok'}</span>}
                        <span className="text-[#D0D5DD] dark:text-[#3D4258] ml-1.5">{formatDate(entry.executedAt)}</span>
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

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <button
          onClick={() => navigate('/app/automations')}
          className="flex items-center gap-1.5 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors font-medium shrink-0"
        >
          <ArrowLeft size={14} /> Automations
        </button>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="flex-1 min-w-[140px] text-[16px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight bg-transparent border-none outline-none placeholder:text-[#D0D5DD] dark:placeholder:text-[#3D4258]"
          placeholder="Workflow name"
        />
        <div className="flex items-center gap-3 shrink-0">
          {/* Active toggle */}
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={isActive}
              onClick={handleToggleActive}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors',
                isActive ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
              )}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                isActive ? 'translate-x-4' : 'translate-x-0',
              )} />
            </button>
            <span className="text-[12.5px] font-semibold text-[#667085] dark:text-[#8B92A8]">
              {isActive ? 'Active' : 'Inactive'}
            </span>
          </label>

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className={cn(
              'flex items-center gap-1.5 h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-colors',
              saving || saved
                ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
                : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5]',
            )}
          >
            {saving
              ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
              : saved
                ? <><Check size={13} /> Saved</>
                : 'Save'}
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-[#EAECF0] dark:border-[#26283A] mb-5">
        {(['builder', 'runs'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors capitalize',
              activeTab === tab
                ? 'border-[#6366F1] text-[#6366F1]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <div key={i} className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-16 rounded-xl" />)}
        </div>
      ) : activeTab === 'runs' ? (
        <RunsTab workflowId={id!} />
      ) : (
        <div className="flex gap-5 items-start">
          {/* Canvas */}
          <div className="flex-1 min-w-0 space-y-0">
            {/* Trigger block */}
            <div
              onClick={() => setSelectedId('trigger')}
              className={cn(
                'card p-4 flex items-center gap-3 cursor-pointer transition-all mb-0',
                selectedId === 'trigger' && 'ring-2 ring-[#6366F1] dark:ring-[#818CF8]',
              )}
            >
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0">
                <Zap size={15} className="text-[#6366F1]" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide mb-0.5">Trigger</p>
                <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                  {TRIGGER_LABELS[trigger.type] ?? trigger.type}
                </p>
              </div>
            </div>

            {/* Steps */}
            <AddStepButton onAdd={addFirstStep} />

            <StepList
              steps={steps}
              selectedId={selectedId as string | null}
              onSelect={setSelectedId}
              onRemove={removeStep}
              onAddAfter={addAfterStep}
              onAddToBranch={addToBranch}
            />

            {steps.length === 0 && (
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] text-center py-4">
                No steps yet. Click "+ Add step" above to begin.
              </p>
            )}
          </div>

          {/* Config panel */}
          {selectedId && (
            <div className="w-[300px] shrink-0 card p-5 sticky top-4 space-y-1">
              {selectedId === 'trigger' ? (
                <TriggerConfig
                  trigger={trigger}
                  onChange={setTrigger}
                  forms={forms}
                />
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
          )}
        </div>
      )}
    </div>
  )
}

// ─── Helper ───────────────────────────────────────────────────────────────────

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
