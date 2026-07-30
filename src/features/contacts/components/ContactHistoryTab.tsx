import { useState } from 'react'
import DOMPurify from 'dompurify'
import {
  Mail, MessageCircle, Video, ChevronDown, AlertCircle, Clock, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContactHistory } from '@/features/contacts/hooks/useContactHistory'
import type { HistoryEntry, HistoryEntryKind } from '@/features/contacts/hooks/useContactHistory'

const KIND_ICON: Record<HistoryEntryKind, React.ComponentType<{ size?: number; className?: string }>> = {
  email:   Mail,
  message: MessageCircle,
  meeting: Video,
}

const KIND_LABEL: Record<HistoryEntryKind, string> = {
  email:   'Email',
  message: 'Message',
  meeting: 'Meeting',
}

function formatTimestamp(date: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function ContactHistoryTab({ contactId }: { contactId: string }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const {
    data, isLoading, isError, refetch, isRefetching,
    fetchNextPage, hasNextPage, isFetchingNextPage,
  } = useContactHistory(contactId)

  const toggleExpanded = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-start gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
            <div className="w-9 h-9 rounded-xl bg-[#F2F4F7] dark:bg-[#21222D] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3.5 w-2/3 bg-[#F2F4F7] dark:bg-[#21222D] rounded" />
              <div className="h-3 w-1/3 bg-[#F2F4F7] dark:bg-[#21222D] rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center py-14 px-4">
        <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] dark:bg-red-950/40 flex items-center justify-center mb-3">
          <AlertCircle size={20} className="text-[#F04438] dark:text-red-400" />
        </div>
        <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Couldn't load history</p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1 mb-3">Something went wrong fetching this contact's history.</p>
        <button
          onClick={() => refetch()}
          disabled={isRefetching}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#3538CD] dark:text-[#818CF8] px-3 py-1.5 rounded-lg border border-[#EAECF0] dark:border-[#26283A] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] disabled:opacity-60"
        >
          <RefreshCw size={13} className={isRefetching ? 'animate-spin' : ''} />
          Retry
        </button>
      </div>
    )
  }

  const items: HistoryEntry[] = data?.pages.flatMap(p => p.items) ?? []
  const total = data?.pages[0]?.total ?? 0

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] mx-4 mt-4">
        <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
          <Clock size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
        </div>
        <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No communication history yet</p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">
          Emails, messages, and meetings with this contact will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-3">
      <p className="text-[11.5px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">
        {total} event{total !== 1 ? 's' : ''}
      </p>

      <div className="space-y-2">
        {items.map(entry => (
          <HistoryRow
            key={entry.id}
            entry={entry}
            isExpanded={expanded.has(entry.id)}
            onToggle={() => toggleExpanded(entry.id)}
          />
        ))}
      </div>

      {hasNextPage && (
        <button
          onClick={() => fetchNextPage()}
          disabled={isFetchingNextPage}
          className="w-full text-[12.5px] font-semibold text-[#3538CD] dark:text-[#818CF8] py-2.5 rounded-lg border border-[#EAECF0] dark:border-[#26283A] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] disabled:opacity-60"
        >
          {isFetchingNextPage ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}

function HistoryRow({ entry, isExpanded, onToggle }: {
  entry:      HistoryEntry
  isExpanded: boolean
  onToggle:   () => void
}) {
  const Icon = KIND_ICON[entry.kind]
  const hasBody = !!entry.body
  const isFailed = entry.kind === 'email' && entry.status === 'FAILED'

  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        disabled={!hasBody}
        className={cn(
          'w-full flex items-start gap-3 px-4 py-3.5 text-left',
          hasBody && 'hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] cursor-pointer',
        )}
      >
        <div className="w-9 h-9 rounded-xl bg-[#EEF4FF] dark:bg-indigo-950/40 flex items-center justify-center shrink-0">
          <Icon size={14} className="text-[#3538CD] dark:text-indigo-400" aria-label={KIND_LABEL[entry.kind]} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] truncate">
              {entry.title}
            </p>
            {isFailed && (
              <span
                title={entry.error ?? 'Send failed'}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none bg-[#FEF3F2] dark:bg-red-950/40 text-[#F04438] dark:text-red-400"
              >
                Failed to send
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
            {formatTimestamp(entry.occurredAt)} · {KIND_LABEL[entry.kind]}
          </p>
        </div>

        {hasBody ? (
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={cn(
              'text-[#98A2B3] dark:text-[#545C74] shrink-0 mt-1 transition-transform',
              isExpanded && 'rotate-180',
            )}
          />
        ) : (
          <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74] shrink-0 mt-1">
            Content not captured
          </span>
        )}
      </button>

      {isExpanded && hasBody && (
        <div
          className="px-4 pb-4 pl-[52px] text-[12.5px] text-[#475467] dark:text-[#A0A6BA] [&_a]:text-[#3538CD] [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(entry.body!) }}
        />
      )}
    </div>
  )
}
