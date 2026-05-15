import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: Users, label: 'Leads', href: '/app/leads' },
  { icon: FileText, label: 'Proposals', href: '/app/proposals' },
  { icon: PenLine, label: 'Contracts', href: '/app/contracts' },
  { icon: Receipt, label: 'Invoices', href: '/app/invoices' },
  { icon: Building2, label: 'Clients', href: '/app/clients' },
]

export default function Sidebar() {
  return (
    <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
            <Zap size={14} className="text-white" />
          </div>
          <span className="font-black text-gray-950 text-lg tracking-tight">Pakka</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {navItems.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Settings at bottom */}
      <div className="px-3 py-4 border-t border-gray-100">
        <NavLink
          to="/app/settings"
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-indigo-50 text-indigo-700'
                : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
            )
          }
        >
          <Settings size={16} />
          Settings
        </NavLink>
      </div>
    </aside>
  )
}
