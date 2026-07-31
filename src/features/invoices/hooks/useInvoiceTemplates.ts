import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { InvoiceTemplate, Invoice } from '../schemas/invoice.schema'

// U11: mirrors useProposalTemplates.ts's hook shape exactly (query keys,
// mutation invalidation pattern), applied to /invoice-templates. Two hooks
// below have no Proposal equivalent: useSetDefaultInvoiceTemplate() (KTD2 --
// Invoice templates are real rows with a mutable `isDefault`, unlike
// Proposal's virtual-constant templates) and useReapplyInvoiceTemplate()
// (R8/R9/KTD7 -- swaps `notes` on an existing, still-editable Invoice).

const TEMPLATES_KEY = 'invoice-templates'

export function useInvoiceTemplates() {
  return useQuery<InvoiceTemplate[]>({
    queryKey:  [TEMPLATES_KEY],
    queryFn:   () => api.get<{ data: InvoiceTemplate[] }>('/invoice-templates').then(r => r.data.data),
    staleTime: 60_000,
  })
}

export function useCreateInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (dto: { name: string; description?: string; category?: string; content: object; totalAmount?: number }) =>
      api.post<{ data: InvoiceTemplate }>('/invoice-templates', dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template created')
    },
    onError: () => toast.error('Failed to create template'),
  })
}

export function useInvoiceTemplate(id: string | null) {
  return useQuery<InvoiceTemplate>({
    queryKey:  [TEMPLATES_KEY, id],
    queryFn:   () => api.get<{ data: InvoiceTemplate }>(`/invoice-templates/${id}`).then(r => r.data.data),
    enabled:   !!id,
    staleTime: 60_000,
  })
}

export function useUpdateInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string; name?: string; description?: string; category?: string; content?: object; totalAmount?: number }) =>
      api.patch<{ data: InvoiceTemplate }>(`/invoice-templates/${id}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template updated')
    },
    onError: () => toast.error('Failed to update template'),
  })
}

export function useDeleteInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/invoice-templates/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template deleted')
    },
    onError: () => toast.error('Failed to delete template'),
  })
}

export function useSaveInvoiceAsTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, ...dto }: { invoiceId: string; name: string; description?: string; category?: string }) =>
      api.post<{ data: InvoiceTemplate }>(`/invoice-templates/from-invoice/${invoiceId}`, dto).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Template saved')
    },
    onError: () => toast.error('Failed to save template'),
  })
}

export function useIncrementInvoiceTemplateUsage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.post(`/invoice-templates/${id}/use`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] }),
  })
}

// New — no Proposal equivalent (KTD2: Invoice templates are real per-workspace
// rows with a mutable `isDefault`, so "default" can live on the row itself).
export function useSetDefaultInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.post<{ data: InvoiceTemplate }>(`/invoice-templates/${id}/set-default`).then(r => r.data.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TEMPLATES_KEY] })
      toast.success('Default template updated')
    },
    onError: () => toast.error('Failed to set default template'),
  })
}

// New — re-applies a different template's `notes` onto an existing,
// still-editable Invoice (R8/R9, KTD7's PAID-only guard is enforced
// server-side). This hits /invoices/:id/reapply-template, not
// /invoice-templates, so it updates the Invoice's own query keys
// (mirrors useInvoices.ts's KEYS.detail()/KEYS.all() shape) rather than the
// template list.
export function useReapplyInvoiceTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ invoiceId, templateId }: { invoiceId: string; templateId: string }) =>
      api.post<{ data: Invoice }>(`/invoices/${invoiceId}/reapply-template`, { templateId }).then(r => r.data.data),
    onSuccess: (updated) => {
      qc.setQueryData(['invoices', updated.id], updated)
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Template re-applied')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to re-apply template'),
  })
}
