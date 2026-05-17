import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DashboardStats {
  revenueThisMonth: number
  revenueLastMonth: number
  revenueChange:    number | null
  overdueAmount:    number
  overdueCount:     number
  pipelineValue:    number
  activeLeads:      number
  openProposals:    number
}

export interface ActivityEvent {
  type:     string
  label:    string
  detail:   string
  time:     string
  entityId: string
}

export interface FollowUpLead {
  id:         string
  name:       string
  company:    string | null
  service:    string | null
  stage:      string
  followUpAt: string
}

export interface RevenuePoint {
  month:   string
  revenue: number
}

export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: DashboardStats }>('/dashboard/stats')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: ActivityEvent[] }>('/dashboard/recent-activity')
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useUpcomingFollowUps() {
  return useQuery({
    queryKey: ['dashboard', 'followups'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: FollowUpLead[] }>('/dashboard/upcoming-followups')
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useRevenueChart() {
  return useQuery({
    queryKey: ['dashboard', 'revenue-chart'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: RevenuePoint[] }>('/dashboard/revenue-chart')
      return data.data
    },
    staleTime: 60_000,
  })
}
