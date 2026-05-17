import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, Receipt, MoreHorizontal,
  PenLine, Building2, Settings, LogOut, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'

const PRIMARY_TABS = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/app/dashboard' },
  { icon: Users,           label: 'Leads',     href: '/app/leads' },
  { icon: FileText,        label: 'Proposals',  href: '/app/proposals' },
  { icon: Receipt,         label: 'Invoices',   href: '/app/invoices' },
]

const MORE_ITEMS = [
  { icon: PenLine,   label: 'Contracts', href: '/app/contracts' },
  { icon: Building2, label: 'Clients',   href: '/app/clients' },
  { icon: Settings,  label: 'Settings',  href: '/app/settings' },
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
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#EAECF0] flex items-stretch"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {PRIMARY_TABS.map(({ icon: Icon, label, href }) => (
          <NavLink
            key={href}
            to={href}
            className={({ isActive }) =>
              cn(
                'flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-semibold transition-colors',
                isActive ? 'text-[#6366F1]' : 'text-[#98A2B3]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  'w-9 h-7 rounded-xl flex items-center justify-center transition-colors',
                  isActive ? 'bg-[#EEF2FF]' : '',
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
            moreOpen ? 'text-[#6366F1]' : 'text-[#98A2B3]',
          )}
        >
          <div className={cn(
            'w-9 h-7 rounded-xl flex items-center justify-center transition-colors',
            moreOpen ? 'bg-[#EEF2FF]' : '',
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
            className="lg:hidden fixed inset-0 z-40 bg-black/30 anim-fade"
            onClick={() => setMoreOpen(false)}
          />
          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-2xl shadow-2xl anim-slide-up"
            style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 8px)' }}
          >
            {/* Handle */}
            <div className="flex items-center justify-between px-5 pt-4 pb-2">
              <div className="w-10 h-1 rounded-full bg-[#E4E7EC] mx-auto absolute left-1/2 -translate-x-1/2 top-2" />
              <span className="text-[13px] font-bold text-[#101828]">More</span>
              <button
                onClick={() => setMoreOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-[#F4F5F8]"
              >
                <X size={15} strokeWidth={2} />
              </button>
            </div>

            <div className="px-4 pb-2">
              <div className="space-y-0.5">
                {MORE_ITEMS.map(({ icon: Icon, label, href }) => (
                  <button
                    key={href}
                    onClick={() => goTo(href)}
                    className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-[#F4F5F8] transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#F4F5F8] flex items-center justify-center shrink-0">
                      <Icon size={17} className="text-[#344054]" strokeWidth={2} />
                    </div>
                    <span className="text-[14px] font-semibold text-[#344054]">{label}</span>
                  </button>
                ))}
              </div>

              <div className="my-2 border-t border-[#F2F4F7]" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl hover:bg-red-50 transition-colors text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-[#FEF3F2] flex items-center justify-center shrink-0">
                  <LogOut size={17} className="text-[#D92D20]" strokeWidth={2} />
                </div>
                <span className="text-[14px] font-semibold text-[#D92D20]">Sign out</span>
              </button>
            </div>
          </div>
        </>
      )}
    </>
  )
}
