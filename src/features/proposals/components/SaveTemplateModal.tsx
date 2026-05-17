import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { X, Loader2, LayoutTemplate } from 'lucide-react'
import { useSaveProposalAsTemplate } from '../hooks/useProposalTemplates'

interface Props {
  open:        boolean
  onClose:     () => void
  proposalId:  string
  defaultName: string
}

interface FormValues {
  name:        string
  category:    string
  description: string
}

const CATEGORY_SUGGESTIONS = ['Web Design', 'Branding', 'Marketing', 'Photography', 'Consulting', 'Development', 'Other']

export default function SaveTemplateModal({ open, onClose, proposalId, defaultName }: Props) {
  const saveMut = useSaveProposalAsTemplate()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { name: defaultName, category: '', description: '' },
  })

  useEffect(() => {
    if (open) reset({ name: defaultName, category: '', description: '' })
  }, [open, defaultName, reset])

  function onSubmit(values: FormValues) {
    saveMut.mutate(
      {
        proposalId,
        name:        values.name.trim(),
        category:    values.category.trim() || undefined,
        description: values.description.trim() || undefined,
      },
      { onSuccess: () => { onClose() } },
    )
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] anim-fade" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm mx-4 card overflow-hidden anim-modal-in">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F3F8]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[#EEF2FF] flex items-center justify-center">
              <LayoutTemplate size={13} className="text-[#6366F1]" />
            </div>
            <h2 className="text-[14px] font-bold text-[#0D1117]">Save as Template</h2>
          </div>
          <button onClick={onClose} className="text-[#98A2B3] hover:text-[#344054] transition-colors">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-5 py-4 space-y-3.5">
          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">Template name *</label>
            <input
              {...register('name', { required: 'Name is required' })}
              className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
              placeholder="e.g. Website Redesign"
            />
            {errors.name && <p className="text-[11px] text-[#D92D20] mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">
              Category <span className="text-[#98A2B3] font-normal">(optional)</span>
            </label>
            <input
              {...register('category')}
              list="category-suggestions"
              className="w-full h-9 px-3 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all"
              placeholder="e.g. Web Design"
            />
            <datalist id="category-suggestions">
              {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
            </datalist>
          </div>

          <div>
            <label className="block text-[12px] font-semibold text-[#344054] mb-1.5">
              Description <span className="text-[#98A2B3] font-normal">(optional)</span>
            </label>
            <textarea
              {...register('description')}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-[#D0D5DD] text-[13px] text-[#101828] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] transition-all resize-none"
              placeholder="Short description for this template"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-3.5 rounded-lg border border-[#D0D5DD] text-[12.5px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveMut.isPending}
              className="h-8 px-3.5 rounded-lg bg-[#6366F1] text-white text-[12.5px] font-semibold hover:bg-[#4F46E5] transition-colors disabled:opacity-60 flex items-center gap-1.5"
            >
              {saveMut.isPending ? <Loader2 size={12} className="animate-spin" /> : <LayoutTemplate size={12} />}
              Save template
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
