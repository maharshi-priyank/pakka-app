import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import Topbar from './Topbar'
import BottomNav from './BottomNav'

export default function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { pathname } = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-[#F4F5F8] dark:bg-[#0C0D10] transition-colors">

      {/* ── Desktop sidebar (lg+) ──────────────────────────────── */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* ── Mobile sidebar overlay (<lg) ──────────────────────── */}
      {sidebarOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[1px] anim-fade"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="lg:hidden fixed inset-y-0 left-0 z-50 shadow-2xl anim-slide-left">
            <Sidebar onClose={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* ── Content area ──────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar onMenuToggle={() => setSidebarOpen(v => !v)} />
        {/* pb-[72px] reserves space for the mobile bottom nav */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-[76px] lg:pb-6">
          <div key={pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* ── Mobile bottom nav (<lg) ───────────────────────────── */}
      <BottomNav />
    </div>
  )
}
