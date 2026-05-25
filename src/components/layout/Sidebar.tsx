import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, X, CalendarDays, ClipboardList, Zap, Clock, Wallet, BarChart3, FolderKanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard',   href: '/app/dashboard',   tourId: 'tour-dashboard' },
  { icon: Users,           label: 'Leads',        href: '/app/leads',       tourId: 'tour-leads' },
  { icon: FileText,        label: 'Proposals',    href: '/app/proposals',   tourId: 'tour-proposals' },
  { icon: PenLine,         label: 'Contracts',    href: '/app/contracts',   tourId: 'tour-contracts' },
  { icon: Receipt,         label: 'Invoices',     href: '/app/invoices',    tourId: 'tour-invoices' },
  { icon: BarChart3,       label: 'Reports',      href: '/app/reports',     tourId: undefined },
  { icon: FolderKanban,   label: 'Projects',     href: '/app/projects',    tourId: undefined },
  { icon: Clock,           label: 'Time',         href: '/app/time',        tourId: undefined },
  { icon: Wallet,          label: 'Expenses',     href: '/app/expenses',    tourId: undefined },
  { icon: Building2,       label: 'Clients',      href: '/app/clients',     tourId: 'tour-clients' },
  { icon: CalendarDays,    label: 'Meetings',     href: '/app/meetings',    tourId: undefined },
  { icon: ClipboardList,   label: 'Forms',        href: '/app/forms',       tourId: undefined },
  { icon: Zap,             label: 'Automations',  href: '/app/automations', tourId: undefined },
]

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  return (
    <aside className="w-[220px] shrink-0 bg-[#0D1117] flex flex-col h-screen sticky top-0">

      {/* Logo */}
      <div className="h-[60px] flex items-center justify-between px-5 border-b border-white/[0.06]">
        <img
          src="/logo/full_logo_dark_theme.svg"
          alt="Clinekt"
          className="h-7 w-auto"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/25 px-3 mb-3">
          Menu
        </p>
        <nav className="space-y-0.5">
          {navItems.map(({ icon: Icon, label, href, tourId }) => (
            <NavLink
              key={href}
              to={href}
              id={tourId}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-100',
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.07]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/40')}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Settings at bottom */}
      <div className="border-t border-white/[0.06] px-3 py-3">
        <NavLink
          to="/app/settings"
          id="tour-settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-100',
              isActive
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-white/50 hover:text-white hover:bg-white/[0.07]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={15}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/40')}
              />
              Settings
            </>
          )}
        </NavLink>
      </div>
    </aside>
  )
}
