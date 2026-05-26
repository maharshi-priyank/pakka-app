import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Users, FileText, PenLine,
  Receipt, Building2, Settings, X, CalendarDays, ClipboardList, Zap, Clock, Wallet, BarChart3, FolderKanban, GripVertical,
} from 'lucide-react'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  arrayMove, sortableKeyboardCoordinates,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'

const ALL_NAV_ITEMS = [
  { id: 'dashboard',   icon: LayoutDashboard, label: 'Dashboard',   href: '/app/dashboard',   tourId: 'tour-dashboard' },
  { id: 'leads',       icon: Users,           label: 'Leads',        href: '/app/leads',       tourId: 'tour-leads' },
  { id: 'clients',     icon: Building2,       label: 'Clients',      href: '/app/clients',     tourId: 'tour-clients' },
  { id: 'projects',    icon: FolderKanban,    label: 'Projects',     href: '/app/projects',    tourId: undefined },
  { id: 'proposals',   icon: FileText,        label: 'Proposals',    href: '/app/proposals',   tourId: 'tour-proposals' },
  { id: 'contracts',   icon: PenLine,         label: 'Contracts',    href: '/app/contracts',   tourId: 'tour-contracts' },
  { id: 'invoices',    icon: Receipt,         label: 'Invoices',     href: '/app/invoices',    tourId: 'tour-invoices' },
  { id: 'time',        icon: Clock,           label: 'Time',         href: '/app/time',        tourId: undefined },
  { id: 'expenses',    icon: Wallet,          label: 'Expenses',     href: '/app/expenses',    tourId: undefined },
  { id: 'reports',     icon: BarChart3,       label: 'Reports',      href: '/app/reports',     tourId: undefined },
  { id: 'meetings',    icon: CalendarDays,    label: 'Meetings',     href: '/app/meetings',    tourId: undefined },
  { id: 'forms',       icon: ClipboardList,   label: 'Forms',        href: '/app/forms',       tourId: undefined },
  { id: 'automations', icon: Zap,             label: 'Automations',  href: '/app/automations', tourId: undefined },
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

type NavItem = typeof ALL_NAV_ITEMS[0]

function SortableNavRow({ item }: { item: NavItem }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/60 select-none cursor-default"
    >
      <button
        {...attributes}
        {...listeners}
        className="text-white/25 hover:text-white/50 transition-colors cursor-grab active:cursor-grabbing touch-none"
        tabIndex={-1}
      >
        <GripVertical size={14} />
      </button>
      <item.icon size={14} className="text-white/40 shrink-0" />
      <span className="text-[13px] font-medium">{item.label}</span>
    </div>
  )
}

interface Props {
  onClose?: () => void
}

export default function Sidebar({ onClose }: Props) {
  const [order, setOrder] = useState<string[]>(loadOrder)
  const [customizing, setCustomizing] = useState(false)

  const orderedItems = order.map(id => ALL_NAV_ITEMS.find(n => n.id === id)!).filter(Boolean)

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      const oldIdx = order.indexOf(active.id as string)
      const newIdx = order.indexOf(over.id as string)
      const newOrder = arrayMove(order, oldIdx, newIdx)
      setOrder(newOrder)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newOrder))
    }
  }

  function resetOrder() {
    localStorage.removeItem(STORAGE_KEY)
    setOrder(DEFAULT_ORDER)
  }

  return (
    <aside className="w-[220px] shrink-0 bg-[#0D1117] flex flex-col h-screen sticky top-0 relative overflow-hidden">

      {/* Logo */}
      <div className="h-[60px] flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
        <img
          src="/logo/full_logo_dark_theme.svg"
          alt="Clinekt"
          className="h-7 w-auto"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        )}
      </div>

      {/* Nav */}
      <div className="flex-1 py-4 px-3 overflow-y-auto space-y-0.5 min-h-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-white/25 px-3 mb-3">
          Menu
        </p>
        <nav className="space-y-0.5">
          {orderedItems.map(({ icon: Icon, label, href, tourId }) => (
            <NavLink
              key={href}
              to={href}
              id={tourId}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-100',
                  isActive
                    ? 'bg-[#2563EB] text-white shadow-sm'
                    : 'text-white/50 hover:text-white hover:bg-white/[0.07]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={15}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/40')}
                  />
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Bottom actions */}
      <div className="border-t border-white/[0.06] px-3 py-3 space-y-0.5 shrink-0">
        <button
          onClick={() => setCustomizing(true)}
          className="flex items-center gap-3 px-3 py-2 rounded-xl w-full text-[12px] font-medium text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
        >
          <GripVertical size={14} className="text-white/25 shrink-0" />
          Customise
        </button>
        <NavLink
          to="/app/settings"
          id="tour-settings"
          onClick={onClose}
          className={({ isActive }) =>
            cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-100',
              isActive
                ? 'bg-[#2563EB] text-white shadow-sm'
                : 'text-white/50 hover:text-white hover:bg-white/[0.07]',
            )
          }
        >
          {({ isActive }) => (
            <>
              <Settings
                size={15}
                strokeWidth={isActive ? 2.5 : 2}
                className={cn('shrink-0 transition-colors', isActive ? 'text-white' : 'text-white/40')}
              />
              Settings
            </>
          )}
        </NavLink>
      </div>

      {/* Customise overlay */}
      {customizing && (
        <div className="absolute inset-0 bg-[#0D1117] flex flex-col z-50">
          {/* Header */}
          <div className="h-[60px] flex items-center justify-between px-5 border-b border-white/[0.06] shrink-0">
            <span className="text-[13px] font-semibold text-white/80">Customise sidebar</span>
            <button
              onClick={() => setCustomizing(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X size={15} strokeWidth={2} />
            </button>
          </div>

          {/* Sortable list */}
          <div className="flex-1 py-3 px-2 overflow-y-auto min-h-0">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order} strategy={verticalListSortingStrategy}>
                {orderedItems.map(item => (
                  <SortableNavRow key={item.id} item={item} />
                ))}
              </SortableContext>
            </DndContext>
          </div>

          {/* Footer */}
          <div className="border-t border-white/[0.06] px-5 py-4 shrink-0">
            <button
              onClick={resetOrder}
              className="text-[12px] text-white/30 hover:text-white/60 transition-colors"
            >
              Reset to default
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
