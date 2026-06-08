import { useState, lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { SidebarContext } from '@/contexts/SidebarContext'
import FloatingAssistant from '@/features/ai/components/FloatingAssistant'

const OnboardingWizard = lazy(() => import('@/features/onboarding/OnboardingWizard'))

export default function AppShell() {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [desktopSidebarVisible, setDesktopSidebarVisible] = useState(true)
  const { pathname } = useLocation()
  const { data: profile, isLoading: profileLoading } = useProfile()
  const showWizard = !profileLoading && !!profile && !profile.onboardingComplete

  return (
    <SidebarContext.Provider value={{ visible: desktopSidebarVisible, setVisible: setDesktopSidebarVisible }}>
      <div className="flex h-screen overflow-hidden transition-colors">

        {/* ── Desktop sidebar (lg+) ──────────────────────────────── */}
        {desktopSidebarVisible && (
          <div className="hidden lg:block">
            <Sidebar />
          </div>
        )}

        {/* ── Mobile sidebar overlay (<lg) ──────────────────────── */}
        {mobileSidebarOpen && (
          <>
            <div
              className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] anim-fade"
              onClick={() => setMobileSidebarOpen(false)}
            />
            <div className="lg:hidden fixed inset-y-0 left-0 z-50 shadow-2xl anim-slide-left">
              <Sidebar onClose={() => setMobileSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* ── Content area — NO topbar ───────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <main className="flex-1 overflow-y-auto p-4 lg:p-7 pb-[76px] lg:pb-7">
            <div key={pathname} className="page-enter">
              <Outlet />
            </div>
          </main>
        </div>

        {/* ── Mobile bottom nav (<lg) ───────────────────────────── */}
        <BottomNav />

        {/* ── Onboarding wizard overlay ─────────────────────────── */}
        {showWizard && (
          <Suspense fallback={null}>
            <OnboardingWizard />
          </Suspense>
        )}

        {/* ── AI floating assistant ─────────────────────────────── */}
        <FloatingAssistant />
      </div>
    </SidebarContext.Provider>
  )
}
