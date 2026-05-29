import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export type TemplateCategory = 'invoice' | 'proposal' | 'contract' | 'lead' | 'meeting' | 'digest'

export interface TemplateVarMeta {
  name: string
  description: string
  sample: string
}

export interface EmailTemplateMeta {
  key: string
  label: string
  category: TemplateCategory
  description: string
  vars: TemplateVarMeta[]
  isCustomised: boolean
  customisedAt: string | null
}

export interface EmailTemplateDetail extends EmailTemplateMeta {
  meta: EmailTemplateMeta
  subject: string
  bodyHtml: string
  updatedAt: string | null
}

const KEYS = {
  all:    () => ['email-templates'] as const,
  list:   () => ['email-templates', 'list'] as const,
  detail: (key: string) => ['email-templates', key] as const,
}

export function useEmailTemplateList() {
  return useQuery({
    queryKey: KEYS.list(),
    queryFn: async () => {
      const { data } = await api.get<{ data: EmailTemplateMeta[] }>('/email-templates')
      return data.data
    },
  })
}

export function useEmailTemplate(templateKey: string) {
  return useQuery({
    queryKey: KEYS.detail(templateKey),
    queryFn: async () => {
      const { data } = await api.get<{ data: EmailTemplateDetail }>(`/email-templates/${templateKey}`)
      return data.data
    },
    enabled: !!templateKey,
  })
}

export function useUpsertEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ templateKey, subject, bodyHtml }: { templateKey: string; subject: string; bodyHtml: string }) => {
      const { data } = await api.put<{ data: EmailTemplateDetail }>(`/email-templates/${templateKey}`, { subject, bodyHtml })
      return data.data
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(vars.templateKey) })
      toast.success('Template saved')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to save template'),
  })
}

export function useResetEmailTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (templateKey: string) => {
      await api.delete(`/email-templates/${templateKey}`)
    },
    onSuccess: (_data, templateKey) => {
      qc.invalidateQueries({ queryKey: KEYS.list() })
      qc.invalidateQueries({ queryKey: KEYS.detail(templateKey) })
      toast.success('Template reset to default')
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reset template'),
  })
}

export function useSendTestEmail() {
  return useMutation({
    mutationFn: async ({ templateKey, to }: { templateKey: string; to: string }) => {
      const { data } = await api.post<{ data: { sent: boolean; to: string } }>('/email-templates/send-test', { templateKey, to })
      return data.data
    },
    onSuccess: (res) => toast.success(`Test email sent to ${res.to}`),
    onError: (err: Error) => toast.error(err.message || 'Failed to send test email'),
  })
}
