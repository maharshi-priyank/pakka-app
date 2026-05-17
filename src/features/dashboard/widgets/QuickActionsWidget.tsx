import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, FileText, Receipt, Building2, Video } from 'lucide-react'
import { cn } from '@/lib/utils'
import ScheduleCallModal from '@/features/meetings/components/ScheduleCallModal'

const NAV_ACTIONS = [
  { icon: UserPlus,  label: 'New Lead',     href: '/app/leads',         bg: 'bg-[#EEF2FF]', iconColor: 'text-[#6366F1]', hoverBg: 'hover:bg-[#E0E7FF]' },
  { icon: FileText,  label: 'New Proposal', href: '/app/proposals/new', bg: 'bg-[#FFFAEB]', iconColor: 'text-[#B54708]', hoverBg: 'hover:bg-[#FEF3C7]' },
  { icon: Receipt,   label: 'New Invoice',  href: '/app/invoices/new',  bg: 'bg-[#ECFDF3]', iconColor: 'text-[#027A48]', hoverBg: 'hover:bg-[#D1FAE5]' },
  { icon: Building2, label: 'New Client',   href: '/app/clients',       bg: 'bg-[#FEF3F2]', iconColor: 'text-[#D92D20]', hoverBg: 'hover:bg-[#FEE2E2]' },
]

export default function QuickActionsWidget() {
  const navigate           = useNavigate()
  const [scheduleOpen, setScheduleOpen] = useState(false)

  return (
    <div className="card overflow-hidden h-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#F2F4F7]">
        <div>
          <h2 className="text-[14px] font-bold text-[#101828]">Quick Actions</h2>
          <p className="text-[12px] text-[#98A2B3] mt-0.5">Jump to common tasks</p>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
        {NAV_ACTIONS.map(({ icon: Icon, label, href, bg, iconColor, hoverBg }) => (
          <button
            key={label}
            onClick={() => navigate(href)}
            className={cn('flex flex-col items-center gap-2.5 py-4 rounded-xl transition-all group', bg, hoverBg)}
          >
            <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
              <Icon size={18} className={iconColor} strokeWidth={2} />
            </div>
            <span className="text-[12px] font-semibold text-[#344054]">{label}</span>
          </button>
        ))}
        <button
          onClick={() => setScheduleOpen(true)}
          className={cn('flex flex-col items-center gap-2.5 py-4 rounded-xl transition-all group bg-[#F0FDF4] hover:bg-[#DCFCE7]')}
        >
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
            <Video size={18} className="text-[#16A34A]" strokeWidth={2} />
          </div>
          <span className="text-[12px] font-semibold text-[#344054]">Schedule Call</span>
        </button>
      </div>

      <ScheduleCallModal open={scheduleOpen} onClose={() => setScheduleOpen(false)} />
    </div>
  )
}
