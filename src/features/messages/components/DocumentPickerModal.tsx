import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { FileText, Receipt, PenLine, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type AttachmentType = 'PROPOSAL' | 'INVOICE' | 'CONTRACT'

export interface PickedDoc {
  type:    AttachmentType
  id:      string
  title:   string
  amount?: string
  status?: string
}

interface Props {
  clientId: string
  onPick:   (doc: PickedDoc) => void
  onClose:  () => void
}

interface DocItem {
  id:            string
  title?:        string
  invoiceNumber?: string
  totalAmount?:  number
  total?:        number
  status:        string
}

export function DocumentPickerModal({ clientId, onPick, onClose }: Props) {
  const [tab, setTab] = useState<AttachmentType>('PROPOSAL')

  const proposals = useQuery<DocItem[]>({
    queryKey: ['picker', 'proposals', clientId],
    queryFn:  () => api.get(`/proposals?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'PROPOSAL',
  })
  const invoices = useQuery<DocItem[]>({
    queryKey: ['picker', 'invoices', clientId],
    queryFn:  () => api.get(`/invoices?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'INVOICE',
  })
  const contracts = useQuery<DocItem[]>({
    queryKey: ['picker', 'contracts', clientId],
    queryFn:  () => api.get(`/contracts?clientId=${clientId}`).then(r => r.data.data),
    enabled:  tab === 'CONTRACT',
  })

  const items: DocItem[] =
    tab === 'PROPOSAL' ? (proposals.data ?? [])
    : tab === 'INVOICE'  ? (invoices.data  ?? [])
    : (contracts.data ?? [])

  const TABS: { id: AttachmentType; label: string; icon: React.ElementType }[] = [
    { id: 'PROPOSAL', label: 'Proposals', icon: FileText },
    { id: 'INVOICE',  label: 'Invoices',  icon: Receipt  },
    { id: 'CONTRACT', label: 'Contracts', icon: PenLine  },
  ]

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-[14px] font-bold text-gray-900">Attach a document</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X size={15} className="text-gray-400" />
          </button>
        </div>

        <div className="flex border-b border-gray-100">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-medium transition-colors',
                tab === t.id
                  ? 'text-indigo-600 border-b-2 border-indigo-600'
                  : 'text-gray-400 hover:text-gray-600',
              )}
            >
              <t.icon size={12} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="max-h-60 overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="text-center text-[12px] text-gray-400 py-6">
              No {tab.toLowerCase()}s for this client
            </p>
          ) : items.map(item => {
            const title  = item.title ?? item.invoiceNumber ?? 'Untitled'
            const amount = item.totalAmount != null
              ? `₹${item.totalAmount.toLocaleString('en-IN')}`
              : item.total != null
              ? `₹${item.total.toLocaleString('en-IN')}`
              : undefined
            return (
              <button
                key={item.id}
                onClick={() => { onPick({ type: tab, id: item.id, title, amount, status: item.status }); onClose() }}
                className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <p className="text-[13px] font-semibold text-gray-900">{title}</p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {item.status}{amount ? ` · ${amount}` : ''}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
