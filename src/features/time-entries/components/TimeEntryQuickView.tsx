import QuickViewModal, { QVField } from '@/components/shared/QuickViewModal'

export interface TimeEntrySnap {
  id:           string
  description:  string
  date:         string
  durationMins: number
  hourlyRate?:  number | null
  isBilled:     boolean
  projectName?: string
  contactName?: string
}

function formatDuration(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

interface Props {
  snap:    TimeEntrySnap | null
  onClose: () => void
  onEdit:  () => void
}

export default function TimeEntryQuickView({ snap, onClose, onEdit }: Props) {
  if (!snap) return null

  return (
    <QuickViewModal
      open
      onClose={onClose}
      onEdit={onEdit}
      editLabel="Edit Entry"
      title={snap.description || 'Time Entry'}
    >
      <dl className="grid grid-cols-2 gap-x-6 gap-y-4">
        <QVField label="Date" value={snap.date ? new Date(snap.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'} />
        <QVField label="Duration" value={formatDuration(snap.durationMins)} />
        {snap.hourlyRate != null && <QVField label="Hourly Rate" value={`₹${Number(snap.hourlyRate).toLocaleString('en-IN')}`} />}
        <QVField label="Billed" value={snap.isBilled ? 'Yes' : 'No'} />
        {snap.projectName && <QVField label="Project" value={snap.projectName} />}
        {snap.contactName && <QVField label="Contact" value={snap.contactName} />}
      </dl>
    </QuickViewModal>
  )
}
