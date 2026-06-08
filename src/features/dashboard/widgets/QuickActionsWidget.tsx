import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, FileText, Receipt, Building2, Video, FolderKanban } from 'lucide-react'
import { cn } from '@/lib/utils'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'

const NAV_ACTIONS = [
  { icon: UserPlus,     label: 'New Lead',     href: '/leads',         bg: 'bg-[#EEF2FF] dark:bg-[#1E2040]',      iconColor: 'text-[#6366F1]',                    hoverBg: 'hover:bg-[#E0E7FF] dark:hover:bg-[#252850]'    },
  { icon: FileText,     label: 'New Proposal', href: '/proposals/new', bg: 'bg-[#FFFAEB] dark:bg-amber-950/30',    iconColor: 'text-[#B54708] dark:text-amber-400', hoverBg: 'hover:bg-[#FEF3C7] dark:hover:bg-amber-950/50' },
  { icon: Receipt,      label: 'New Invoice',  href: '/invoices/new',  bg: 'bg-[#ECFDF3] dark:bg-emerald-950/40', iconColor: 'text-[#027A48] dark:text-[#34D399]', hoverBg: 'hover:bg-[#D1FAE5] dark:hover:bg-emerald-950/60' },
  { icon: Building2,    label: 'New Client',   href: '/clients',       bg: 'bg-[#FEF3F2] dark:bg-red-950/40',     iconColor: 'text-[#D92D20] dark:text-red-400',   hoverBg: 'hover:bg-[#FEE2E2] dark:hover:bg-red-950/60'   },
  { icon: FolderKanban, label: 'New Project',  href: '/projects',      bg: 'bg-[#EFF6FF] dark:bg-blue-950/40',    iconColor: 'text-[#2563EB] dark:text-[#60A5FA]', hoverBg: 'hover:bg-[#DBEAFE] dark:hover:bg-blue-950/60'  },
]

export default function QuickActionsWidget() {
  const navigate           = useNavigate()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  return (
    <div className="card-glass overflow-hidden h-full hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Quick Actions</h2>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">Jump to common tasks</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {NAV_ACTIONS.map(({ icon: Icon, label, href, bg, iconColor, hoverBg }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className={cn('flex flex-col items-center gap-2.5 py-4 rounded-xl transition-all group', bg, hoverBg)}
          >
            <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-[#21222D] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Icon size={18} className={iconColor} strokeWidth={2} />
            </div>
            <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setScheduleOpen(true)}
          className={cn('flex flex-col items-center gap-2.5 py-4 rounded-xl transition-all group bg-[#F0FDF4] dark:bg-emerald-950/30 hover:bg-[#DCFCE7] dark:hover:bg-emerald-950/50')}
        >
          <div className="w-10 h-10 rounded-xl bg-white/70 dark:bg-[#21222D] flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Video size={18} className="text-[#16A34A] dark:text-[#34D399]" strokeWidth={2} />
          </div>
          <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Schedule Call</span>
        </button>
      </div>

      <ScheduleCallModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  )
}
