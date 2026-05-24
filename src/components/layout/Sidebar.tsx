import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, X, CalendarDays,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: Users,           label: 'Leads',     href: '/app/leads' },
  { icon: FileText,        label: 'Proposals',  href: '/app/proposals' },
  { icon: PenLine,         label: 'Contracts',  href: '/app/contracts' },
  { icon: Receipt,         label: 'Invoices',   href: '/app/invoices' },
  { icon: Building2,       label: 'Clients',    href: '/app/clients' },
  { icon: CalendarDays,    label: 'Meetings',   href: '/app/meetings' },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  return (
    <aside className="w-[230px] shrink-0 bg-white dark:bg-[#13141A] border-r border-[#EAECF0] dark:border-[#26283A] flex flex-col h-screen sticky top-0 transition-colors">

      {/* Logo */}
      <div className="h-[60px] flex items-center justify-between px-4 border-b border-[#EAECF0] dark:border-[#26283A]">
        <div className="flex items-center">
          <img src="/logo/full_logo.svg" alt="Clinekt" className="h-8 w-auto block dark:hidden" />
          <img src="/logo/full_logo_dark_theme.svg" alt="Clinekt" className="h-8 w-auto hidden dark:block" />
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 py-3 px-2 overflow-y-auto">
        <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-[#B0B7C3] dark:text-[#545C74] px-3 mb-2 mt-1">
          Menu
        </p>
        <nav className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, href }) => (
            <NavLink
              key={href}
              to={href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-100',
                  isActive
                    ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#4338CA] dark:text-[#A5B4FC] font-semibold'
                    : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={16}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn('shrink-0 transition-colors', isActive ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-[#9CA3AF] dark:text-[#545C74]')}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Settings at bottom */}
      <div className="border-t border-[#EAECF0] dark:border-[#26283A] px-2 py-2">
        <NavLink
          to="/app/settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-100',
              isActive
                ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#4338CA] dark:text-[#A5B4FC] font-semibold'
                : 'text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={16}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn('shrink-0 transition-colors', isActive ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-[#9CA3AF] dark:text-[#545C74]')}
              />
              Settings
            </>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
