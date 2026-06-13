import { useState } from 'react'
import { Archive, Trash2, X, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RemoveModalProps {
  open: boolean
  onClose: () => void
  onArchive: () => void
  onDelete: () => void
  entityLabel: string
  entityType: string
  hasLinkedRecords: boolean
  linkedRecordsSummary?: string
  isArchiving?: boolean
  isDeleting?: boolean
}

export function RemoveModal({
  open,
  onClose,
  onArchive,
  onDelete,
  entityLabel,
  entityType,
  hasLinkedRecords,
  linkedRecordsSummary,
  isArchiving,
  isDeleting,
}: RemoveModalProps) {
  const [step, setStep] = useState<'choose' | 'confirm-delete'>('choose')

  if (!open) return null

  const handleClose = () => {
    setStep('choose')
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="glass-modal relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={handleClose}
          className="absolute right-4 top-4 text-[#98A2B3] hover:text-[#344054] transition-colors"
        >
          <X size={16} />
        </button>

        {step === 'choose' ? (
          <>
            <div className="mb-4">
              <p className="text-[15px] font-semibold text-[#101828] truncate pr-6">{entityLabel}</p>
              <p className="text-[13px] text-[#667085] mt-0.5">Choose how to remove this {entityType}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Archive card */}
              <button
                onClick={() => { onArchive(); handleClose() }}
                disabled={isArchiving}
                className={cn(
                  'group rounded-xl border p-4 text-left transition-all',
                  'bg-[#F9FAFB] border-[#EAECF0]',
                  'hover:border-[#101828] hover:bg-white',
                  isArchiving && 'opacity-60 cursor-not-allowed',
                )}
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#F2F4F7] text-[#344054]">
                  <Archive size={18} />
                </div>
                <p className="mt-2 text-[13.5px] font-semibold text-[#101828]">Archive</p>
                <p className="mt-1 text-[11.5px] text-[#667085] leading-snug">
                  Hidden from your list. All linked records preserved. Restore anytime.
                </p>
              </button>

              {/* Delete card */}
              <button
                onClick={() => !hasLinkedRecords && setStep('confirm-delete')}
                disabled={hasLinkedRecords || isDeleting}
                className={cn(
                  'rounded-xl border p-4 text-left transition-all',
                  hasLinkedRecords
                    ? 'bg-[#F9FAFB] border-[#EAECF0] opacity-50 cursor-not-allowed'
                    : 'bg-[#FFF5F5] border-[#FEE4E2] hover:border-[#D92D20] cursor-pointer',
                )}
              >
                <div className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg',
                  hasLinkedRecords ? 'bg-[#F2F4F7] text-[#98A2B3]' : 'bg-[#FEE4E2] text-[#D92D20]',
                )}>
                  <Trash2 size={18} />
                </div>
                <p className={cn(
                  'mt-2 text-[13.5px] font-semibold',
                  hasLinkedRecords ? 'text-[#98A2B3]' : 'text-[#D92D20]',
                )}>
                  Permanently delete
                </p>
                <p className={cn(
                  'mt-1 text-[11.5px] leading-snug',
                  hasLinkedRecords ? 'text-[#98A2B3]' : 'text-[#D92D20]/70',
                )}>
                  {hasLinkedRecords
                    ? `Has ${linkedRecordsSummary ?? 'linked records'}. Archive instead.`
                    : 'Removed forever. Cannot be undone.'}
                </p>
              </button>
            </div>

            <button
              onClick={handleClose}
              className="mt-4 block w-full text-center text-[12px] text-[#667085] hover:text-[#344054] transition-colors"
            >
              Cancel
            </button>
          </>
        ) : (
          <>
            <div className="flex flex-col items-center text-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#FEE4E2] text-[#D92D20]">
                <AlertTriangle size={22} />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#101828]">Permanently delete?</p>
                <p className="mt-1.5 text-[13px] text-[#667085] leading-relaxed">
                  This will permanently delete this {entityType}. This cannot be undone.
                </p>
              </div>
              <div className="flex flex-col gap-2 w-full pt-1">
                <button
                  onClick={() => { onDelete(); handleClose() }}
                  disabled={isDeleting}
                  className="w-full rounded-xl bg-[#D92D20] hover:bg-[#B42318] px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60"
                >
                  {isDeleting ? 'Deleting…' : 'Yes, delete permanently'}
                </button>
                <button
                  onClick={() => setStep('choose')}
                  className="text-[12px] text-[#667085] hover:text-[#344054] py-1 transition-colors"
                >
                  Go back
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
