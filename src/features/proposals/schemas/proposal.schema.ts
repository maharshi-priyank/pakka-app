import { z } from 'zod'

export const PROPOSAL_STATUSES = ['DRAFT', 'SENT', 'OPENED', 'ACCEPTED', 'DECLINED', 'EXPIRED'] as const
export type ProposalStatus = typeof PROPOSAL_STATUSES[number]

export const GST_TYPES = ['CGST_SGST', 'IGST', 'EXEMPT'] as const
export type GstType = typeof GST_TYPES[number]

export const GST_RATES = [0, 5, 12, 18, 28] as const
export type GstRate = typeof GST_RATES[number]

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  qty:         z.number().min(0.01, 'Qty must be > 0'),
  rate:        z.number().min(0, 'Rate must be ≥ 0'),
  gstRate:     z.union([z.literal(0), z.literal(5), z.literal(12), z.literal(18), z.literal(28)]).optional(),
})

export const scopeItemSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
})

export const milestoneSchema = z.object({
  title:       z.string().min(1),
  duration:    z.string().optional(),
  description: z.string().optional(),
})

export const deliverableSchema = z.object({
  item:   z.string().min(1, 'Deliverable is required'),
  format: z.string().optional(),
})

export const paymentMilestoneSchema = z.object({
  milestone: z.string().min(1, 'Milestone name is required'),
  amount:    z.number().min(0, 'Amount must be ≥ 0'),
  dueOn:     z.string().optional(),
})

export const caseStudySchema = z.object({
  title:       z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  result:      z.string().optional(),
  link:        z.string().url('Must be a valid URL').optional().or(z.literal('')),
})

export const faqItemSchema = z.object({
  question: z.string().min(1, 'Question is required'),
  answer:   z.string().min(1, 'Answer is required'),
})

export const proposalContentSchema = z.object({
  // Cover
  intro:       z.string().optional(),
  whyUs:       z.string().optional(),
  nextSteps:   z.string().optional(),
  // Scope
  scopeItems:  z.array(scopeItemSchema).optional(),
  deliverables: z.array(deliverableSchema).optional(),
  exclusions:  z.array(z.string()).optional(),
  // Pricing
  lineItems:       z.array(lineItemSchema).optional(),
  pricingNotes:    z.string().optional(),
  gstType:         z.enum(GST_TYPES).optional(),
  paymentSchedule: z.array(paymentMilestoneSchema).optional(),
  // Timeline
  milestones: z.array(milestoneSchema).optional(),
  // Terms
  terms: z.string().optional(),
  // Credibility
  caseStudies: z.array(caseStudySchema).optional(),
  faq:         z.array(faqItemSchema).optional(),
})

// ─── Form schemas ─────────────────────────────────────────────────────────────

export const createProposalSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  leadId:      z.string().optional(),
  clientId:    z.string().optional(),
  projectId:   z.string().optional(),
  clientName:  z.string().optional(),
  clientEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  content:     proposalContentSchema.optional(),
  validUntil:  z.string().optional(),
})

export const updateProposalSchema = createProposalSchema.partial().extend({
  status:           z.enum(PROPOSAL_STATUSES).optional(),
  hidePricingTable: z.boolean().optional(),
})

export type LineItem          = z.infer<typeof lineItemSchema>
export type ScopeItem         = z.infer<typeof scopeItemSchema>
export type Milestone         = z.infer<typeof milestoneSchema>
export type Deliverable       = z.infer<typeof deliverableSchema>
export type PaymentMilestone  = z.infer<typeof paymentMilestoneSchema>
export type CaseStudy         = z.infer<typeof caseStudySchema>
export type FaqItem           = z.infer<typeof faqItemSchema>
export type ProposalContent   = z.infer<typeof proposalContentSchema>
export type CreateProposalInput = z.infer<typeof createProposalSchema>
export type UpdateProposalInput = z.infer<typeof updateProposalSchema>

// ─── API response types ───────────────────────────────────────────────────────

export interface ProposalLead   { id: string; name: string; email?: string }
export interface ProposalClient { id: string; name: string; company?: string | null }
export interface ProposalOpen   { id: string; openedAt: string }

export interface ProposalContract { id: string; status: string }

export interface Proposal {
  id:          string
  userId:      string
  leadId:      string | null
  clientId:    string | null
  projectId:   string | null
  lead:        ProposalLead | null
  client:      ProposalClient | null
  project:     { id: string; name: string } | null
  title:       string
  status:      ProposalStatus
  slug:        string
  content:     ProposalContent
  totalAmount:      string
  gstAmount:        string
  hidePricingTable: boolean
  validUntil:       string | null
  acceptedAt:       string | null
  opens:       ProposalOpen[]
  contracts?:  ProposalContract[]
  archivedAt:  string | null
  createdAt:   string
  _count?:     { opens: number }
}

export interface ProposalListResponse {
  items: Proposal[]
  total: number
  page:  number
  limit: number
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ProposalStatus, string> = {
  DRAFT:    'Draft',
  SENT:     'Sent',
  OPENED:   'Opened',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  EXPIRED:  'Expired',
}

export const STATUS_BADGE_CLASS: Record<ProposalStatus, string> = {
  DRAFT:    'badge badge-neutral',
  SENT:     'badge badge-indigo',
  OPENED:   'badge badge-warning',
  ACCEPTED: 'badge badge-success',
  DECLINED: 'badge badge-error',
  EXPIRED:  'badge badge-neutral',
}

export const GST_TYPE_LABELS: Record<GstType, string> = {
  CGST_SGST: 'CGST + SGST (Same state)',
  IGST:      'IGST (Inter-state)',
  EXEMPT:    'GST Exempt',
}

// ─── Template types ───────────────────────────────────────────────────────────

export interface ProposalTemplate {
  id:          string
  name:        string
  description: string | null
  category:    string | null
  isSystem?:   boolean
  content:     ProposalContent
  totalAmount: number
  usageCount:  number
  createdAt:   string
  updatedAt:   string
}
