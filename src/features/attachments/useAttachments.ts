import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import type { Attachment, AttachmentParent, PortalAttachment } from './types'
import type { CanvaDesign } from '@/features/settings/hooks/useCanva'

export function humanSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function parentQuery(parent: AttachmentParent) {
  if ('projectId'  in parent) return { projectId:  parent.projectId  }
  if ('proposalId' in parent) return { proposalId: parent.proposalId }
  if ('invoiceId'  in parent) return { invoiceId:  parent.invoiceId  }
  return { clientId: (parent as { clientId: string }).clientId }
}

function parentKey(parent: AttachmentParent): string {
  if ('projectId'  in parent) return `project-${parent.projectId}`
  if ('proposalId' in parent) return `proposal-${parent.proposalId}`
  if ('invoiceId'  in parent) return `invoice-${parent.invoiceId}`
  return `client-${'clientId' in parent ? parent.clientId : ''}`
}

function parentPathSegment(parent: AttachmentParent): string {
  if ('projectId'  in parent) return `projects/${parent.projectId}`
  if ('proposalId' in parent) return `proposals/${parent.proposalId}`
  if ('invoiceId'  in parent) return `invoices/${parent.invoiceId}`
  return `clients/${'clientId' in parent ? parent.clientId : ''}`
}

export function useAttachments(parent: AttachmentParent) {
  const query = parentQuery(parent)
  const id    = Object.values(query)[0] as string | undefined
  return useQuery<Attachment[]>({
    queryKey: ['attachments', parentKey(parent)],
    queryFn:  async () => {
      const params = new URLSearchParams(Object.fromEntries(Object.entries(query).filter(([, v]) => v != null)) as Record<string, string>).toString()
      const { data } = await api.get<{ data: Attachment[] }>(`/attachments?${params}`)
      return data.data
    },
    enabled: !!id,
  })
}

export function useUploadAttachment(parent: AttachmentParent, opts?: { gateInvoiceId?: string }) {
  const user = useAuthStore((s) => s.user)
  const qc   = useQueryClient()

  return useMutation({
    mutationFn: async (file: File) => {
      if (!user) throw new Error('Not authenticated')

      const rand         = Math.random().toString(36).slice(2, 10)
      const safeName     = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const path         = `attachments/${parentPathSegment(parent)}/${rand}-${safeName}`

      const { error } = await supabase.storage
        .from('deliverables')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw new Error(error.message)

      const { data: urlData } = supabase.storage.from('deliverables').getPublicUrl(path)

      const body = {
        ...parentQuery(parent),
        ...(opts?.gateInvoiceId && { gateInvoiceId: opts.gateInvoiceId }),
        fileName: file.name,
        fileUrl:  urlData.publicUrl,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
      }

      const { data } = await api.post<{ data: Attachment }>('/attachments', body)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', parentKey(parent)] })
      toast.success('File uploaded')
    },
    onError: (err: Error) => toast.error(err.message || 'Upload failed'),
  })
}

export function useLinkCanvaDesign(parent: AttachmentParent) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (design: CanvaDesign) => {
      const body = {
        ...parentQuery(parent),
        fileName: design.title || 'Canva Design',
        fileUrl:  design.viewUrl,
        fileSize: 0,
        mimeType: 'application/x-canva',
      }
      const { data } = await api.post<{ data: Attachment }>('/attachments', body)
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', parentKey(parent)] })
      toast.success('Canva design linked')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to link design'),
  })
}

export function useDeleteAttachment(parent: AttachmentParent) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/attachments/${id}`)
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attachments', parentKey(parent)] })
      toast.success('File removed')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to remove file'),
  })
}

export function usePortalAttachments(token: string) {
  return useQuery<PortalAttachment[]>({
    queryKey: ['attachments', 'portal', token],
    queryFn:  async () => {
      const { data } = await api.get<{ data: PortalAttachment[] }>(`/attachments/public/portal/${token}`)
      return data.data
    },
    enabled: !!token,
  })
}
