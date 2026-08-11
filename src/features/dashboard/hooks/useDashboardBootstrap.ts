import { useDashboardStats, useRecentActivity, useUpcomingFollowUps, useRevenueChart } from './useDashboard'
import { useInvoices } from '@/features/invoices/hooks/useInvoices'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useUpcomingMeetings } from '@/features/meetings/hooks/useMeetings'
import { useProfile } from '@/features/settings/hooks/useProfile'

/** Prefetch every query the dashboard widgets need, then expose one ready flag. */
export function useDashboardBootstrap() {
  const stats        = useDashboardStats()
  const invoices     = useInvoices({ limit: 200 })
  const contacts     = useContacts({ limit: 200 })
  const activity     = useRecentActivity()
  const followUps    = useUpcomingFollowUps()
  const revenueChart = useRevenueChart()
  const meetings     = useUpcomingMeetings()
  const profile      = useProfile()

  const queries = [stats, invoices, contacts, activity, followUps, revenueChart, meetings, profile]
  const isReady = queries.every(q => !q.isPending)

  return { isReady }
}
