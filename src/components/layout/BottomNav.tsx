import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Receipt, MoreHorizontal,
  PenLine, Building2, Settings, LogOut, X,
  FolderKanban, BarChart3, CalendarDays, ClipboardList, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const PRIMARY_TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Users,           label: 'Leads',     href: '/leads' },
  { icon: FileText,        label: 'Proposals', href: '/proposals' },
  { icon: Receipt,         label: 'Invoices',  href: '/invoices' },
]

const MORE_ITEMS = [
  { icon: PenLine,       label: 'Contracts',   href: '/contracts' },
  { icon: Building2,     label: 'Clients',     href: '/clients' },
  { icon: FolderKanban,  label: 'Projects',    href: '/projects' },
  { icon: BarChart3,     label: 'Reports',     href: '/reports' },
  { icon: CalendarDays,  label: 'Calendar',    href: '/calendar' },
  { icon: ClipboardList, label: 'Forms',       href: '/forms' },
  { icon: Zap,           label: 'Automations', href: '/automations' },
  { icon: Settings,      label: 'Settings',    href: '/settings' },
]

export default function BottomNav() {
  const [moreOpen, setMoreOpen] = useState(false)
  const navigate = useNavigate()

  async function handleSignOut() {
    setMoreOpen(false)
    await supabase.auth.signOut()
  }

  function goTo(href: string) {
    setMoreOpen(false)
    navigate(href)
  }

  return (
    <>
      {/* ── Bottom tab bar ─────────────────────────────────────── */}
      <nav
        className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-[#13141A] border-t border-[#EAECF0] dark:border-[#26283A] flex items-stretch transition-colors"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_TABS.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                isActive ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-[#98A2B3] dark:text-[#545C74]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-9 h-7 rounded-xl flex items-center justify-center transition-colors',
                  isActive ? 'bg-[#EEF2FF] dark:bg-[#1E2040]' : '',
                )}>
                  <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
                </div>
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
            moreOpen ? 'text-[#6366F1] dark:text-[#818CF8]' : 'text-[#98A2B3] dark:text-[#545C74]',
          )}
        >
          <div className={cn(
            'w-9 h-7 rounded-xl flex items-center justify-center transition-colors',
            moreOpen ? 'bg-[#EEF2FF] dark:bg-[#1E2040]' : '',
          )}>
            <MoreHorizontal size={18} strokeWidth={2} />
          </div>
          <span>More</span>
        </button>
      </nav>

      {/* ── More bottom sheet ──────────────────────────────────── */}
      {moreOpen && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/30 dark:bg-black/50 anim-fade"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div
            className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white dark:bg-[#13141A] rounded-t-2xl shadow-2xl anim-slide-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#E4E7EC] dark:bg-[#26283A] mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            <div className="px-4 pb-2">
              <div className="grid grid-cols-2 gap-1.5">
                {MORE_ITEMS.map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    onClick={() => goTo(href)}
                    className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded-xl bg-[#F4F5F8] dark:bg-[#21222D] flex items-center justify-center shrink-0">
                      <Icon size={16} className="text-[#344054] dark:text-[#C2C8D8]" strokeWidth={2} />
                    </div>
                    <span className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{label}</span>
                  </button>
                ))}
              </div>

              <div className="my-2 border-t border-[#F2F4F7] dark:border-[#26283A]" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-xl bg-[#FEF3F2] dark:bg-red-950/40 flex items-center justify-center shrink-0">
                  <LogOut size={16} className="text-[#D92D20] dark:text-red-400" strokeWidth={2} />
                </div>
                <span className="text-[13px] font-semibold text-[#D92D20] dark:text-red-400">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
