import { useState } from 'react'
import { Loader2, Trash2, Megaphone } from 'lucide-react'
import { useProjectUpdates, useCreateProjectUpdate, useDeleteProjectUpdate } from '../hooks/useProjectUpdates'
import { cn } from '@/lib/utils'

interface Props {
  projectId: string
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)  return 'just now'
  if (mins  < 60) return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days  < 7)  return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return parts[0].slice(0, 2).toUpperCase()
}

export default function ProjectUpdatesTab({ projectId }: Props) {
  const [draft, setDraft] = useState('')

  const { data: updates = [], isLoading } = useProjectUpdates(projectId)
  const createMutation = useCreateProjectUpdate(projectId)
  const deleteMutation = useDeleteProjectUpdate(projectId)

  function submit() {
    const content = draft.trim()
    if (!content) return
    createMutation.mutate(content, { onSuccess: () => setDraft('') })
  }

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit()
  }

  return (
    <div className="flex flex-col gap-6">

      {/* Header */}
      <div>
        <h3 className="text-[13px] font-bold text-[#0F172A] dark:text-[#ECEEF3]">Updates</h3>
        <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
          Post progress updates for this project
        </p>
      </div>

      {/* Compose */}
      <div className="flex flex-col gap-2">
        <textarea
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={handleKey}
          placeholder="What's the latest on this project?…"
          rows={3}
          className="w-full resize-none px-4 py-3.5 text-[13px] text-[#0F172A] dark:text-[#ECEEF3] placeholder-[#B8C0CC] dark:placeholder-[#545C74] bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl outline-none focus:border-indigo-400 dark:focus:border-indigo-500 leading-relaxed transition-colors"
        />
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#B8C0CC] dark:text-[#545C74]">⌘↵ to post</span>
          <button
            onClick={submit}
            disabled={!draft.trim() || createMutation.isPending}
            className="flex items-center gap-1.5 h-8 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[12px] font-semibold rounded-lg transition-all active:scale-[0.97]"
          >
            {createMutation.isPending && <Loader2 size={11} className="animate-spin" />}
            Post update
          </button>
        </div>
      </div>

      {/* Feed */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-[13px] text-[#98A2B3] dark:text-[#545C74]">
          <Loader2 size={14} className="animate-spin" />
          Loading…
        </div>
      ) : updates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="w-10 h-10 rounded-xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-3">
            <Megaphone size={18} className="text-[#B8C0CC] dark:text-[#545C74]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No updates yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Post the first update above</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {updates.map((update, idx) => (
            <div
              key={update.id}
              className={cn(
                'relative flex gap-3 group',
                idx < updates.length - 1 && 'pb-5',
              )}
            >
              {/* Timeline line */}
              {idx < updates.length - 1 && (
                <div className="absolute left-[15px] top-8 bottom-0 w-px bg-[#EAECF0] dark:bg-[#26283A]" />
              )}

              {/* Avatar */}
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 z-10',
                avatarColor(update.author.name),
              )}>
                {initials(update.author.name)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 bg-white dark:bg-[#13141A] border border-[#EAECF0] dark:border-[#26283A] rounded-xl px-4 py-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] font-semibold text-[#101828] dark:text-[#ECEEF3]">
                      {update.author.name}
                    </span>
                    <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
                      {timeAgo(update.createdAt)}
                    </span>
                  </div>
                  <button
                    onClick={() => deleteMutation.mutate(update.id)}
                    disabled={deleteMutation.isPending}
                    className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-md flex items-center justify-center text-[#98A2B3] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-[#2A1A1A] transition-all disabled:opacity-30"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
                <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] leading-relaxed whitespace-pre-wrap">
                  {update.content}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
