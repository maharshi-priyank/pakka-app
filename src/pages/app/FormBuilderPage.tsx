import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { nanoid } from 'nanoid'
import {
  ArrowLeft, Copy, CheckCheck, GripVertical, Trash2, Plus,
  Loader2, ChevronDown, ChevronUp, Check, Zap, Code2, X,
} from 'lucide-react'
import { cn, formatDate } from '@/lib/utils'
import { useForm, useUpdateForm, type FormField, type FormSubmission } from '@/features/forms/hooks/useForms'

const LEAD_FIELDS = [
  { key: 'name',    label: 'Name *' },
  { key: 'email',   label: 'Email' },
  { key: 'phone',   label: 'Phone' },
  { key: 'company', label: 'Company' },
  { key: 'service', label: 'Service' },
  { key: 'budget',  label: 'Budget' },
  { key: 'notes',   label: 'Notes' },
]

type FieldType = FormField['type']
const FIELD_TYPES: { type: FieldType; label: string }[] = [
  { type: 'text',        label: 'Short text' },
  { type: 'textarea',    label: 'Long text' },
  { type: 'select',      label: 'Dropdown' },
  { type: 'multiselect', label: 'Multi-select' },
  { type: 'date',        label: 'Date' },
]

// ─── Sortable field row ───────────────────────────────────────────────────────

interface SortableFieldRowProps {
  field:     FormField
  onChange:  (id: string, patch: Partial<FormField>) => void
  onRemove:  (id: string) => void
}

function SortableFieldRow({ field, onChange, onRemove }: SortableFieldRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.id })

  const style = {
    transform:  CSS.Transform.toString(transform),
    transition,
    opacity:    isDragging ? 0.5 : 1,
    zIndex:     isDragging ? 10 : undefined,
  }

  function addOption() {
    onChange(field.id, { options: [...(field.options ?? []), ''] })
  }
  function updateOption(idx: number, val: string) {
    const opts = [...(field.options ?? [])]
    opts[idx] = val
    onChange(field.id, { options: opts })
  }
  function removeOption(idx: number) {
    const opts = (field.options ?? []).filter((_, i) => i !== idx)
    onChange(field.id, { options: opts })
  }

  return (
    <div ref={setNodeRef} style={style} className="card p-4 flex gap-3 group">
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        type="button"
        className="mt-1 text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#667085] dark:hover:text-[#8B92A8] cursor-grab active:cursor-grabbing shrink-0 transition-colors"
      >
        <GripVertical size={16} />
      </button>

      <div className="flex-1 space-y-3">
        {/* Type + label row */}
        <div className="flex items-start gap-3 flex-wrap">
          <select
            value={field.type}
            onChange={e => onChange(field.id, { type: e.target.value as FieldType, options: e.target.value === 'select' || e.target.value === 'multiselect' ? (field.options ?? ['']) : undefined })}
            className="form-input text-[12.5px] py-1.5 pr-8 h-8 shrink-0 w-[140px]"
          >
            {FIELD_TYPES.map(t => (
              <option key={t.type} value={t.type}>{t.label}</option>
            ))}
          </select>
          <input
            value={field.label}
            onChange={e => onChange(field.id, { label: e.target.value })}
            placeholder="Question / label"
            className="form-input text-[13px] py-1.5 h-8 flex-1 min-w-[160px]"
          />
          {/* Required toggle */}
          <label className="flex items-center gap-1.5 h-8 shrink-0 cursor-pointer select-none">
            <button
              type="button"
              role="switch"
              aria-checked={field.required}
              onClick={() => onChange(field.id, { required: !field.required })}
              className={cn(
                'relative inline-flex h-4 w-7 shrink-0 rounded-full border-2 border-transparent transition-colors',
                field.required ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
              )}
            >
              <span className={cn(
                'inline-block h-3 w-3 rounded-full bg-white shadow transition-transform',
                field.required ? 'translate-x-3' : 'translate-x-0',
              )} />
            </button>
            <span className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">Required</span>
          </label>
        </div>

        {/* Options for select / multiselect */}
        {(field.type === 'select' || field.type === 'multiselect') && (
          <div className="space-y-1.5 pl-1">
            {(field.options ?? []).map((opt, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  value={opt}
                  onChange={e => updateOption(idx, e.target.value)}
                  placeholder={`Option ${idx + 1}`}
                  className="form-input text-[12.5px] py-1 h-7 flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  disabled={(field.options ?? []).length <= 1}
                  className="text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] disabled:opacity-30 transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              className="flex items-center gap-1 text-[11.5px] font-semibold text-[#6366F1] dark:text-[#818CF8] hover:opacity-80 transition-opacity mt-1"
            >
              <Plus size={12} /> Add option
            </button>
          </div>
        )}
      </div>

      {/* Delete */}
      <button
        type="button"
        onClick={() => onRemove(field.id)}
        className="mt-1 text-[#D0D5DD] dark:text-[#3D4258] hover:text-[#D92D20] dark:hover:text-red-400 shrink-0 transition-colors opacity-0 group-hover:opacity-100"
      >
        <Trash2 size={15} />
      </button>
    </div>
  )
}

// ─── Responses tab ────────────────────────────────────────────────────────────

function ResponsesTab({ submissions, fields }: { submissions: FormSubmission[]; fields: FormField[] }) {
  const [expanded, setExpanded] = useState<string | null>(null)

  if (submissions.length === 0) {
    return (
      <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] py-16 text-center">
        <p className="text-[13.5px] font-semibold text-[#101828] dark:text-[#ECEEF3]">No responses yet</p>
        <p className="text-[12px] text-[#98A2B3] dark:text-[#545C74] mt-1">Share the form link to start collecting responses.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] overflow-hidden">
      <div className="divide-y divide-[#F2F4F7] dark:divide-[#26283A]">
        {submissions.map(sub => {
          const isExpanded = expanded === sub.id
          return (
            <div key={sub.id}>
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : sub.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-[#FAFBFF] dark:hover:bg-[#1A1B23] transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold text-[#101828] dark:text-[#ECEEF3]">
                    {sub.respondentName ?? sub.respondentEmail ?? 'Anonymous'}
                  </p>
                  {sub.respondentEmail && sub.respondentName && (
                    <p className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74]">{sub.respondentEmail}</p>
                  )}
                </div>
                <span className="text-[11.5px] text-[#98A2B3] dark:text-[#545C74] shrink-0">{formatDate(sub.submittedAt)}</span>
                {isExpanded
                  ? <ChevronUp  size={14} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />
                  : <ChevronDown size={14} className="text-[#98A2B3] dark:text-[#545C74] shrink-0" />}
              </button>
              {isExpanded && (
                <div className="px-5 pb-4 space-y-3 bg-[#FAFBFF] dark:bg-[#1A1B23] border-t border-[#F2F4F7] dark:border-[#26283A]">
                  {fields.map(f => {
                    const answer = sub.answers[f.id]
                    return (
                      <div key={f.id}>
                        <p className="text-[11px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide mb-0.5">{f.label}</p>
                        <p className="text-[13px] text-[#344054] dark:text-[#C2C8D8]">
                          {Array.isArray(answer)
                            ? answer.join(', ')
                            : answer || <span className="text-[#D0D5DD] dark:text-[#3D4258]">—</span>}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Add field dropdown ───────────────────────────────────────────────────────

function AddFieldMenu({ onAdd }: { onAdd: (type: FieldType) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-[#D0D5DD] dark:border-[#3D4258] text-[12.5px] font-semibold text-[#667085] dark:text-[#8B92A8] hover:border-[#6366F1] hover:text-[#6366F1] dark:hover:border-[#818CF8] dark:hover:text-[#818CF8] transition-colors w-full justify-center"
      >
        <Plus size={14} /> Add field
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 -translate-x-1/2 mt-2 z-20 bg-white dark:bg-[#1A1B26] rounded-xl shadow-lg border border-[#EAECF0] dark:border-[#26283A] w-48 overflow-hidden">
            {FIELD_TYPES.map(t => (
              <button
                key={t.type}
                type="button"
                onClick={() => { onAdd(t.type); setOpen(false) }}
                className="w-full text-left px-4 py-2.5 text-[13px] text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F4F5F8] dark:hover:bg-[#21222D] transition-colors"
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FormBuilderPage() {
  const { id }   = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: form, isLoading } = useForm(id!)
  const { mutateAsync: updateForm, isPending: saving } = useUpdateForm()

  const [activeTab,       setActiveTab]       = useState<'builder' | 'responses'>('builder')
  const [title,           setTitle]           = useState('')
  const [desc,            setDesc]            = useState('')
  const [fields,          setFields]          = useState<FormField[]>([])
  const [autoCreateLead,  setAutoCreateLead]  = useState(false)
  const [leadFieldMap,    setLeadFieldMap]    = useState<Record<string, string>>({})
  const [copied,          setCopied]          = useState(false)
  const [embedCopied,     setEmbedCopied]     = useState(false)
  const [showEmbed,       setShowEmbed]       = useState(false)
  const [saved,           setSaved]           = useState(false)

  useEffect(() => {
    if (form) {
      setTitle(form.title)
      setDesc(form.description ?? '')
      setFields(form.fields)
      setAutoCreateLead(form.autoCreateLead)
      setLeadFieldMap(form.leadFieldMap ?? {})
    }
  }, [form])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setFields(prev => {
        const oldIndex = prev.findIndex(f => f.id === active.id)
        const newIndex = prev.findIndex(f => f.id === over.id)
        return arrayMove(prev, oldIndex, newIndex)
      })
    }
  }

  function addField(type: FieldType) {
    const newField: FormField = {
      id:       nanoid(8),
      type,
      label:    '',
      required: false,
      options:  type === 'select' || type === 'multiselect' ? [''] : undefined,
    }
    setFields(prev => [...prev, newField])
  }

  function updateField(id: string, patch: Partial<FormField>) {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f))
  }

  function removeField(id: string) {
    setFields(prev => prev.filter(f => f.id !== id))
  }

  async function handleSave() {
    if (!id) return
    await updateForm({ id, title, description: desc || undefined, fields, autoCreateLead, leadFieldMap })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const shareUrl = form ? `${window.location.origin}/q/${form.token}` : ''

  const embedCode = form
    ? `<iframe\n  src="${shareUrl}"\n  width="100%"\n  height="640"\n  style="border:none;border-radius:12px;"\n  title="${title || form.title}"\n></iframe>`
    : ''

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function copyEmbed() {
    if (!embedCode) return
    navigator.clipboard.writeText(embedCode)
    setEmbedCopied(true)
    setTimeout(() => setEmbedCopied(false), 2000)
  }

  return (
    <div className="space-y-5 max-w-[780px]">
      {/* Back */}
      <button
        onClick={() => navigate('/app/forms')}
        className="flex items-center gap-1.5 text-[12.5px] text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors font-medium"
      >
        <ArrowLeft size={14} /> Forms
      </button>

      {isLoading ? (
        <div className="space-y-4">
          <div className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-7 w-64 rounded" />
          <div className="animate-pulse bg-[#F2F4F7] dark:bg-[#21222D] h-4 w-96 rounded" />
        </div>
      ) : form ? (
        <>
          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Form title"
                className="text-[20px] font-extrabold text-[#101828] dark:text-[#ECEEF3] tracking-tight bg-transparent border-none outline-none w-full placeholder:text-[#D0D5DD] dark:placeholder:text-[#3D4258]"
              />
              <input
                value={desc}
                onChange={e => setDesc(e.target.value)}
                placeholder="Add a description (optional)"
                className="text-[13px] text-[#667085] dark:text-[#8B92A8] bg-transparent border-none outline-none w-full mt-0.5 placeholder:text-[#D0D5DD] dark:placeholder:text-[#3D4258]"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={copyLink}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                {copied ? <><CheckCheck size={13} /> Copied!</> : <><Copy size={13} /> Share link</>}
              </button>
              <button
                onClick={() => setShowEmbed(true)}
                className="flex items-center gap-1.5 h-9 px-3.5 rounded-lg border border-[#D0D5DD] dark:border-[#3D4258] text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] transition-colors"
              >
                <Code2 size={13} /> Embed
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={cn(
                  'flex items-center gap-2 h-9 px-4 rounded-lg text-[12.5px] font-semibold transition-colors',
                  saving || saved
                    ? 'bg-[#ECFDF3] dark:bg-emerald-950/40 text-[#027A48] dark:text-[#34D399]'
                    : 'bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5]',
                )}
              >
                {saving
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : saved
                    ? <><Check size={13} /> Saved</>
                    : 'Save'}
              </button>
            </div>
          </div>

          {/* Tab bar */}
          <div className="flex items-center gap-1 border-b border-[#EAECF0] dark:border-[#26283A]">
            {(['builder', 'responses'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-3.5 py-2.5 text-[12.5px] font-medium border-b-2 -mb-px transition-colors capitalize flex items-center gap-1.5',
                  activeTab === tab
                    ? 'border-[#6366F1] text-[#6366F1]'
                    : 'border-transparent text-[#667085] dark:text-[#8B92A8] hover:text-[#344054] dark:hover:text-[#C2C8D8]',
                )}
              >
                {tab}
                {tab === 'responses' && form.submissions.length > 0 && (
                  <span className={cn(
                    'text-[10px] font-bold px-1.5 py-0.5 rounded-full',
                    activeTab === tab
                      ? 'bg-[#EEF2FF] dark:bg-[#1E2040] text-[#6366F1]'
                      : 'bg-[#F2F4F7] dark:bg-[#21222D] text-[#667085] dark:text-[#8B92A8]',
                  )}>
                    {form.submissions.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'builder' ? (
            <div className="space-y-3">
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={fields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                  {fields.map(field => (
                    <SortableFieldRow
                      key={field.id}
                      field={field}
                      onChange={updateField}
                      onRemove={removeField}
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {fields.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#D0D5DD] dark:border-[#3D4258] py-10 text-center">
                  <p className="text-[13px] text-[#98A2B3] dark:text-[#545C74]">No fields yet. Add your first field below.</p>
                </div>
              )}

              <AddFieldMenu onAdd={addField} />

              {/* Lead automation */}
              <div className="rounded-xl border border-[#EAECF0] dark:border-[#26283A] bg-white dark:bg-[#13141A] p-5 mt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] dark:bg-[#1E2040] flex items-center justify-center shrink-0">
                      <Zap size={14} className="text-[#6366F1] dark:text-[#818CF8]" />
                    </div>
                    <div>
                      <p className="text-[13px] font-bold text-[#101828] dark:text-[#ECEEF3]">Auto-create lead</p>
                      <p className="text-[11.5px] text-[#667085] dark:text-[#8B92A8]">Add a lead to your CRM on every submission</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoCreateLead}
                    onClick={() => setAutoCreateLead(v => !v)}
                    className={cn(
                      'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                      autoCreateLead ? 'bg-[#6366F1]' : 'bg-[#D0D5DD] dark:bg-[#3D4258]',
                    )}
                  >
                    <span className={cn(
                      'inline-block h-4 w-4 rounded-full bg-white shadow transition-transform',
                      autoCreateLead ? 'translate-x-4' : 'translate-x-0',
                    )} />
                  </button>
                </div>

                {autoCreateLead && (
                  <div className="mt-4 border-t border-[#F2F4F7] dark:border-[#26283A] pt-4">
                    {fields.length === 0 ? (
                      <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                        <Zap size={14} className="text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-[12px] text-amber-700 dark:text-amber-400 leading-snug">
                          Add form fields above first, then map them to lead fields here.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        <p className="text-[11.5px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide mb-3">
                          Map form fields → lead fields
                        </p>
                        {LEAD_FIELDS.map(lf => (
                          <div key={lf.key} className="flex items-center gap-3">
                            <span className="text-[12px] font-semibold text-[#344054] dark:text-[#C2C8D8] w-20 shrink-0">{lf.label}</span>
                            <select
                              value={leadFieldMap[lf.key] ?? ''}
                              onChange={e => setLeadFieldMap(prev => {
                                const next = { ...prev }
                                if (e.target.value) next[lf.key] = e.target.value
                                else delete next[lf.key]
                                return next
                              })}
                              className="form-input text-[12.5px] py-1 h-8 flex-1"
                            >
                              <option value="">— not mapped —</option>
                              {fields.map(f => (
                                <option key={f.id} value={f.id}>
                                  {f.label || `Unnamed ${f.type} field`}
                                </option>
                              ))}
                            </select>
                          </div>
                        ))}
                        {!leadFieldMap['name'] && (
                          <p className="text-[11.5px] text-amber-600 dark:text-amber-400 mt-2">
                            Map at least "Name" so leads have a name.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <ResponsesTab submissions={form.submissions} fields={form.fields} />
          )}
        </>
      ) : (
        <p className="text-[14px] text-[#98A2B3]">Form not found.</p>
      )}

      {/* Embed modal */}
      {showEmbed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowEmbed(false)} />
          <div className="relative bg-white dark:bg-[#13141A] rounded-2xl shadow-2xl dark:shadow-black/60 w-full max-w-[540px] p-6 space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Embed on your website</p>
                <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mt-0.5">Paste this snippet in your HTML where you want the form to appear.</p>
              </div>
              <button
                onClick={() => setShowEmbed(false)}
                className="text-[#98A2B3] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors mt-0.5"
              >
                <X size={16} />
              </button>
            </div>

            {/* Code block */}
            <div className="relative group">
              <pre className="bg-[#F4F6FB] dark:bg-[#0D0E14] border border-[#E4E7EC] dark:border-[#26283A] rounded-xl px-4 py-3.5 text-[12px] font-mono text-[#344054] dark:text-[#C2C8D8] whitespace-pre overflow-x-auto leading-relaxed">
                {embedCode}
              </pre>
              <button
                onClick={copyEmbed}
                className="absolute top-2.5 right-2.5 flex items-center gap-1.5 h-7 px-2.5 rounded-lg bg-white dark:bg-[#21222D] border border-[#E4E7EC] dark:border-[#26283A] text-[11.5px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#2A2B38] transition-colors shadow-sm"
              >
                {embedCopied ? <><CheckCheck size={11} className="text-[#027A48]" /> Copied!</> : <><Copy size={11} /> Copy</>}
              </button>
            </div>

            {/* Tips */}
            <div className="space-y-1.5">
              <p className="text-[11.5px] font-semibold text-[#98A2B3] dark:text-[#545C74] uppercase tracking-wide">Tips</p>
              <ul className="space-y-1">
                {[
                  'Change height to fit your form — typically 500–800px.',
                  'Add allow-forms to a sandbox attribute if your site uses Content Security Policy.',
                  'Works on any website: plain HTML, WordPress, Webflow, Framer, Wix.',
                ].map(tip => (
                  <li key={tip} className="flex items-start gap-2 text-[12px] text-[#667085] dark:text-[#8B92A8]">
                    <span className="mt-1.5 w-1 h-1 rounded-full bg-[#D0D5DD] dark:bg-[#3D4258] shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
