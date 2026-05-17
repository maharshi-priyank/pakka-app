import { useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { generateInitials } from '@/lib/utils'
import { LogOut, ChevronDown, Menu } from 'lucide-react'
import NotificationBell from '@/features/notifications/components/NotificationBell'
import CalendarBell     from '@/features/meetings/components/CalendarBell'

const PAGE_TITLES: Record<string, { title: string; sub: string }> = {
  '/app/dashboard': { title: 'Dashboard',  sub: 'Welcome back' },
  '/app/leads':     { title: 'Leads',      sub: 'Manage your pipeline' },
  '/app/proposals': { title: 'Proposals',  sub: 'Track and send proposals' },
  '/app/contracts': { title: 'Contracts',  sub: 'E-sign and manage contracts' },
  '/app/invoices':  { title: 'Invoices',   sub: 'Billing and payments' },
  '/app/clients':   { title: 'Clients',    sub: 'Your client roster' },
  '/app/meetings':  { title: 'Meetings',   sub: 'Scheduled calls & events' },
  '/app/settings':  { title: 'Settings',   sub: 'Account and preferences' },
}

interface Props {
  onMenuToggle?: () => void
}

export default function Topbar({ onMenuToggle }: Props) {
  const { user } = useAuthStore()
  const { pathname } = useLocation()

  const page     = PAGE_TITLES[pathname] ?? { title: 'Pakka', sub: '' }
  const name     = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'User'
  const initials = generateInitials(name)
  const firstName = name.split(' ')[0]

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="h-[56px] lg:h-[60px] bg-white border-b border-[#EAECF0] flex items-center justify-between px-4 lg:px-6 shrink-0">

      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] hover:bg-[#F5F6FA] transition-colors"
          aria-label="Open menu"
        >
          <Menu size={18} strokeWidth={2} />
        </button>

        {/* Page identity */}
        <div>
          <h1 className="text-[15px] lg:text-[16px] font-bold text-[#101828] leading-tight tracking-tight">{page.title}</h1>
          {page.sub && <p className="hidden sm:block text-[11.5px] text-[#98A2B3] leading-none mt-0.5">{page.sub}</p>}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1">

        <CalendarBell />
        <NotificationBell />

        <div className="w-px h-5 bg-[#EAECF0] mx-1" />

        {/* User pill */}
        <button className="flex items-center gap-2 h-9 pl-1 pr-2 lg:pr-2.5 rounded-lg hover:bg-[#F5F6FA] transition-colors group">
          <div className="w-7 h-7 rounded-full bg-[#6366F1] flex items-center justify-center text-white text-[11px] font-bold select-none shrink-0">
            {initials}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-[13px] font-semibold text-[#101828] leading-none">{firstName}</p>
            <p className="text-[10.5px] text-[#98A2B3] leading-none mt-0.5">Agency owner</p>
          </div>
          <ChevronDown size={12} className="text-[#98A2B3] hidden sm:block" strokeWidth={2.5} />
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-red-50 hover:text-red-500 transition-colors ml-0.5"
          title="Sign out"
        >
          <LogOut size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
