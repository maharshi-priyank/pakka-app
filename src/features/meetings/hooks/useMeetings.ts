import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export type MeetingStatus = 'SCHEDULED' | 'COMPLETED' | 'CANCELLED'

export interface MeetingLead   { id: string; name: string }
export interface MeetingClient { id: string; name: string; company: string | null; email: string | null }

export interface Meeting {
  id:           string
  userId:       string
  leadId:       string | null
  clientId:     string | null
  lead:         MeetingLead   | null
  client:       MeetingClient | null
  title:        string
  agenda:       string | null
  scheduledAt:  string
  durationMins: number
  meetLink:     string | null
  googleEventId: string | null
  status:       MeetingStatus
  reminderSent: boolean
  createdAt:    string
  updatedAt:    string
}

export interface CreateMeetingDto {
  title:        string
  scheduledAt:  string
  durationMins?: number
  agenda?:      string
  leadId?:      string
  clientId?:    string
}

export interface UpdateMeetingDto extends Partial<CreateMeetingDto> {}

export function useUpcomingMeetings() {
  return useQuery<Meeting[]>({
    queryKey:        ['meetings', 'upcoming'],
    queryFn:         () => api.get('/meetings/upcoming').then(r => r.data.data),
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
}

export function useUpcomingCount() {
  return useQuery<number>({
    queryKey:        ['meetings', 'upcoming-count'],
    queryFn:         () => api.get<{ data: { count: number } }>('/meetings/upcoming-count').then(r => r.data.data.count),
    refetchInterval: 60_000,
    staleTime:       30_000,
  })
}

export function useMeetings(query?: { status?: MeetingStatus; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['meetings', query],
    queryFn:  () => {
      const params = new URLSearchParams()
      if (query?.status) params.set('status', query.status)
      if (query?.page)   params.set('page',   String(query.page))
      if (query?.limit)  params.set('limit',  String(query.limit))
      return api.get(`/meetings?${params}`).then(r => r.data.data as { items: Meeting[]; total: number; page: number; limit: number })
    },
  })
}

export function useCreateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: CreateMeetingDto) => api.post<{ data: Meeting }>('/meetings', dto).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

export function useUpdateMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dto }: { id: string; dto: UpdateMeetingDto }) =>
      api.patch<{ data: Meeting }>(`/meetings/${id}`, dto).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

export function useCompleteMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post<{ data: Meeting }>(`/meetings/${id}/complete`).then(r => r.data.data),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}

export function useCancelMeeting() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/meetings/${id}`),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['meetings'] })
    },
  })
}
