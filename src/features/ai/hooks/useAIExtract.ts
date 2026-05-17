import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface ExtractLeadPayload {
  text?:        string
  imageBase64?: string
  mimeType?:    string
}

export interface ExtractProposalPayload {
  text?:          string
  imageBase64?:   string
  mimeType?:      string
  pricingContext?: string
}

export interface ExtractedLead {
  name:       string | null
  email:      string | null
  phone:      string | null
  company:    string | null
  service:    string | null
  budget:     number | null
  source:     string | null
  notes:      string | null
  confidence: number
}

export interface ExtractedLineItem {
  description: string
  qty:         number
  rate:        number
  gstRate:     number
}

export interface ExtractedPaymentMilestone {
  milestone:  string
  percentage: number
}

export interface ExtractedProposal {
  title:           string
  scopeItems:      string[]
  deliverables:    string[]
  exclusions:      string[]
  lineItems:       ExtractedLineItem[]
  paymentSchedule: ExtractedPaymentMilestone[]
  pricingNotes:    string
  terms:           string
  validUntil:      string | null
  suggestedClient: { name: string | null; email: string | null }
  confidence:      number
}

export function useExtractLead() {
  return useMutation<ExtractedLead, Error, ExtractLeadPayload>({
    mutationFn: (payload) =>
      api.post<{ data: ExtractedLead }>('/ai/extract-lead', payload)
        .then(r => r.data.data),
  })
}

export function useExtractProposal() {
  return useMutation<ExtractedProposal, Error, ExtractProposalPayload>({
    mutationFn: (payload) =>
      api.post<{ data: ExtractedProposal }>('/ai/extract-proposal', payload)
        .then(r => r.data.data),
  })
}
