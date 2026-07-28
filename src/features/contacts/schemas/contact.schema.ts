import { z } from 'zod'

export const CONTACT_STAGES = [
  'ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLIENT', 'PAST_CLIENT', 'LOST',
] as const
export type ContactStage = typeof CONTACT_STAGES[number]

export const PIPELINE_STAGES: ContactStage[] = ['ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLIENT']

export const CONTACT_SOURCES = [
  'instagram', 'referral', 'website', 'linkedin', 'cold_outreach', 'other',
] as const

export const createContactSchema = z.object({
  name:       z.string().min(1, 'Name is required').max(100),
  email:      z.string().email('Invalid email').optional().or(z.literal('')),
  phone:      z.string().max(20).optional().or(z.literal('')),
  company:    z.string().max(100).optional().or(z.literal('')),
  service:    z.string().max(200).optional().or(z.literal('')),
  dealValue:  z.string().optional().or(z.literal('')),
  source:     z.enum(CONTACT_SOURCES).optional(),
  notes:      z.string().max(2000).optional().or(z.literal('')),
  followUpAt: z.string().optional().or(z.literal('')),
  stage:      z.enum(CONTACT_STAGES).optional(),
})

export const updateContactSchema = createContactSchema.partial()

export type CreateContactInput = z.infer<typeof createContactSchema>
export type UpdateContactInput = z.infer<typeof updateContactSchema>

export interface ContactCounts {
  proposals: number
  contracts: number
  invoices:  number
  projects:  number
}

export type ProjectStage = 'SCOPING' | 'PROPOSAL_SENT' | 'ACTIVE' | 'COMPLETED' | 'ON_HOLD' | 'CANCELLED'

export interface ContactProject {
  id:           string
  name:         string
  status:       string
  projectStage: ProjectStage | null
  budget:       string | null
  startDate:    string | null
  endDate:      string | null
  createdAt:    string
  updatedAt:    string
}

export interface ContactMeeting {
  id:          string
  title:       string
  scheduledAt: string
  status:      string
  meetLink:    string | null
}

export interface ContactNote {
  id:        string
  content:   string
  createdAt: string
}

export interface Contact {
  id:             string
  workspaceId:    string
  name:           string
  email:          string | null
  phone:          string | null
  company:        string | null
  service:        string | null
  dealValue:      string | null
  source:         string | null
  stage:          ContactStage
  notes:          string | null
  portalToken:    string | null
  lastActivityAt: string
  followUpAt:     string | null
  archivedAt:     string | null
  createdAt:      string
  updatedAt:      string
  _count?:        ContactCounts
  projects?:      ContactProject[]
  meetings?:      ContactMeeting[]
  notesList?:     ContactNote[]
  threads?:       { id: string; subject: string | null; updatedAt: string }[]
}

export interface ContactsListResponse {
  items:         Contact[]
  total:         number
  page:          number
  limit:         number
  pipelineValue: string
}

export const STAGE_LABELS: Record<ContactStage, string> = {
  ENQUIRY:       'Enquiry',
  PROPOSAL_SENT: 'Proposal Sent',
  NEGOTIATING:   'Negotiating',
  CLIENT:        'Client',
  PAST_CLIENT:   'Past Client',
  LOST:          'Lost',
}

export const STAGE_COLORS: Record<ContactStage, string> = {
  ENQUIRY:       'bg-[#EEF4FF] text-[#3538CD]',
  PROPOSAL_SENT: 'bg-[#FFFAEB] text-[#B54708]',
  NEGOTIATING:   'bg-[#FDF4FF] text-[#6941C6]',
  CLIENT:        'bg-[#ECFDF3] text-[#027A48]',
  PAST_CLIENT:   'bg-[#F2F4F7] text-[#344054]',
  LOST:          'bg-[#FEF3F2] text-[#B42318]',
}

export const SOURCE_LABELS: Record<string, string> = {
  instagram:     'Instagram',
  referral:      'Referral',
  website:       'Website',
  linkedin:      'LinkedIn',
  cold_outreach: 'Cold Outreach',
  other:         'Other',
}
