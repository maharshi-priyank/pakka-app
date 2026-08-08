import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRecentActivity } from './useDashboard'

const LAST_SEEN_KEY = 'clearwork_last_seen_win'
const WIN_TYPES = new Set(['invoice_paid', 'contract_signed', 'proposal_accepted'])

const WIN_COPY: Record<string, string> = {
  invoice_paid:       '💰 Payment received!',
  contract_signed:    '✍️ Contract signed!',
  proposal_accepted:  '🎉 Proposal accepted!',
}

/**
 * Surfaces a one-time celebratory toast the first time the owner sees a new
 * payment / signature / acceptance since their last visit. Purely a delight
 * moment — never blocks or repeats for the same event.
 */
export function useCelebrateWins() {
  const { data: activity } = useRecentActivity()

  useEffect(() => {
    if (!activity || activity.length === 0) return

    const lastSeen = localStorage.getItem(LAST_SEEN_KEY)
    const lastSeenTime = lastSeen ? new Date(lastSeen).getTime() : 0

    const wins = activity
      .filter(a => WIN_TYPES.has(a.type) && new Date(a.time).getTime() > lastSeenTime)
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    if (wins.length === 0) return

    // First visit ever — just record the watermark, don't retro-celebrate old history
    if (!lastSeen) {
      localStorage.setItem(LAST_SEEN_KEY, activity[0]!.time)
      return
    }

    for (const win of wins.slice(0, 3)) {
      toast.success(WIN_COPY[win.type] ?? 'Nice progress!', { description: win.detail })
    }
    localStorage.setItem(LAST_SEEN_KEY, wins[wins.length - 1]!.time)
  }, [activity])
}
