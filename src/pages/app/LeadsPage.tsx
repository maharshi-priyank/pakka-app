import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, IndianRupee } from 'lucide-react'
import AIIcon from '@/features/ai/components/AIIcon'
import { LeadsKanban, AddLeadModal } from '@/features/leads'
import { useLeads } from '@/features/leads'
import { cn } from '@/lib/utils'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import AILeadModal from '@/features/ai/components/AILeadModal'

export default function LeadsPage() {
  const navigate = useNavigate()
  const [search,  setSearch]  = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [showAI,  setShowAI]  = useState(false)

  function handleNewProposal(lead: Lead) {
    navigate('/app/proposals/new', { state: { lead } })
  }

  const { data } = useLeads({ limit: 200 })
  const pipelineValue = data?.pipelineValue ? Number(data.pipelineValue) : null

  return (
    <div className="space-y-4 max-w-[1400px]">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Leads</h1>
          {pipelineValue !== null && pipelineValue > 0 && (
            <p className={cn('text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5 flex items-center gap-1')}>
              <IndianRupee size={10} />
              {pipelineValue.toLocaleString('en-IN')} in pipeline
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Search */}
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search leads…"
              className={cn(
                'h-9 pl-8 pr-3 text-[13px] bg-white dark:bg-[#21222D] text-[#101828] dark:text-[#ECEEF3] border border-[#E8EBF2] dark:border-[#3D4258] rounded-lg outline-none',
                'focus:border-indigo-400 focus:ring-2 focus:ring-indigo-50 dark:focus:ring-indigo-900/30 transition-all w-[180px]',
                'placeholder:text-[#C9CDD4] dark:placeholder:text-[#545C74]',
              )}
            />
          </div>

          {/* AI button */}
          <button
            onClick={() => setShowAI(true)}
            className={cn(
              'flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-semibold transition-all',
              'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
              'hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md',
            )}
          >
            <AIIcon size={13} />
            Add with AI
          </button>

          {/* Add lead */}
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary"
          >
            <Plus size={14} strokeWidth={2.5} />
            Add Lead
          </button>
        </div>
      </div>

      {/* Kanban */}
      <LeadsKanban search={search} onNewProposal={handleNewProposal} />

      {/* Add modal */}
      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} />

      {/* AI modal */}
      {showAI && <AILeadModal onClose={() => setShowAI(false)} />}
    </div>
  )
}
