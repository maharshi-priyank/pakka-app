import { cn } from '@/lib/utils'

function Bone({ className }: { className?: string }) {
  return <div className={cn('animate-pulse rounded bg-[#F2F4F7] dark:bg-[#21222D]', className)} />
}

const SECTION_COUNTS = [7, 6, 3] as const

export default function SidebarSkeleton() {
  return (
    <aside className="w-[240px] shrink-0 bg-transparent flex flex-col h-screen sticky top-0 relative overflow-hidden border-r border-black/[0.06]">

      {/* Workspace switcher */}
      <div className="pt-3 pb-2 shrink-0 border-b border-gray-100">
        <div className="flex items-center gap-2.5 px-4 py-3 mx-1">
          <Bone className="w-8 h-8 rounded-xl shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Bone className="h-2.5 w-24 rounded-full" />
            <Bone className="h-2 w-12 rounded-full" />
          </div>
        </div>
      </div>

      {/* Nav rows */}
      <div className="flex-1 pt-2 pb-3 pl-4 pr-3 overflow-y-auto min-h-0">
        {SECTION_COUNTS.map((count, si) => (
          <div key={si} className={si > 0 ? 'mt-6' : ''}>
            {si > 0 && <Bone className="h-2.5 w-20 mx-3 mb-2 rounded-full" />}
            <div className="space-y-0.5">
              {Array.from({ length: count }).map((_, i) => (
                <Bone key={i} className="h-[42px] w-full rounded-xl" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-gray-100 pl-4 pr-3 py-3 space-y-0.5 shrink-0">
        <Bone className="h-[38px] w-full rounded-xl" />
        <Bone className="h-[38px] w-full rounded-xl" />
        <Bone className="h-[38px] w-full rounded-xl" />
        <div className="h-px bg-gray-100 my-1.5" />
        <div className="flex items-center gap-3 px-3 py-2.5">
          <Bone className="w-7 h-7 rounded-full shrink-0" />
          <Bone className="h-3 w-16 flex-1 rounded-full" />
        </div>
      </div>
    </aside>
  )
}

export function BottomNavSkeleton() {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-[#13141A] border-t border-[#EAECF0] dark:border-[#26283A] flex items-stretch"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex-1 flex flex-col items-center justify-center gap-1 py-2">
          <Bone className="w-9 h-7 rounded-xl" />
          <Bone className="h-2 w-10 rounded-full" />
        </div>
      ))}
    </nav>
  )
}
