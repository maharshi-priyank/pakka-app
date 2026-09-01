import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import {
  Settings, Mail,
  LogOut,
} from 'lucide-react'
import { useMessageUnreadCount } from '@/features/messages/hooks/useMessages'
import { useWorkspacePermissions } from '@/features/settings/hooks/useWorkspacePermissions'
import { ALL_NAV_ITEMS, SECTIONS, DEFAULT_ORDER, STORAGE_KEY } from './navItems'
// Customise sidebar imports — disabled until feature is ready
// import { X } from 'lucide-react'
// import {
//   DndContext, closestCenter, PointerSensor, KeyboardSensor,
//   useSensor, useSensors, type DragEndEvent,
// } from '@dnd-kit/core'
// import {
//   SortableContext, useSortable, verticalListSortingStrategy,
//   arrayMove, sortableKeyboardCoordinates,
// } from '@dnd-kit/sortable'
// import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { signOutCurrentDevice } from '@/lib/auth'
import { useAuthStore } from '@/store/authStore'
import { generateInitials } from '@/lib/utils'
import WorkspaceSwitcher from '@/features/settings/components/WorkspaceSwitcher'
import CreateWorkspaceModal from '@/features/settings/components/CreateWorkspaceModal'
import SidebarSkeleton from './SidebarSkeleton'
import { useAppShellBootstrap } from '@/hooks/useAppShellBootstrap'

function loadOrder(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_ORDER
    const parsed = JSON.parse(raw) as string[]
    const valid = parsed.filter(id => ALL_NAV_ITEMS.some(n => n.id === id))
    const newItems = DEFAULT_ORDER.filter(id => !valid.includes(id))
    return [...valid, ...newItems]
  } catch {
    return DEFAULT_ORDER
  }
}

// type NavItem = typeof ALL_NAV_ITEMS[0]

// Customise sidebar — SortableNavRow disabled until feature is ready
// function SortableNavRow({ item }: { item: NavItem }) {
//   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
//   return (
//     <div
//       ref={setNodeRef}
//       style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
//       className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 select-none cursor-default"
//     >
//       <button
//         {...attributes}
//         {...listeners}
//         className="text-gray-300 hover:text-gray-500 transition-colors cursor-grab active:cursor-grabbing touch-none"
//         tabIndex={-1}
//       >
//         <GripVertical size={14} />
//       </button>
//       <item.icon size={14} className="text-gray-400 shrink-0" />
//       <span className="text-[13px] font-medium text-gray-600">{item.label}</span>
//     </div>
//   )
// }

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const [order] = useState<string[]>(loadOrder)
  const [createWsOpen, setCreateWsOpen] = useState(false)
  const { isReady: shellReady } = useAppShellBootstrap()

  const { user } = useAuthStore()
  const { hasPermission } = useWorkspacePermissions()

  useEffect(() => {
    function onCreateWs() { setCreateWsOpen(true) }
    document.addEventListener('create-workspace', onCreateWs)
    return () => document.removeEventListener('create-workspace', onCreateWs)
  }, [])
  const { data: inboxUnread = 0 } = useMessageUnreadCount()
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'User'
  const initials = generateInitials(name)
  const firstName = name.split(' ')[0]

  async function handleSignOut() {
    await signOutCurrentDevice()
  }


  const orderedItems = order.map(id => ALL_NAV_ITEMS.find(n => n.id === id)!).filter(Boolean)

  // Customise sidebar logic — disabled until feature is ready
  // const sensors = useSensors(
  //   useSensor(PointerSensor),
  //   useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  // )
  // function handleDragEnd(event: DragEndEvent) {
  //   const { active, over } = event
  //   if (over && active.id !== over.id) {
  //     const oldIdx = order.indexOf(active.id as string)
  //     const newIdx = order.indexOf(over.id as string)
  //     const newOrder = arrayMove(order, oldIdx, newIdx)
  //     setOrder(newOrder)
  //     localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
  //   }
  // }
  // function resetOrder() {
  //   localStorage.removeItem(STORAGE_KEY)
  //   setOrder(DEFAULT_ORDER)
  // }

  if (!shellReady) return <SidebarSkeleton />

  return (
    <aside className="w-[232px] shrink-0 bg-transparent flex flex-col h-screen sticky top-0 relative overflow-hidden border-r border-black/[0.05]">

      {/* Workspace switcher */}
      <div className="pt-2.5 pb-1.5 shrink-0">
        <WorkspaceSwitcher />
      </div>

      {/* Nav — scrollable */}
      <div className="flex-1 py-1 px-2.5 overflow-y-auto min-h-0">
        {SECTIONS.map((section, si) => {
          const sectionItems = orderedItems.filter(item => section.ids.includes(item.id))
          const visibleItems = sectionItems.filter(item =>
            !item.permission || hasPermission(item.permission)
          )
          if (visibleItems.length === 0) return null
          return (
            <div key={si} className={si > 0 ? 'mt-4' : ''}>
              {section.label && (
                <p className="text-[10.5px] font-medium text-[#94A3B8] px-2 pt-1 pb-0.5">
                  {section.label}
                </p>
              )}
              <nav>
                {visibleItems.map(({ id, icon: Icon, label, href, tourId }) => (
                  <NavLink
                    key={href}
                    to={href}
                    id={tourId}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-2 px-2 h-8 rounded-md text-[13px] font-medium transition-all duration-100 w-full',
                        isActive
                          ? 'bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] text-[#0F172A]'
                          : 'text-[#64748B] hover:bg-black/[0.04] hover:text-[#1E293B]',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={15}
                          strokeWidth={isActive ? 2.2 : 1.75}
                          className={cn('shrink-0 transition-colors', isActive ? 'text-[#0F172A]' : 'text-[#94A3B8]')}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {id === 'inbox' && inboxUnread > 0 && (
                          <span className="text-[9.5px] font-bold bg-[#1E293B] text-white rounded-full min-w-[16px] h-[16px] px-1 flex items-center justify-center">
                            {inboxUnread > 9 ? '9+' : inboxUnread}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                ))}
              </nav>
            </div>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="border-t border-black/[0.05] px-2.5 pt-1.5 pb-2.5 shrink-0">
        {/* Secondary links */}
        <nav className="mb-1.5">
          <NavLink
            to="/email-templates"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-2 h-8 rounded-md text-[13px] font-medium transition-all duration-100',
                isActive
                  ? 'bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] text-[#0F172A]'
                  : 'text-[#64748B] hover:bg-black/[0.04] hover:text-[#1E293B]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Mail size={15} strokeWidth={isActive ? 2.2 : 1.75} className={cn('shrink-0', isActive ? 'text-[#0F172A]' : 'text-[#94A3B8]')} />
                <span className="flex-1 truncate">Email Templates</span>
              </>
            )}
          </NavLink>

          <NavLink
            to="/settings"
            id="tour-settings"
            onClick={onClose}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-2 h-8 rounded-md text-[13px] font-medium transition-all duration-100',
                isActive
                  ? 'bg-white shadow-[0_1px_2px_0_rgba(0,0,0,0.06),0_0_0_1px_rgba(0,0,0,0.04)] text-[#0F172A]'
                  : 'text-[#64748B] hover:bg-black/[0.04] hover:text-[#1E293B]',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Settings size={15} strokeWidth={isActive ? 2.2 : 1.75} className={cn('shrink-0', isActive ? 'text-[#0F172A]' : 'text-[#94A3B8]')} />
                <span className="flex-1 truncate">Settings</span>
              </>
            )}
          </NavLink>
        </nav>

        {/* User row */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2.5 px-2 py-1.5 w-full rounded-md text-left transition-all group hover:bg-black/[0.04]"
        >
          <div className="w-6 h-6 rounded-md bg-[#1E293B] flex items-center justify-center text-white text-[9.5px] font-bold shrink-0 leading-none">
            {initials}
          </div>
          <span className="flex-1 text-[12.5px] font-medium text-[#475569] truncate">{firstName}</span>
          <LogOut size={12} className="text-[#C1C9D4] group-hover:text-[#64748B] transition-colors shrink-0" />
        </button>
      </div>

      {createPortal(
        <CreateWorkspaceModal open={createWsOpen} onClose={() => setCreateWsOpen(false)} />,
        document.body,
      )}
    </aside>
  )
}
