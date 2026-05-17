import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, FileSignature } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useContracts } from '@/features/contracts/hooks/useContracts'
import ContractCard, { ContractCardSkeleton } from '@/features/contracts/components/ContractCard'
import type { ContractStatus, Contract } from '@/features/contracts/schemas/contract.schema'
import { STATUS_LABELS } from '@/features/contracts/schemas/contract.schema'

const STATUS_TABS: Array<{ value: ContractStatus | 'ALL'; label: string }> = [
  { value: 'ALL',      label: 'All' },
  { value: 'DRAFT',    label: 'Draft' },
  { value: 'SENT',     label: 'Sent' },
  { value: 'SIGNED',   label: 'Signed' },
  { value: 'DECLINED', label: 'Declined' },
]

export default function ContractsPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<ContractStatus | 'ALL'>('ALL')

  const { data, isLoading } = useContracts({ limit: 200 })

  const allContracts   = data?.items ?? []
  const contracts      = statusFilter === 'ALL' ? allContracts : allContracts.filter(c => c.status === statusFilter)
  const signedCount    = allContracts.filter(c => c.status === 'SIGNED').length
  const awaitingCount  = allContracts.filter(c => c.status === 'SENT').length

  return (
    <div className="space-y-5 max-w-[1400px]">

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] tracking-tight">Contracts</h1>
          {!isLoading && contracts.length > 0 && (
            <p className="text-[12px] text-[#9CA3AF] mt-0.5">
              {signedCount} signed
              {awaitingCount > 0 && ` · ${awaitingCount} awaiting signature`}
            </p>
          )}
        </div>
        <button onClick={() => navigate('/app/contracts/new')} className="btn-primary">
          <Plus size={14} strokeWidth={2.5} />
          New Contract
        </button>
      </div>

      {/* Status filter tabs */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] overflow-x-auto scrollbar-none -mx-4 px-4 lg:mx-0 lg:px-0">
        {STATUS_TABS.map(tab => {
          const isActive = statusFilter === tab.value
          const count = tab.value === 'ALL'
            ? allContracts.length
            : allContracts.filter(c => c.status === tab.value).length

          return (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap flex items-center gap-1.5',
                isActive
                  ? 'border-[#6366F1] text-[#6366F1]'
                  : 'border-transparent text-[#667085] hover:text-[#344054]',
              )}
            >
              {tab.label}
              {typeof count === 'number' && count > 0 && (
                <span className={cn(
                  'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                  isActive ? 'bg-[#EEF2FF] text-[#6366F1]' : 'bg-[#F2F4F7] text-[#667085]',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 6 }).map((_, i) => <ContractCardSkeleton key={i} />)}
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] flex items-center justify-center mb-4">
            <FileSignature size={22} className="text-[#D0D5DD]" />
          </div>
          <p className="text-[14px] font-semibold text-[#344054]">
            {statusFilter === 'ALL' ? 'No contracts yet' : `No ${STATUS_LABELS[statusFilter as ContractStatus]?.toLowerCase()} contracts`}
          </p>
          <p className="text-[12px] text-[#98A2B3] mt-1">
            {statusFilter === 'ALL' ? 'Create a contract manually or generate one from an accepted proposal.' : 'Try a different filter.'}
          </p>
          {statusFilter === 'ALL' && (
            <button onClick={() => navigate('/app/contracts/new')} className="btn-primary mt-4 text-[13px]">
              <Plus size={13} strokeWidth={2.5} /> New Contract
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {contracts.map(c => (
            <ContractCard key={c.id} contract={c} onClick={(c: Contract) => navigate(`/app/contracts/${c.id}`)} />
          ))}
        </div>
      )}
    </div>
  )
}
