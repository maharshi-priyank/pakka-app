import { useState, useRef, useEffect } from 'react'
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { Trash2, Loader2, StickyNote } from 'lucide-react'
import { ConfirmModal } from './ConfirmModal'

export interface Note {
  id:        string
  content:   string
  createdAt: string
}

interface Props {
  notes:          Note[]
  isLoading:      boolean
  isSubmitting:   boolean
  onAdd:          (content: string) => void
  onDelete:       (id: string) => void
}

function noteDate(iso: string) {
  const d = new Date(iso)
  if (isToday(d))     return `Today at ${format(d, 'h:mm a')}`
  if (isYesterday(d)) return `Yesterday at ${format(d, 'h:mm a')}`
  if (Date.now() - d.getTime() < 7 * 24 * 60 * 60 * 1000)
    return formatDistanceToNow(d, { addSuffix: true })
  return format(d, 'd MMM yyyy, h:mm a')
}

export default function NotesPanel({ notes, isLoading, isSubmitting, onAdd, onDelete }: Props) {
  const [draft,        setDraft]        = useState('')
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function submit() {
    const trimmed = draft.trim()
    if (!trimmed) return
    onAdd(trimmed)
    setDraft('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      submit()
    }
  }

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft])

  return (
    <div className="flex flex-col gap-5">

      {/* Compose */}
      <div className="bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl overflow-hidden">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Write a note… (⌘↵ to save)"
          rows={3}
          className="w-full resize-none px-4 pt-3.5 pb-2 text-[13px] text-[#0F172A] dark:text-[#ECEEF3] placeholder-[#B8C0CC] dark:placeholder-[#545C74] bg-transparent outline-none leading-relaxed"
        />
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-[#F2F4F7] dark:border-[#26283A]">
          <span className="text-[11px] text-[#B8C0CC] dark:text-[#545C74]">{draft.length > 0 ? `${draft.length} chars` : 'Supports plain text'}</span>
          <button
            onClick={submit}
            disabled={!draft.trim() || isSubmitting}
            className="flex items-center gap-1.5 h-7 px-3 bg-[#0F172A] dark:bg-indigo-600 hover:bg-[#1E293B] dark:hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-all active:scale-[0.97]"
          >
            {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : null}
            Save note
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 size={18} className="animate-spin text-[#D0D5DD]" />
        </div>
      ) : notes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 gap-2 text-center">
          <StickyNote size={22} className="text-[#D0D5DD] dark:text-[#3A3D52]" />
          <p className="text-[12.5px] text-[#98A2B3] dark:text-[#545C74]">No notes yet. Add the first one above.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map(note => (
            <div
              key={note.id}
              className="group bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl px-4 py-3.5 flex gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-[#1E293B] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap break-words">
                  {note.content}
                </p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-1.5">{noteDate(note.createdAt)}</p>
              </div>
              <button
                onClick={() => setDeleteTarget(note.id)}
                className="shrink-0 w-6 h-6 rounded-lg flex items-center justify-center text-[#D0D5DD] dark:text-[#3A3D52] hover:text-[#D92D20] dark:hover:text-red-400 hover:bg-[#FEF3F2] dark:hover:bg-red-950/30 opacity-0 group-hover:opacity-100 transition-all mt-0.5"
              >
                <Trash2 size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) onDelete(deleteTarget)
          setDeleteTarget(null)
        }}
        title="Delete note?"
        description="This note will be permanently deleted. This cannot be undone."
        confirmLabel="Delete Note"
        variant="delete"
      />
    </div>
  )
}
