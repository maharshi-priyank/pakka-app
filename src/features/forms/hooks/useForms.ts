import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface FormField {
  id:       string
  type:     'text' | 'textarea' | 'select' | 'multiselect' | 'date'
  label:    string
  required: boolean
  options?: string[]
}

export interface IntakeForm {
  id:             string
  title:          string
  description:    string | null
  token:          string
  fields:         FormField[]
  isActive:       boolean
  capturesLeads:  boolean
  leadFieldMap:   Record<string, string>
  archivedAt:     string | null
  createdAt:      string
  updatedAt:      string
  _count?:        { submissions: number }
}

export interface FormSubmission {
  id:              string
  respondentName:  string | null
  respondentEmail: string | null
  answers:         Record<string, string | string[]>
  submittedAt:     string
}

export interface IntakeFormDetail extends IntakeForm {
  submissions: FormSubmission[]
}

export function useForms(params?: { includeArchived?: boolean }) {
  return useQuery({
    queryKey: ['forms', params ?? {}],
    queryFn:  async () => {
      const { data } = await api.get<{ data: IntakeForm[] }>('/forms', { params })
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useForm(id: string) {
  return useQuery({
    queryKey: ['forms', id],
    queryFn:  async () => {
      const { data } = await api.get<{ data: IntakeFormDetail }>(`/forms/${id}`)
      return data.data
    },
    staleTime: 30_000,
    enabled:   !!id,
  })
}

export function useCreateForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: { title: string; description?: string }) => {
      const { data } = await api.post<{ data: IntakeForm }>('/forms', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create form'),
  })
}

export function useUpdateForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<IntakeForm> & { id: string; leadFieldMap?: Record<string, string> }) => {
      const { data } = await api.patch<{ data: IntakeForm }>(`/forms/${id}`, payload)
      return data.data
    },
    onSuccess: (updated) => {
      queryClient.setQueryData(['forms', updated.id], (prev: IntakeFormDetail | undefined) =>
        prev ? { ...prev, ...updated } : undefined,
      )
      queryClient.invalidateQueries({ queryKey: ['forms'] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save form'),
  })
}

export function useDeleteForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/forms/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forms'] })
      toast.success('Form deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete form'),
  })
}

export function useArchiveForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/forms/${id}/archive`).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to archive form'),
  })
}

export function useUnarchiveForm() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/forms/${id}/unarchive`).then(r => r.data.data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forms'] }),
    onError: (err: Error) => toast.error(err.message || 'Failed to unarchive form'),
  })
}
