import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Clock, Play, Square, Plus, Trash2, Edit2, CheckSquare,
  Square as SquareIcon, IndianRupee, ChevronRight, Loader2, FolderKanban,
} from 'lucide-react'
import { ConfirmModal } from '@/components/ConfirmModal'
import { cn } from '@/lib/utils'
import DropdownSelect from '@/components/ui/DropdownSelect'
import { useContacts } from '@/features/contacts/hooks/useContacts'
import { useProjects } from '@/features/projects/hooks/useProjects'
import {
  useTimeEntries, useCreateTimeEntry, useUpdateTimeEntry,
  useDeleteTimeEntry, useBillEntries,
  type TimeEntry, type CreateTimeEntryPayload,
} from '@/features/time-entries/hooks/useTimeEntries'
import TimeEntryQuickView, { type TimeEntrySnap } from '@/features/time-entries/components/TimeEntryQuickView'

// ─── Timer state shape stored in localStorage ───────────────────────────────
interface TimerState {
  startedAt:   string
  description: string
  contactId:   string
  projectId:   string
}

const TIMER_KEY = 'clearwork_timer'

function getStoredTimer(): TimerState | null {
  try {
    const raw = localStorage.getItem(TIMER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}

// ─── Form schema ──────────────────────────────────────────────────────────────
const logEntrySchema = z.object({
  contactId:   z.string().optional(),
  projectId:   z.string().optional(),
  description: z.string().min(1, 'Description required'),
  date:        z.string().min(1, 'Date required'),
  hours:       z.number({ message: 'Required' }).min(0.1).max(24),
  minutes:     z.number().min(0).max(59),
  hourlyRate:  z.number().min(0).optional(),
})
type LogEntryForm = z.infer<typeof logEntrySchema>

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmtDuration(mins: number) {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

function fmtElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function groupByDate(entries: TimeEntry[]) {
  const map = new Map<string, TimeEntry[]>()
  for (const e of entries) {
    const key = e.date.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0]))
}

function weekBounds() {
  const now  = new Date()
  const day  = now.getDay()
  const from = new Date(now)
  from.setDate(now.getDate() - ((day + 6) % 7))
  from.setHours(0, 0, 0, 0)
  const to = new Date(from)
  to.setDate(from.getDate() + 6)
  to.setHours(23, 59, 59, 999)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default function TimePage() {
  const [searchParams] = useSearchParams()
  const preselectedProjectId = searchParams.get('projectId') ?? ''
  const preselectedContactId = searchParams.get('contactId') || searchParams.get('clientId') || ''

  const { from, to } = weekBounds()
  const [dateFrom, setDateFrom] = useState(from)
  const [dateTo,   setDateTo]   = useState(to)

  const [timerState,     setTimerState]     = useState<TimerState | null>(getStoredTimer)
  const [elapsed,        setElapsed]        = useState(0)
  const [timerDesc,      setTimerDesc]      = useState('')
  const [timerContactId,  setTimerContactId]  = useState('')
  const [timerProjectId, setTimerProjectId] = useState(preselectedProjectId)

  const [showLogForm, setShowLogForm] = useState(false)
  const [editEntry,   setEditEntry]   = useState<TimeEntry | null>(null)
  const [selected,    setSelected]    = useState<Set<string>>(new Set())
  const [deleteTarget, setDeleteTarget] = useState<TimeEntry | null>(null)
  const [timeSnap,       setTimeSnap]       = useState<TimeEntrySnap | null>(null)
  const [activeTimeEntry, setActiveTimeEntry] = useState<TimeEntry | null>(null)

  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: contactsData } = useContacts({ limit: 200 })
  const contacts = contactsData?.items ?? []
  const { data: projectsData } = useProjects({ limit: 100 })
  const projects = projectsData?.projects ?? []

  const { data: entries = [], isLoading } = useTimeEntries({ from: dateFrom, to: dateTo })
  const createEntry = useCreateTimeEntry()
  const updateEntry = useUpdateTimeEntry()
  const deleteEntry = useDeleteTimeEntry()
  const billEntries = useBillEntries()

  const { register, handleSubmit, reset, formState: { errors } } = useForm<LogEntryForm>({
    resolver: zodResolver(logEntrySchema),
    defaultValues: { minutes: 0 },
  })

  // Pre-open form if navigated from a project
  useEffect(() => {
    if (preselectedProjectId && !showLogForm && !timerState) {
      reset({
        projectId:   preselectedProjectId,
        contactId:   preselectedContactId || undefined,
        description: '',
        date:        new Date().toISOString().slice(0, 10),
        hours:       1,
        minutes:     0,
      })
      setShowLogForm(true)
    }
  }, [preselectedProjectId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Live timer ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerState) {
      setTimerDesc(timerState.description)
      setTimerContactId(timerState.contactId)
      setTimerProjectId(timerState.projectId ?? '')
      startTick(timerState.startedAt)
    }
    return () => stopTick()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function startTick(startedAt: string) {
    stopTick()
    tickRef.current = setInterval(() => {
      setElapsed(Date.now() - new Date(startedAt).getTime())
    }, 1000)
  }

  function stopTick() {
    if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
  }

  function handleStartTimer() {
    if (!timerDesc.trim()) return
    const state: TimerState = {
      startedAt:   new Date().toISOString(),
      description: timerDesc,
      contactId:   timerContactId,
      projectId:   timerProjectId,
    }
    localStorage.setItem(TIMER_KEY, JSON.stringify(state))
    setTimerState(state)
    startTick(state.startedAt)
  }

  function handleStopTimer() {
    if (!timerState) return
    stopTick()
    const durationMs   = Date.now() - new Date(timerState.startedAt).getTime()
    const durationMins = Math.max(1, Math.round(durationMs / 60000))
    const hours   = Math.floor(durationMins / 60)
    const minutes = durationMins % 60
    reset({
      description: timerState.description,
      contactId:   timerState.contactId  || undefined,
      projectId:   timerState.projectId || undefined,
      date:        new Date().toISOString().slice(0, 10),
      hours:       hours || 0,
      minutes,
      hourlyRate:  undefined,
    })
    localStorage.removeItem(TIMER_KEY)
    setTimerState(null)
    setElapsed(0)
    setShowLogForm(true)
  }

  function handleOpenManualLog() {
    setEditEntry(null)
    reset({
      projectId:   preselectedProjectId || undefined,
      description: '',
      date:        new Date().toISOString().slice(0, 10),
      hours:       1,
      minutes:     0,
    })
    setShowLogForm(true)
  }

  function handleOpenEdit(entry: TimeEntry) {
    setEditEntry(entry)
    reset({
      contactId:   entry.contactId ?? undefined,
      projectId:   entry.projectId ?? undefined,
      description: entry.description,
      date:        entry.date.slice(0, 10),
      hours:       Math.floor(entry.durationMins / 60),
      minutes:     entry.durationMins % 60,
      hourlyRate:  entry.hourlyRate ?? undefined,
    })
    setShowLogForm(true)
  }

  async function onSubmitEntry(data: LogEntryForm) {
    const durationMins = Math.round((data.hours * 60) + (data.minutes ?? 0))
    const payload: CreateTimeEntryPayload = {
      contactId:   data.contactId || undefined,
      projectId:   data.projectId || undefined,
      description: data.description,
      date:        data.date,
      durationMins,
      hourlyRate:  data.hourlyRate || undefined,
    }
    if (editEntry) {
      await updateEntry.mutateAsync({ id: editEntry.id, ...payload })
    } else {
      await createEntry.mutateAsync(payload)
    }
    setShowLogForm(false)
    setEditEntry(null)
    reset()
  }

  // ─── Selection ─────────────────────────────────────────────────────────────
  const unbilledEntries   = entries.filter(e => !e.isBilled)
  const selectedUnbilled  = [...selected].filter(id => {
    const e = entries.find(e => e.id === id)
    return e && !e.isBilled
  })
  const selectedEntries    = entries.filter(e => selected.has(e.id))
  const selectedContactIds = [...new Set(selectedEntries.map(e => e.contactId))]
  const canBill = selectedUnbilled.length > 0 && selectedContactIds.length === 1

  function toggleSelect(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function selectAll()      { setSelected(new Set(unbilledEntries.map(e => e.id))) }
  function clearSelection() { setSelected(new Set()) }

  // ─── Totals ───────────────────────────────────────────────────────────────
  const totalMins     = entries.reduce((s, e) => s + e.durationMins, 0)
  const unbilledMins  = unbilledEntries.reduce((s, e) => s + e.durationMins, 0)
  const unbilledValue = unbilledEntries.reduce((s, e) =>
    s + (e.hourlyRate ? (e.durationMins / 60) * Number(e.hourlyRate) : 0), 0)

  const grouped = groupByDate(entries)

  // Active project name (for timer bar / form context)
  const activeProjectName = preselectedProjectId
    ? projects.find(p => p.id === preselectedProjectId)?.name
    : undefined

  return (
    <div className="space-y-5 max-w-[860px]">

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">Time Tracking</h1>
          <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            {activeProjectName
              ? <span className="flex items-center gap-1.5"><FolderKanban size={12} className="text-[#2563EB]" /> Logging for <span className="text-[#2563EB] font-semibold">{activeProjectName}</span></span>
              : 'Log hours and convert them to invoices'}
          </p>
        </div>
      </div>

      {/* ── Timer card ── */}
      <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm p-5">
        <div className="flex items-center gap-2 mb-4">
          <Clock size={14} className="text-[#2563EB]" />
          <h2 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Timer</h2>
        </div>

        {timerState ? (
          <div className="text-center py-4 space-y-3">
            <div className="text-[48px] font-mono font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight">
              {fmtElapsed(elapsed)}
            </div>
            <p className="text-[13px] text-[#667085] dark:text-[#8B92A8]">
              {timerState.description}
              {timerState.contactId && contacts.find(c => c.id === timerState.contactId) && (
                <span className="ml-2 text-[#2563EB]">
                  · {contacts.find(c => c.id === timerState.contactId)?.name}
                </span>
              )}
              {timerState.projectId && projects.find(p => p.id === timerState.projectId) && (
                <span className="ml-2 text-emerald-600 dark:text-emerald-400 flex items-center gap-1 inline-flex">
                  <FolderKanban size={10} /> {projects.find(p => p.id === timerState.projectId)?.name}
                </span>
              )}
            </p>
            <button
              onClick={handleStopTimer}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#D92D20] text-white text-[14px] font-bold hover:bg-[#B42318] transition-colors"
            >
              <Square size={14} strokeWidth={2.5} /> Stop & Log
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Row 1: client + project selectors */}
            <div className="flex gap-2">
              <DropdownSelect
                value={timerContactId}
                onChange={setTimerContactId}
                placeholder="No contact"
                options={[{ value: '', label: 'No contact' }, ...contacts.map(c => ({ value: c.id, label: c.name }))]}
                className="flex-1 min-w-0"
              />
              <DropdownSelect
                value={timerProjectId}
                onChange={setTimerProjectId}
                placeholder="No project"
                options={[{ value: '', label: 'No project' }, ...projects.map(p => ({ value: p.id, label: p.name }))]}
                className="flex-1 min-w-0"
              />
            </div>
            {/* Row 2: description input + action buttons */}
            <div className="flex gap-2">
              <input
                value={timerDesc}
                onChange={e => setTimerDesc(e.target.value)}
                placeholder="What are you working on?"
                className="form-input text-[13px] flex-1 min-w-0"
                onKeyDown={e => { if (e.key === 'Enter') handleStartTimer() }}
              />
              <button
                onClick={handleStartTimer}
                disabled={!timerDesc.trim()}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[#2563EB] text-white text-[13px] font-bold hover:bg-[#1D4ED8] transition-colors disabled:opacity-50 shrink-0"
              >
                <Play size={13} strokeWidth={2.5} fill="currentColor" />
                <span className="hidden sm:inline">Start</span>
              </button>
              <button
                onClick={handleOpenManualLog}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border border-[#EAECF0] dark:border-[#3D4258] text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors shrink-0"
              >
                <Plus size={13} strokeWidth={2.5} />
                <span className="hidden sm:inline">Log manually</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Log/Edit entry form ── */}
      {showLogForm && (
        <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#2563EB] shadow-sm p-5 space-y-4">
          <h3 className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">
            {editEntry ? 'Edit entry' : 'Log entry'}
          </h3>
          <form onSubmit={handleSubmit(onSubmitEntry)} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Contact</label>
                <select {...register('contactId')} className="form-input w-full">
                  <option value="">No contact</option>
                  {contacts.map(c => <option key={c.id} value={c.id}>{c.name}{c.company ? ` — ${c.company}` : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="form-label">Project</label>
                <select {...register('projectId')} className="form-input w-full">
                  <option value="">No project</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="form-label">Description</label>
                <input {...register('description')} className="form-input w-full" placeholder="What did you work on?" />
                {errors.description && <p className="form-error">{errors.description.message}</p>}
              </div>
              <div>
                <label className="form-label">Date</label>
                <input {...register('date')} type="date" className="form-input w-full" />
                {errors.date && <p className="form-error">{errors.date.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="form-label">Hours</label>
                <input {...register('hours', { valueAsNumber: true })} type="number" min="0" max="24" step="0.5" className="form-input w-full" />
                {errors.hours && <p className="form-error">{errors.hours.message}</p>}
              </div>
              <div>
                <label className="form-label">Minutes</label>
                <input {...register('minutes', { valueAsNumber: true })} type="number" min="0" max="59" step="15" className="form-input w-full" />
              </div>
              <div className="col-span-2 sm:col-span-1">
                <label className="form-label">Rate / hr (₹)</label>
                <input {...register('hourlyRate', { valueAsNumber: true })} type="number" min="0" placeholder="Optional" className="form-input w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={createEntry.isPending || updateEntry.isPending}
                className="btn-primary text-[13px]"
              >
                {(createEntry.isPending || updateEntry.isPending)
                  ? <><Loader2 size={12} className="animate-spin" /> Saving…</>
                  : editEntry ? 'Save changes' : 'Log entry'}
              </button>
              <button
                type="button"
                onClick={() => { setShowLogForm(false); setEditEntry(null); reset() }}
                className="btn-secondary text-[13px]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Timesheet ── */}
      <div className="bg-white dark:bg-[#1A1B23] rounded-xl border border-[#EAECF0] dark:border-[#26283A] shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-[#F2F4F7] dark:border-[#26283A] flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Timesheet</p>
            {totalMins > 0 && (
              <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
                {fmtDuration(totalMins)} logged
                {unbilledMins > 0 && ` · ${fmtDuration(unbilledMins)} unbilled`}
                {unbilledValue > 0 && (
                  <span className="ml-1">
                    · <IndianRupee size={10} className="inline" />
                    {unbilledValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} value
                  </span>
                )}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="form-input text-[12px] w-[130px] sm:w-[130px]" />
            <span className="text-[#D0D5DD] text-[12px]">–</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="form-input text-[12px] w-[130px] sm:w-[130px]" />
          </div>
        </div>

        {/* Selection toolbar */}
        {selected.size > 0 && (
          <div className="px-5 py-2.5 bg-[#EFF6FF] dark:bg-[#1E2D4F] border-b border-[#BFDBFE] dark:border-[#1E3A5F] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-[13px] font-semibold text-[#2563EB]">{selected.size} selected</span>
              <button onClick={clearSelection} className="text-[12px] text-[#2563EB] hover:text-[#1D4ED8]">Clear</button>
            </div>
            <button
              onClick={() => billEntries.mutate([...selectedUnbilled])}
              disabled={!canBill || billEntries.isPending}
              className="flex items-center gap-1.5 text-[12px] font-bold text-white bg-[#2563EB] px-3 py-1.5 rounded-lg hover:bg-[#1D4ED8] disabled:opacity-50 transition-colors"
            >
              {billEntries.isPending ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={12} strokeWidth={2.5} />}
              Bill {selectedUnbilled.length} entr{selectedUnbilled.length === 1 ? 'y' : 'ies'} →
            </button>
          </div>
        )}

        {unbilledEntries.length > 0 && selected.size === 0 && (
          <div className="px-5 py-2 border-b border-[#F2F4F7] dark:border-[#26283A]">
            <button onClick={selectAll} className="text-[12px] text-[#667085] dark:text-[#8B92A8] hover:text-[#2563EB] transition-colors">
              Select all unbilled ({unbilledEntries.length})
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="px-5 py-8 flex justify-center">
            <Loader2 size={20} className="animate-spin text-[#D0D5DD]" />
          </div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Clock size={28} className="mx-auto text-[#D0D5DD] mb-2" />
            <p className="text-[13px] font-semibold text-[#667085] dark:text-[#8B92A8]">No entries this week</p>
            <p className="text-[12px] text-[#D0D5DD] dark:text-[#3D4258] mt-1">Start the timer or log time manually above</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
            {grouped.map(([date, dayEntries]) => (
              <div key={date}>
                <div className="px-5 py-2 bg-[#FAFAFA] dark:bg-[#21222D]">
                  <p className="text-[11px] font-bold text-[#667085] dark:text-[#8B92A8] uppercase tracking-wider">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
                    <span className="ml-2 font-normal">· {fmtDuration(dayEntries.reduce((s, e) => s + e.durationMins, 0))}</span>
                  </p>
                </div>
                {dayEntries.map(entry => (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-3 px-5 py-3 hover:bg-[#FAFAFA] dark:hover:bg-[#21222D] group transition-colors cursor-pointer',
                      entry.isBilled && 'opacity-60',
                    )}
                    onClick={() => {
                      setTimeSnap({
                        id: entry.id,
                        description: entry.description,
                        date: entry.date,
                        durationMins: entry.durationMins,
                        hourlyRate: entry.hourlyRate,
                        isBilled: entry.isBilled,
                        projectName: entry.project?.name,
                        contactName: entry.contact?.name,
                      })
                      setActiveTimeEntry(entry)
                    }}
                  >
                    {!entry.isBilled ? (
                      <button onClick={e => { e.stopPropagation(); toggleSelect(entry.id) }} className="shrink-0 text-[#D0D5DD] hover:text-[#2563EB] transition-colors">
                        {selected.has(entry.id)
                          ? <CheckSquare size={15} className="text-[#2563EB]" />
                          : <SquareIcon size={15} />}
                      </button>
                    ) : <div className="w-4 shrink-0" />}

                    {/* Contact badge */}
                    {(entry.contact || entry.client) ? (
                      <span className="text-[11px] font-semibold text-[#2563EB] bg-[#EFF6FF] dark:bg-[#1E3A5F]/60 px-2 py-0.5 rounded-full shrink-0">
                        {entry.contact?.name ?? entry.client?.name}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#D0D5DD] shrink-0">—</span>
                    )}

                    {/* Project badge */}
                    {entry.project && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full shrink-0">
                        <FolderKanban size={9} />
                        {entry.project.name}
                      </span>
                    )}

                    <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8] flex-1 min-w-0 truncate">
                      {entry.description}
                    </p>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
                        {fmtDuration(entry.durationMins)}
                      </span>
                      {entry.hourlyRate && (
                        <span className="text-[11px] text-[#667085] dark:text-[#8B92A8]">
                          ₹{Number(entry.hourlyRate).toLocaleString('en-IN')}/hr
                        </span>
                      )}
                      {entry.isBilled && (
                        <span className="text-[10px] font-bold text-[#027A48] bg-[#ECFDF3] px-1.5 py-0.5 rounded-full">Billed</span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); handleOpenEdit(entry) }}
                        className="w-7 h-7 flex items-center justify-center text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors rounded-lg hover:bg-[#F2F4F7] dark:hover:bg-[#3D4258]"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); setDeleteTarget(entry) }}
                        className="w-7 h-7 flex items-center justify-center text-[#98A2B3] hover:text-[#F04438] transition-colors rounded-lg hover:bg-[#FEF3F2]"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {selected.size > 0 && (
          <div className="px-5 py-3 border-t border-[#EAECF0] dark:border-[#26283A] bg-[#FAFAFA] dark:bg-[#21222D] flex items-center justify-between">
            <p className="text-[12px] text-[#667085] dark:text-[#8B92A8]">
              {selected.size} entr{selected.size === 1 ? 'y' : 'ies'} selected
              {!canBill && selectedEntries.length > 0 && selectedContactIds.length > 1 && (
                <span className="ml-1 text-amber-600"> — must be same contact to bill</span>
              )}
            </p>
            <button
              onClick={() => billEntries.mutate([...selectedUnbilled])}
              disabled={!canBill || billEntries.isPending}
              className="flex items-center gap-1.5 btn-primary text-[13px] disabled:opacity-50"
            >
              {billEntries.isPending ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={13} strokeWidth={2.5} />}
              Bill {selectedUnbilled.length} entries →
            </button>
          </div>
        )}
      </div>

      <TimeEntryQuickView
        snap={timeSnap}
        onClose={() => { setTimeSnap(null); setActiveTimeEntry(null) }}
        onEdit={() => { setTimeSnap(null); if (activeTimeEntry) handleOpenEdit(activeTimeEntry) }}
      />

      {deleteTarget && (
        <ConfirmModal
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => {
            deleteEntry.mutate(deleteTarget.id)
            setDeleteTarget(null)
          }}
          title="Delete time entry?"
          description={`This will permanently delete "${deleteTarget.description || 'this entry'}". This cannot be undone.`}
          confirmLabel="Delete Entry"
          variant="delete"
          isLoading={deleteEntry.isPending}
        />
      )}
    </div>
  )
}
