import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

export interface PortalProposal {
  id:          string
  title:       string
  status:      string
  slug:        string
  totalAmount: string
  gstAmount:   string
  validUntil:  string | null
  acceptedAt:  string | null
  createdAt:   string
}

export interface PortalContract {
  id:       string
  title:    string
  status:   string
  signedAt: string | null
  createdAt: string
}

export interface PortalInvoice {
  id:            string
  invoiceNumber: string
  status:        string
  total:         string
  dueDate:       string | null
  paidAt:        string | null
  createdAt:     string
}

export interface PortalMeeting {
  id:           string
  title:        string
  agenda:       string | null
  scheduledAt:  string
  durationMins: number
  meetLink:     string | null
  status:       string
}

export interface PortalProjectTimeEntry {
  id: string; description: string; date: string
  durationMins: number; hourlyRate: string | null; isBilled: boolean
}

export interface PortalProjectExpense {
  id: string; description: string; category: string
  amount: string; date: string; isBilled: boolean
}

export interface PortalProject {
  id:                  string
  name:                string
  status:              string
  budget:              string | null
  startDate:           string | null
  endDate:             string | null
  shareRateWithClient: boolean
  timeEntries:         PortalProjectTimeEntry[]
  expenses:            PortalProjectExpense[]
}

export interface PortalData {
  client: {
    id:      string
    name:    string
    email:   string | null
    company: string | null
  }
  freelancer: {
    businessName: string | null
    logoUrl:      string | null
  }
  proposals: PortalProposal[]
  contracts: PortalContract[]
  invoices:  PortalInvoice[]
  meetings:  PortalMeeting[]
  projects:  PortalProject[]
}

export function usePortalData(token: string) {
  return useQuery({
    queryKey: ['portal', token],
    queryFn:  async () => {
      const { data } = await publicApi.get<{ data: PortalData }>(`/portal/${token}`)
      return data.data
    },
    retry: false,
  })
}

export function useCreateInvoiceOrder(token: string) {
  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const { data } = await publicApi.post<{ data: { orderId: string; amount: number; currency: string; keyId: string } }>(
        `/portal/${token}/invoices/${invoiceId}/create-order`,
      )
      return data.data
    },
  })
}

export function usePortalAcceptProposal() {
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data } = await publicApi.post<{ data: { status: string } }>(`/proposals/view/${slug}/accept`)
      return data.data
    },
  })
}

export function usePortalDeclineProposal() {
  return useMutation({
    mutationFn: async (slug: string) => {
      const { data } = await publicApi.post<{ data: { status: string } }>(`/proposals/view/${slug}/decline`)
      return data.data
    },
  })
}

export function usePortalSignContract() {
  return useMutation({
    mutationFn: async ({ id, otp }: { id: string; otp: string }) => {
      const { data } = await publicApi.post<{ data: { status: string; signedAt: string } }>(
        `/contracts/sign/${id}`,
        { otp },
      )
      return data.data
    },
  })
}
