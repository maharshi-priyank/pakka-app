import { useNavigate } from 'react-router-dom'
import { isAfter, addDays, startOfDay, format } from 'date-fns'
import { Calendar, Globe, FolderKanban, FileText, Receipt } from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import type { Contact } from '../schemas/contact.schema'
import { STAGE_COLORS, STAGE_LABELS, SOURCE_LABELS } from '../schemas/contact.schema'

interface Props {
  contacts: Contact[]
}

function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Cool-tone only palette — no warm/rainbow colours
const AVATAR_PALETTES = [
  { bg: 'bg-indigo-50 dark:bg-indigo-950/40',   text: 'text-indigo-600 dark:text-indigo-400'  },
  { bg: 'bg-slate-100 dark:bg-slate-800/60',     text: 'text-slate-600 dark:text-slate-300'   },
  { bg: 'bg-blue-50 dark:bg-blue-950/40',        text: 'text-blue-600 dark:text-blue-400'     },
  { bg: 'bg-violet-50 dark:bg-violet-950/40',    text: 'text-violet-600 dark:text-violet-400' },
  { bg: 'bg-sky-50 dark:bg-sky-950/40',          text: 'text-sky-600 dark:text-sky-400'       },
  { bg: 'bg-slate-50 dark:bg-[#1E2030]',         text: 'text-slate-500 dark:text-slate-400'   },
]

function avatarPalette(name: string) {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length]
}

export default function ContactsCards({ contacts }: Props) {
  const navigate = useNavigate()
  const today    = startOfDay(new Date())
  const weekEnd  = addDays(today, 7)

  if (contacts.length === 0) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {contacts.map(c => {
        const followUpDate  = c.followUpAt ? new Date(c.followUpAt) : null
        const isOverdue     = followUpDate ? isAfter(today, followUpDate) : false
        const isThisWeek    = followUpDate && !isOverdue ? isAfter(weekEnd, followUpDate) : false
        const palette       = avatarPalette(c.name)
        const hasDeal       = c.dealValue && Number(c.dealValue) > 0
        const totalActivity = (c._count?.projects ?? 0) + (c._count?.invoices ?? 0) + (c._count?.proposals ?? 0)

        return (
          <button
            key={c.id}
            onClick={() => navigate(`/contacts/${c.id}`)}
            className={cn(
              'text-left w-full rounded-xl overflow-hidden flex flex-col cursor-pointer group',
              'bg-white dark:bg-[#13141A]',
              'border border-[#E4E7EC] dark:border-[#26283A]',
              'shadow-[0_1px_2px_rgba(0,0,0,0.05)]',
              'transition-all duration-150',
              'hover:border-[#2563EB]/40 dark:hover:border-[#3B4A72]',
              'hover:shadow-[0_4px_16px_rgba(37,99,235,0.08)]',
              'hover:-translate-y-px',
            )}
          >
            {/* ── Header ─────────────────────────────────────── */}
            <div className="flex items-start gap-3 px-4 pt-4 pb-3">
              {/* Avatar */}
              <div className={cn(
                'w-10 h-10 rounded-lg flex items-center justify-center shrink-0',
                'text-[13px] font-bold',
                palette.bg, palette.text,
              )}>
                {initials(c.name)}
              </div>

              {/* Name + Company */}
              <div className="flex-1 min-w-0 pt-0.5">
                <p className={cn(
                  'text-[13px] font-semibold leading-tight truncate',
                  'text-[#0F172A] dark:text-[#ECEEF3]',
                  'group-hover:text-[#2563EB] dark:group-hover:text-[#93C5FD] transition-colors duration-150',
                )}>
                  {c.name}
                </p>
                <p className="text-[11.5px] text-[#94A3B8] dark:text-[#545C74] truncate leading-snug mt-0.5">
                  {c.company ?? <span className="italic opacity-50">No company</span>}
                </p>
              </div>

              {/* Stage badge */}
              <span className={cn(
                'text-[10.5px] font-semibold px-2 py-0.5 rounded-full shrink-0 mt-0.5',
                STAGE_COLORS[c.stage],
              )}>
                {STAGE_LABELS[c.stage]}
              </span>
            </div>

            {/* ── Deal value ─────────────────────────────────── */}
            {hasDeal && (
              <div className="px-4 pb-3 -mt-0.5">
                <span className="text-[15px] font-bold text-[#0F172A] dark:text-[#ECEEF3] tabular-nums">
                  {formatCurrency(Number(c.dealValue), c.currency ?? 'INR')}
                </span>
              </div>
            )}

            {/* ── Meta (only populated rows) ─────────────────── */}
            <div className="flex-1 px-4 pb-4 flex flex-col gap-2 min-h-[40px]">
              {followUpDate && (isOverdue || isThisWeek || true) && (
                <div className="flex items-center gap-2">
                  <Calendar
                    size={11}
                    className={cn(
                      'shrink-0',
                      isOverdue  ? 'text-[#EF4444]' :
                      isThisWeek ? 'text-[#F59E0B]' :
                                   'text-[#94A3B8] dark:text-[#545C74]',
                    )}
                  />
                  <span className={cn(
                    'text-[11.5px] font-medium',
                    isOverdue  ? 'text-[#EF4444] dark:text-red-400' :
                    isThisWeek ? 'text-[#D97706] dark:text-amber-400' :
                                 'text-[#475569] dark:text-[#8B92A8]',
                  )}>
                    {isOverdue ? 'Overdue · ' : isThisWeek ? 'This week · ' : ''}
                    {format(followUpDate, 'd MMM')}
                  </span>
                </div>
              )}

              {c.source && (
                <div className="flex items-center gap-2">
                  <Globe size={11} className="shrink-0 text-[#94A3B8] dark:text-[#545C74]" />
                  <span className="text-[11.5px] text-[#64748B] dark:text-[#8B92A8]">
                    {SOURCE_LABELS[c.source] ?? c.source}
                  </span>
                </div>
              )}
            </div>

            {/* ── Footer ─────────────────────────────────────── */}
            <div className="flex items-center gap-1.5 px-4 py-2.5 border-t border-[#F1F5F9] dark:border-[#1E2030] bg-[#F8FAFC] dark:bg-[#15161D]">
              {totalActivity === 0 ? (
                <span className="text-[11px] text-[#CBD5E1] dark:text-[#3D4258]">No activity yet</span>
              ) : (
                <>
                  {(c._count?.projects ?? 0) > 0 && (
                    <Chip icon={FolderKanban} count={c._count!.projects} label="projects" />
                  )}
                  {(c._count?.proposals ?? 0) > 0 && (
                    <Chip icon={FileText} count={c._count!.proposals} label="proposals" />
                  )}
                  {(c._count?.invoices ?? 0) > 0 && (
                    <Chip icon={Receipt} count={c._count!.invoices} label="invoices" />
                  )}
                </>
              )}
            </div>
          </button>
        )
      })}
    </div>
  )
}

function Chip({
  icon: Icon,
  count,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  count: number
  label: string
}) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#F1F5F9] dark:bg-[#1E2030] text-[#64748B] dark:text-[#8B92A8]">
      <Icon size={9} className="shrink-0" />
      <span className="text-[10.5px] font-semibold">{count}</span>
      <span className="text-[10.5px] font-normal opacity-70">{label}</span>
    </div>
  )
}
