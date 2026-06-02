import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Deliverable } from '../schemas/invoice.schema'

function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
export { humanSize }

export function useDeliverables(invoiceId: string) {
  return useQuery({
    queryKey: ['deliverables', invoiceId],
    queryFn:  async () => {
      const { data } = await api.get<{ data: Deliverable[] }>(`/invoices/${invoiceId}/deliverables`)
      return data.data
    },
    enabled: !!invoiceId,
  })
}

export function useUploadDeliverable(invoiceId: string) {
  const user = useAuthStore((s) => s.user)
  const qc   = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      // Random prefix to make path unguessable
      const rand = Math.random().toString(36).slice(2, 10)
      const path = `deliverables/${invoiceId}/${rand}-${file.name}`

      const { error } = await supabase.storage
        .from('deliverables')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw new Error(error.message)

      const { data: urlData } = supabase.storage.from('deliverables').getPublicUrl(path)

      const { data } = await api.post<{ data: Deliverable }>(`/invoices/${invoiceId}/deliverables`, {
        fileName: file.name,
        fileUrl:  urlData.publicUrl,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      })
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliverables', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices', invoiceId] })
      toast.success('File uploaded')
    },
    onError: (err: Error) => toast.error(err.message || 'Upload failed'),
  })
}

export function useDeleteDeliverable(invoiceId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (delivId: string) => {
      await api.delete(`/invoices/${invoiceId}/deliverables/${delivId}`)
      return delivId
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['deliverables', invoiceId] })
      qc.invalidateQueries({ queryKey: ['invoices', invoiceId] })
      toast.success('File removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove file'),
  })
}
