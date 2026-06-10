import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/authStore'

export interface ExpenseClient  { id: string; name: string }
export interface ExpenseProject { id: string; name: string }

export interface Expense {
  id:          string
  userId:      string
  clientId:    string | null
  client:      ExpenseClient | null
  projectId:   string | null
  project:     ExpenseProject | null
  category:    string
  description: string
  amount:      string
  date:        string
  receiptUrl:  string | null
  isBillable:  boolean
  isBilled:    boolean
  invoiceId:   string | null
  vendor:      string | null
  gstRate:     string | null
  gstAmount:   string | null
  tdsSection:  string | null
  tdsRate:     string | null
  createdAt:   string
  updatedAt:   string
}

export interface CreateExpensePayload {
  clientId?:    string
  projectId?:   string
  category:     string
  description:  string
  amount:       number
  date:         string
  receiptUrl?:  string
  isBillable?:  boolean
  vendor?:      string
  gstRate?:     number
  gstAmount?:   number
  tdsSection?:  string
  tdsRate?:     number
}

export interface UpdateExpensePayload {
  clientId?:    string
  projectId?:   string
  category?:    string
  description?: string
  amount?:      number
  date?:        string
  receiptUrl?:  string
  isBillable?:  boolean
  isBilled?:    boolean
  invoiceId?:   string
  vendor?:      string
  gstRate?:     number
  gstAmount?:   number
  tdsSection?:  string
  tdsRate?:     number
}

export interface ExpensesQuery {
  clientId?:   string
  projectId?:  string
  from?:       string
  to?:         string
  isBillable?: boolean
  isBilled?:   boolean
}

const KEY = 'expenses'

async function fetchExpenses(params: ExpensesQuery): Promise<Expense[]> {
  const { data } = await api.get<{ data: Expense[] }>('/expenses', { params })
  return data.data
}

export function useExpenses(params: ExpensesQuery = {}) {
  return useQuery({
    queryKey: [KEY, params],
    queryFn:  () => fetchExpenses(params),
    staleTime: 30_000,
  })
}

export function useExpenseCategories() {
  return useQuery({
    queryKey: [KEY, 'categories'],
    queryFn:  async (): Promise<string[]> => {
      const { data } = await api.get<{ data: string[] }>('/expenses/categories')
      return data.data
    },
    staleTime: 5 * 60_000,
  })
}

export function useExportExpenses() {
  const [isPending, setIsPending] = useState(false)

  const trigger = async (filters: ExpensesQuery) => {
    setIsPending(true)
    try {
      const response = await api.get('/expenses/export', {
        params:       filters,
        responseType: 'blob',
      })
      const blob = new Blob([response.data], { type: 'text/csv' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      const label = filters.from && filters.to
        ? `${filters.from}_to_${filters.to}`
        : 'all'
      a.href     = url
      a.download = `expenses-${label}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Failed to export expenses')
    } finally {
      setIsPending(false)
    }
  }

  return { trigger, isPending }
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: CreateExpensePayload): Promise<Expense> => {
      const { data } = await api.post<{ data: Expense }>('/expenses', payload)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Expense logged') },
    onError: (err: Error) => toast.error(err.message || 'Failed to log expense'),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...payload }: UpdateExpensePayload & { id: string }): Promise<Expense> => {
      const { data } = await api.patch<{ data: Expense }>(`/expenses/${id}`, payload)
      return data.data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Expense updated') },
    onError: (err: Error) => toast.error(err.message || 'Failed to update expense'),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/expenses/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: [KEY] }); toast.success('Expense deleted') },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete expense'),
  })
}

export function useBillExpenses() {
  const qc       = useQueryClient()
  const navigate = useNavigate()
  return useMutation({
    mutationFn: async (expenseIds: string[]) => {
      const { data } = await api.post<{ data: { id: string } }>('/expenses/bill', { expenseIds })
      return data.data
    },
    onSuccess: (invoice) => {
      qc.invalidateQueries({ queryKey: [KEY] })
      qc.invalidateQueries({ queryKey: ['invoices'] })
      toast.success('Invoice created from expenses')
      navigate(`/invoices/${invoice.id}`)
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to create invoice'),
  })
}

export function useUploadReceipt() {
  const user = useAuthStore((s) => s.user)
  return useMutation({
    mutationFn: async (file: File): Promise<string> => {
      if (!user) throw new Error('Not authenticated')
      const ext  = file.name.split('.').pop() ?? 'jpg'
      const path = `receipts/${user.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: false, contentType: file.type })
      if (error) throw new Error(error.message)
      const { data } = supabase.storage.from('avatars').getPublicUrl(path)
      return data.publicUrl
    },
  })
}
