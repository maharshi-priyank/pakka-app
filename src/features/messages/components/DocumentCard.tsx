import { useNavigate } from 'react-router-dom'
import { FileText, Receipt, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'

type AttachmentType = 'PROPOSAL' | 'INVOICE' | 'CONTRACT'

interface Props {
  type:      AttachmentType
  entityId:  string
  title:     string
  amount?:   string
  status?:   string
  isPortal?: boolean
}

const CONFIG: Record<AttachmentType, {
  icon: React.ElementType
  color: string
  bg: string
  label: string
  path: string
}> = {
  PROPOSAL: { icon: FileText, color: 'text-indigo-600',  bg: 'bg-indigo-50',  label: 'Proposal', path: '/proposals'  },
  INVOICE:  { icon: Receipt,  color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Invoice',  path: '/invoices'   },
  CONTRACT: { icon: PenLine,  color: 'text-amber-600',   bg: 'bg-amber-50',   label: 'Contract', path: '/contracts'  },
}

export function DocumentCard({ type, entityId, title, amount, status, isPortal = false }: Props) {
  const navigate = useNavigate()
  const { icon: Icon, color, bg, label, path } = CONFIG[type]

  return (
    <div
      onClick={() => { if (!isPortal) navigate(`${path}/${entityId}`) }}
      className={cn(
        'max-w-[260px] border border-gray-200 rounded-xl overflow-hidden bg-white',
        'hover:border-indigo-300 hover:shadow-md transition-all duration-150',
        !isPortal && 'cursor-pointer',
      )}
    >
      <div className="flex items-center gap-3 px-3 py-2.5 border-b border-gray-100">
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
          <Icon size={14} className={color} />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{label}</p>
          <p className="text-[12px] font-semibold text-gray-900 truncate">{title}</p>
        </div>
      </div>
      {(amount || status) && (
        <div className="flex items-center justify-between px-3 py-2">
          {amount && <span className="text-[13px] font-bold text-gray-900">{amount}</span>}
          {status && (
            <span className="text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">
              {status}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
