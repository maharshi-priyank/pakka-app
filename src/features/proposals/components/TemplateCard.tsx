import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LayoutTemplate, Pencil, Trash2, Check, X, Loader2, ChevronRight, Layers } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateTemplate, useDeleteTemplate } from '../hooks/useProposalTemplates'
import type { ProposalTemplate } from '../schemas/proposal.schema'

interface Props {
  template:         ProposalTemplate
  mode:             'pick' | 'manage'
  onUse?:           (template: ProposalTemplate) => void
  onPreview?:       (template: ProposalTemplate) => void
  isPreviewActive?: boolean
}

const CATEGORY_COLORS: Record<string, string> = {
  'Web Design': 'bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB] dark:text-[#60A5FA]',
  'Branding':   'bg-[#F5F3FF] dark:bg-violet-950/40 text-[#5925DC] dark:text-[#A78BFA]',
  'Marketing':  'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]',
}

function getCategoryStyle(category: string | null) {
  if (!category) return 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'
  return CATEGORY_COLORS[category] ?? 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]'
}

function fmt(v: number) {
  return `₹${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`
}

export default function TemplateCard({ template, mode, onUse, onPreview, isPreviewActive }: Props) {
  const navigate = useNavigate()
  const [editing, setEditing]         = useState(false)
  const [editName, setEditName]       = useState(template.name)
  const [editCategory, setEditCategory] = useState(template.category ?? '')
  const [editDesc, setEditDesc]       = useState(template.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const updateMut = useUpdateTemplate()
  const deleteMut = useDeleteTemplate()

  function handleSaveEdit() {
    updateMut.mutate(
      { id: template.id, name: editName.trim() || template.name, category: editCategory.trim() || undefined, description: editDesc.trim() || undefined },
      { onSuccess: () => setEditing(false) },
    )
  }

  function handleDelete() {
    deleteMut.mutate(template.id, { onSuccess: () => setConfirmDelete(false) })
  }

  if (editing) {
    return (
      <div className="card p-4 space-y-3 ring-2 ring-[#6366F1]/40">
        <input
          value={editName}
          onChange={e => setEditName(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
          placeholder="Template name"
          autoFocus
        />
        <input
          value={editCategory}
          onChange={e => setEditCategory(e.target.value)}
          className="w-full h-8 px-2.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12px] text-[#344054] dark:text-[#C2C8D8] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1]"
          placeholder="Category (e.g. Web Design)"
        />
        <textarea
          value={editDesc}
          onChange={e => setEditDesc(e.target.value)}
          rows={2}
          className="w-full px-2.5 py-1.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12px] text-[#344054] dark:text-[#C2C8D8] bg-white dark:bg-[#21222D] focus:outline-none focus:ring-2 focus:ring-[#6366F1]/30 focus:border-[#6366F1] resize-none"
          placeholder="Short description (optional)"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={handleSaveEdit}
            disabled={updateMut.isPending}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
          >
            {updateMut.isPending ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#3D4258] text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
          >
            <X size={11} /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'card p-4 flex flex-col gap-2.5 group transition-all',
        mode === 'pick' ? 'cursor-pointer hover:ring-2 hover:ring-[#6366F1]/40 hover:shadow-md' : '',
        isPreviewActive && 'ring-2 ring-[#6366F1]/40 shadow-md',
      )}
      onClick={mode === 'pick' ? () => onUse?.(template) : undefined}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0">
          <LayoutTemplate size={14} className="text-[#6366F1]" />
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {template.isSystem ? (
            <span className="text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#FFFAEB] dark:bg-amber-950/30 text-[#B54708] dark:text-amber-400">System</span>
          ) : template.usageCount > 0 ? (
            <span className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74]">Used {template.usageCount}×</span>
          ) : null}
          {/* Expand preview button — pick mode */}
          {mode === 'pick' && onPreview && (
            <button
              onClick={e => { e.stopPropagation(); onPreview(template) }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#6366F1] transition-colors opacity-0 group-hover:opacity-100"
              title="Preview template"
            >
              <ChevronRight size={12} />
            </button>
          )}
          {mode === 'manage' && !template.isSystem && (
            <>
              <button
                onClick={e => { e.stopPropagation(); navigate(`/app/proposals/templates/${template.id}/edit`) }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#6366F1] transition-colors"
                title="Edit template content"
              >
                <Layers size={11} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setEditing(true) }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                title="Edit name & category"
              >
                <Pencil size={11} />
              </button>
              {confirmDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete() }}
                    disabled={deleteMut.isPending}
                    className="text-[10.5px] font-semibold text-[#D92D20] hover:underline"
                  >
                    {deleteMut.isPending ? '…' : 'Confirm'}
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setConfirmDelete(false) }}
                    className="text-[10.5px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:underline"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={e => { e.stopPropagation(); setConfirmDelete(true) }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#FEF3F2] dark:hover:bg-red-950/40 hover:text-[#D92D20] transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={11} />
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-tight">{template.name}</p>
        {template.description && (
          <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5 line-clamp-2">{template.description}</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-1.5">
          {template.category && (
            <span className={cn('text-[10.5px] font-semibold px-2 py-0.5 rounded-full', getCategoryStyle(template.category))}>
              {template.category}
            </span>
          )}
        </div>
        <span className="text-[12px] font-bold text-[#344054] dark:text-[#C2C8D8]">{fmt(template.totalAmount)}</span>
      </div>

      {mode === 'pick' && (
        <div className="pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="w-full h-7 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[11.5px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors">
            Use this template
          </button>
        </div>
      )}
    </div>
  )
}
