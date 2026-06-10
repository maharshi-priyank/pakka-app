import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api } from '@/lib/api'

export function useConnectGoogleSheets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Step 1 — get OAuth URL and redirect
      const { data } = await api.get<{ data: { authUrl: string } }>('/auth/google/connect-sheets')
      return data.data
    },
    onSuccess: ({ authUrl }) => {
      window.location.href = authUrl
    },
    onError: () => toast.error('Failed to start Google Sheets connection'),
  })
}

export function useInitGoogleSheets() {
  // Called after OAuth redirect returns ?googleSheetsConnected=true
  // Hits the backend to actually create the spreadsheet
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data } = await api.post<{ data: { sheetId: string; url: string } }>('/google-sheets/connect')
      return data.data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Google Sheets connected — your spreadsheet is ready!')
    },
    onError: () => toast.error('Failed to create Google Sheet'),
  })
}

export function useDisconnectGoogleSheets() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      await api.post('/google-sheets/disconnect')
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] })
      toast.success('Google Sheets disconnected')
    },
    onError: () => toast.error('Failed to disconnect Google Sheets'),
  })
}

export function useGoogleSheetUrl() {
  return useQuery({
    queryKey: ['google-sheet-url'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: { url: string } | null }>('/google-sheets/sheet-url')
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}
