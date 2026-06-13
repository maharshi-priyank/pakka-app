import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'
import { DocumentCard } from './DocumentCard'
import type { Message } from '../hooks/useMessages'

interface Props {
  message:     Message
  isPortal?:   boolean
  clientName?: string
}

export function MessageBubble({ message, isPortal = false, clientName }: Props) {
  const isSent = isPortal
    ? message.senderType === 'CLIENT'
    : message.senderType === 'FREELANCER'

  const timeAgo = formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })

  return (
    <div className={cn('flex flex-col gap-1', isSent ? 'items-end' : 'items-start')}>
      <span className="text-[10px] text-gray-400 px-1">
        {isSent ? 'You' : (clientName ?? 'Client')} · {timeAgo}
      </span>

      {message.body && message.body !== '<p></p>' && (
        <div className={cn(
          'max-w-[72%] px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed',
          isSent
            ? 'bg-[#0D1117] text-white rounded-br-md'
            : 'bg-gray-100 text-gray-900 rounded-bl-md',
        )}>
          <div
            className={cn('prose prose-sm max-w-none', isSent && '[&_*]:!text-white')}
            dangerouslySetInnerHTML={{ __html: message.body }}
          />
        </div>
      )}

      {message.attachmentType && message.attachmentId && (
        <DocumentCard
          type={message.attachmentType}
          entityId={message.attachmentId}
          title="Attached document"
          isPortal={isPortal}
        />
      )}

      {isSent && message.readAt && (
        <span className="text-[9px] text-gray-400 px-1">Read</span>
      )}
    </div>
  )
}
