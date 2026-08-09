import { createPortal } from 'react-dom'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useCancelSubscription } from '../hooks/useSubscription'

interface Props {
  open: boolean
  onClose: () => void
}

export default function CancelSubscriptionModal({ open, onClose }: Props) {
  const { mutate: cancel, isPending } = useCancelSubscription()

  if (!open) return null

  const handleConfirm = () => {
    cancel(undefined, { onSuccess: onClose })
  }

  return createPortal(
    <>
      <div
        className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="w-full max-w-sm bg-white dark:bg-[#1A1B27] rounded-2xl shadow-xl border border-[#EAECF0] dark:border-[#26283A] pointer-events-auto p-6"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-11 h-11 rounded-full bg-[#FEF2F2] flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={20} className="text-[#D92D20]" />
          </div>
          <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3] text-center mb-1.5">
            Cancel subscription?
          </h2>
          <p className="text-[12.5px] text-[#667085] text-center mb-5">
            You'll retain access until the end of your current billing period. No refund for unused time.
          </p>
          <div className="flex gap-2.5">
            <button
              onClick={onClose}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-[#344054] bg-[#F4F5F8] hover:bg-[#EAECF0] disabled:opacity-50 transition-colors cursor-pointer"
            >
              Keep plan
            </button>
            <button
              onClick={handleConfirm}
              disabled={isPending}
              className="flex-1 h-10 rounded-xl text-[13px] font-semibold text-white bg-[#D92D20] hover:bg-[#B42318] disabled:opacity-50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isPending ? <Loader2 size={13} className="animate-spin" /> : null}
              Yes, cancel
            </button>
          </div>
        </div>
      </div>
    </>
  , document.body)
}
