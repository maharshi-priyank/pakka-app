import { useState } from 'react'
import type { ReactNode } from 'react'
import { LayoutTemplate, Pencil, Trash2, Check, X, Loader2, ChevronRight, Layers, Star } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LibraryTemplate } from '../types'

export interface TemplateLibraryCardProps<T extends LibraryTemplate = LibraryTemplate> {
  template:          T
  mode:              'pick' | 'manage'
  onUse?:            (template: T) => void
  onPreview?:        (template: T) => void
  isPreviewActive?:  boolean
  /** Navigate to a full content editor (mirrors Proposal's `Layers` icon → template content editor page). Manage mode only, hidden for system templates. */
  onEditContent?:    (template: T) => void
  /** Inline name/category/description edit. Manage mode only, hidden for system templates. */
  onUpdate?:         (id: string, data: { name?: string; category?: string; description?: string }) => Promise<void> | void
  isUpdating?:       boolean
  /** Manage mode only. Hidden for system templates AND for the current default (backend always rejects deleting the default — surfaced client-side instead of an unexplained 400). */
  onDelete?:         (id: string) => Promise<void> | void
  isDeleting?:       boolean
  /** New action, no Proposal equivalent. Manage mode only. Disabled with no action once `template.isDefault` is already true. */
  onSetDefault?:     (id: string) => Promise<void> | void
  isSettingDefault?: boolean
  /** Entity-specific footer content (e.g. an amount), rendered next to the category chip. This component stays entity-agnostic and doesn't know what to put here. */
  children?:         ReactNode
}

export default function TemplateLibraryCard<T extends LibraryTemplate = LibraryTemplate>({
  template,
  mode,
  onUse,
  onPreview,
  isPreviewActive,
  onEditContent,
  onUpdate,
  isUpdating,
  onDelete,
  isDeleting,
  onSetDefault,
  isSettingDefault,
  children,
}: TemplateLibraryCardProps<T>) {
  const [editing, setEditing]             = useState(false)
  const [editName, setEditName]           = useState(template.name)
  const [editCategory, setEditCategory]   = useState(template.category ?? '')
  const [editDesc, setEditDesc]           = useState(template.description ?? '')
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function handleSaveEdit() {
    await onUpdate?.(template.id, {
      name:        editName.trim() || template.name,
      category:    editCategory.trim() || undefined,
      description: editDesc.trim() || undefined,
    })
    setEditing(false)
  }

  async function handleDelete() {
    await onDelete?.(template.id)
    setConfirmDelete(false)
  }

  function handleSetDefault() {
    if (template.isDefault || isSettingDefault) return
    onSetDefault?.(template.id)
  }

  if (editing) {
    return (
      <div className="card-glass p-4 space-y-3 ring-2 ring-[#6366F1]/40">
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
            disabled={isUpdating}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#0D1117] dark:bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
          >
            {isUpdating ? <Loader2 size={11} className="animate-spin" /> : <Check size={11} />}
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
          {mode === 'manage' && onSetDefault && (
            <button
              onClick={e => { e.stopPropagation(); handleSetDefault() }}
              disabled={template.isDefault || isSettingDefault}
              className={cn(
                'w-6 h-6 rounded-lg flex items-center justify-center transition-colors',
                template.isDefault
                  ? 'text-[#6366F1] cursor-default'
                  : 'text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#6366F1]',
              )}
              title={template.isDefault ? 'Default template' : 'Set as default'}
            >
              {isSettingDefault ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Star size={11} className={template.isDefault ? 'fill-current' : ''} />
              )}
            </button>
          )}
          {mode === 'manage' && !template.isSystem && (
            <>
              {onEditContent && (
                <button
                  onClick={e => { e.stopPropagation(); onEditContent(template) }}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#6366F1] transition-colors"
                  title="Edit template content"
                >
                  <Layers size={11} />
                </button>
              )}
              <button
                onClick={e => { e.stopPropagation(); setEditing(true) }}
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
                title="Edit name & category"
              >
                <Pencil size={11} />
              </button>
              {!template.isDefault && (
                confirmDelete ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete() }}
                      disabled={isDeleting}
                      className="text-[10.5px] font-semibold text-[#D92D20] hover:underline"
                    >
                      {isDeleting ? '…' : 'Confirm'}
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
                )
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
            <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]">
              {template.category}
            </span>
          )}
        </div>
        {children}
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
