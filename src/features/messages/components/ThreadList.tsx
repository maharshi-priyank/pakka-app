import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { useThreads } from '../hooks/useMessages'

interface Props {
  activeClientId: string | null
  onSelect:       (clientId: string) => void
}

export function ThreadList({ activeClientId, onSelect }: Props) {
  const { data: threads = [], isLoading } = useThreads()

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-[12px] text-gray-400">Loading…</p>
      </div>
    )
  }

  if (threads.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 text-center p-8">
        <p className="text-[12px] text-gray-400 leading-relaxed">
          No messages yet.<br />Start a conversation with a client.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      {threads.map(t => {
        const isActive = t.client.id === activeClientId
        const preview  = t.latestMessage?.body.replace(/<[^>]*>/g, '').slice(0, 60) ?? ''
        const timeAgo  = t.latestMessage
          ? formatDistanceToNow(new Date(t.latestMessage.createdAt), { addSuffix: false })
          : ''

        return (
          <button
            key={t.id}
            onClick={() => onSelect(t.client.id)}
            className={cn(
              'flex items-start gap-3 px-4 py-3 border-b border-gray-50 text-left transition-colors',
              isActive ? 'bg-indigo-50' : 'bg-white hover:bg-gray-50',
            )}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center text-white text-[11px] font-bold shrink-0 mt-0.5">
              {t.client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-1">
                <span className={cn(
                  'text-[12px] font-semibold truncate',
                  isActive ? 'text-indigo-700' : 'text-gray-900',
                )}>
                  {t.client.name}
                </span>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo}</span>
              </div>
              <p className={cn(
                'text-[11px] mt-0.5 truncate',
                t.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400',
              )}>
                {preview}
              </p>
            </div>
            {t.unreadCount > 0 && (
              <div className="w-2 h-2 rounded-full bg-indigo-500 mt-1.5 shrink-0" />
            )}
          </button>
        )
      })}
    </div>
  )
}
