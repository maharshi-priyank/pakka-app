import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Zap, Edit2, Trash2, Copy, CheckCheck, GitBranch } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import {
  useWorkflows, useCreateWorkflow, useUpdateWorkflow, useDeleteWorkflow,
  TRIGGER_LABELS, type AutomationWorkflow,
} from '../hooks/useWorkflows'

// ─── New Workflow Modal ───────────────────────────────────────────────────────

function NewWorkflowModal({ onClose }: { onClose: () => void }) {
  const [name, setName]    = useState('')
  const { mutate, isPending } = useCreateWorkflow()

  function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    mutate(trimmed)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white dark:bg-[#1A1B26] rounded-2xl shadow-xl border border-[#EAECF0] dark:border-[#26283A] w-full max-w-sm p-6 space-y-4">
        <h2 className="text-[16px] font-extrabold text-[#101828] dark:text-[#ECEEF3]">New Workflow</h2>
        <div>
          <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1.5">Name</label>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
            placeholder="e.g. Onboarding sequence"
            className="form-input w-full"
          />
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={!name.trim() || isPending}
            className="flex-1 py-2 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold transition-colors disabled:opacity-50"
          >
            {isPending ? 'Creating…' : 'Create & Edit'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Workflow Card ────────────────────────────────────────────────────────────

function WorkflowCard({ wf }: { wf: AutomationWorkflow }) {
  const navigate          = useNavigate()
  const { mutate: update, isPending: toggling } = useUpdateWorkflow()
  const { mutate: remove }                      = useDeleteWorkflow()
  const [confirmDelete, setConfirmDelete]       = useState(false)

  const triggerLabel = TRIGGER_LABELS[wf.trigger?.type ?? ''] ?? wf.trigger?.type ?? 'No trigger'
  const stepCount    = wf.steps?.length ?? 0

  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate">{wf.name}</p>
          <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">When: {triggerLabel}</p>
        </div>
        {/* Active toggle */}
        <button
          type="button"
          role="switch"
          aria-checked={wf.isActive}
          onClick={() => update({ id: wf.id, isActive: !wf.isActive })}
          disabled={toggling}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors disabled:opacity-50',
            wf.isActive ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
          )}
        >
          <span className={cn(
            'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
            wf.isActive ? 'translate-x-4' : 'translate-x-0',
          )} />
        </button>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F2F4F7] dark:bg-[#21222D] px-2 py-0.5 rounded-full">
          <GitBranch size={10} /> {stepCount} step{stepCount !== 1 ? 's' : ''}
        </span>
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F2F4F7] dark:bg-[#21222D] px-2 py-0.5 rounded-full">
          <Zap size={10} /> {wf._count?.runs ?? wf.runCount} runs
        </span>
        {wf.lastRunAt && (
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
            Last run {formatDate(wf.lastRunAt)}
          </span>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <button
          onClick={() => navigate(`/app/automations/${wf.id}`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] dark:hover:text-[#818CF8] transition-colors"
        >
          <Edit2 size={12} /> Edit
        </button>
        <div className="flex-1" />
        {confirmDelete ? (
          <>
            <span className="text-[11.5px] text-[#D92D20]">Delete?</span>
            <button
              onClick={() => remove(wf.id)}
              className="text-[11.5px] font-bold text-[#D92D20] hover:opacity-80 transition-opacity"
            >
              Yes
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11.5px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:opacity-80 transition-opacity"
            >
              No
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] dark:hover:text-red-400 transition-colors"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Main list ────────────────────────────────────────────────────────────────

export default function WorkflowsList() {
  const { data: workflows, isLoading } = useWorkflows()
  const [showModal, setShowModal]      = useState(false)

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-5 space-y-3">
            <div className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-4 w-40 rounded" />
            <div className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-3 w-56 rounded" />
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {showModal && <NewWorkflowModal onClose={() => setShowModal(false)} />}

      <div className="flex items-center justify-between mb-4">
        <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">
          {workflows?.length ?? 0} workflow{(workflows?.length ?? 0) !== 1 ? 's' : ''}
        </p>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[13px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors"
        >
          <Plus size={14} /> New Workflow
        </button>
      </div>

      {!workflows?.length ? (
        <div className="rounded-xl border border-dashed border-[#D0D5DD] dark:border-[#3D4258] py-16 text-center">
          <Zap size={28} className="text-[#D0D5DD] dark:text-[#3D4258] mx-auto mb-3" />
          <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">No workflows yet</p>
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-1 mb-4">
            Create a workflow to automate repetitive actions.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[13px] font-semibold transition-colors"
          >
            <Plus size={14} /> Create your first workflow
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {workflows.map(wf => <WorkflowCard key={wf.id} wf={wf} />)}
        </div>
      )}
    </>
  )
}
