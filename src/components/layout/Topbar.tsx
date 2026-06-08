import { useAuthStore } from '@/store/authStore'
import { supabase } from '@/lib/supabase'
import { LogOut, ChevronDown, Sun, Moon, Search, PanelLeft } from 'lucide-react'
import NotificationBell from '@/features/notifications/components/NotificationBell'
import CalendarBell     from '@/features/meetings/components/CalendarBell'
import { useThemeToggle } from '@/hooks/useThemeToggle'

interface Props {
  onMenuToggle?: () => void
  onDesktopSidebarToggle?: () => void
  desktopSidebarVisible?: boolean
}

export default function Topbar({ onMenuToggle, onDesktopSidebarToggle, desktopSidebarVisible = true }: Props) {
  const { user } = useAuthStore()
  const { isDark, toggle } = useThemeToggle()

  const name      = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'User'
  const firstName = name.split(' ')[0]

  async function handleSignOut() {
    await supabase.auth.signOut()
  }

  return (
    <header className="h-[56px] lg:h-[60px] bg-transparent dark:bg-transparent border-b border-black/[0.06] dark:border-[#26283A] flex items-center gap-3 px-4 lg:px-5 shrink-0 transition-colors">

      {/* Desktop sidebar toggle */}
      <button
        onClick={onDesktopSidebarToggle}
        className="hidden lg:flex w-8 h-8 rounded-lg items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors shrink-0"
        title={desktopSidebarVisible ? 'Collapse sidebar' : 'Expand sidebar'}
      >
        <PanelLeft size={16} strokeWidth={2} className={desktopSidebarVisible ? 'opacity-100' : 'opacity-50'} />
      </button>

      {/* Mobile menu toggle */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] transition-colors shrink-0"
      >
        <PanelLeft size={16} strokeWidth={2} />
      </button>

      {/* Centered search */}
      <div className="flex-1 flex justify-center">
        <div className="relative flex items-center w-full max-w-[380px]">
          <Search size={14} className="absolute left-3 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" strokeWidth={2} />
          <input
            type="text"
            placeholder="Search clients, invoices, proposals..."
            className="h-9 w-full pl-8 pr-3 rounded-xl text-[13px] bg-[#F5F6FA] dark:bg-[#1A1B23] border border-transparent focus:border-[#2563EB] focus:bg-white dark:focus:bg-[#13141A] text-[#101828] dark:text-[#ECEEF3] placeholder-[#98A2B3] dark:placeholder-[#545C74] outline-none transition-all"
          />
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 shrink-0">

        <CalendarBell />
        <NotificationBell />

        {/* Dark mode toggle */}
        <button
          onClick={toggle}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] transition-colors"
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark
            ? <Sun size={15} strokeWidth={2} />
            : <Moon size={15} strokeWidth={2} />
          }
        </button>

        <div className="w-px h-5 bg-[#EAECF0] dark:bg-[#26283A] mx-1" />

        {/* User pill — no avatar */}
        <button className="flex items-center gap-2 h-9 pl-2 pr-2 lg:pr-2.5 rounded-lg hover:bg-[#F5F6FA] dark:hover:bg-[#1A1B23] transition-colors group">
          <div className="hidden sm:block text-left">
            <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] leading-none">{firstName}</p>
            <p className="text-[10.5px] text-[#98A2B3] dark:text-[#545C74] leading-none mt-0.5">Agency owner</p>
          </div>
          <ChevronDown size={12} className="text-[#98A2B3] dark:text-[#545C74] hidden sm:block" strokeWidth={2.5} />
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-8 h-8 lg:w-9 lg:h-9 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-500 dark:hover:text-red-400 transition-colors ml-0.5"
          title="Sign out"
        >
          <LogOut size={14} strokeWidth={2} />
        </button>
      </div>
    </header>
  )
}
