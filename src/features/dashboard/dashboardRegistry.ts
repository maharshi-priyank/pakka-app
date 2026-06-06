export interface WidgetMeta {
  id:          string
  name:        string
  description: string
  cols:        1 | 2 | 4  // column span in the 4-col desktop grid
}

export const WIDGET_REGISTRY: WidgetMeta[] = [
  { id: 'revenue_month',  name: 'Revenue This Month', description: 'Paid invoice revenue this month with % change vs last month', cols: 1 },
  { id: 'pipeline',       name: 'Pipeline Value',     description: 'Total estimated value of all active leads',                  cols: 1 },
  { id: 'overdue',        name: 'Overdue Invoices',   description: 'Outstanding overdue invoice amount and count',               cols: 1 },
  { id: 'open_proposals', name: 'Open Proposals',     description: 'Proposals currently sent or viewed by clients',              cols: 1 },
  { id: 'win_rate',       name: 'Win Rate',           description: 'Proposal acceptance rate as a circular progress ring',       cols: 1 },
  { id: 'collection',     name: 'Pending Collection', description: 'Total receivables across all sent and overdue invoices',     cols: 1 },
  { id: 'invoice_status', name: 'Invoice Status',     description: 'Donut chart breakdown of invoices by status',                cols: 2 },
  { id: 'lead_funnel',    name: 'Lead Pipeline',      description: 'Horizontal funnel bars showing leads at each stage',         cols: 2 },
  { id: 'quick_actions',  name: 'Quick Actions',      description: 'One-tap shortcuts to create leads, proposals and invoices',  cols: 2 },
  { id: 'followups',      name: 'Follow-ups',         description: 'Leads that are due for a follow-up this week',               cols: 2 },
  { id: 'upcoming_calls', name: 'Upcoming Calls',    description: 'Scheduled Google Meet calls this week with Join links',       cols: 2 },
  { id: 'revenue_chart',  name: 'Revenue Trend',      description: '6-month bar chart of paid invoice revenue',                  cols: 4 },
  { id: 'activity',       name: 'Recent Activity',    description: 'Live event feed across your entire pipeline',                cols: 4 },
]

export const DEFAULT_ORDER = WIDGET_REGISTRY.map(w => w.id)

const ORDER_KEY  = 'clearwork_dash_order_v2'
const HIDDEN_KEY = 'clearwork_dash_hidden_v2'

export function loadDashboardState(): { order: string[]; hidden: string[] } {
  try {
    const order  = JSON.parse(localStorage.getItem(ORDER_KEY)  ?? 'null')
    const hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY) ?? 'null')
    const savedOrder  = Array.isArray(order)  ? order  : [...DEFAULT_ORDER]
    const savedHidden = Array.isArray(hidden) ? hidden : []
    // ensure any new widgets not yet in saved order get appended
    const newIds = DEFAULT_ORDER.filter(id => !savedOrder.includes(id))
    return { order: [...savedOrder, ...newIds], hidden: savedHidden }
  } catch {
    return { order: [...DEFAULT_ORDER], hidden: [] }
  }
}

export function saveDashboardState(order: string[], hidden: string[]) {
  localStorage.setItem(ORDER_KEY,  JSON.stringify(order))
  localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden))
}

export function getWidgetMeta(id: string): WidgetMeta | undefined {
  return WIDGET_REGISTRY.find(w => w.id === id)
}

// ─── Widget size overrides ────────────────────────────────────────────────────

const SIZES_KEY = 'clearwork_dash_sizes_v2'

export function loadWidgetSizes(): Record<string, 1 | 2 | 4> {
  try {
    const raw = localStorage.getItem(SIZES_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return {}
}

export function saveWidgetSizes(sizes: Record<string, 1 | 2 | 4>) {
  localStorage.setItem(SIZES_KEY, JSON.stringify(sizes))
}

export function getNextCols(current: 1 | 2 | 4, defaultCols: 1 | 2 | 4): 1 | 2 | 4 {
  if (defaultCols === 1) return current === 1 ? 2 : 1      // stat ↔ half
  if (defaultCols === 2) return current === 2 ? 4 : 2      // half ↔ full
  return current === 4 ? 2 : 4                             // full ↔ half
}
