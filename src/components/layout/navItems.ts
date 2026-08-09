import {
  LayoutDashboard, FileText, PenLine, Receipt, CalendarDays,
  ClipboardList, Zap, BarChart3, FolderKanban, CheckSquare,
  MessageSquare, ContactRound, Clock, Wallet, GitBranch, CreditCard,
} from 'lucide-react'
import { Permission } from '@/types/permissions'

export interface NavItem {
  id: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>
  label: string
  href: string
  tourId?: string
  permission?: Permission
}

// Single source of truth — add a new item here and it appears in Sidebar + BottomNav automatically
export const ALL_NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard',    href: '/dashboard',    tourId: 'tour-dashboard', permission: undefined },
  { id: 'contacts',     icon: ContactRound,    label: 'Contacts',      href: '/contacts',     permission: Permission.VIEW_LEADS },
  { id: 'leads',        icon: GitBranch,       label: 'Leads',         href: '/leads',        permission: Permission.VIEW_LEADS },
  { id: 'projects',     icon: FolderKanban,    label: 'Projects',      href: '/projects',     permission: Permission.VIEW_PROJECTS },
  { id: 'tasks',        icon: CheckSquare,     label: 'Tasks',         href: '/tasks',        permission: Permission.VIEW_TASKS },
  { id: 'inbox',        icon: MessageSquare,   label: 'Inbox',         href: '/inbox',        permission: Permission.VIEW_INBOX },
  { id: 'time',         icon: Clock,           label: 'Time Log',      href: '/time' },
  { id: 'proposals',    icon: FileText,        label: 'Proposals',     href: '/proposals',    tourId: 'tour-proposals', permission: Permission.VIEW_PROPOSALS },
  { id: 'contracts',    icon: PenLine,         label: 'Contracts',     href: '/contracts',    tourId: 'tour-contracts', permission: Permission.VIEW_CONTRACTS },
  { id: 'invoices',     icon: Receipt,         label: 'Invoices',      href: '/invoices',     tourId: 'tour-invoices',  permission: Permission.VIEW_INVOICES },
  { id: 'expenses',     icon: Wallet,          label: 'Expenses',      href: '/expenses' },
  { id: 'billing',      icon: CreditCard,      label: 'Billing',       href: '/billing' },
  { id: 'reports',      icon: BarChart3,       label: 'Reports',       href: '/reports',      permission: Permission.VIEW_REPORTS },
  { id: 'calendar',     icon: CalendarDays,    label: 'Calendar',      href: '/calendar',     permission: Permission.VIEW_CALENDAR },
  { id: 'forms',        icon: ClipboardList,   label: 'Forms',         href: '/forms',        permission: Permission.VIEW_FORMS },
  { id: 'automations',  icon: Zap,             label: 'Automations',   href: '/automations',  permission: Permission.VIEW_AUTOMATIONS },
]

// The IDs shown as primary bottom tabs on mobile (max 4 — 5th slot is the "More" button)
export const PRIMARY_IDS = ['dashboard', 'contacts', 'projects', 'inbox']

export const SECTIONS = [
  { label: null,           ids: ['dashboard', 'contacts', 'leads', 'projects', 'tasks', 'inbox', 'time'] },
  { label: 'TOOLS',        ids: ['proposals', 'contracts', 'invoices', 'expenses', 'reports', 'billing'] },
  { label: 'PRODUCTIVITY', ids: ['calendar', 'forms', 'automations'] },
]

export const DEFAULT_ORDER = ALL_NAV_ITEMS.map(i => i.id)
export const STORAGE_KEY = 'clearwork_sidebar_order'
