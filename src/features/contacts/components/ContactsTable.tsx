import { ArrowUpRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import type { Contact } from '../schemas/contact.schema'
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS } from '../schemas/contact.schema'

export type SortField = 'name' | 'dealValue' | 'followUpAt' | 'createdAt'
export type SortDir   = 'asc' | 'desc'

interface Props {
  contacts: Contact[]
  sortBy:   SortField
  sortDir:  SortDir
  onSort:   (field: SortField) => void
}

const AVATAR_COLORS = [
  'bg-[#EEF4FF] text-[#3538CD]',
  'bg-[#ECFDF3] text-[#027A48]',
  'bg-[#FFFAEB] text-[#B54708]',
  'bg-[#FEF3F2] text-[#B42318]',
  'bg-[#F4F3FF] text-[#5925DC]',
]

function avatarColor(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmt(v: number) {
  return v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function SortIcon({ field, sortBy, sortDir }: { field: SortField; sortBy: SortField; sortDir: SortDir }) {
  if (field !== sortBy) return <ChevronsUpDown size={11} className="text-[#D0D5DD] dark:text-[#3D4258] shrink-0" />
  return sortDir === 'asc'
    ? <ChevronUp   size={11} className="text-[#6366F1] shrink-0" />
    : <ChevronDown size={11} className="text-[#6366F1] shrink-0" />
}

const COLS: Array<{ label: string; field?: SortField; right?: boolean; cls?: string }> = [
  { label: 'Contact',    field: 'name',       cls: 'min-w-[180px]' },
  { label: 'Stage',      cls: 'w-[130px]' },
  { label: 'Deal Value', field: 'dealValue',  right: true, cls: 'w-[120px]' },
  { label: 'Service',    cls: 'max-w-[160px]' },
  { label: 'Source',     cls: 'w-[110px]' },
  { label: 'Follow-up',  field: 'followUpAt', cls: 'w-[120px]' },
  { label: 'Added',      field: 'createdAt',  cls: 'w-[110px]' },
  { label: '',           cls: 'w-10' },
]

export default function ContactsTable({ contacts, sortBy, sortDir, onSort }: Props) {
  const navigate = useNavigate()
  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden bg-white dark:bg-[#13141A]">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#EAECF0] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#1A1B23]">
              {COLS.map(col => (
                <th
                  key={col.label}
                  onClick={() => col.field && onSort(col.field)}
                  className={cn(
                    'px-4 py-2.5 text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] whitespace-nowrap',
                    col.right && 'text-right',
                    col.field && 'cursor-pointer select-none hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                    col.cls,
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.field && <SortIcon field={col.field} sortBy={sortBy} sortDir={sortDir} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>

          <tbody className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
            {contacts.map(contact => (
              <tr
                key={contact.id}
                onClick={() => navigate(`/contacts/${contact.id}`)}
                className="cursor-pointer hover:bg-[#F9FAFB] dark:hover:bg-[#1A1B23] transition-colors group"
              >
                {/* Name + company */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className={cn(
                      'w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0',
                      avatarColor(contact.name),
                    )}>
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] leading-tight">
                        {contact.name}
                      </p>
                      {contact.company && (
                        <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] truncate">{contact.company}</p>
                      )}
                    </div>
                  </div>
                </td>

                {/* Stage */}
                <td className="px-4 py-3">
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold whitespace-nowrap',
                    STAGE_COLORS[contact.stage],
                  )}>
                    {STAGE_LABELS[contact.stage]}
                  </span>
                </td>

                {/* Deal Value */}
                <td className="px-4 py-3 text-right">
                  {contact.dealValue && Number(contact.dealValue) > 0 ? (
                    <span className="text-[13px] font-bold tabular-nums text-[#101828] dark:text-[#ECEEF3]">
                      ₹{fmt(Number(contact.dealValue))}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                  )}
                </td>

                {/* Service */}
                <td className="px-4 py-3">
                  {contact.service ? (
                    <span className="text-[12px] text-[#667085] dark:text-[#8B92A8] truncate block max-w-[160px]">
                      {contact.service}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                  )}
                </td>

                {/* Source */}
                <td className="px-4 py-3">
                  {contact.source ? (
                    <span className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
                      {SOURCE_LABELS[contact.source] ?? contact.source}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                  )}
                </td>

                {/* Follow-up */}
                <td className="px-4 py-3">
                  {contact.followUpAt ? (
                    <span className={cn(
                      'text-[12px] font-medium',
                      new Date(contact.followUpAt) < new Date()
                        ? 'text-[#D92D20]'
                        : 'text-[#344054] dark:text-[#C2C8D8]',
                    )}>
                      {formatDate(contact.followUpAt)}
                    </span>
                  ) : (
                    <span className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258]">—</span>
                  )}
                </td>

                {/* Added */}
                <td className="px-4 py-3">
                  <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">{formatDate(contact.createdAt)}</span>
                </td>

                {/* Open */}
                <td className="px-4 py-3">
                  <div className="w-6 h-6 rounded-lg bg-[#F5F6FA] dark:bg-[#21222D] opacity-0 group-hover:opacity-100 hover:bg-[#EFF6FF] dark:hover:bg-[#1E2040] flex items-center justify-center text-[#98A2B3] hover:text-[#2563EB] transition-all pointer-events-none">
                    <ArrowUpRight size={11} strokeWidth={2.5} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function ContactsTableSkeleton() {
  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] overflow-hidden bg-white dark:bg-[#13141A]">
      <div className="border-b border-[#EAECF0] dark:border-[#26283A] bg-[#F9FAFB] dark:bg-[#1A1B23] px-4 py-2.5">
        <div className="h-3 w-48 bg-[#F2F4F7] dark:bg-[#21222D] rounded animate-pulse" />
      </div>
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 border-b border-[#F2F4F7] dark:border-[#26283A] last:border-0 animate-pulse">
          <div className="w-7 h-7 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-32" />
            <div className="h-2.5 bg-[#F2F4F7] dark:bg-[#21222D] rounded w-20" />
          </div>
          <div className="h-5 w-24 bg-[#F2F4F7] dark:bg-[#21222D] rounded-full" />
          <div className="h-3.5 w-16 bg-[#F2F4F7] dark:bg-[#21222D] rounded ml-auto" />
        </div>
      ))}
    </div>
  )
}
