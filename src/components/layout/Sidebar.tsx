import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, CalendarDays, ClipboardList, Zap, BarChart3, FolderKanban, Mail,
  LogOut,
} from 'lucide-react'
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
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'
import { generateInitials } from '@/lib/utils'

const ALL_NAV_ITEMS = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',   href: '/dashboard',   tourId: 'tour-dashboard' },
  { id: 'leads',       icon: Users,           label: 'Leads',        href: '/leads',       tourId: 'tour-leads' },
  { id: 'clients',     icon: Building2,       label: 'Clients',      href: '/clients',     tourId: 'tour-clients' },
  { id: 'projects',    icon: FolderKanban,    label: 'Projects',     href: '/projects',    tourId: undefined },
  { id: 'proposals',   icon: FileText,        label: 'Proposals',    href: '/proposals',   tourId: 'tour-proposals' },
  { id: 'contracts',   icon: PenLine,         label: 'Contracts',    href: '/contracts',   tourId: 'tour-contracts' },
  { id: 'invoices',    icon: Receipt,         label: 'Invoices',     href: '/invoices',    tourId: 'tour-invoices' },
  { id: 'reports',     icon: BarChart3,       label: 'Reports',      href: '/reports',     tourId: undefined },
  { id: 'calendar',    icon: CalendarDays,    label: 'Calendar',     href: '/calendar',    tourId: undefined },
  { id: 'forms',       icon: ClipboardList,   label: 'Forms',        href: '/forms',       tourId: undefined },
  { id: 'automations', icon: Zap,             label: 'Automations',  href: '/automations', tourId: undefined },
]

// Section groups — defines labels and order for the nav
const SECTIONS = [
  { label: null,           ids: ['dashboard', 'leads', 'clients', 'projects'] },
  { label: 'TOOLS',        ids: ['proposals', 'contracts', 'invoices', 'reports'] },
  { label: 'PRODUCTIVITY', ids: ['calendar', 'forms', 'automations'] },
]

const DEFAULT_ORDER = ALL_NAV_ITEMS.map(i => i.id)
const STORAGE_KEY = 'pakka_sidebar_order'

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
  onCollapse?: () => void
}

export default function Sidebar({ onClose, onCollapse }: Props) {
  const [order] = useState<string[]>(loadOrder)
  // const [customizing, setCustomizing] = useState(false) // disabled — Customise feature not ready

  const { user } = useAuthStore()
  const name = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'User'
  const initials = generateInitials(name)
  const firstName = name.split(' ')[0]

  async function handleSignOut() {
    await supabase.auth.signOut()
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

  return (
    <aside className="w-[240px] shrink-0 bg-white flex flex-col h-screen sticky top-0 relative overflow-hidden border-r border-gray-100">

      {/* Logo */}
      <div className="h-[60px] flex items-center px-5 shrink-0">
        <img src="/logo/clearwork_full_dark.png" alt="ClearWork" style={{ height: 26, width: 'auto', display: 'block' }} />
      </div>

      {/* Nav — scrollable */}
      <div className="flex-1 py-3 pl-4 pr-3 overflow-y-auto min-h-0">
        {SECTIONS.map((section, si) => {
          const sectionItems = orderedItems.filter(item => section.ids.includes(item.id))
          if (sectionItems.length === 0) return null
          return (
            <div key={si} className={si > 0 ? 'mt-6' : ''}>
              {section.label && (
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-gray-400 px-3 mb-2">
                  {section.label}
                </p>
              )}
              <nav className="space-y-0.5">
                {sectionItems.map(({ icon: Icon, label, href, tourId }) => (
                  <NavLink
                    key={href}
                    to={href}
                    id={tourId}
                    onClick={onClose}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-all duration-100',
                        isActive
                          ? 'bg-gray-100 text-gray-900 font-semibold'
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={15}
                          strokeWidth={isActive ? 2.5 : 2}
                          className={cn('shrink-0 transition-colors', isActive ? 'text-gray-900' : 'text-gray-400')}
                        />
                        <span>{label}</span>
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
      <div className="border-t border-gray-100 pl-4 pr-3 py-3 space-y-0.5 shrink-0">
        <NavLink
          to="/email-templates"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-100',
              isActive ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Mail size={15} strokeWidth={isActive ? 2.5 : 2} className={cn('shrink-0', isActive ? 'text-gray-900' : 'text-gray-400')} />
              Email Templates
            </>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          id="tour-settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2 rounded-xl text-[13.5px] font-medium transition-all duration-100',
              isActive ? 'bg-gray-100 text-gray-900 font-semibold' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings size={15} strokeWidth={isActive ? 2.5 : 2} className={cn('shrink-0', isActive ? 'text-gray-900' : 'text-gray-400')} />
              Settings
            </>
          )}
        </NavLink>

        {/* Customise button — disabled until sidebar customisation is ready
        <button
          onClick={() => setCustomizing(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl w-full text-[13px] font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-50 transition-all"
        >
          <GripVertical size={14} className="text-gray-300 shrink-0" />
          Customise
        </button>
        */}

        <div className="h-px bg-gray-100 my-1.5" />

        {/* User + sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-[13.5px] font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all group"
        >
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {initials}
          </div>
          <span className="flex-1 text-left">{firstName}</span>
          <LogOut size={13} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
        </button>
      </div>

      {/* Customise overlay — disabled until sidebar customisation is ready
      {customizing && (
        <div className="absolute inset-0 bg-white flex flex-col z-50 border-r border-gray-100">
          <div className="h-[60px] flex items-center justify-between px-5 border-b border-gray-100 shrink-0">
            <span className="text-[13px] font-semibold text-gray-800">Customise sidebar</span>
            <button
              onClick={() => setCustomizing(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 py-3 px-2 overflow-y-auto min-h-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {orderedItems.map(item => (
                  <SortableNavRow key={item.id} item={item} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          <div className="border-t border-gray-100 px-5 py-4 shrink-0">
            <button
              onClick={resetOrder}
              className="text-[12px] text-gray-400 hover:text-gray-700 transition-colors"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
      */}
    </aside>
  )
}
