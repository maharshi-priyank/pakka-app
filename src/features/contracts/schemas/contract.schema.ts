import { z } from 'zod'

export const CONTRACT_STATUSES = ['DRAFT', 'SENT', 'SIGNED', 'DECLINED'] as const
export type ContractStatus = typeof CONTRACT_STATUSES[number]

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

export const contractClauseSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body:  z.string().min(1, 'Body is required'),
})

export const contractScopeItemSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
})

export const contractDeliverableSchema = z.object({
  item:   z.string().min(1),
  format: z.string().optional(),
})

export const contractPaymentMilestoneSchema = z.object({
  milestone: z.string().min(1),
  amount:    z.number().min(0),
  dueOn:     z.string().optional(),
})

export const contractContentSchema = z.object({
  intro:              z.string().optional(),
  projectDescription: z.string().optional(),
  totalAmount:        z.number().optional(),
  gstAmount:          z.number().optional(),
  gstType:            z.enum(['IGST', 'CGST_SGST', 'EXEMPT']).optional(),
  scopeItems:         z.array(contractScopeItemSchema).optional(),
  deliverables:       z.array(contractDeliverableSchema).optional(),
  exclusions:         z.array(z.string()).optional(),
  paymentSchedule:    z.array(contractPaymentMilestoneSchema).optional(),
  clauses:            z.array(contractClauseSchema).optional(),
  signerName:         z.string().optional(),
  signerEmail:        z.string().optional(),
  signerPhone:        z.string().optional(),
})

export const createContractSchema = z.object({
  title:       z.string().min(1, 'Title is required').max(200),
  proposalId:  z.string().optional(),
  clientId:    z.string().optional(),
  clientName:  z.string().optional(),
  clientEmail: z.string().optional(),
  projectId:   z.string().optional(),
  content:     contractContentSchema.optional(),
})

export const updateContractSchema = createContractSchema.partial().extend({
  status: z.enum(CONTRACT_STATUSES).optional(),
})

export type ContractClause          = z.infer<typeof contractClauseSchema>
export type ContractScopeItem       = z.infer<typeof contractScopeItemSchema>
export type ContractDeliverable     = z.infer<typeof contractDeliverableSchema>
export type ContractPaymentMilestone = z.infer<typeof contractPaymentMilestoneSchema>
export type ContractContent         = z.infer<typeof contractContentSchema>
export type CreateContractInput     = z.infer<typeof createContractSchema>
export type UpdateContractInput     = z.infer<typeof updateContractSchema>

// ─── API response types ───────────────────────────────────────────────────────

export interface ContractProposal { id: string; title: string; slug: string }
export interface ContractClient   { id: string; name: string; company?: string | null; email?: string | null }

export interface Contract {
  id:         string
  userId:     string
  proposalId: string | null
  clientId:   string | null
  projectId:  string | null
  proposal:   ContractProposal | null
  client:     ContractClient | null
  project:    { id: string; name: string } | null
  title:      string
  status:     ContractStatus
  content:    ContractContent
  signedAt:   string | null
  auditLog:   Record<string, unknown> | null
  createdAt:  string
}

export interface ContractListResponse {
  items: Contract[]
  total: number
  page:  number
  limit: number
}

export interface SendContractResponse {
  contract: Contract
  signUrl:  string
  otp:      string
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const STATUS_LABELS: Record<ContractStatus, string> = {
  DRAFT:    'Draft',
  SENT:     'Sent',
  SIGNED:   'Signed',
  DECLINED: 'Declined',
}

export const STATUS_BADGE_CLASS: Record<ContractStatus, string> = {
  DRAFT:    'badge badge-neutral',
  SENT:     'badge badge-indigo',
  SIGNED:   'badge badge-success',
  DECLINED: 'badge badge-error',
}
