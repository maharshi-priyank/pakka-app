import { useState, useCallback, useRef } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  rectIntersection,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, X, Plus, Check, Maximize2, Minimize2, Search, Sun, Moon, PanelRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProfile } from '@/features/settings/hooks/useProfile'
import { useAuthStore } from '@/store/authStore'
import { generateInitials } from '@/lib/utils'
import { useThemeToggle } from '@/hooks/useThemeToggle'
import { useSidebarState } from '@/contexts/SidebarContext'
import NotificationBell from '@/features/notifications/components/NotificationBell'
import CalendarBell from '@/features/meetings/components/CalendarBell'

function getGreeting(firstName: string): string {
  const h = new Date().getHours()
  if (h < 5)  return `Working late, ${firstName}`
  if (h < 12) return `Good morning, ${firstName}`
  if (h < 17) return `Good afternoon, ${firstName}`
  if (h < 21) return `Good evening, ${firstName}`
  return `Good night, ${firstName}`
}
import {
  WIDGET_REGISTRY,
  loadDashboardState,
  saveDashboardState,
  loadWidgetSizes,
  saveWidgetSizes,
  getNextCols,
  getWidgetMeta,
  type WidgetMeta,
} from '@/features/dashboard/dashboardRegistry'

import StatCardWidget       from '@/features/dashboard/widgets/StatCardWidget'
import CollectionWidget     from '@/features/dashboard/widgets/CollectionWidget'
import WinRateWidget        from '@/features/dashboard/widgets/WinRateWidget'
import InvoiceStatusWidget  from '@/features/dashboard/widgets/InvoiceStatusWidget'
import LeadFunnelWidget     from '@/features/dashboard/widgets/LeadFunnelWidget'
import RevenueChartWidget   from '@/features/dashboard/widgets/RevenueChartWidget'
import QuickActionsWidget   from '@/features/dashboard/widgets/QuickActionsWidget'
import FollowUpsWidget      from '@/features/dashboard/widgets/FollowUpsWidget'
import ActivityWidget       from '@/features/dashboard/widgets/ActivityWidget'
import UpcomingCallsWidget  from '@/features/meetings/components/UpcomingCallsWidget'
import PrioritiesStrip      from '@/features/dashboard/components/PrioritiesStrip'
import OnboardingChecklist  from '@/features/dashboard/components/OnboardingChecklist'
import { useCelebrateWins } from '@/features/dashboard/hooks/useCelebrateWins'

// ─── Widget renderer ─────────────────────────────────────────────────────────

function WidgetContent({ id }: { id: string }) {
  switch (id) {
    case 'revenue_month':  return <StatCardWidget type="revenue_month" />
    case 'pipeline':       return <StatCardWidget type="pipeline" />
    case 'overdue':        return <StatCardWidget type="overdue" />
    case 'open_proposals': return <StatCardWidget type="open_proposals" />
    case 'collection':     return <CollectionWidget />
    case 'win_rate':       return <WinRateWidget />
    case 'invoice_status': return <InvoiceStatusWidget />
    case 'lead_funnel':    return <LeadFunnelWidget />
    case 'quick_actions':  return <QuickActionsWidget />
    case 'followups':      return <FollowUpsWidget />
    case 'upcoming_calls': return <UpcomingCallsWidget />
    case 'revenue_chart':  return <RevenueChartWidget />
    case 'activity':       return <ActivityWidget />
    default:               return null
  }
}

// ─── Col span helpers ─────────────────────────────────────────────────────────

function colSpanClass(cols: 1 | 2 | 4) {
  if (cols === 4) return 'col-span-2 md:col-span-3 lg:col-span-4'
  if (cols === 2) return 'col-span-2'
  return 'col-span-1'
}

// ─── Sortable widget ──────────────────────────────────────────────────────────

function SortableWidget({
  id,
  meta,
  effectiveCols,
  editMode,
  onRemove,
  onResize,
}: {
  id:            string
  meta:          WidgetMeta
  effectiveCols: 1 | 2 | 4
  editMode:      boolean
  onRemove:      (id: string) => void
  onResize:      (id: string) => void
}) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id })

  const containerRef = useRef<HTMLDivElement>(null)

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0 : 1,
  }

  const isExpanded = effectiveCols > meta.cols
  const canResize  = true  // all widgets support resize

  function handleResize() {
    // Brief "press" tactile animation
    const el = containerRef.current
    if (el) {
      el.style.transform = 'scale(0.95)'
      el.style.opacity   = '0.75'
      el.style.transition = 'transform 0.1s ease-in, opacity 0.1s ease-in'
      setTimeout(() => {
        onResize(id)
        el.style.transform = ''
        el.style.opacity   = ''
        el.style.transition = 'transform 0.18s ease-out, opacity 0.18s ease-out'
        setTimeout(() => { el.style.transition = '' }, 200)
      }, 110)
    } else {
      onResize(id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(colSpanClass(effectiveCols), 'relative')}
    >
      <div ref={containerRef} className="h-full">
        {/* Edit mode controls */}
        {editMode && (
          <>
            {/* Inset ring */}
            <div className="absolute inset-0 rounded-[14px] ring-2 ring-[#6366F1]/25 pointer-events-none z-10" />

            {/* Grip (drag handle) */}
            <button
              {...listeners}
              {...attributes}
              className="absolute top-2 left-2 z-20 w-7 h-7 rounded-lg bg-white/90 dark:bg-[#1A1B23]/90 shadow-sm border border-[#EAECF0] dark:border-[#3D4258] flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] cursor-grab active:cursor-grabbing touch-none"
              title="Drag to reorder"
            >
              <GripVertical size={13} strokeWidth={2} />
            </button>

            {/* Remove */}
            <button
              onClick={() => onRemove(id)}
              className="absolute top-2 right-2 z-20 w-7 h-7 rounded-lg bg-white/90 dark:bg-[#1A1B23]/90 shadow-sm border border-[#EAECF0] dark:border-[#3D4258] flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:text-[#D92D20] hover:bg-[#FEF3F2] dark:hover:bg-red-950/40 hover:border-[#FECDC9] dark:hover:border-red-800/40 transition-colors"
              title="Hide widget"
            >
              <X size={12} strokeWidth={2.5} />
            </button>

            {/* Resize */}
            {canResize && (
              <button
                onClick={handleResize}
                className="absolute bottom-2 right-2 z-20 w-7 h-7 rounded-lg bg-white/90 dark:bg-[#1A1B23]/90 shadow-sm border border-[#EAECF0] dark:border-[#3D4258] flex items-center justify-center text-[#667085] dark:text-[#8B92A8] hover:text-[#6366F1] hover:bg-[#EEF2FF] dark:hover:bg-[#1E2040] hover:border-[#C7D2FE] transition-colors"
                title={isExpanded ? 'Shrink widget' : 'Expand widget'}
              >
                {isExpanded
                  ? <Minimize2 size={12} strokeWidth={2.5} />
                  : <Maximize2 size={12} strokeWidth={2.5} />
                }
              </button>
            )}
          </>
        )}

        {/* Widget body — pointer-events disabled in edit mode so drag works */}
        <div className={cn('h-full', editMode && 'pointer-events-none select-none')}>
          <WidgetContent id={id} />
        </div>
      </div>
    </div>
  )
}

// ─── Add widget panel ─────────────────────────────────────────────────────────

function AddWidgetPanel({
  hidden,
  onAdd,
  onClose,
}: {
  hidden:  string[]
  onAdd:   (id: string) => void
  onClose: () => void
}) {
  const hiddenMeta = WIDGET_REGISTRY.filter(w => hidden.includes(w.id))

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px] anim-fade" onClick={onClose} />
      <div className="fixed bottom-0 left-0 right-0 lg:top-0 lg:right-0 lg:left-auto lg:bottom-0 z-50 w-full lg:w-[340px] bg-white dark:bg-[#13141A] lg:shadow-2xl flex flex-col rounded-t-2xl lg:rounded-none max-h-[80vh] lg:max-h-none anim-slide-up lg:anim-slide-right">

        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EAECF0] dark:border-[#26283A]">
          <div>
            <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Add Widget</h2>
            <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">{hiddenMeta.length} widget{hiddenMeta.length !== 1 ? 's' : ''} available</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[#98A2B3] dark:text-[#545C74] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
          >
            <X size={15} strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {hiddenMeta.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] flex items-center justify-center mb-3">
                <Check size={20} className="text-[#027A48]" strokeWidth={2.5} />
              </div>
              <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">All widgets are visible</p>
              <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Remove a widget first to add it back here</p>
            </div>
          ) : hiddenMeta.map(widget => (
            <button
              key={widget.id}
              onClick={() => onAdd(widget.id)}
              className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#1A1B23] hover:border-[#C7D2FE] dark:hover:border-[#6366F1]/40 hover:bg-[#F5F3FF] dark:hover:bg-[#1E2040] transition-all text-left group"
            >
              <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-[#6366F1] transition-colors">
                <Plus size={14} className="text-[#6366F1] group-hover:text-white transition-colors" strokeWidth={2.5} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">{widget.name}</p>
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5 leading-snug">{widget.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </>
  )
}

// ─── Dashboard page ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [{ order, hidden }, setState] = useState(loadDashboardState)
  const [sizes,        setSizes]       = useState<Record<string, 1 | 2 | 4>>(loadWidgetSizes)
  const [editMode,     setEditMode]    = useState(false)
  const [showAddPanel, setShowAddPanel]= useState(false)
  const [activeId,     setActiveId]    = useState<string | null>(null)
  const { data: profile } = useProfile()
  const firstName = profile?.name?.split(' ')[0] ?? 'there'
  const { user } = useAuthStore()
  const userName = (user?.user_metadata?.name as string | undefined) ?? user?.email ?? 'User'
  const initials = generateInitials(userName)
  const { isDark, toggle: toggleTheme } = useThemeToggle()
  const { visible: sidebarVisible, setVisible: setSidebarVisible } = useSidebarState()
  useCelebrateWins()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 5 } }),
  )

  const visibleOrder = order.filter(id => !hidden.includes(id))

  function effectiveCols(id: string): 1 | 2 | 4 {
    const meta = getWidgetMeta(id)
    if (!meta) return 1
    return (sizes[id] ?? meta.cols) as 1 | 2 | 4
  }

  function persistLayout(nextOrder: string[], nextHidden: string[]) {
    setState({ order: nextOrder, hidden: nextHidden })
    saveDashboardState(nextOrder, nextHidden)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveId(active.id as string)
  }

  function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveId(null)
    if (!over || active.id === over.id) return
    const oldIdx = visibleOrder.indexOf(active.id as string)
    const newIdx = visibleOrder.indexOf(over.id as string)
    if (oldIdx === -1 || newIdx === -1) return
    const newVisible = arrayMove(visibleOrder, oldIdx, newIdx)
    const newOrder   = [...newVisible, ...order.filter(id => hidden.includes(id))]
    persistLayout(newOrder, hidden)
  }

  const removeWidget = useCallback((id: string) => {
    persistLayout(order, [...hidden, id])
  }, [order, hidden])

  const addWidget = useCallback((id: string) => {
    persistLayout(order, hidden.filter(h => h !== id))
    setShowAddPanel(false)
  }, [order, hidden])

  const resizeWidget = useCallback((id: string) => {
    const meta    = getWidgetMeta(id)
    if (!meta) return
    const current = (sizes[id] ?? meta.cols) as 1 | 2 | 4
    const next    = getNextCols(current, meta.cols)
    const newSizes = { ...sizes, [id]: next }
    setSizes(newSizes)
    saveWidgetSizes(newSizes)
  }, [sizes])

  const activeWidget = activeId ? getWidgetMeta(activeId) : null

  return (
    <div className="space-y-5 max-w-[1440px] mx-auto">

      {/* ── Inline page header — Dreelio style ── */}
      <div className="flex items-center gap-3 md:gap-5 mb-6">

        {/* Re-open sidebar button (desktop only, when collapsed) */}
        {!sidebarVisible && (
          <button
            onClick={() => setSidebarVisible(true)}
            className="hidden lg:flex w-8 h-8 rounded-lg border border-gray-200 bg-white items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm shrink-0 transition-colors"
            title="Open sidebar"
          >
            <PanelRight size={15} strokeWidth={2} />
          </button>
        )}

        {/* Greeting */}
        <div className="flex-1 min-w-0">
          <h1 className="text-[18px] md:text-[22px] font-bold text-[#101828] dark:text-[#ECEEF3] tracking-tight leading-none truncate">
            {getGreeting(firstName)}
          </h1>
          <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74] mt-1">What are you working on?</p>
        </div>

        {/* Search — truly centered via fixed width */}
        <div className="hidden md:block w-[280px] shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-[#545C74] pointer-events-none"
              strokeWidth={2}
            />
            <input
              type="text"
              placeholder="Search..."
              className="w-full h-9 pl-10 pr-4 rounded-xl text-[13px] bg-[#F5F6FA] dark:bg-[#1A1B23] border border-transparent focus:border-[#6366F1]/30 focus:bg-white dark:focus:bg-[#13141A] focus:ring-2 focus:ring-[#6366F1]/10 outline-none transition-all placeholder-gray-400 dark:placeholder-[#545C74] text-gray-900 dark:text-[#ECEEF3]"
            />
          </div>
        </div>

        {/* Right actions */}
        <div className="flex-1 flex items-center justify-end gap-1">
          <div className="hidden sm:flex"><CalendarBell /></div>
          <NotificationBell />
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 dark:text-[#8B92A8] hover:bg-white dark:hover:bg-[#1A1B23] hover:shadow-sm transition-all"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={15} strokeWidth={2} /> : <Moon size={15} strokeWidth={2} />}
          </button>
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0 select-none">
            {initials}
          </div>

          {/* Customise widgets — hidden on mobile */}
          <div className="hidden md:flex items-center gap-1">
            <div className="w-px h-5 bg-gray-200 dark:bg-[#26283A] mx-1" />
            {editMode && hidden.length > 0 && (
              <button
                onClick={() => setShowAddPanel(true)}
                className="flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-semibold text-[#6366F1] bg-[#EEF2FF] border border-[#C7D2FE] rounded-lg hover:bg-[#E0E7FF] transition-colors"
              >
                <Plus size={13} strokeWidth={2.5} />
                Add
              </button>
            )}
            <button
              onClick={() => { if (editMode) setShowAddPanel(false); setEditMode(v => !v) }}
              className={cn(
                'flex items-center gap-1.5 h-8 px-3 text-[12.5px] font-semibold rounded-lg transition-colors border',
                editMode
                  ? 'text-white bg-[#0D1117] dark:bg-[#6366F1] border-[#0D1117] dark:border-[#6366F1] hover:bg-[#1a1d2e]'
                  : 'text-[#667085] dark:text-[#8B92A8] bg-white dark:bg-[#21222D] border-[#EAECF0] dark:border-[#3D4258] hover:bg-[#F4F5F8] shadow-sm',
              )}
            >
              {editMode
                ? <><Check size={13} strokeWidth={2.5} /> Done</>
                : <><GripVertical size={13} strokeWidth={2} /> Customise</>
              }
            </button>
          </div>
        </div>
      </div>

      {/* ── Getting started checklist — hidden once the workspace has real activity ── */}
      <OnboardingChecklist />

      {/* ── Priorities strip ── */}
      <PrioritiesStrip />

      {/* ── Edit mode hint ── */}
      {editMode && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl text-[12px] text-[#4338CA] font-medium anim-modal-in">
          <GripVertical size={14} strokeWidth={2} className="shrink-0" />
          <span>
            <span className="font-bold">Drag</span> to reorder ·&nbsp;
            <Maximize2 size={11} className="inline" strokeWidth={2.5} /> to resize ·&nbsp;
            <X size={11} className="inline" strokeWidth={2.5} /> to hide
          </span>
        </div>
      )}

      {/* ── Widget grid ── */}
      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={visibleOrder} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {visibleOrder.map(id => {
              const meta = getWidgetMeta(id)
              if (!meta) return null
              return (
                <SortableWidget
                  key={id}
                  id={id}
                  meta={meta}
                  effectiveCols={effectiveCols(id)}
                  editMode={editMode}
                  onRemove={removeWidget}
                  onResize={resizeWidget}
                />
              )
            })}

            {/* Empty state */}
            {visibleOrder.length === 0 && (
              <div className="col-span-2 md:col-span-3 lg:col-span-4 flex flex-col items-center justify-center py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-[#F4F5F8] flex items-center justify-center mb-4">
                  <GripVertical size={24} className="text-[#D0D5DD]" />
                </div>
                <p className="text-[14px] font-semibold text-[#344054]">No widgets visible</p>
                <p className="text-[12px] text-[#98A2B3] mt-1">Add widgets to build your dashboard</p>
                <button onClick={() => setShowAddPanel(true)} className="btn-primary mt-4 text-[13px]">
                  <Plus size={13} strokeWidth={2.5} /> Add Widget
                </button>
              </div>
            )}
          </div>
        </SortableContext>

        {/* Drag ghost */}
        <DragOverlay dropAnimation={{ duration: 180, easing: 'ease-out' }}>
          {activeWidget ? (
            <div
              className={cn(
                'rounded-[14px] shadow-2xl ring-2 ring-[#6366F1]/30 opacity-90',
                effectiveCols(activeId!) === 4 ? 'w-[calc(100vw-8rem)] max-w-[900px]' :
                effectiveCols(activeId!) === 2 ? 'w-[340px]' : 'w-[200px]',
              )}
            >
              <WidgetContent id={activeId!} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* ── Add widget panel ── */}
      {showAddPanel && (
        <AddWidgetPanel
          hidden={hidden}
          onAdd={addWidget}
          onClose={() => setShowAddPanel(false)}
        />
      )}

    </div>
  )
}
