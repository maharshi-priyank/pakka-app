import { createPortal } from 'react-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { useCreateForm } from '../hooks/useForms'

interface Props {
  onClose: () => void
  title?: string
}

// capturesLeads is never passed here -- the one lead-capture form is only
// ever created by the backend's seedLeadCaptureForm(), never through this
// generic creation flow. See CreateFormDto (pakka-api).
export function CreateFormModal({ onClose, title = 'New Intake Form' }: Props) {
  const navigate = useNavigate()
  const { mutateAsync, isPending } = useCreateForm()
  const [formTitle, setFormTitle] = useState('')
  const [desc,      setDesc]      = useState('')

  async function handleCreate() {
    if (!formTitle.trim()) return
    const form = await mutateAsync({ title: formTitle.trim(), description: desc.trim() || undefined })
    onClose()
    navigate(`/forms/${form.id}`)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md p-6">
        <h3 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-4">{title}</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] mb-1">Form title *</label>
            <input
              value={formTitle}
              onChange={e => setFormTitle(e.target.value)}
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
            disabled={isPending || !formTitle.trim()}
            className="btn-primary text-[13px] flex items-center gap-2"
          >
            {isPending && <Loader2 size={13} className="animate-spin" />}
            {isPending ? 'Creating…' : 'Create form'}
          </button>
        </div>
      </div>
    </div>
  , document.body)
}
