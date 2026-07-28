import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContactStage } from '../schemas/contact.schema'
import { STAGE_LABELS, STAGE_COLORS } from '../schemas/contact.schema'
import { useUpdateContactStage } from '../hooks/useContacts'

const VALID_TRANSITIONS: Record<ContactStage, ContactStage[]> = {
  ENQUIRY:       ['PROPOSAL_SENT', 'NEGOTIATING', 'CLIENT', 'LOST'],
  PROPOSAL_SENT: ['NEGOTIATING', 'CLIENT', 'LOST'],
  NEGOTIATING:   ['CLIENT', 'LOST'],
  CLIENT:        ['PAST_CLIENT', 'LOST'],
  PAST_CLIENT:   ['CLIENT', 'LOST'],
  LOST:          ['ENQUIRY', 'CLIENT'],
}

const STAGE_DESCRIPTIONS: Record<ContactStage, string> = {
  ENQUIRY:       'Initial enquiry, gathering requirements',
  PROPOSAL_SENT: 'Proposal has been sent and awaiting review',
  NEGOTIATING:   'Proposal accepted, working out the details',
  CLIENT:        'Active paying client',
  PAST_CLIENT:   'Previously worked together',
  LOST:          'Deal did not proceed',
}

interface Props {
  contactId: string
  current:   ContactStage
}

export default function ContactStagePicker({ contactId, current }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { mutate, isPending } = useUpdateContactStage()

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const options = VALID_TRANSITIONS[current] ?? []

  function pick(stage: ContactStage) {
    mutate({ id: contactId, stage }, { onSuccess: () => setOpen(false) })
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={isPending}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold transition-all',
          STAGE_COLORS[current],
          'hover:opacity-80 cursor-pointer',
        )}
      >
        {STAGE_LABELS[current]}
        <ChevronDown size={11} strokeWidth={2.5} className={cn('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-64 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="px-3 pt-3 pb-1">
            <p className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">
              Move to stage
            </p>
          </div>
          {options.map(stage => (
            <button
              key={stage}
              onClick={() => pick(stage)}
              className="w-full flex items-start gap-2.5 px-3 py-2.5 hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors text-left"
            >
              <span className={cn(
                'mt-0.5 text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0',
                STAGE_COLORS[stage],
              )}>
                {STAGE_LABELS[stage]}
              </span>
              <span className="text-[11.5px] text-[#667085] dark:text-[#8B92A8] leading-snug">
                {STAGE_DESCRIPTIONS[stage]}
              </span>
            </button>
          ))}
          <div className="px-3 py-2 border-t border-[#F2F4F7] dark:border-[#26283A]">
            <div className="flex items-center gap-2">
              <span className={cn(
                'text-[10.5px] font-semibold px-2 py-0.5 rounded-full',
                STAGE_COLORS[current],
              )}>
                {STAGE_LABELS[current]}
              </span>
              <span className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">current stage</span>
              <Check size={11} className="ml-auto text-[#17B26A]" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
