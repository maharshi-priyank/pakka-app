import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { ClipboardList, CheckCircle2, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FormField } from '@/features/forms/hooks/useForms'

const publicApi = axios.create({
  baseURL: import.meta.env.VITE_API_URL as string,
  headers: { 'Content-Type': 'application/json' },
})

interface PublicForm {
  id:          string
  title:       string
  description: string | null
  fields:      FormField[]
  isActive:    boolean
  user: {
    businessName: string | null
    name:         string
    logoUrl:      string | null
  }
}

export default function IntakeFormPage() {
  const { token } = useParams<{ token: string }>()

  const { data: form, isLoading, isError } = useQuery({
    queryKey: ['public-form', token],
    queryFn:  async () => {
      const res = await publicApi.get<{ data: PublicForm }>(`/forms/fill/${token}`)
      return res.data.data
    },
    retry: false,
  })

  const [answers,   setAnswers]   = useState<Record<string, string | string[]>>({})
  const [errors,    setErrors]    = useState<Record<string, string>>({})
  const [name,      setName]      = useState('')
  const [email,     setEmail]     = useState('')
  const [submitted, setSubmitted] = useState(false)

  const { mutate: submit, isPending } = useMutation({
    mutationFn: async () => {
      await publicApi.post(`/forms/fill/${token}`, {
        respondentName:  name.trim() || undefined,
        respondentEmail: email.trim() || undefined,
        answers,
      })
    },
    onSuccess: () => setSubmitted(true),
  })

  function setAnswer(fieldId: string, value: string | string[]) {
    setAnswers(prev => ({ ...prev, [fieldId]: value }))
    if (errors[fieldId]) setErrors(prev => { const n = { ...prev }; delete n[fieldId]; return n })
  }

  function toggleMulti(fieldId: string, option: string) {
    const current = (answers[fieldId] as string[] | undefined) ?? []
    const next    = current.includes(option)
      ? current.filter(v => v !== option)
      : [...current, option]
    setAnswer(fieldId, next)
  }

  function validate() {
    if (!form) return false
    const errs: Record<string, string> = {}
    for (const field of form.fields) {
      if (!field.required) continue
      const val = answers[field.id]
      if (!val || (Array.isArray(val) ? val.length === 0 : val.trim() === '')) {
        errs[field.id] = 'This field is required'
      }
    }
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (validate()) submit()
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB]">
        <Loader2 size={24} className="text-[#6366F1] animate-spin" />
      </div>
    )
  }

  if (isError || !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <p className="text-[15px] font-bold text-[#101828]">Form not found</p>
          <p className="text-[13px] text-[#667085] mt-1">This link may be invalid or expired.</p>
        </div>
      </div>
    )
  }

  if (!form.isActive) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <ClipboardList size={32} className="text-[#D0D5DD] mx-auto mb-3" />
          <p className="text-[15px] font-bold text-[#101828]">This form is closed</p>
          <p className="text-[13px] text-[#667085] mt-1">This form is no longer accepting responses.</p>
        </div>
      </div>
    )
  }

  if (submitted) {
    const bizName = form.user.businessName ?? form.user.name
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F6FB] p-4">
        <div className="bg-white rounded-2xl shadow-sm p-8 max-w-sm text-center">
          <CheckCircle2 size={40} className="text-[#027A48] mx-auto mb-4" />
          <p className="text-[17px] font-extrabold text-[#101828]">Thank you!</p>
          <p className="text-[13px] text-[#667085] mt-1.5">
            Your response has been submitted to {bizName}. They'll be in touch soon.
          </p>
        </div>
      </div>
    )
  }

  const bizName = form.user.businessName ?? form.user.name

  return (
    <div className="min-h-screen bg-[#F4F6FB] py-10 px-4">
      <div className="max-w-[600px] mx-auto space-y-5">
        {/* Brand header */}
        <div className="flex items-center gap-3 mb-2">
          {form.user.logoUrl ? (
            <img src={form.user.logoUrl} alt={bizName} className="h-9 w-9 rounded-xl object-cover border border-[#EAECF0]" />
          ) : (
            <div className="h-9 w-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center shrink-0">
              <span className="text-[14px] font-bold text-[#6366F1]">
                {bizName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </span>
            </div>
          )}
          <span className="text-[14px] font-bold text-[#344054]">{bizName}</span>
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-6 sm:p-8">
          <h1 className="text-[20px] font-extrabold text-[#101828] tracking-tight">{form.title}</h1>
          {form.description && (
            <p className="text-[13.5px] text-[#667085] mt-1.5 leading-relaxed">{form.description}</p>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {/* Respondent info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-5 border-b border-[#F2F4F7]">
              <div>
                <label className="block text-[12.5px] font-semibold text-[#344054] mb-1.5">Your name</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="form-input w-full"
                />
              </div>
              <div>
                <label className="block text-[12.5px] font-semibold text-[#344054] mb-1.5">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className="form-input w-full"
                />
              </div>
            </div>

            {/* Dynamic fields */}
            {form.fields.map(field => (
              <div key={field.id}>
                <label className="block text-[13px] font-semibold text-[#344054] mb-1.5">
                  {field.label || 'Untitled field'}
                  {field.required && <span className="text-red-500 ml-0.5">*</span>}
                </label>

                {field.type === 'text' && (
                  <input
                    value={(answers[field.id] as string) ?? ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className={cn('form-input w-full', errors[field.id] && 'border-red-400')}
                  />
                )}

                {field.type === 'textarea' && (
                  <textarea
                    value={(answers[field.id] as string) ?? ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    rows={4}
                    className={cn('form-input w-full resize-none', errors[field.id] && 'border-red-400')}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    value={(answers[field.id] as string) ?? ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className={cn('form-input w-full', errors[field.id] && 'border-red-400')}
                  >
                    <option value="">— Select —</option>
                    {(field.options ?? []).map((opt, i) => (
                      <option key={i} value={opt}>{opt}</option>
                    ))}
                  </select>
                )}

                {field.type === 'multiselect' && (
                  <div className="space-y-2">
                    {(field.options ?? []).map((opt, i) => {
                      const selected = ((answers[field.id] as string[]) ?? []).includes(opt)
                      return (
                        <label key={i} className="flex items-center gap-2.5 cursor-pointer group">
                          <span className={cn(
                            'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors shrink-0',
                            selected
                              ? 'bg-[#6366F1] border-[#6366F1]'
                              : 'border-[#D0D5DD] group-hover:border-[#6366F1]',
                          )}>
                            {selected && <svg width="8" height="6" fill="none" viewBox="0 0 8 6"><path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                          </span>
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={selected}
                            onChange={() => toggleMulti(field.id, opt)}
                          />
                          <span className="text-[13px] text-[#344054]">{opt}</span>
                        </label>
                      )
                    })}
                  </div>
                )}

                {field.type === 'date' && (
                  <input
                    type="date"
                    value={(answers[field.id] as string) ?? ''}
                    onChange={e => setAnswer(field.id, e.target.value)}
                    className={cn('form-input w-full', errors[field.id] && 'border-red-400')}
                  />
                )}

                {errors[field.id] && (
                  <p className="text-[11.5px] text-red-500 mt-1">{errors[field.id]}</p>
                )}
              </div>
            ))}

            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[#6366F1] hover:bg-[#4F46E5] text-white text-[14px] font-semibold transition-colors disabled:opacity-60 mt-2"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              {isPending ? 'Submitting…' : 'Submit'}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-[#D0D5DD]">Powered by Clinekt</p>
      </div>
    </div>
  )
}
