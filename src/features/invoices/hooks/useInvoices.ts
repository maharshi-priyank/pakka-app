import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { Invoice, InvoiceListResponse, InvoiceFormData, InvoiceStatus } from '../schemas/invoice.schema'

const KEYS = {
  all:    () => ['invoices'] as const,
  list:   (f: object) => ['invoices', 'list', f] as const,
  detail: (id: string) => ['invoices', id] as const,
}

export function useInvoices(params?: { status?: InvoiceStatus; limit?: number; page?: number }) {
  return useQuery({
    queryKey: KEYS.list(params ?? {}),
    queryFn:  async () => {
      const { data } = await api.get<{ data: InvoiceListResponse }>('/invoices', { params })
      return data.data
    },
  })
}

export function useInvoice(id: string | null) {
  return useQuery({
    queryKey: KEYS.detail(id!),
    queryFn:  async () => {
      const { data } = await api.get<{ data: Invoice }>(`/invoices/${id}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: InvoiceFormData) => {
      const { data } = await api.post<{ data: Invoice }>('/invoices', dto)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all() }); toast.success('Invoice created') },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}

export function useCreateInvoiceFromContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data } = await api.post<{ data: Invoice }>(`/invoices/from-contract/${contractId}`)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all() }); toast.success('Invoice created from contract') },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}

export function useUpdateInvoice(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (dto: Partial<InvoiceFormData>) => {
      const { data } = await api.patch<{ data: Invoice }>(`/invoices/${id}`, dto)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success('Invoice updated')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update invoice'),
  })
}

export function useSendInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: { invoice: Invoice; viewUrl: string } }>(`/invoices/${id}/send`)
      return data.data
    },
    onSuccess: ({ invoice }) => {
      qc.setQueryData(KEYS.detail(invoice.id), invoice)
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success('Invoice sent to client')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to send invoice'),
  })
}

export function useMarkPaid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: Invoice }>(`/invoices/${id}/mark-paid`)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(updated.id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success('Invoice marked as paid')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to mark as paid'),
  })
}

export function useMarkOverdue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post<{ data: Invoice }>(`/invoices/${id}/mark-overdue`)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(updated.id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all() })
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to update invoice'),
  })
}

export function useDeleteInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/invoices/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.removeQueries({ queryKey: KEYS.detail(id) })
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success('Invoice deleted')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete invoice'),
  })
}
