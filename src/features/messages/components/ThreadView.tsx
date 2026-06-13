import { useEffect, useRef } from 'react'
import { ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useThread, useSendMessage, useMarkThreadRead } from '../hooks/useMessages'
import { MessageBubble } from './MessageBubble'
import { ReplyComposer } from './ReplyComposer'

interface Props {
  clientId: string
}

export function ThreadView({ clientId }: Props) {
  const navigate  = useNavigate()
  const bottomRef = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useThread(clientId)
  const sendMessage = useSendMessage(clientId)
  const markRead    = useMarkThreadRead(clientId)

  useEffect(() => {
    markRead.mutate()
  }, [clientId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [data?.messages.length])

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-[13px] text-gray-400">Loading…</p>
      </div>
    )
  }

  if (!data) return null

  const { thread, messages, client } = data

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-gray-100 shrink-0">
        <div className="w-9 h-9 rounded-full bg-amber-400 flex items-center justify-center text-white text-[13px] font-bold shrink-0">
          {client?.name?.slice(0, 2).toUpperCase() ?? '??'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-bold text-gray-900 truncate">{client?.name}</p>
          <p className="text-[11px] text-gray-400">{client?.email}</p>
        </div>
        <button
          onClick={() => navigate(`/app/clients/${clientId}`)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-[12px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <ExternalLink size={11} />
          View client
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3">
        {thread.subject && (
          <p className="text-center text-[11px] text-gray-400 bg-gray-50 rounded-full px-3 py-1 self-center">
            {thread.subject}
          </p>
        )}
        {messages.length === 0 && (
          <p className="text-center text-[13px] text-gray-400 mt-8">
            No messages yet. Send the first one!
          </p>
        )}
        {messages.map(msg => (
          <MessageBubble key={msg.id} message={msg} clientName={client?.name} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply */}
      <ReplyComposer
        isPending={sendMessage.isPending}
        placeholder={`Reply to ${client?.name ?? 'client'}…`}
        onSend={async body => { await sendMessage.mutateAsync({ body }) }}
      />
    </div>
  )
}
