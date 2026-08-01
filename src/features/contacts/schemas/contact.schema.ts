import { z } from 'zod'

export const CONTACT_STAGES = [
  'ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLIENT', 'PAST_CLIENT', 'LOST',
] as const
export type ContactStage = typeof CONTACT_STAGES[number]

export const PIPELINE_STAGES: ContactStage[] = ['ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'CLIENT']

export const CONTACT_SOURCES = [
  'instagram', 'referral', 'website', 'linkedin', 'cold_outreach', 'other',
] as const

export const CONTACT_CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED'] as const
export type ContactCurrency = typeof CONTACT_CURRENCIES[number]

export const createContactSchema = z.object({
  name:       z.string().min(1, 'Name is required').max(100),
  country:    z.string().min(1, 'Country is required'),
  currency:   z.enum(CONTACT_CURRENCIES, { message: 'Currency is required' }),
  email:      z.string().email('Invalid email').optional().or(z.literal('')),
  phone:      z.string().max(20).regex(/^[+\d\s\-().]+$/, 'Enter a valid phone number e.g. +91 98765 43210').optional().or(z.literal('')),
  company:    z.string().max(100).optional().or(z.literal('')),
  service:    z.string().max(200).optional().or(z.literal('')),
  dealValue:  z.string().optional().or(z.literal('')),
  source:     z.enum(CONTACT_SOURCES).optional(),
  notes:      z.string().max(2000).optional().or(z.literal('')),
  followUpAt: z.string().optional().or(z.literal('')),
  stage:      z.enum(CONTACT_STAGES).optional(),
})

// review-fix: country/currency need their own `.or(z.literal(''))` here, not
// just createContactSchema.partial()'s optional() -- a native uncontrolled
// <select> with an unselected placeholder submits '', not undefined, and
// .optional() only skips validation for undefined. Without this, editing any
// pre-existing Contact (all of which have country/currency: null per KTD5's
// no-backfill policy) without touching those two fields fails validation.
export const updateContactSchema = createContactSchema.partial().extend({
  country:  z.string().optional().or(z.literal('')),
  currency: z.enum(CONTACT_CURRENCIES).optional().or(z.literal('')),
})

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
  country:        string | null
  currency:       string | null
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

// Outlined/bordered variant of STAGE_COLORS — same color family, no fill.
// Used wherever a Contact-stage badge renders next to a Project's own status
// badge (which uses the filled-pill STAGE_COLORS-style treatment), so the two
// badges stay visually distinct even when their colors overlap (e.g. a
// CLIENT-stage Contact next to an ACTIVE Project are both green).
export const STAGE_OUTLINE_COLORS: Record<ContactStage, string> = {
  ENQUIRY:       'bg-transparent border border-[#3538CD] text-[#3538CD]',
  PROPOSAL_SENT: 'bg-transparent border border-[#B54708] text-[#B54708]',
  NEGOTIATING:   'bg-transparent border border-[#6941C6] text-[#6941C6]',
  CLIENT:        'bg-transparent border border-[#027A48] text-[#027A48]',
  PAST_CLIENT:   'bg-transparent border border-[#344054] text-[#344054]',
  LOST:          'bg-transparent border border-[#B42318] text-[#B42318]',
}

export const SOURCE_LABELS: Record<string, string> = {
  instagram:     'Instagram',
  referral:      'Referral',
  website:       'Website',
  linkedin:      'LinkedIn',
  cold_outreach: 'Cold Outreach',
  other:         'Other',
}
