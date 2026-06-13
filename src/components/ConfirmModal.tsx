import { Trash2, XCircle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: string
  confirmLabel: string
  variant: 'delete' | 'void'
  isLoading?: boolean
}

export function ConfirmModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant,
  isLoading,
}: ConfirmModalProps) {
  if (!open) return null

  const isDelete = variant === 'delete'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="glass-modal relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-[#98A2B3] hover:text-[#344054] transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex flex-col items-center text-center gap-4">
          <div
            className={cn(
              'flex h-12 w-12 items-center justify-center rounded-full',
              isDelete ? 'bg-[#FEE4E2] text-[#D92D20]' : 'bg-[#FEF0C7] text-[#DC6803]',
            )}
          >
            {isDelete ? <Trash2 size={22} /> : <XCircle size={22} />}
          </div>

          <div>
            <p className="text-[15px] font-semibold text-[#101828]">{title}</p>
            <p className="mt-1.5 text-[13px] text-[#667085] leading-relaxed">{description}</p>
          </div>

          <div className="flex flex-col gap-2 w-full pt-1">
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className={cn(
                'w-full rounded-xl px-4 py-2.5 text-[13.5px] font-semibold text-white transition-colors disabled:opacity-60',
                isDelete
                  ? 'bg-[#D92D20] hover:bg-[#B42318]'
                  : 'bg-[#DC6803] hover:bg-[#B54708]',
              )}
            >
              {isLoading ? 'Processing…' : confirmLabel}
            </button>
            <button
              onClick={onClose}
              className="text-[12px] text-[#667085] hover:text-[#344054] py-1 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
