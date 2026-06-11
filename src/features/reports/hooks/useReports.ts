import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface DateRange { from: string; to: string }

// ─── Revenue ─────────────────────────────────────────────────────────────────

export interface RevenueRow {
  period:       string
  invoiced:     number
  collected:    number
  outstanding:  number
  invoiceCount: number
}

export interface RevenueReport {
  rows:   RevenueRow[]
  totals: Omit<RevenueRow, 'period'>
}

export function useRevenueReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'revenue', range],
    queryFn: async () => {
      const { data } = await api.get<{ data: RevenueReport }>('/reports/revenue', { params: range })
      return data.data
    },
    staleTime: 60_000,
  })
}

// ─── GST ─────────────────────────────────────────────────────────────────────

export interface GstRow {
  period:       string
  taxableValue: number
  igst:         number
  cgst:         number
  sgst:         number
  tds:          number
  totalTax:     number
  invoiceCount: number
}

export interface GstReport {
  rows:   GstRow[]
  totals: Omit<GstRow, 'period'>
}

export function useGstReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'gst', range],
    queryFn: async () => {
      const { data } = await api.get<{ data: GstReport }>('/reports/gst', { params: range })
      return data.data
    },
    staleTime: 60_000,
  })
}

// ─── Clients ──────────────────────────────────────────────────────────────────

export interface ClientRow {
  clientId:     string | null
  clientName:   string
  invoiced:     number
  collected:    number
  outstanding:  number
  invoiceCount: number
}

export function useClientReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'clients', range],
    queryFn: async () => {
      const { data } = await api.get<{ data: ClientRow[] }>('/reports/clients', { params: range })
      return data.data
    },
    staleTime: 60_000,
  })
}

// ─── Expenses ─────────────────────────────────────────────────────────────────

export interface ExpenseRow {
  category:    string
  count:       number
  total:       number
  billable:    number
  nonBillable: number
}

export interface MonthlyPoint { period: string; value: number }

export interface ExpenseReport {
  byCategory: ExpenseRow[]
  monthly:    MonthlyPoint[]
  totals:     { count: number; total: number; billable: number; nonBillable: number }
}

export function useExpenseReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'expenses', range],
    queryFn: async () => {
      const { data } = await api.get<{ data: ExpenseReport }>('/reports/expenses', { params: range })
      return data.data
    },
    staleTime: 60_000,
  })
}

// ─── Time ─────────────────────────────────────────────────────────────────────

export interface TimeRow {
  clientId:      string | null
  clientName:    string
  totalMins:     number
  totalHours:    string
  billedMins:    number
  unbilledMins:  number
  billableValue: number
}

export interface TimeReport {
  byClient: TimeRow[]
  monthly:  MonthlyPoint[]
  totals:   { totalMins: number; billedMins: number; unbilledMins: number; billableValue: number }
}

export function useTimeReport(range: DateRange) {
  return useQuery({
    queryKey: ['reports', 'time', range],
    queryFn: async () => {
      const { data } = await api.get<{ data: TimeReport }>('/reports/time', { params: range })
      return data.data
    },
    staleTime: 60_000,
  })
}

// ─── P&L ──────────────────────────────────────────────────────────────────────

export type PlBasis = 'accrual' | 'cash'

export interface PlMonthlyPoint {
  period:      string
  revenue:     number
  expenses:    number
  grossProfit: number
}

export interface PlProjectRow {
  projectId:   string
  projectName: string
  clientName:  string | null
  revenue:     number
  expenses:    number
  grossProfit: number
  margin:      number | null
}

export interface PlTotals {
  revenue:     number
  expenses:    number
  grossProfit: number
  margin:      number | null
}

export interface PlReport {
  totals:    PlTotals
  monthly:   PlMonthlyPoint[]
  byProject: PlProjectRow[]
}

export function usePlReport(range: DateRange, basis: PlBasis) {
  return useQuery({
    queryKey: ['reports', 'pl', range, basis],
    queryFn: async () => {
      const { data } = await api.get<{ data: PlReport }>('/reports/pl', {
        params: { from: range.from, to: range.to, basis },
      })
      return data.data
    },
    staleTime: 60_000,
  })
}
