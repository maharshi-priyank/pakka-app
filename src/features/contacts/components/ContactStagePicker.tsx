import { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
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

const LOST_REASON_OPTIONS = [
  'Price too high',
  'Chose a competitor',
  'Project cancelled by client',
  'No response after follow-up',
  'Scope mismatch',
  'Timeline mismatch',
  'Other',
]

interface Props {
  contactId: string
  current:   ContactStage
}

export default function ContactStagePicker({ contactId, current }: Props) {
  const [open, setOpen]               = useState(false)
  const [lostStep, setLostStep]       = useState(false)
  const [lostReason, setLostReason]   = useState('')
  const [lostOther, setLostOther]     = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const { mutate, isPending } = useUpdateContactStage()

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setLostStep(false)
        setLostReason('')
        setLostOther('')
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [])

  const options = VALID_TRANSITIONS[current] ?? []

  function pick(stage: ContactStage) {
    if (stage === 'LOST') {
      setLostStep(true)
      return
    }
    mutate({ id: contactId, stage }, { onSuccess: () => setOpen(false) })
  }

  function confirmLost() {
    const reason = lostReason === 'Other' ? lostOther.trim() : lostReason
    mutate(
      { id: contactId, stage: 'LOST', lostReason: reason || undefined },
      { onSuccess: () => { setOpen(false); setLostStep(false); setLostReason(''); setLostOther('') } },
    )
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

      {open && !lostStep && (
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

      {/* Lost reason step */}
      {open && lostStep && (
        <div className="absolute top-full left-0 mt-1.5 z-50 w-72 bg-white dark:bg-[#1A1B23] border border-[#EAECF0] dark:border-[#26283A] rounded-xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] overflow-hidden">
          <div className="flex items-center justify-between px-3 pt-3 pb-2">
            <p className="text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Why was this lost?</p>
            <button
              onClick={() => setLostStep(false)}
              className="text-[#98A2B3] hover:text-[#667085] transition-colors"
            >
              <X size={13} />
            </button>
          </div>
          <div className="px-3 pb-1 space-y-0.5">
            {LOST_REASON_OPTIONS.map(opt => (
              <button
                key={opt}
                onClick={() => setLostReason(opt)}
                className={cn(
                  'w-full text-left px-2.5 py-1.5 rounded-lg text-[12.5px] transition-colors',
                  lostReason === opt
                    ? 'bg-[#FEF3F2] dark:bg-red-950/30 text-[#B42318] dark:text-red-400 font-medium'
                    : 'text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D]',
                )}
              >
                {opt}
              </button>
            ))}
          </div>
          {lostReason === 'Other' && (
            <div className="px-3 pb-2">
              <input
                autoFocus
                value={lostOther}
                onChange={e => setLostOther(e.target.value)}
                placeholder="Describe the reason..."
                className="w-full px-2.5 py-1.5 text-[12.5px] border border-[#EAECF0] dark:border-[#26283A] rounded-lg bg-transparent text-[#344054] dark:text-[#C2C8D8] placeholder-[#98A2B3] focus:outline-none focus:ring-1 focus:ring-[#3538CD] mt-1"
              />
            </div>
          )}
          <div className="flex gap-2 px-3 pb-3 pt-1">
            <button
              onClick={() => setLostStep(false)}
              className="flex-1 py-1.5 text-[12.5px] font-medium text-[#667085] dark:text-[#8B92A8] border border-[#EAECF0] dark:border-[#26283A] rounded-lg hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmLost}
              disabled={isPending}
              className="flex-1 py-1.5 text-[12.5px] font-semibold bg-[#FEF3F2] dark:bg-red-950/40 text-[#B42318] dark:text-red-400 border border-red-200 dark:border-red-900/50 rounded-lg hover:bg-[#FEE4E2] dark:hover:bg-red-950/60 transition-colors disabled:opacity-50"
            >
              Mark as Lost
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
