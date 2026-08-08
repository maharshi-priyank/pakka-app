import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, FileText, FileSignature, Receipt, Check, ArrowRight, X, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDashboardStats } from '../hooks/useDashboard'

const DISMISS_KEY = 'clearwork_onboarding_dismissed'

interface Step {
  key:   'hasContact' | 'hasProposal' | 'hasContract' | 'hasInvoice'
  icon:  React.ElementType
  title: string
  sub:   string
  href:  string
}

const STEPS: Step[] = [
  { key: 'hasContact',  icon: UserPlus,      title: 'Add your first contact',  sub: 'Clients or leads you\'re working with', href: '/contacts' },
  { key: 'hasProposal', icon: FileText,      title: 'Send a proposal',         sub: 'Pitch your scope and pricing',          href: '/proposals/new' },
  { key: 'hasContract', icon: FileSignature, title: 'Create a contract',       sub: 'Get it signed with OTP e-sign',         href: '/contracts/new' },
  { key: 'hasInvoice',  icon: Receipt,       title: 'Send an invoice',         sub: 'Get paid straight to your account',     href: '/invoices/new' },
]

export default function OnboardingChecklist() {
  const navigate = useNavigate()
  const { data: stats } = useDashboardStats()
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === '1')

  if (!stats || stats.hasAnyActivity || dismissed) return null

  const completed = STEPS.filter(s => stats.onboarding[s.key]).length

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, '1')
    setDismissed(true)
  }

  return (
    <div className="rounded-2xl border border-[#E4ECFC] dark:border-[#26283A] bg-gradient-to-br from-[#F5F3FF] to-white dark:from-[#1E2040] dark:to-[#1A1B23] p-5 relative overflow-hidden">
      <button
        onClick={dismiss}
        className="absolute top-3.5 right-3.5 w-7 h-7 rounded-lg flex items-center justify-center text-[#98A2B3] hover:bg-white/60 dark:hover:bg-white/5 hover:text-[#344054] dark:hover:text-[#C2C8D8] transition-colors"
        title="Dismiss"
      >
        <X size={13} strokeWidth={2} />
      </button>

      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={15} className="text-[#6366F1]" />
        <h2 className="text-[15px] font-bold text-[#101828] dark:text-[#ECEEF3]">Welcome to ClearWork</h2>
      </div>
      <p className="text-[12.5px] text-[#667085] dark:text-[#8B92A8] mb-4">
        {completed === 0
          ? 'A few quick steps to get your business running end-to-end.'
          : `${completed} of ${STEPS.length} steps done — keep going.`}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
        {STEPS.map(step => {
          const done = stats.onboarding[step.key]
          const Icon = step.icon
          return (
            <button
              key={step.key}
              onClick={() => navigate(step.href)}
              disabled={done}
              className={cn(
                'flex items-start gap-2.5 p-3 rounded-xl border text-left transition-all group',
                done
                  ? 'bg-[#ECFDF3] dark:bg-emerald-950/30 border-[#D1FAE5] dark:border-emerald-800/40 cursor-default'
                  : 'bg-white dark:bg-[#21222D] border-[#EAECF0] dark:border-[#3D4258] hover:border-[#C7D2FE] hover:shadow-sm',
              )}
            >
              <div className={cn(
                'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                done ? 'bg-[#027A48]' : 'bg-[#EEF2FF] dark:bg-[#1E2040]',
              )}>
                {done
                  ? <Check size={14} className="text-white" strokeWidth={2.5} />
                  : <Icon size={14} className="text-[#6366F1]" strokeWidth={2} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn(
                  'text-[12.5px] font-semibold leading-tight',
                  done ? 'text-[#027A48] dark:text-[#34D399] line-through' : 'text-[#344054] dark:text-[#C2C8D8]',
                )}>
                  {step.title}
                </p>
                <p className="text-[11px] text-[#98A2B3] dark:text-[#545C74] mt-0.5 leading-snug">{step.sub}</p>
              </div>
              {!done && (
                <ArrowRight size={12} className="text-[#D0D5DD] group-hover:text-[#6366F1] group-hover:translate-x-0.5 transition-all shrink-0 mt-1.5" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
