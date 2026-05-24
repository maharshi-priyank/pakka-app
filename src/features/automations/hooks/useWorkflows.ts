import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { api } from '@/lib/api'

// ─── Types ─────────────────────────────────────────────────────────────────

export interface ActionNode {
  id:     string
  type:   'action'
  delay:  { value: number; unit: 'minutes' | 'hours' | 'days' }
  action: { type: string; config: Record<string, unknown> }
}

export interface ConditionNode {
  id:        string
  type:      'condition'
  condition: { field: string; operator: string; value: string }
  trueBranch:  WorkflowStep[]
  falseBranch: WorkflowStep[]
}

export type WorkflowStep = ActionNode | ConditionNode

export interface WorkflowTrigger {
  type:   string
  config: Record<string, unknown>
}

export interface AutomationWorkflow {
  id:          string
  name:        string
  description: string | null
  isActive:    boolean
  trigger:     WorkflowTrigger
  steps:       WorkflowStep[]
  runCount:    number
  lastRunAt:   string | null
  createdAt:   string
  updatedAt:   string
  _count?:     { runs: number }
}

export interface WorkflowRunLogEntry {
  stepId:      string
  type?:       string
  actionType?: string
  result?:     string
  error?:      string
  executedAt:  string
}

export interface WorkflowRun {
  id:          string
  workflowId:  string
  entityId:    string
  entityType:  string
  status:      'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED'
  log:         WorkflowRunLogEntry[]
  startedAt:   string
  completedAt: string | null
}

export interface AutomationWorkflowDetail extends AutomationWorkflow {
  runs: WorkflowRun[]
}

// ─── Trigger + action metadata ─────────────────────────────────────────────

export const TRIGGER_LABELS: Record<string, string> = {
  'lead.created':        'New lead created',
  'lead.stage_changed':  'Lead stage changed',
  'proposal.accepted':   'Proposal accepted',
  'proposal.sent':       'Proposal sent',
  'contract.signed':     'Contract signed',
  'contract.sent':       'Contract sent',
  'invoice.paid':        'Invoice paid',
  'invoice.sent':        'Invoice sent',
  'invoice.overdue':     'Invoice overdue',
  'form.submitted':      'Form submitted',
  'meeting.scheduled':   'Meeting scheduled',
}

export const ACTION_LABELS: Record<string, string> = {
  'send_email.client':  'Send email to client',
  'send_email.me':      'Send email to me',
  'send_form':          'Send form link',
  'change_lead_stage':  'Change lead stage',
  'create_task':        'Create task / reminder',
  'add_note':           'Add note',
  'create.contract':    'Auto-create contract',
  'create.invoice':     'Auto-create invoice',
}

export const CONDITION_FIELD_LABELS: Record<string, string> = {
  'lead.budget':    'Lead budget',
  'lead.stage':     'Lead stage',
  'lead.source':    'Lead source',
  'invoice.total':  'Invoice total',
  'client.hasEmail': 'Client has email',
}

export const LEAD_STAGES = ['ENQUIRY', 'PROPOSAL_SENT', 'NEGOTIATING', 'WON', 'LOST'] as const

export const MERGE_FIELDS = [
  '{{clientName}}', '{{clientEmail}}', '{{businessName}}',
  '{{proposalTitle}}', '{{invoiceAmount}}', '{{invoiceDueDate}}',
  '{{formLink}}', '{{portalLink}}', '{{meetingTitle}}', '{{meetingDate}}',
]

// ─── Hooks ─────────────────────────────────────────────────────────────────

export function useWorkflows() {
  return useQuery({
    queryKey: ['workflows'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: AutomationWorkflow[] }>('/workflows')
      return data.data
    },
    staleTime: 30_000,
  })
}

export function useWorkflow(id: string) {
  return useQuery({
    queryKey: ['workflows', id],
    queryFn:  async () => {
      const { data } = await api.get<{ data: AutomationWorkflowDetail }>(`/workflows/${id}`)
      return data.data
    },
    staleTime: 10_000,
    enabled:   !!id,
  })
}

export function useWorkflowRuns(workflowId: string) {
  return useQuery({
    queryKey: ['workflows', workflowId, 'runs'],
    queryFn:  async () => {
      const { data } = await api.get<{ data: WorkflowRun[] }>(`/workflows/${workflowId}/runs`)
      return data.data
    },
    staleTime: 15_000,
    enabled:   !!workflowId,
  })
}

export function useCreateWorkflow() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (name: string) => {
      const { data } = await api.post<{ data: AutomationWorkflow }>('/workflows', { name })
      return data.data
    },
    onSuccess: (wf) => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      navigate(`/app/automations/${wf.id}`)
    },
  })
}

export function useUpdateWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: Partial<AutomationWorkflow> & { id: string }) => {
      const { data } = await api.patch<{ data: AutomationWorkflow }>(`/workflows/${id}`, patch)
      return data.data
    },
    onSuccess: (updated) => {
      qc.setQueryData<AutomationWorkflow[]>(['workflows'], prev =>
        prev?.map(w => w.id === updated.id ? { ...w, ...updated } : w),
      )
      qc.setQueryData<AutomationWorkflowDetail>(['workflows', updated.id], prev =>
        prev ? { ...prev, ...updated } : prev,
      )
    },
  })
}

export function useDeleteWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/workflows/${id}`)
      return id
    },
    onSuccess: (id) => {
      qc.setQueryData<AutomationWorkflow[]>(['workflows'], prev => prev?.filter(w => w.id !== id))
    },
  })
}
