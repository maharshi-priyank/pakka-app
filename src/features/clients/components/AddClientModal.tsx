import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { X, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCreateClient } from '../hooks/useClients'

const schema = z.object({
  name:       z.string().min(1, 'Name is required'),
  email:      z.string().email('Invalid email').optional().or(z.literal('')),
  phone:      z.string().optional(),
  company:    z.string().optional(),
  gstNumber:  z.string().optional(),
  state:      z.string().optional(),
})

type FormValues = z.infer<typeof schema>

interface Props {
  onClose: () => void
}

export default function AddClientModal({ onClose }: Props) {
  const { mutateAsync: createClient, isPending } = useCreateClient()

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  })

  const onSubmit = async (values: FormValues) => {
    await createClient({
      name:      values.name,
      email:     values.email     || undefined,
      phone:     values.phone     || undefined,
      company:   values.company   || undefined,
      gstNumber: values.gstNumber || undefined,
      state:     values.state     || undefined,
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-4 anim-fade">
      <div className="bg-white dark:bg-[#13141A] rounded-2xl shadow-xl w-full max-w-lg anim-modal-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EAECF0] dark:border-[#26283A]">
          <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Add Client</h2>
          <button onClick={onClose} className="text-[#98A2B3] dark:text-[#545C74] hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name" error={errors.name?.message} required>
              <input {...register('name')} placeholder="Ravi Mehta" className={cn('form-input w-full', errors.name && 'border-red-400')} />
            </Field>
            <Field label="Company">
              <input {...register('company')} placeholder="Mehta Designs" className="form-input w-full" />
            </Field>
            <Field label="Email" error={errors.email?.message}>
              <input {...register('email')} type="email" placeholder="ravi@example.com" className={cn('form-input w-full', errors.email && 'border-red-400')} />
            </Field>
            <Field label="Phone">
              <input {...register('phone')} placeholder="+91 98765 43210" className="form-input w-full" />
            </Field>
            <Field label="GST Number">
              <input
                {...register('gstNumber')}
                placeholder="22AAAAA0000A1Z5"
                className="form-input w-full font-mono text-[13px] tracking-wide uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase()
                  register('gstNumber').onChange(e)
                }}
              />
            </Field>
            <Field label="State">
              <input {...register('state')} placeholder="Gujarat" className="form-input w-full" />
            </Field>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-semibold text-[#344054] dark:text-[#C2C8D8] hover:bg-[#F9FAFB] dark:hover:bg-[#21222D] rounded-lg transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex items-center gap-2 px-5 py-2 bg-[#0D1117] dark:bg-[#6366F1] text-white hover:bg-[#1a1d2e] dark:hover:bg-[#4F46E5] transition-colors disabled:opacity-60"
            >
              {isPending && <Loader2 size={13} className="animate-spin" />}
              {isPending ? 'Adding…' : 'Add Client'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({ label, error, required, children }: { label: string; error?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[12.5px] font-semibold text-[#344054] dark:text-[#C2C8D8]">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  )
}
