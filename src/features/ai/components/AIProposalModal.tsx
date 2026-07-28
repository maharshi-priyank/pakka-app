import { useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import AIModal, { type AIModalPhase } from './AIModal'
import ProposalReviewPanel, { type ProposalReviewData } from './ProposalReviewPanel'
import { useExtractProposal, type ExtractedProposal } from '../hooks/useAIExtract'
import { useCreateProposal } from '@/features/proposals/hooks/useProposals'

interface Props {
  onClose:        () => void
  defaultLeadId?: string
}

export default function AIProposalModal({ onClose, defaultLeadId }: Props) {
  const [phase,     setPhase]     = useState<AIModalPhase>('input')
  const [extracted, setExtracted] = useState<ExtractedProposal | null>(null)
  const navigate = useNavigate()

  const extractMutation = useExtractProposal()
  const createMutation  = useCreateProposal()

  async function handleExtract(payload: {
    text?: string; imageBase64?: string; mimeType?: string; pricingContext?: string
  }) {
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

  async function handleConfirm(data: ProposalReviewData) {
    // Compute total from line items for payment schedule conversion
    const lineTotal = data.lineItems.reduce((sum, li) => {
      const base = li.qty * li.rate
      const gst  = base * (li.gstRate / 100)
      return sum + base + gst
    }, 0)

    // Convert percentage-based schedule to amount-based
    const paymentSchedule = data.paymentSchedule.map(ms => ({
      milestone: ms.milestone,
      amount:    lineTotal > 0
        ? parseFloat(((ms.percentage / 100) * lineTotal).toFixed(2))
        : 0,
    }))

    try {
      const proposal = await createMutation.mutateAsync({
        title:       data.title,
        contactId:   defaultLeadId || undefined,
        clientName:  data.clientName,
        clientEmail: data.clientEmail,
        validUntil:  data.validUntil ?? undefined,
        content: {
          scopeItems:   data.scopeItems.map(s => ({ title: s })),
          deliverables: data.deliverables.map(d => ({ item: d })),
          exclusions:   data.exclusions,
          lineItems:    data.lineItems as { description: string; qty: number; rate: number; gstRate?: 0 | 5 | 12 | 18 | 28 }[],
          paymentSchedule,
          pricingNotes: data.pricingNotes,
          terms:        data.terms,
          gstType:      'IGST',
        },
      })
      toast.success('Draft proposal created')
      onClose()
      navigate(`/proposals/${proposal.id}`)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create proposal'
      toast.error(msg)
    }
  }

  return (
    <AIModal
      mode="proposal"
      phase={phase}
      onClose={onClose}
      onExtract={handleExtract}
    >
      {phase === 'review' && extracted && (
        <ProposalReviewPanel
          extracted={extracted}
          onConfirm={handleConfirm}
          onReset={() => { setPhase('input'); setExtracted(null) }}
          isCreating={createMutation.isPending}
        />
      )}
    </AIModal>
  )
}
