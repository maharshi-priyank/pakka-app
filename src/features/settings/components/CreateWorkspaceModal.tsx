import { createPortal } from 'react-dom'
import { useState } from 'react'
import { X, Loader2, Building2 } from 'lucide-react'
import { useCreateWorkspace } from '../hooks/useWorkspaces'

interface Props {
  open:    boolean
  onClose: () => void
}

export default function CreateWorkspaceModal({ open, onClose }: Props) {
  const [name, setName] = useState('')
  const { mutateAsync: create, isPending } = useCreateWorkspace()

  if (!open) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    await create(trimmed)
    setName('')
    onClose()
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl p-6">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#98A2B3] hover:text-[#344054] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Building2 size={18} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-[15px] font-semibold text-[#101828]">New workspace</p>
            <p className="text-[12px] text-[#667085]">Create a separate workspace for a different business or brand</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[12.5px] font-semibold text-[#344054]">
              Workspace name <span className="text-red-500">*</span>
            </label>
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. My Design Studio"
              className="form-input w-full"
              disabled={isPending}
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#344054] bg-[#F2F4F7] hover:bg-[#EAECF0] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || !name.trim()}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Creating…' : 'Create workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  , document.body)
}
