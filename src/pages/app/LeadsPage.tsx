import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import {
  Plus, Search, X, IndianRupee, LayoutGrid, List, Archive,
  Telescope, ExternalLink, Inbox, UserPlus, RefreshCw, Copy,
  CheckCheck, GitBranch, Code2,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { cn, formatDate } from '@/lib/utils'
import AIIcon from '@/features/ai/components/AIIcon'
import AILeadModal from '@/features/ai/components/AILeadModal'
import { LeadsKanban, AddLeadModal } from '@/features/leads'
import { useLeads, useArchiveLead, useUnarchiveLead } from '@/features/leads'
import type { Lead } from '@/features/leads/schemas/lead.schema'
import { LEAD_STAGES, LEAD_SOURCES, STAGE_LABELS } from '@/features/leads/schemas/lead.schema'
import type { LeadStage } from '@/features/leads/schemas/lead.schema'
import LeadProposalPickerModal from '@/features/leads/components/LeadProposalPickerModal'
import LeadTable, { LeadTableSkeleton } from '@/features/leads/components/LeadTable'
import type { SortField, SortDir } from '@/features/leads/components/LeadTable'
import ConvertLeadToContactModal from '@/features/leads/components/ConvertLeadToContactModal'
import MultiSelectPill from '@/components/filters/MultiSelectPill'
import FollowUpPill from '@/components/filters/FollowUpPill'
import AmountRangePill from '@/components/filters/AmountRangePill'
import { useLeadCaptureForm } from '@/features/forms/hooks/useForms'

// ─── Types ─────────────────────────────────────────────────────────────────────

type Tab      = 'pipeline' | 'capture'
type ViewMode = 'kanban' | 'table'

const SOURCE_LABELS: Record<string, string> = {
  instagram:     'Instagram',
  referral:      'Referral',
  website:       'Website',
  linkedin:      'LinkedIn',
  cold_outreach: 'Cold outreach',
  other:         'Other',
}

interface LeadFilters {
  stages:    LeadStage[]
  sources:   string[]
  budgetMin: string
  budgetMax: string
  followUp:  'overdue' | 'this_week' | 'unset' | ''
}

const EMPTY_FILTERS: LeadFilters = { stages: [], sources: [], budgetMin: '', budgetMax: '', followUp: '' }

const VIEW_KEY = 'clearwork:leads:view'
function getStoredView(): ViewMode {
  try { return (localStorage.getItem(VIEW_KEY) as ViewMode) ?? 'kanban' } catch { return 'kanban' }
}

// ─── Capture tab — Embed Panel ────────────────────────────────────────────────

function EmbedPanel() {
  const { data: form, isLoading, isError, refetch } = useLeadCaptureForm()
  const [copied, setCopied] = useState(false)

  const shareUrl  = form ? `${window.location.origin}/q/${form.token}` : ''
  const embedCode = form
    ? `<iframe\n  src="${shareUrl}"\n  width="100%"\n  height="640"\n  style="border:none;border-radius:12px;"\n  title="${form.title}"\n></iframe>`
    : ''

  function copyEmbed() {
    if (!embedCode) return
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[13.5px] font-bold text-[#101828] dark:text-[#ECEEF3]">Embed your intake form</p>
          <p className="text-[12px] text-[#667085] dark:text-[#8B92A8] mt-0.5">
            Copy this code and paste it anywhere on your website to start capturing leads.
          </p>
        </div>
        {form && (
          <Link
            to={`/forms/${form.id}`}
            className="shrink-0 text-[12px] font-semibold text-[#3538CD] dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            Customize fields <ExternalLink size={10} />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="h-24 w-full rounded-lg bg-[#F2F4F7] dark:bg-[#21222D] animate-pulse" />
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-6">
          <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8]">Couldn't load your embed code</p>
          <button
            onClick={() => refetch()}
            className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] transition-colors"
          >
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      ) : (
        <div className="relative">
          <pre className="text-[11.5px] font-mono text-[#344054] dark:text-[#C2C8D8] bg-[#F9FAFB] dark:bg-[#1A1B23] rounded-lg px-4 py-3 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-[#EAECF0] dark:border-[#26283A]">
            {embedCode}
          </pre>
          <button
            onClick={copyEmbed}
            className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-white dark:bg-[#13141A] border border-[#E4E7EC] dark:border-[#26283A] text-[11px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] hover:border-[#2563EB] transition-colors shadow-sm"
          >
            {copied
              ? <><CheckCheck size={11} className="text-[#027A48]" /> Copied!</>
              : <><Copy size={11} /> Copy code</>
            }
          </button>
        </div>
      )}

      {form && (
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">Public URL:</span>
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11.5px] text-[#2563EB] hover:underline font-medium flex items-center gap-1 truncate"
          >
            {shareUrl} <ExternalLink size={10} className="shrink-0" />
          </a>
        </div>
      )}
    </div>
  )
}

// ─── Capture tab ───────────────────────────────────────────────────────────────

function CaptureTab() {
  const { data, isLoading, isError, refetch } = useLeads({ limit: 200, hasSourceForm: true })
  const archiveMut   = useArchiveLead()
  const unarchiveMut = useUnarchiveLead()
  const [convertLead, setConvertLead] = useState<Lead | null>(null)

  const leads = data?.items ?? []

  function handleDismiss(lead: Lead) {
    archiveMut.mutate(lead.id, {
      onSuccess: () => toast('Lead dismissed', {
        action: { label: 'Undo', onClick: () => unarchiveMut.mutate(lead.id) },
      }),
    })
  }

  return (
    <div className="space-y-5 max-w-[860px]">
      <EmbedPanel />

      {/* Submissions header */}
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">
          Form submissions
          {leads.length > 0 && (
            <span className="ml-2 text-[11px] font-bold px-1.5 py-0.5 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 text-[#2563EB]">
              {leads.length}
            </span>
          )}
        </p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">New leads from your embedded form appear here</p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
              <div className="w-9 h-9 rounded-full bg-[#F2F4F7] dark:bg-[#21222D] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 bg-[#F2F4F7] dark:bg-[#21222D] animate-pulse rounded w-1/3" />
                <div className="h-3 bg-[#F2F4F7] dark:bg-[#21222D] animate-pulse rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Couldn't load submissions</p>
          <button onClick={() => refetch()} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] transition-colors">
            <RefreshCw size={11} /> Retry
          </button>
        </div>
      ) : leads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A]">
          <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] dark:bg-[#1A1B23] flex items-center justify-center mb-3">
            <Inbox size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
          </div>
          <p className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">No submissions yet</p>
          <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1 text-center max-w-[280px] leading-relaxed">
            Copy the embed code above and add it to your website to start collecting leads.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {leads.map(lead => (
            <div
              key={lead.id}
              className="flex items-center gap-3 px-4 py-3.5 bg-white dark:bg-[#13141A] rounded-xl border border-[#EAECF0] dark:border-[#26283A] hover:border-[#D0D5DD] dark:hover:border-[#333649] transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-[#EFF6FF] dark:bg-blue-950/40 flex items-center justify-center text-[#2563EB] font-bold text-[12px] shrink-0">
                {lead.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3] truncate">
                  {lead.name}
                  {lead.company && <span className="text-[#98A2B3] dark:text-[#545C74] font-normal"> · {lead.company}</span>}
                </p>
                <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] mt-0.5">
                  {lead.sourceForm?.title ?? 'Website form'} · {formatDate(lead.createdAt)}
                  {lead.email && <> · {lead.email}</>}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleDismiss(lead)}
                  disabled={archiveMut.isPending}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors disabled:opacity-50"
                >
                  <Archive size={12} /> Dismiss
                </button>
                <button
                  onClick={() => setConvertLead(lead)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#EEF4FF] dark:bg-indigo-950/40 text-[#3538CD] dark:text-indigo-400 text-[12px] font-semibold hover:bg-[#E0EAFF] dark:hover:bg-indigo-950/60 transition-colors"
                >
                  <UserPlus size={12} /> Convert
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {convertLead && (
        <ConvertLeadToContactModal lead={convertLead} open={!!convertLead} onClose={() => setConvertLead(null)} />
      )}
    </div>
  )
}

// ─── Pipeline tab ──────────────────────────────────────────────────────────────

function PipelineTab({
  showAdd, setShowAdd, showAI, setShowAI,
}: {
  showAdd:    boolean
  setShowAdd: (v: boolean) => void
  showAI:     boolean
  setShowAI:  (v: boolean) => void
}) {
  const [search,          setSearch]          = useState('')
  const [view,            setView]            = useState<ViewMode>(getStoredView)
  const [sortBy,          setSortBy]          = useState<SortField>('createdAt')
  const [sortDir,         setSortDir]         = useState<SortDir>('desc')
  const navigate = useNavigate()
  const [proposalForLead, setProposalForLead] = useState<Lead | null>(null)
  const [filters,         setFilters]         = useState<LeadFilters>(EMPTY_FILTERS)
  const [includeArchived, setIncludeArchived] = useState(false)

  const searchRef = useRef<HTMLInputElement>(null)

  const { data, isLoading } = useLeads({ limit: 500, includeArchived: includeArchived || undefined, hasSourceForm: false })
  const allLeads = data?.items ?? []

  useEffect(() => { localStorage.setItem(VIEW_KEY, view) }, [view])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') { e.preventDefault(); searchRef.current?.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  function handleSort(field: SortField) {
    if (field === sortBy) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  const displayed = useMemo(() => {
    let list = allLeads
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(l =>
        l.name.toLowerCase().includes(q) ||
        (l.company ?? '').toLowerCase().includes(q) ||
        (l.email   ?? '').toLowerCase().includes(q) ||
        (l.service ?? '').toLowerCase().includes(q),
      )
    }
    if (filters.stages.length > 0)  list = list.filter(l => filters.stages.includes(l.stage))
    if (filters.sources.length > 0) list = list.filter(l => l.source && filters.sources.includes(l.source))
    if (filters.followUp === 'overdue') {
      list = list.filter(l => l.followUpAt && new Date(l.followUpAt) < new Date())
    } else if (filters.followUp === 'this_week') {
      const now = new Date()
      const start = new Date(now); start.setHours(0, 0, 0, 0)
      const end   = new Date(now); end.setDate(end.getDate() + (6 - end.getDay())); end.setHours(23, 59, 59, 999)
      list = list.filter(l => {
        if (!l.followUpAt) return false
        const d = new Date(l.followUpAt)
        return d >= start && d <= end
      })
    } else if (filters.followUp === 'unset') {
      list = list.filter(l => !l.followUpAt)
    }
    if (filters.budgetMin) list = list.filter(l => Number(l.budget ?? 0) >= Number(filters.budgetMin))
    if (filters.budgetMax) list = list.filter(l => Number(l.budget ?? 0) <= Number(filters.budgetMax))

    return [...list].sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1
      switch (sortBy) {
        case 'name':       return dir * a.name.localeCompare(b.name)
        case 'budget':     return dir * ((Number(a.budget) || 0) - (Number(b.budget) || 0))
        case 'followUpAt': return dir * ((a.followUpAt ?? '9999').localeCompare(b.followUpAt ?? '9999'))
        case 'createdAt':  return dir * a.createdAt.localeCompare(b.createdAt)
        default:           return 0
      }
    })
  }, [allLeads, search, filters, sortBy, sortDir])

  const hasSearch = search.trim().length > 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#98A2B3] dark:text-[#545C74] pointer-events-none" />
          <input
            ref={searchRef}
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search leads…"
            className={cn(
              'h-8 pl-8 pr-7 text-[12.5px] bg-white dark:bg-[#13141A] text-[#101828] dark:text-[#ECEEF3]',
              'border border-[#E4E7EC] dark:border-[#26283A] rounded-lg outline-none',
              'focus:border-[#2563EB] transition-colors w-full placeholder:text-[#98A2B3] dark:placeholder:text-[#545C74]',
            )}
          />
          {hasSearch && (
            <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-[#98A2B3] hover:text-[#667085] transition-colors">
              <X size={12} />
            </button>
          )}
        </div>

        <MultiSelectPill
          label="Stage"
          options={LEAD_STAGES.map(s => ({ value: s, label: STAGE_LABELS[s] }))}
          selected={filters.stages}
          onChange={vals => setFilters(f => ({ ...f, stages: vals as LeadStage[] }))}
        />
        <MultiSelectPill
          label="Source"
          options={LEAD_SOURCES.map(s => ({ value: s, label: SOURCE_LABELS[s] ?? s }))}
          selected={filters.sources}
          onChange={vals => setFilters(f => ({ ...f, sources: vals }))}
        />
        <AmountRangePill
          label="Budget"
          min={filters.budgetMin}
          max={filters.budgetMax}
          onMin={v => setFilters(f => ({ ...f, budgetMin: v }))}
          onMax={v => setFilters(f => ({ ...f, budgetMax: v }))}
          onClear={() => setFilters(f => ({ ...f, budgetMin: '', budgetMax: '' }))}
        />
        <FollowUpPill
          value={filters.followUp}
          onChange={v => setFilters(f => ({ ...f, followUp: v }))}
        />

        {hasSearch && !isLoading && (
          <span className="text-[12px] text-[#98A2B3] dark:text-[#545C74]">
            {displayed.length} result{displayed.length !== 1 ? 's' : ''}
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={() => setIncludeArchived(prev => !prev)}
          className={cn(
            'flex items-center gap-1.5 text-[12px] px-3 py-1.5 rounded-lg border transition-colors',
            includeArchived
              ? 'bg-[#F2F4F7] border-[#D0D5DD] text-[#344054] dark:bg-[#1E2030] dark:border-[#333649] dark:text-[#CDD2E0]'
              : 'border-transparent text-[#98A2B3] hover:text-[#667085]',
          )}
        >
          <Archive size={12} /> Show archived
        </button>

        <div className="flex items-center gap-0.5 p-0.5 bg-[#F5F6FA] dark:bg-[#21222D] rounded-lg border border-[#E4E7EC] dark:border-[#26283A]">
          <button
            onClick={() => setView('kanban')}
            title="Kanban view"
            className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'kanban' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
          >
            <LayoutGrid size={13} strokeWidth={2} />
          </button>
          <button
            onClick={() => setView('table')}
            title="Table view"
            className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', view === 'table' ? 'bg-white dark:bg-[#13141A] text-[#2563EB] shadow-sm' : 'text-[#98A2B3] dark:text-[#545C74] hover:text-[#667085]')}
          >
            <List size={13} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Table view */}
      {view === 'table' && (
        isLoading ? <LeadTableSkeleton /> :
        displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#F5F6FA] dark:bg-[#21222D] flex items-center justify-center mb-4">
              <Search size={20} className="text-[#D0D5DD] dark:text-[#3D4258]" />
            </div>
            <p className="text-[14px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
              {hasSearch ? `No results for "${search}"` : 'No leads yet'}
            </p>
            {hasSearch && (
              <button onClick={() => setSearch('')} className="mt-3 text-[12px] text-[#2563EB] font-semibold hover:text-[#1D4ED8] transition-colors">
                Clear search
              </button>
            )}
          </div>
        ) : (
          <LeadTable
            leads={displayed}
            sortBy={sortBy}
            sortDir={sortDir}
            onSort={handleSort}
            onOpen={lead => navigate(`/leads/${lead.id}`)}
            onNewProposal={lead => setProposalForLead(lead)}
          />
        )
      )}

      {/* Kanban view */}
      {view === 'kanban' && (
        <LeadsKanban search={search} onNewProposal={lead => setProposalForLead(lead)} />
      )}

      <AddLeadModal open={showAdd} onClose={() => setShowAdd(false)} />
      {showAI && <AILeadModal onClose={() => setShowAI(false)} />}
      {proposalForLead && <LeadProposalPickerModal lead={proposalForLead} onClose={() => setProposalForLead(null)} />}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = (searchParams.get('tab') as Tab) ?? 'pipeline'

  const [showAdd, setShowAdd] = useState(false)
  const [showAI,  setShowAI]  = useState(false)

  const openLeadFinder = useCallback(async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault()
    const { data: { session } } = await supabase.auth.getSession()
    const base = import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'
    const url  = session
      ? `${base}?at=${encodeURIComponent(session.access_token)}&rt=${encodeURIComponent(session.refresh_token)}`
      : base
    window.open(url, '_blank', 'noopener,noreferrer')
  }, [])

  const { data: pipelineData } = useLeads({ limit: 1, hasSourceForm: false })
  const pipelineValue = pipelineData?.pipelineValue ? Number(pipelineData.pipelineValue) : null

  function setTab(t: Tab) {
    setSearchParams(t === 'pipeline' ? {} : { tab: t }, { replace: true })
  }

  return (
    <div className="space-y-0 max-w-[1400px]">

      {/* Page header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[17px] font-bold text-[#0D1117] dark:text-[#ECEEF3] tracking-tight">Leads</h1>
          {tab === 'pipeline' && pipelineValue !== null && pipelineValue > 0 && (
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#545C74] mt-0.5 flex items-center gap-1">
              <IndianRupee size={10} />
              {pipelineValue.toLocaleString('en-IN')} in pipeline
            </p>
          )}
        </div>

        {/* Pipeline-only actions */}
        {tab === 'pipeline' && (
          <div className="flex items-center gap-2">
            <a
              href={import.meta.env.VITE_LEADS_APP_URL ?? 'https://leads.getclearwork.in'}
              onClick={openLeadFinder}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 transition-colors cursor-pointer"
            >
              <Telescope size={13} />
              Find Leads
              <ExternalLink size={10} className="opacity-60" />
            </a>
            <button
              onClick={() => setShowAI(true)}
              className={cn(
                'flex items-center gap-1.5 h-9 px-3 sm:px-3.5 rounded-lg text-[13px] font-semibold transition-all',
                'bg-gradient-to-r from-indigo-600 to-violet-600 text-white',
                'hover:from-indigo-500 hover:to-violet-500 shadow-sm hover:shadow-indigo-200 hover:shadow-md',
              )}
            >
              <AIIcon size={13} />
              <span className="hidden sm:inline">Add with AI</span>
            </button>
            <button onClick={() => setShowAdd(true)} className="btn-primary">
              <Plus size={14} strokeWidth={2.5} />
              Add Lead
            </button>
          </div>
        )}
      </div>

      {/* Sub-tab bar */}
      <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A] mt-3">
        {([
          { id: 'pipeline', label: 'Pipeline',  icon: GitBranch },
          { id: 'capture',  label: 'Capture',   icon: Code2     },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium border-b-2 -mb-px transition-colors whitespace-nowrap',
              tab === id
                ? 'border-[#2563EB] text-[#2563EB]'
                : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
            )}
          >
            <Icon size={14} strokeWidth={2} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-4">
        {tab === 'pipeline' && (
          <PipelineTab showAdd={showAdd} setShowAdd={setShowAdd} showAI={showAI} setShowAI={setShowAI} />
        )}
        {tab === 'capture' && <CaptureTab />}
      </div>
    </div>
  )
}
