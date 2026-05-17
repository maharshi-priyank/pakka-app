import { z } from 'zod'

export const LEAD_STAGES = ['ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST'] as const
export type LeadStage = typeof LEAD_STAGES[number]

export const LEAD_SOURCES = [
  'instagram', 'referral', 'website', 'linkedin', 'cold_outreach', 'other',
] as const

export const createLeadSchema = z.object({
  name:      z.string().min(1, 'Name is required').max(100),
  email:     z.string().email('Invalid email').optional().or(z.literal('')),
  phone:     z.string().max(20).optional().or(z.literal('')),
  company:   z.string().max(100).optional().or(z.literal('')),
  service:   z.string().max(200).optional().or(z.literal('')),
  budget:    z.string().optional().or(z.literal('')),
  source:    z.enum(LEAD_SOURCES).optional(),
  notes:     z.string().max(2000).optional().or(z.literal('')),
  followUpAt: z.string().optional().or(z.literal('')),
})

export const updateLeadSchema = createLeadSchema.partial()

export type CreateLeadInput = z.infer<typeof createLeadSchema>
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>

export interface Lead {
  id:             string
  userId:         string
  clientId:       string | null
  name:           string
  email:          string | null
  phone:          string | null
  company:        string | null
  service:        string | null
  budget:         string | null
  source:         string | null
  stage:          LeadStage
  notes:          string | null
  lastActivityAt: string
  followUpAt:     string | null
  createdAt:      string
}

export interface LeadsListResponse {
  items:         Lead[]
  total:         number
  page:          number
  limit:         number
  pipelineValue: string
}

export const STAGE_LABELS: Record<LeadStage, string> = {
  ENQUIRY:       'Enquiry',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATING:   'Negotiating',
  WON:           'Won',
  LOST:          'Lost',
}

export const STAGE_COLORS: Record<LeadStage, { bg: string; text: string; border: string }> = {
  ENQUIRY:       { bg: 'bg-[#F3F4F6]',  text: 'text-[#6B7280]',  border: 'border-[#E5E7EB]' },
  PROPOSAL_SENT: { bg: 'bg-indigo-50',   text: 'text-indigo-600', border: 'border-indigo-100' },
  NEGOTIATING:   { bg: 'bg-amber-50',    text: 'text-amber-600',  border: 'border-amber-100'  },
  WON:           { bg: 'bg-emerald-50',  text: 'text-emerald-600',border: 'border-emerald-100'},
  LOST:          { bg: 'bg-red-50',      text: 'text-red-500',    border: 'border-red-100'    },
}

export const STAGE_BADGE_CLASS: Record<LeadStage, string> = {
  ENQUIRY:       'badge badge-neutral',
  PROPOSAL_SENT: 'badge badge-indigo',
  NEGOTIATING:   'badge badge-warning',
  WON:           'badge badge-success',
  LOST:          'badge badge-error',
}
