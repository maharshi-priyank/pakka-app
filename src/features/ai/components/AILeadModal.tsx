import { useState } from 'react'
import { toast } from 'sonner'
import AIModal, { type AIModalPhase } from './AIModal'
import LeadReviewPanel from './LeadReviewPanel'
import { useExtractLead, type ExtractedLead } from '../hooks/useAIExtract'
import { useCreateLead } from '@/features/leads/hooks/useLeads'

interface Props {
  onClose: () => void
}

export default function AILeadModal({ onClose }: Props) {
  const [phase,     setPhase]     = useState<AIModalPhase>('input')
  const [extracted, setExtracted] = useState<ExtractedLead | null>(null)

  const extractMutation = useExtractLead()
  const createMutation  = useCreateLead()

  async function handleExtract(payload: { text?: string; imageBase64?: string; mimeType?: string }) {
    setPhase('extracting')
    try {
      const result = await extractMutation.mutateAsync(payload)
      setExtracted(result)
      setPhase('review')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Extraction failed'
      toast.error(msg)
      setPhase('input')
    }
  }

  async function handleConfirm(data: {
    name: string; email: string; phone: string; company: string
    service: string; budget: string; source: string; notes: string
  }) {
    try {
      await createMutation.mutateAsync({
        name:    data.name,
        email:   data.email   || undefined,
        phone:   data.phone   || undefined,
        company: data.company || undefined,
        service: data.service || undefined,
        budget:  data.budget  ? data.budget : undefined,
        source:  (data.source || undefined) as 'linkedin' | 'instagram' | 'referral' | 'website' | 'cold_outreach' | 'other' | undefined,
        notes:   data.notes   || undefined,
      })
      toast.success('Lead created from AI extraction')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create lead'
      toast.error(msg)
    }
  }

  return (
    <AIModal
      mode="lead"
      phase={phase}
      onClose={onClose}
      onExtract={handleExtract}
    >
      {phase === 'review' && extracted && (
        <LeadReviewPanel
          extracted={extracted}
          onConfirm={handleConfirm}
          onReset={() => { setPhase('input'); setExtracted(null) }}
          isCreating={createMutation.isPending}
        />
      )}
    </AIModal>
  )
}
