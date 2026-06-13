import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { MessageSquare, Plus } from 'lucide-react'
import { ThreadList } from '@/features/messages/components/ThreadList'
import { ThreadView } from '@/features/messages/components/ThreadView'
import { ComposeModal } from '@/features/messages/components/ComposeModal'
import { useMessageUnreadCount } from '@/features/messages/hooks/useMessages'

export default function InboxPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showCompose, setShowCompose]   = useState(false)
  const activeClientId = searchParams.get('client')

  // Prefetch unread count
  useMessageUnreadCount()

  return (
    <div className="flex h-full min-h-0">
      {/* Left — thread list */}
      <div className="w-64 shrink-0 border-r border-gray-100 flex flex-col bg-gray-50/50">
        <div className="px-4 py-4 border-b border-gray-100 bg-white shrink-0">
          <div className="flex items-center justify-between">
            <h1 className="text-[15px] font-bold text-gray-900">Inbox</h1>
            <button
              onClick={() => setShowCompose(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 text-white text-[12px] font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus size={12} />
              New
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ThreadList
            activeClientId={activeClientId}
            onSelect={clientId => setSearchParams({ client: clientId })}
          />
        </div>
      </div>

      {/* Right — thread view */}
      <div className="flex-1 flex flex-col min-w-0">
        {activeClientId ? (
          <ThreadView clientId={activeClientId} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <MessageSquare size={20} className="text-gray-400" />
            </div>
            <div>
              <p className="text-[14px] font-semibold text-gray-700">Select a conversation</p>
              <p className="text-[12px] text-gray-400 mt-1">Or start a new message with a client</p>
            </div>
          </div>
        )}
      </div>

      {showCompose && (
        <ComposeModal onClose={() => setShowCompose(false)} />
      )}
    </div>
  )
}
