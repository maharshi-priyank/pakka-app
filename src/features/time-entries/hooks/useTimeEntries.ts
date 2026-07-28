import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface TimeEntryClient  { id: string; name: string }
export interface TimeEntryContact { id: string; name: string }
export interface TimeEntryProject { id: string; name: string }

export interface TimeEntry {
  id:           string
  userId:       string
  clientId:     string | null
  client:       TimeEntryClient | null
  contactId:    string | null
  contact:      TimeEntryContact | null
  projectId:    string | null
  project:      TimeEntryProject | null
  description:  string
  date:         string
  durationMins: number
  hourlyRate:   number | null
  isBilled:     boolean
  invoiceId:    string | null
  createdAt:    string
  updatedAt:    string
}

export interface CreateTimeEntryPayload {
  clientId?:    string
  contactId?:   string
  projectId?:   string
  description:  string
  date:         string
  durationMins: number
  hourlyRate?:  number
}

export interface UpdateTimeEntryPayload {
  clientId?:     string
  contactId?:    string
  projectId?:    string
  description?:  string
  date?:         string
  durationMins?: number
  hourlyRate?:   number
  isBilled?:     boolean
  invoiceId?:    string
}

export interface TimeEntriesQuery {
  clientId?:  string
  projectId?: string
  from?:      string
  to?:        string
  isBilled?:  boolean
}

const KEY = 'time-entries'

async function fetchEntries(params: TimeEntriesQuery): Promise<TimeEntry[]> {
  const { data } = await api.get<{ data: TimeEntry[] }>('/time-entries', { params })
  return data.data
}

export function useTimeEntries(params: TimeEntriesQuery = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn:  () => fetchEntries(params),
    staleTime: 30_000,
  })
}

export function useCreateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateTimeEntryPayload): Promise<TimeEntry> => {
      const { data } = await api.post<{ data: TimeEntry }>('/time-entries', payload)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Time entry logged') },
    onError: (err: Error) => toast.error(err.message || 'Failed to log time entry'),
  })
}

export function useUpdateTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateTimeEntryPayload & { id: string }): Promise<TimeEntry> => {
      const { data } = await api.patch<{ data: TimeEntry }>(`/time-entries/${id}`, payload)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Entry updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update entry'),
  })
}

export function useDeleteTimeEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/time-entries/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Entry deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete entry'),
  })
}

export function useBillEntries() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (entryIds: string[]) => {
      const { data } = await api.post<{ data: { id: string } }>('/time-entries/bill', { entryIds })
      return data.data
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created from time entries')
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}
