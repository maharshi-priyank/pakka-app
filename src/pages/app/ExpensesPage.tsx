import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSearchParams } from 'react-router-dom'
import {
  Wallet, Plus, Trash2, Edit2, CheckSquare, Square as SquareIcon,
  IndianRupee, ChevronRight, Loader2, Receipt, Image, ExternalLink,
  FolderKanban,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useClients } from '@/features/clients/hooks/useClients'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  useExpenses, useCreateExpense, useUpdateExpense,
  useDeleteExpense, useBillExpenses, useUploadReceipt,
  type Expense, type CreateExpensePayload,
} from '@/features/expenses/hooks/useExpenses'

// ─── Constants ────────────────────────────────────────────────────────────────
const EXPENSE_CATEGORIES = ['Travel', 'Materials', 'Software', 'Food', 'Accommodation', 'Equipment', 'Other'] as const

// ─── Schema ────────────────────────────────────────────────────────────────────
const expenseSchema = z.object({
  clientId:    z.string().optional(),
  projectId:   z.string().optional(),
  category:    z.string().min(1, 'Category required'),
  description: z.string().min(1, 'Description required'),
  amount:      z.number({ message: 'Required' }).min(0),
  date:        z.string().min(1, 'Date required'),
  isBillable:  z.boolean(),
  receiptUrl:  z.string().optional(),
})
type ExpenseForm = z.infer<typeof expenseSchema>

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtAmount(v: string | number) {
  return Number(v).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

type FilterTab = 'all' | 'unbilled' | 'billed'

export default function ExpensesPage() {
  const [searchParams] = useSearchParams()
  const preselectedProjectId = searchParams.get('projectId') ?? ''

  const [filter,     setFilter]     = useState<FilterTab>('all')
  const [clientFilter, setClientFilter] = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [editExpense, setEditExpense] = useState<Expense | null>(null)
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [confirmId,  setConfirmId]  = useState<string | null>(null)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [localReceiptUrl, setLocalReceiptUrl] = useState<string | undefined>(undefined)

  const { data: clientsData } = useClients()
  const clients = clientsData?.clients ?? []
  const { data: projectsData } = useProjects()
  const projects = projectsData?.projects ?? []
  const { data: expenses = [], isLoading } = useExpenses({
    clientId:   clientFilter || undefined,
    isBillable: filter === 'unbilled' ? true : undefined,
    isBilled:   filter === 'unbilled' ? false : filter === 'billed' ? true : undefined,
  })
  const createExpense  = useCreateExpense()
  const updateExpense  = useUpdateExpense()
  const deleteExpense  = useDeleteExpense()
  const billExpenses   = useBillExpenses()
  const uploadReceipt  = useUploadReceipt()

  const {
    register, handleSubmit, reset, setValue, watch,
    formState: { errors },
  } = useForm<ExpenseForm>({ resolver: zodResolver(expenseSchema), defaultValues: { isBillable: true } })

  const watchedReceiptUrl = watch('receiptUrl') ?? localReceiptUrl

  function openNewForm() {
    setEditExpense(null)
    setLocalReceiptUrl(undefined)
    reset({
      category:   'Travel',
      date:       new Date().toISOString().slice(0, 10),
      isBillable: true,
      amount:     undefined as any,
      projectId:  preselectedProjectId || undefined,
    })
    setShowForm(true)
  }

  function openEditForm(expense: Expense) {
    setEditExpense(expense)
    setLocalReceiptUrl(expense.receiptUrl ?? undefined)
    reset({
      clientId:    expense.clientId ?? undefined,
      projectId:   expense.projectId ?? undefined,
      category:    expense.category,
      description: expense.description,
      amount:      Number(expense.amount),
      date:        expense.date.slice(0, 10),
      isBillable:  expense.isBillable,
      receiptUrl:  expense.receiptUrl ?? undefined,
    })
    setShowForm(true)
  }

  useEffect(() => {
    if (preselectedProjectId) {
      openNewForm()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectedProjectId])

  async function handleReceiptUpload(file: File) {
    setUploadingReceipt(true)
    try {
      const url = await uploadReceipt.mutateAsync(file)
      setLocalReceiptUrl(url)
      setValue('receiptUrl', url)
    } catch { /* toast handled in hook */ }
    finally { setUploadingReceipt(false) }
  }

  async function onSubmit(data: ExpenseForm) {
    const payload: CreateExpensePayload = {
      clientId:    data.clientId || undefined,
      projectId:   data.projectId || undefined,
      category:    data.category,
      description: data.description,
      amount:      data.amount,
      date:        data.date,
      receiptUrl:  data.receiptUrl || undefined,
      isBillable:  data.isBillable,
    }
    if (editExpense) {
      await updateExpense.mutateAsync({ id: editExpense.id, ...payload })
    } else {
      await createExpense.mutateAsync(payload)
    }
    setShowForm(false)
    setEditExpense(null)
    setLocalReceiptUrl(undefined)
    reset()
  }

  // ─── Selection ─────────────────────────────────────────────────────────────
  const unbilledExpenses = expenses.filter(e => !e.isBilled && e.isBillable)
  const selectedUnbilled = [...selected].filter(id => {
    const e = expenses.find(e => e.id === id)
    return e && !e.isBilled
  })
  const selectedExpenses   = expenses.filter(e => selected.has(e.id))
  const selectedClientIds  = [...new Set(selectedExpenses.map(e => e.clientId))]
  const canBill = selectedUnbilled.length > 0 && selectedClientIds.length === 1

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selectAllUnbilled() {
    setSelected(new Set(unbilledExpenses.map(e => e.id)))
  }

  // ─── Totals ─────────────────────────────────────────────────────────────────
  const totalAmount    = expenses.reduce((s, e) => s + Number(e.amount), 0)
  const unbilledAmount = unbilledExpenses.reduce((s, e) => s + Number(e.amount), 0)

  return (
    <div className="space-y-5 max-w-[860px]">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Expenses</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            {preselectedProjectId && projects.find(p => p.id === preselectedProjectId) ? (
              <>Logging for <span className="font-semibold text-[#344054] dark:text-[#C2C8D8]">{projects.find(p => p.id === preselectedProjectId)?.name}</span></>
            ) : (
              <>
                {totalAmount > 0 && <>₹{fmtAmount(totalAmount)} total · </>}
                {unbilledAmount > 0 && <>₹{fmtAmount(unbilledAmount)} unbilled</>}
                {totalAmount === 0 && 'Log out-of-pocket costs and bill them back to clients'}
              </>
            )}
          </p>
        </div>
        <button onClick={openNewForm} className="btn-primary text-[13px] flex items-center gap-1.5">
          <Plus size={13} strokeWidth={2.5} /> Log Expense
        </button>
      </div>

      {/* ── Log/Edit form ── */}
      {showForm && (
        <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#2563EB] shadow-sm p-5 space-y-4">
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">
            {editExpense ? 'Edit expense' : 'Log expense'}
          </h3>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Category *</label>
                <select {...register('category')} className="form-input w-full">
                  {EXPENSE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.category && <p className="form-error">{errors.category.message}</p>}
              </div>
              <div>
                <label className="form-label">Client</label>
                <select {...register('clientId')} className="form-input w-full">
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="form-label">Project <span className="font-normal text-[#98A2B3]">(optional)</span></label>
              <select {...register('projectId')} className="form-input w-full">
                <option value="">No project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}{p.client ? ` · ${p.client.name}` : ''}</option>)}
              </select>
            </div>
            <div>
              <label className="form-label">Description *</label>
              <input {...register('description')} className="form-input w-full" placeholder="e.g. Cab to client site" />
              {errors.description && <p className="form-error">{errors.description.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Amount (₹) *</label>
                <input {...register('amount', { valueAsNumber: true })} type="number" min="0" step="0.01" className="form-input w-full" />
                {errors.amount && <p className="form-error">{errors.amount.message}</p>}
              </div>
              <div>
                <label className="form-label">Date *</label>
                <input {...register('date')} type="date" className="form-input w-full" />
                {errors.date && <p className="form-error">{errors.date.message}</p>}
              </div>
            </div>

            {/* Receipt upload */}
            <div>
              <label className="form-label">Receipt <span className="font-normal text-[#98A2B3]">(optional)</span></label>
              {watchedReceiptUrl ? (
                <div className="flex items-center gap-2 p-2 border border-[#EAECF0] dark:border-[#3D4258] rounded-lg">
                  {watchedReceiptUrl.match(/\.(jpg|jpeg|png|webp|gif)$/i) ? (
                    <img src={watchedReceiptUrl} alt="receipt" className="w-10 h-10 rounded object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-[#F2F4F7] dark:bg-[#21222D] flex items-center justify-center">
                      <Receipt size={14} className="text-[#667085]" />
                    </div>
                  )}
                  <span className="text-[12px] text-[#667085] flex-1 truncate">Receipt attached</span>
                  <a href={watchedReceiptUrl} target="_blank" rel="noreferrer" className="text-[#2563EB]">
                    <ExternalLink size={12} />
                  </a>
                  <button
                    type="button"
                    onClick={() => { setValue('receiptUrl', undefined); setLocalReceiptUrl(undefined) }}
                    className="text-[#98A2B3] hover:text-[#F04438] transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ) : (
                <label className={cn(
                  'flex items-center gap-2 p-3 border-2 border-dashed border-[#D0D5DD] dark:border-[#3D4258] rounded-lg cursor-pointer',
                  'hover:border-[#2563EB] hover:bg-[#F8FBFF] dark:hover:bg-[#1E2D4F] transition-colors',
                )}>
                  {uploadingReceipt ? (
                    <Loader2 size={14} className="animate-spin text-[#667085]" />
                  ) : (
                    <Image size={14} className="text-[#98A2B3]" />
                  )}
                  <span className="text-[12px] text-[#667085]">
                    {uploadingReceipt ? 'Uploading…' : 'Upload receipt (image or PDF)'}
                  </span>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={e => {
                      const file = e.target.files?.[0]
                      if (file) handleReceiptUpload(file)
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input {...register('isBillable')} id="isBillable" type="checkbox" className="w-4 h-4 accent-[#2563EB]" />
              <label htmlFor="isBillable" className="form-label mb-0 cursor-pointer">Bill to client</label>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={createExpense.isPending || updateExpense.isPending || uploadingReceipt}
                className="btn-primary text-[13px]"
              >
                {(createExpense.isPending || updateExpense.isPending) ? (
                  <><Loader2 size={12} className="animate-spin" /> Saving…</>
                ) : editExpense ? 'Save changes' : 'Log expense'}
              </button>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditExpense(null); setLocalReceiptUrl(undefined); reset() }}
                className="btn-secondary text-[13px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {(['all', 'unbilled', 'billed'] as FilterTab[]).map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all',
                filter === tab
                  ? 'bg-[#0D1117] dark:bg-[#6366F1] text-white'
                  : 'bg-[#F3F4F6] dark:bg-[#21222D] text-[#6B7280] dark:text-[#8B92A8] hover:bg-[#E5E7EB] dark:hover:bg-[#26283A]',
              )}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
        <select
          value={clientFilter}
          onChange={e => setClientFilter(e.target.value)}
          className="form-input text-[12px] w-[160px]"
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* ── Expense list ── */}
      <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">

        {/* Selection toolbar */}
        {selected.size > 0 && (
          <div className="px-5 py-2.5 bg-[#EFF6FF] dark:bg-[#1E2D4F] border-b border-[#BFDBFE] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-[#2563EB]">{selected.size} selected</span>
              <button onClick={() => setSelected(new Set())} className="text-[12px] text-[#2563EB] hover:text-[#1D4ED8]">Clear</button>
            </div>
            <button
              onClick={() => billExpenses.mutate([...selectedUnbilled])}
              disabled={!canBill || billExpenses.isPending}
              className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {billExpenses.isPending ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} strokeWidth={2.5} />}
              Bill {selectedUnbilled.length} expense{selectedUnbilled.length !== 1 ? 's' : ''} →
            </button>
          </div>
        )}

        {/* Select all */}
        {unbilledExpenses.length > 0 && selected.size === 0 && (
          <div className="px-5 py-2 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <button onClick={selectAllUnbilled} className="text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#2563EB] transition-colors">
              Select all unbilled ({unbilledExpenses.length})
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-[#D0D5DD]" />
          </div>
        ) : expenses.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Wallet size={28} className="mx-auto text-[#D0D5DD] mb-2" />
            <p className="text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8]">No expenses yet</p>
            <p className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258] mt-1">Log out-of-pocket costs to bill them back</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
            {expenses.map(expense => (
              <div
                key={expense.id}
                className={cn(
                  'flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFAFA] dark:hover:bg-[#21222D] group transition-colors',
                  expense.isBilled && 'opacity-60',
                )}
              >
                {/* Checkbox */}
                {!expense.isBilled && expense.isBillable ? (
                  <button
                    onClick={() => toggleSelect(expense.id)}
                    className="shrink-0 text-[#D0D5DD] hover:text-[#2563EB] transition-colors"
                  >
                    {selected.has(expense.id)
                      ? <CheckSquare size={15} className="text-[#2563EB]" />
                      : <SquareIcon size={15} />}
                  </button>
                ) : (
                  <div className="w-4 shrink-0" />
                )}

                {/* Category badge */}
                <span className="text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] bg-[#F3F4F6] dark:bg-[#21222D] px-2 py-0.5 rounded-full shrink-0">
                  {expense.category}
                </span>

                {/* Description + client + project */}
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {expense.client && (
                      <p className="text-[11px] text-[#667085] dark:text-[#545C74]">{expense.client.name}</p>
                    )}
                    {expense.project && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.5 rounded-full">
                        <FolderKanban size={9} />
                        {expense.project.name}
                      </span>
                    )}
                  </div>
                </div>

                {/* Amount + date */}
                <div className="flex items-center gap-3 shrink-0 text-right">
                  <div>
                    <p className="text-[13px] font-bold text-[#344054] dark:text-[#C2C8D8] flex items-center gap-0.5">
                      <IndianRupee size={10} strokeWidth={2.5} />
                      {fmtAmount(expense.amount)}
                    </p>
                    <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">
                      {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>

                  {/* Receipt */}
                  {expense.receiptUrl && (
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] hover:text-[#2563EB] transition-colors"
                      title="View receipt"
                    >
                      <Receipt size={12} />
                    </a>
                  )}

                  {/* Status badges */}
                  {expense.isBilled && (
                    <span className="text-[10px] font-bold text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.5 rounded-full">Billed</span>
                  )}
                  {!expense.isBillable && (
                    <span className="text-[10px] font-bold text-[#667085] bg-[#F2F4F7] dark:bg-[#21222D] px-1.5 py-0.5 rounded-full">Non-billable</span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEditForm(expense)}
                    className="w-7 h-7 flex items-center justify-center text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#3D4258]"
                  >
                    <Edit2 size={12} />
                  </button>
                  {confirmId === expense.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { deleteExpense.mutate(expense.id); setConfirmId(null) }}
                        disabled={deleteExpense.isPending}
                        className="text-[11px] text-red-500 font-semibold hover:text-red-700 px-1"
                      >
                        Delete
                      </button>
                      <button onClick={() => setConfirmId(null)} className="text-[11px] text-[#98A2B3] px-1">Cancel</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmId(expense.id)}
                      className="w-7 h-7 flex items-center justify-center text-[#98A2B3] hover:text-[#F04438] transition-colors rounded-lg hover:bg-[#FEF3F2]"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer bill action */}
        {selected.size > 0 && (
          <div className="px-5 py-3 border-t border-[#EAECF0] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#21222D] flex items-center justify-between">
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
              {selected.size} selected
              {!canBill && selectedClientIds.length > 1 && (
                <span className="ml-1 text-amber-600"> — must be same client to bill</span>
              )}
            </p>
            <button
              onClick={() => billExpenses.mutate([...selectedUnbilled])}
              disabled={!canBill || billExpenses.isPending}
              className="flex items-center gap-1.5 btn-primary text-[13px] disabled:opacity-50"
            >
              {billExpenses.isPending ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} strokeWidth={2.5} />}
              Bill {selectedUnbilled.length} expenses →
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
