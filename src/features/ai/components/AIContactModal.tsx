import { useState } from 'react'
import { toast } from 'sonner'
import AIModal, { type AIModalPhase } from './AIModal'
import ContactReviewPanel, { type EditableContact } from './ContactReviewPanel'
import { useExtractLead, type ExtractedLead } from '../hooks/useAIExtract'
import { useCreateContact } from '@/features/contacts/hooks/useContacts'

interface Props {
  onClose: () => void
}

export default function AIContactModal({ onClose }: Props) {
  const [phase,     setPhase]     = useState<AIModalPhase>('input')
  const [extracted, setExtracted] = useState<ExtractedLead | null>(null)

  const extractMutation = useExtractLead()
  const createMutation  = useCreateContact()

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

  async function handleConfirm(data: EditableContact) {
    try {
      await createMutation.mutateAsync({
        name:      data.name,
        country:   data.country,
        currency:  data.currency,
        email:     data.email     || undefined,
        phone:     data.phone     || undefined,
        company:   data.company   || undefined,
        service:   data.service   || undefined,
        dealValue: data.budget    || undefined,
        source:    (data.source   || undefined) as 'instagram' | 'referral' | 'website' | 'linkedin' | 'cold_outreach' | 'other' | undefined,
        notes:     data.notes     || undefined,
        stage:     data.stage,
      })
      toast.success('Contact created from AI extraction')
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Could not create contact'
      toast.error(msg)
    }
  }

  return (
    <AIModal
      mode="contact"
      phase={phase}
      onClose={onClose}
      onExtract={handleExtract}
    >
      {phase === 'review' && extracted && (
        <ContactReviewPanel
          extracted={extracted}
          onConfirm={handleConfirm}
          onReset={() => { setPhase('input'); setExtracted(null) }}
          isCreating={createMutation.isPending}
        />
      )}
    </AIModal>
  )
}
