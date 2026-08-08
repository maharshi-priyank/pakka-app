import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import type { ContactStage } from '@/features/contacts/schemas/contact.schema'

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
  projectId:   string | null
}

export interface PortalContract {
  id:        string
  title:     string
  status:    string
  signedAt:  string | null
  createdAt: string
  projectId: string | null
}

export interface PortalInvoice {
  id:            string
  invoiceNumber: string
  status:        string
  total:         string
  dueDate:       string | null
  paidAt:        string | null
  createdAt:     string
  projectId:     string | null
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

export interface PortalProjectUpdate {
  id:        string
  content:   string
  createdAt: string
  author: { id: string; name: string }
}

export interface PortalApprovalRequest {
  id:           string
  kind:         string
  status:       string
  requiresOtp:  boolean
  decisionNote: string | null
  decidedAt:    string | null
  otpEmailSent: boolean
  createdAt:    string
}

export interface PortalChangeRequest {
  id:               string
  description:      string
  status:           string
  raisedByEmail:    string
  freelancerNote:   string | null
  createdAt:        string
  approvalRequests: PortalApprovalRequest[]
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
  updates:             PortalProjectUpdate[]
  changeRequests?:     PortalChangeRequest[]
  approvalRequests?:   PortalApprovalRequest[]
}

export interface PortalData {
  client: {
    id:      string
    name:    string
    email:   string | null
    company: string | null
    // Only present when resolved via Contact (Phase C portal path). The legacy
    // Client-based portal path (no Contact record) never includes this field.
    stage?:  ContactStage
  }
  freelancer: {
    businessName:  string | null
    logoUrl:       string | null
    hideBranding?: boolean
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

export interface VerifyPaymentInput {
  invoiceId:          string
  razorpayOrderId:    string
  razorpayPaymentId:  string
  razorpaySignature:  string
}

export function useVerifyInvoicePayment(token: string) {
  return useMutation({
    mutationFn: async (input: VerifyPaymentInput) => {
      const { data } = await publicApi.post<{ data: { status: string; paidAt: string | null } }>(
        `/portal/${token}/invoices/${input.invoiceId}/verify-payment`,
        {
          razorpayOrderId:   input.razorpayOrderId,
          razorpayPaymentId: input.razorpayPaymentId,
          razorpaySignature: input.razorpaySignature,
        },
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

export function useRaiseChangeRequest(token: string, projectId: string) {
  return useMutation({
    mutationFn: async (description: string) => {
      const { data } = await publicApi.post(
        `/portal/${token}/projects/${projectId}/change-requests`,
        { description },
      )
      return data.data
    },
  })
}

export function useDecideApproval(token: string) {
  return useMutation({
    mutationFn: async ({ id, action, otp, decisionNote }: {
      id: string; action: string; otp?: string; decisionNote?: string
    }) => {
      const { data } = await publicApi.post(
        `/portal/${token}/approval-requests/${id}/decide`,
        { action, otp, decisionNote },
      )
      return data.data
    },
  })
}

export function useResendApprovalOtp(token: string) {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data } = await publicApi.post(
        `/portal/${token}/approval-requests/${id}/resend-otp`,
      )
      return data.data
    },
  })
}
