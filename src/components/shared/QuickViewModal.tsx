import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ExternalLink, Download } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface Props {
  open: boolean
  onClose: () => void
  onEdit: () => void
  editLabel?: string
  downloadAction?: () => void
  downloadLabel?: string
  updatedAt?: string
  title: string
  subtitle?: string
  statusBadge?: React.ReactNode
  extraActions?: React.ReactNode
  children: React.ReactNode
}

export default function QuickViewModal({
  open, onClose, onEdit,
  editLabel = 'Open Editor',
  downloadAction, downloadLabel = 'Download',
  updatedAt,
  title, subtitle, statusBadge, extraActions, children,
}: Props) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-black/25 backdrop-blur-[2px]"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <motion.div
              className="glass-modal rounded-2xl w-full max-w-[500px] pointer-events-auto flex flex-col shadow-2xl"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Header */}
              <div className="flex items-start gap-3 px-5 pt-5 pb-4 border-b border-black/[0.06]">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-bold text-gray-900 dark:text-[#ECEEF3] truncate">{title}</h2>
                    {statusBadge}
                  </div>
                  {subtitle && <p className="text-[12px] text-gray-400 mt-0.5">{subtitle}</p>}
                  {updatedAt && <p className="text-[11px] text-gray-400 mt-0.5">Modified {formatDate(updatedAt)}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:bg-black/[0.06] transition-colors shrink-0"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Body */}
              <div className="px-5 py-5">{children}</div>

              {/* Footer */}
              <div className="px-5 pb-5 flex items-center gap-2">
                {extraActions}
                <div className="flex-1" />
                <button onClick={onClose} className="btn-secondary text-[12.5px] h-9 px-4">
                  Close
                </button>
                {downloadAction && (
                  <button
                    onClick={downloadAction}
                    className="btn-secondary flex items-center gap-1.5 text-[12.5px] h-9 px-4"
                  >
                    <Download size={11} /> {downloadLabel}
                  </button>
                )}
                <button
                  onClick={onEdit}
                  className="flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#3538CD] text-white text-[12.5px] font-semibold hover:bg-[#2D31B3] transition-colors"
                >
                  {editLabel} <ExternalLink size={11} />
                </button>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  )
}

/** Reusable labeled field inside a QuickView body */
export function QVField({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</dt>
      <dd className={`text-[13px] font-semibold text-gray-900 dark:text-[#ECEEF3] ${mono ? 'font-mono' : ''}`}>
        {value ?? <span className="text-gray-300 font-normal">—</span>}
      </dd>
    </div>
  )
}
