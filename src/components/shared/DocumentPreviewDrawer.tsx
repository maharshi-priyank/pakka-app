import { useEffect } from 'react'
import { X, Pencil, Download } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

interface Props {
  open: boolean
  onClose: () => void
  onEdit?: () => void
  onDownload?: () => void
  title: string
  statusBadge?: React.ReactNode
  metaRow?: React.ReactNode
  editLabel?: string
  downloadLabel?: string
  isLoading?: boolean
  children?: React.ReactNode
}

export default function DocumentPreviewDrawer({
  open, onClose, onEdit, onDownload,
  title, statusBadge, metaRow,
  editLabel = 'Edit', downloadLabel = 'View / Download',
  isLoading, children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 bg-black/25 backdrop-blur-[1px] z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col bg-white dark:bg-[#13141A] shadow-2xl border-l border-[#EAECF0] dark:border-[#26283A]"
            style={{ width: 'min(680px, 100vw)' }}
          >
            {/* Header */}
            <div className="flex items-start gap-3 px-5 py-4 border-b border-[#EAECF0] dark:border-[#26283A] shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-[14.5px] font-bold text-[#101828] dark:text-[#ECEEF3] leading-snug">
                    {title}
                  </h2>
                  {statusBadge}
                </div>
                {metaRow && (
                  <div className="flex items-center gap-3 flex-wrap mt-1.5">
                    {metaRow}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                {onDownload && (
                  <button
                    onClick={onDownload}
                    className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg border border-[#E4E7EC] dark:border-[#26283A] text-[11.5px] font-medium text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors"
                  >
                    <Download size={11} />
                    {downloadLabel}
                  </button>
                )}
                {onEdit && (
                  <button
                    onClick={onEdit}
                    className="flex items-center gap-1.5 h-[30px] px-2.5 rounded-lg bg-[#3538CD] hover:bg-[#2D31B3] text-[11.5px] font-medium text-white transition-colors"
                  >
                    <Pencil size={11} />
                    {editLabel}
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-[30px] h-[30px] rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F2F4F7] dark:hover:bg-[#21222D] hover:text-[#667085] transition-colors"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="p-5 space-y-4 animate-pulse">
                  <div className="h-4 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-3/4" />
                  <div className="h-4 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
                  <div className="h-24 bg-[#F2F4F7] dark:bg-[#21222D] rounded mt-6" />
                  <div className="h-4 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-2/3" />
                  <div className="h-4 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-1/2" />
                </div>
              ) : children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
