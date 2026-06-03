import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, UserPlus, FolderKanban, Loader2 } from 'lucide-react'
import { useConvertLeadToClient } from '../hooks/useLeads'
import type { Lead } from '../schemas/lead.schema'

const schema = z.object({
  name:             z.string().min(1, 'Name is required'),
  email:            z.string().email('Invalid email').optional().or(z.literal('')),
  phone:            z.string().optional().or(z.literal('')),
  company:          z.string().optional().or(z.literal('')),
  createProject:    z.boolean(),
  projectName:      z.string().optional(),
  projectBudget:    z.string().optional().or(z.literal('')),
  projectStartDate: z.string().optional().or(z.literal('')),
  projectEndDate:   z.string().optional().or(z.literal('')),
}).superRefine((val, ctx) => {
  if (val.createProject && !val.projectName?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['projectName'], message: 'Project name is required' })
  }
})

type FormValues = z.infer<typeof schema>

interface Props {
  lead:    Lead
  open:    boolean
  onClose: () => void
}

export default function ConvertLeadModal({ lead, open, onClose }: Props) {
  const convertMutation = useConvertLeadToClient()

  const defaultProjectName =
    lead.service?.trim()
    || (lead.company ? `Project for ${lead.company}` : `Project for ${lead.name}`)

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name:          lead.name,
      email:         lead.email   ?? '',
      phone:         lead.phone   ?? '',
      company:       lead.company ?? '',
      createProject: false,
      projectName:   defaultProjectName,
      projectBudget: lead.budget ? String(Math.round(Number(lead.budget))) : '',
    },
  })

  const createProject = watch('createProject')

  function onSubmit(values: FormValues) {
    convertMutation.mutate({
      leadId:           lead.id,
      name:             values.name,
      email:            values.email    || undefined,
      phone:            values.phone    || undefined,
      company:          values.company  || undefined,
      createProject:    values.createProject,
      projectName:      values.createProject ? values.projectName  : undefined,
      projectBudget:    values.createProject && values.projectBudget ? Number(values.projectBudget) : undefined,
      projectStartDate: values.createProject ? values.projectStartDate || undefined : undefined,
      projectEndDate:   values.createProject ? values.projectEndDate   || undefined : undefined,
    }, { onSuccess: onClose })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1A1B26] rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#EAECF0] dark:border-[#26283A] sticky top-0 bg-white dark:bg-[#1A1B26] rounded-t-2xl z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#EFF6FF] dark:bg-[#1E3A5F] flex items-center justify-center">
              <UserPlus size={14} className="text-[#2563EB]" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[#101828] dark:text-[#ECEEF3]">Win lead</p>
              <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74]">Convert {lead.name} to a client</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:text-[#667085] hover:bg-[#F5F6FA] dark:hover:bg-[#21222D] transition-colors">
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-5 space-y-5">

          {/* Client details */}
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#98A2B3] dark:text-[#545C74] mb-3">Client details</p>
            <div className="space-y-3">
              <div>
                <label className="form-label">Name *</label>
                <input {...register('name')} className="form-input w-full" />
                {errors.name && <p className="form-error">{errors.name.message}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Email</label>
                  <input {...register('email')} type="email" className="form-input w-full" />
                  {errors.email && <p className="form-error">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="form-label">Phone</label>
                  <input {...register('phone')} className="form-input w-full" />
                </div>
              </div>
              <div>
                <label className="form-label">Company</label>
                <input {...register('company')} className="form-input w-full" />
              </div>
            </div>
          </div>

          {/* Project toggle */}
          <div className="border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                {...register('createProject')}
                type="checkbox"
                className="w-4 h-4 rounded border-[#D0D5DD] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer"
              />
              <div className="flex items-center gap-2">
                <FolderKanban size={14} className="text-[#667085] dark:text-[#8B92A8]" />
                <span className="text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8]">Create a project for this client</span>
              </div>
            </label>

            {createProject && (
              <div className="space-y-3 pt-1 border-t border-[#F2F4F7] dark:border-[#26283A]">
                <div>
                  <label className="form-label">Project name *</label>
                  <input {...register('projectName')} className="form-input w-full" />
                  {errors.projectName && <p className="form-error">{errors.projectName.message}</p>}
                </div>
                <div>
                  <label className="form-label">Budget (₹)</label>
                  <input {...register('projectBudget')} type="number" min={0} className="form-input w-full" placeholder="Optional" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Start date</label>
                    <input {...register('projectStartDate')} type="date" className="form-input w-full" />
                  </div>
                  <div>
                    <label className="form-label">End date</label>
                    <input {...register('projectEndDate')} type="date" className="form-input w-full" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary text-[13px]">
              Cancel
            </button>
            <button
              type="submit"
              disabled={convertMutation.isPending}
              className="btn-primary flex items-center gap-1.5 text-[13px]"
            >
              {convertMutation.isPending
                ? <><Loader2 size={13} className="animate-spin" /> Converting…</>
                : createProject
                  ? 'Win Lead, Create Client + Project'
                  : 'Win Lead & Create Client'
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
