import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface Client {
  id:          string
  userId:      string
  name:        string
  email:       string | null
  phone:       string | null
  company:     string | null
  gstNumber:   string | null
  state:       string | null
  portalToken: string | null
  createdAt:   string
  updatedAt:   string
  _count?: {
    proposals: number
    contracts: number
    invoices:  number
  }
}

export interface ClientDetail extends Client {
  proposals: { id: string; title: string; status: string; totalAmount: string; createdAt: string }[]
  contracts: { id: string; title: string; status: string; createdAt: string }[]
  invoices:  { id: string; invoiceNumber: string; status: string; total: string; dueDate: string | null; createdAt: string }[]
  leads:     { id: string; name: string; stage: string; budget: string | null; source: string | null; createdAt: string }[]
}

interface ClientsResponse {
  clients:    Client[]
  total:      number
  page:       number
  totalPages: number
}

export interface CreateClientPayload {
  name:       string
  email?:     string
  phone?:     string
  company?:   string
  gstNumber?: string
  state?:     string
}

export function useClients(search?: string) {
  return useQuery({
    queryKey: ['clients', search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: '50' })
      if (search) params.set('search', search)
      const { data } = await api.get<{ data: ClientsResponse }>(`/clients?${params}`)
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useClient(id: string) {
  return useQuery({
    queryKey: ['clients', id],
    queryFn: async () => {
      const { data } = await api.get<{ data: ClientDetail }>(`/clients/${id}`)
      return data.data
    },
    staleTime: 60_000,
    enabled: !!id,
  })
}

export function useCreateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateClientPayload) => {
      const { data } = await api.post<{ data: Client }>('/clients', payload)
      return data.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client added')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to add client'),
  })
}

export function useUpdateClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: Partial<CreateClientPayload> & { id: string }) => {
      const { data } = await api.patch<{ data: Client }>(`/clients/${id}`, payload)
      return data.data
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.setQueryData(['clients', updated.id], updated)
      toast.success('Client updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update client'),
  })
}

export function useDeleteClient() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/clients/${id}`)
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      toast.success('Client deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete client'),
  })
}

export function useRegeneratePortalToken() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: { portalToken: string; portalUrl: string } }>(`/clients/${id}/regenerate-portal`)
      return data.data
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['clients', id] })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to regenerate link'),
  })
}
