import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ClipboardList, Plus, Copy, CheckCheck, Pencil, Trash2, Loader2 } from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useForms, useCreateForm, useUpdateForm, useDeleteForm, type IntakeForm } from '@/features/forms/hooks/useForms'

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] rounded', className)} />
}

// ─── Create Modal ─────────────────────────────────────────────────────────────

interface CreateModalProps { onClose: () => void }

function CreateFormModal({ onClose }: CreateModalProps) {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateForm()
  const [title, setTitle]       = useState('')
  const [desc,  setDesc]        = useState('')

  async function handleCreate() {
    if (!title.trim()) return
    const form = await mutateAsync({ title: title.trim(), description: desc.trim() || undefined })
    onClose()
    navigate(`/forms/${form.id}`)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">New Intake Form</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Form title *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="e.g. Project Brief"
              className="form-input w-full"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Description <span className="font-normal text-[#98A2B3]">(optional)</span></label>
            <textarea
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Tell your client what this form is about"
              rows={2}
              className="form-input w-full resize-none"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <button type="button" onClick={onClose} className="btn-ghost text-[13px] px-4 py-2">Cancel</button>
          <button
            type="button"
            onClick={handleCreate}
            disabled={isPending || !title.trim()}
            className="btn-primary text-[13px] flex items-center gap-2"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            {isPending ? 'Creating…' : 'Create form'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Form Card ────────────────────────────────────────────────────────────────

function FormCard({ form }: { form: IntakeForm }) {
  const navigate = useNavigate()
  const { mutate: updateForm, isPending: toggling } = useUpdateForm()
  const { mutate: deleteForm, isPending: deleting }  = useDeleteForm()
  const [copied,        setCopied]        = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  const shareUrl = `${window.location.origin}/q/${form.token}`

  function copyLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3] truncate">{form.title}</h3>
          {form.description && (
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 line-clamp-2">{form.description}</p>
          )}
        </div>
        {/* Active toggle */}
        <button
          role="switch"
          aria-checked={form.isActive}
          disabled={toggling}
          onClick={() => updateForm({ id: form.id, isActive: !form.isActive })}
          className={cn(
            'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
            form.isActive ? 'bg-[#2563EB]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
            toggling && 'opacity-50',
          )}
        >
          <span className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            form.isActive ? 'translate-x-4' : 'translate-x-0',
          )} />
        </button>
      </div>

      <div className="flex items-center gap-3 text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">
        <span>{form._count?.submissions ?? 0} response{(form._count?.submissions ?? 0) !== 1 ? 's' : ''}</span>
        <span>·</span>
        <span>Created {formatDate(form.createdAt)}</span>
        {!form.isActive && (
          <span className="ml-auto text-[11px] font-semibold text-[#D92D20] dark:text-red-400 bg-[#FEF3F2] dark:bg-red-950/30 px-2 py-0.5 rounded-full">Inactive</span>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1 border-t border-[#F2F4F7] dark:border-[#26283A]">
        <button
          onClick={copyLink}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        >
          {copied ? <><CheckCheck size={13} /> Copied!</> : <><Copy size={13} /> Copy link</>}
        </button>
        <button
          onClick={() => navigate(`/forms/${form.id}`)}
          className="flex items-center gap-1.5 text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors ml-auto"
        >
          <Pencil size={12} /> Edit
        </button>
        {confirmDelete ? (
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] text-[#D92D20]">Delete?</span>
            <button
              onClick={() => { deleteForm(form.id); setConfirmDelete(false) }}
              disabled={deleting}
              className="text-[11.5px] font-bold text-[#D92D20] hover:underline"
            >
              Yes
            </button>
            <button onClick={() => setConfirmDelete(false)} className="text-[11.5px] text-[#667085] hover:underline">No</button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1 text-[12px] text-[#D92D20] dark:text-red-400 hover:opacity-80 transition-opacity"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FormsPage() {
  const { data: forms, isLoading } = useForms()
  const [createOpen, setCreateOpen] = useState(false)

  return (
    <div className="space-y-6 max-w-[900px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Intake Forms</h1>
          {!isLoading && forms && (
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">{forms.length} form{forms.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary flex items-center gap-2">
          <Plus size={14} /> New Form
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      ) : forms && forms.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {forms.map(form => <FormCard key={form.id} form={form} />)}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-14 h-14 rounded-2xl bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center mb-4">
            <ClipboardList size={24} className="text-[#6366F1] dark:text-[#818CF8]" />
          </div>
          <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">No forms yet</h3>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-1 max-w-xs">
            Create an intake form to collect project briefs, requirements, or any info from your clients.
          </p>
          <button onClick={() => setCreateOpen(true)} className="btn-primary mt-4 flex items-center gap-2">
            <Plus size={14} /> Create first form
          </button>
        </div>
      )}

      {createOpen && <CreateFormModal onClose={() => setCreateOpen(false)} />}
    </div>
  )
}
