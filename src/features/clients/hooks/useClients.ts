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

export interface ClientProjectTimeEntry {
  id: string; description: string; date: string
  durationMins: number; hourlyRate: string | null; isBilled: boolean
}

export interface ClientProjectExpense {
  id: string; description: string; category: string
  amount: string; date: string; isBilled: boolean
}

export interface ClientProject {
  id: string; name: string; status: string
  budget: string | null; startDate: string | null; endDate: string | null
  createdAt: string; shareRateWithClient: boolean
  timeEntries: ClientProjectTimeEntry[]
  expenses:    ClientProjectExpense[]
}

export interface ClientDetail extends Client {
  proposals: { id: string; title: string; status: string; totalAmount: string; createdAt: string; acceptedAt: string | null }[]
  contracts: { id: string; title: string; status: string; createdAt: string; sentAt: string | null; signedAt: string | null }[]
  invoices:  { id: string; invoiceNumber: string; status: string; total: string; dueDate: string | null; createdAt: string; paidAt: string | null }[]
  leads:     { id: string; name: string; stage: string; budget: string | null; source: string | null; createdAt: string }[]
  meetings:  { id: string; title: string; scheduledAt: string; status: string; meetLink: string | null }[]
  projects:  ClientProject[]
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
      // Invalidate both the list and the detail — do NOT setQueryData with the
      // bare Client response since ClientPage expects the full ClientDetail shape
      // (with proposals/contracts/invoices/leads arrays).
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      queryClient.invalidateQueries({ queryKey: ['clients', updated.id] })
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
