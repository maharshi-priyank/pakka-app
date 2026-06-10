import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export interface DriveFile {
  id:           string
  name:         string
  modifiedTime: string | null
}

export function useConnectGoogleDocs() {
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/google/connect-docs')
      return data.data
    },
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl
    },
    onError: () => toast.error('Failed to start Google Docs connection'),
  })
}

export function useDisconnectGoogleDocs() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/auth/google/disconnect-docs')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Google Docs disconnected')
    },
    onError: () => toast.error('Failed to disconnect Google Docs'),
  })
}

export function useListDriveFiles(query?: string) {
  return useQuery({
    queryKey: ['google-docs-files', query ?? ''],
    queryFn:  async () => {
      const params = query?.trim() ? `?query=${encodeURIComponent(query)}` : ''
      const { data } = await api.get<{ data: DriveFile[] }>(`/google-docs/files${params}`)
      return data.data
    },
    staleTime: 60_000,
  })
}

export function useFetchDocText(docId: string | null) {
  return useQuery({
    queryKey: ['google-doc-text', docId],
    queryFn:  async () => {
      const { data } = await api.get<{ data: string }>(`/google-docs/files/${docId}/text`)
      return data.data
    },
    enabled:   !!docId,
    staleTime: Infinity,
  })
}

export function useExportProposalToGoogleDocs() {
  return useMutation({
    mutationFn: async (proposalId: string) => {
      const { data } = await api.post<{ data: { docUrl: string; docId: string } }>(
        `/google-docs/export/proposal/${proposalId}`,
      )
      return data.data
    },
    onSuccess: ({ docUrl }) => {
      window.open(docUrl, '_blank', 'noopener,noreferrer')
      toast.success('Opened in Google Docs')
    },
    onError: () => toast.error('Failed to export to Google Docs'),
  })
}

export function useExportContractToGoogleDocs() {
  return useMutation({
    mutationFn: async (contractId: string) => {
      const { data } = await api.post<{ data: { docUrl: string; docId: string } }>(
        `/google-docs/export/contract/${contractId}`,
      )
      return data.data
    },
    onSuccess: ({ docUrl }) => {
      window.open(docUrl, '_blank', 'noopener,noreferrer')
      toast.success('Opened in Google Docs')
    },
    onError: () => toast.error('Failed to export to Google Docs'),
  })
}
