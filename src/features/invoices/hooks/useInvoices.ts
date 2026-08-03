import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ph } from '@/lib/posthog'
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
    onSuccess: () => { qc.invalidateQueries({ queryKey: KEYS.all() }); toast.success('Invoice created'); ph.invoiceCreated() },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}

export function useCreateInvoiceFromContract() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data } = await api.post<{ data: Invoice[] }>(`/invoices/from-contract/${contractId}`)
      return data.data
    },
    onSuccess: (invoices) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success(invoices.length > 1 ? `${invoices.length} milestone invoices created` : 'Invoice created from contract')
      ph.invoiceCreated()
    },
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
      toast.success('Invoice sent to client'); ph.invoiceSent()
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
      ph.invoicePaid()
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

export function useRecordPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, amountReceived, tdsDeducted, note }: {
      id: string
      amountReceived: number
      tdsDeducted: number
      note?: string
    }) => {
      const { data } = await api.post<{ data: Invoice }>(`/invoices/${id}/record-payment`, {
        amountReceived,
        tdsDeducted,
        note,
      })
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData(KEYS.detail(updated.id), updated)
      qc.invalidateQueries({ queryKey: KEYS.all() })
      toast.success(updated.status === 'PAID' ? 'Invoice marked as paid' : 'Payment recorded')
      if (updated.status === 'PAID') ph.invoicePaid()
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to record payment'),
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

export function useVoidInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(`/invoices/${id}/void`).then(r => r.data.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: KEYS.all() })
      qc.invalidateQueries({ queryKey: KEYS.detail(id) })
      toast.success('Invoice voided')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to void invoice'),
  })
}
