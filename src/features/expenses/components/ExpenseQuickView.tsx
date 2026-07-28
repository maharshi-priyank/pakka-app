import QuickViewModal, { QVField } from '@/components/shared/QuickViewModal'
import { formatCurrency, formatDate } from '@/lib/utils'

export interface ExpenseSnap {
  id:           string
  description:  string
  category:     string
  amount:       string | number
  date:         string
  vendor?:      string | null
  isBillable:   boolean
  isBilled:     boolean
  projectName?: string
  contactName?: string
}

interface Props {
  snap:    ExpenseSnap | null
  onClose: () => void
  onEdit:  () => void
}

export default function ExpenseQuickView({ snap, onClose, onEdit }: Props) {
  if (!snap) return null

  return (
    <QuickViewModal
      open
      onClose={onClose}
      onEdit={onEdit}
      editLabel="Edit Expense"
      title={snap.description || 'Expense'}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <QVField label="Category" value={snap.category} />
        <QVField label="Amount" value={formatCurrency(Number(snap.amount))} />
        <QVField label="Date" value={formatDate(snap.date)} />
        {snap.vendor && <QVField label="Vendor" value={snap.vendor} />}
        <QVField label="Billable" value={snap.isBillable ? 'Yes' : 'No'} />
        <QVField label="Billed" value={snap.isBilled ? 'Yes' : 'No'} />
        {snap.projectName && <QVField label="Project" value={snap.projectName} />}
        {snap.contactName && <QVField label="Contact" value={snap.contactName} />}
      </dl>
    </QuickViewModal>
  )
}
