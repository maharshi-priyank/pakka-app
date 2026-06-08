import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, LayoutTemplate, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Lead } from '../schemas/lead.schema'
import AIIcon from '@/features/ai/components/AIIcon'
import AIProposalModal from '@/features/ai/components/AIProposalModal'
import TemplatePickerModal from '@/features/proposals/components/TemplatePickerModal'

interface Props {
  lead:    Lead
  onClose: () => void
}

export default function LeadProposalPickerModal({ lead, onClose }: Props) {
  const navigate = useNavigate()
  const [showAI,       setShowAI]       = useState(false)
  const [showTemplate, setShowTemplate] = useState(false)

  function handleBlank() {
    onClose()
    navigate('/proposals/new', { state: { lead } })
  }

  if (showAI) {
    return <AIProposalModal defaultLeadId={lead.id} onClose={onClose} />
  }

  if (showTemplate) {
    return <TemplatePickerModal open defaultLead={lead} onClose={onClose} />
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={onClose} />

      <div className="relative z-10 w-full max-w-sm bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0] dark:border-[#26283A]">
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">New Proposal</p>
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
              For {lead.name}{lead.company ? ` · ${lead.company}` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2.5">

          {/* Draft with AI */}
          <button
            onClick={() => setShowAI(true)}
            className={cn(
              'w-full flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all group',
              'border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30',
              'hover:border-indigo-400 dark:hover:border-indigo-600 hover:shadow-sm hover:shadow-indigo-100 dark:hover:shadow-indigo-900/30',
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 flex items-center justify-center shrink-0 mt-0.5">
              <AIIcon size={14} className="text-white" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Draft with AI</p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">
                Describe the project or paste a brief — AI fills scope, pricing, and terms.
              </p>
            </div>
          </button>

          {/* From Template */}
          <button
            onClick={() => setShowTemplate(true)}
            className={cn(
              'w-full flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all',
              'border-[#E4E7EC] dark:border-[#2D3048] bg-white dark:bg-[#21222D]',
              'hover:border-[#D0D5DD] dark:hover:border-[#3D4258] hover:shadow-sm',
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F5F6FA] dark:bg-[#2D3048] flex items-center justify-center shrink-0 mt-0.5">
              <LayoutTemplate size={15} className="text-[#667085] dark:text-[#8B92A8]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">From Template</p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">
                Pick a saved template and customise for this lead.
              </p>
            </div>
          </button>

          {/* Blank */}
          <button
            onClick={handleBlank}
            className={cn(
              'w-full flex items-start gap-3.5 p-4 rounded-xl border-2 text-left transition-all',
              'border-[#E4E7EC] dark:border-[#2D3048] bg-white dark:bg-[#21222D]',
              'hover:border-[#D0D5DD] dark:hover:border-[#3D4258] hover:shadow-sm',
            )}
          >
            <div className="w-8 h-8 rounded-lg bg-[#F5F6FA] dark:bg-[#2D3048] flex items-center justify-center shrink-0 mt-0.5">
              <FileText size={15} className="text-[#667085] dark:text-[#8B92A8]" />
            </div>
            <div>
              <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Start Blank</p>
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5 leading-relaxed">
                Open the proposal editor with this lead pre-filled.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
