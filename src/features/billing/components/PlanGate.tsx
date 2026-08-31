import { useNavigate } from 'react-router-dom'
import { Lock, Sparkles, Check } from 'lucide-react'
import { useProfile } from '@/features/settings/hooks/useProfile'

// DB enum uses SOLO; landing page / user-facing name is "Pro"
type Plan = 'FREE' | 'SOLO' | 'STUDIO'

const PLAN_RANK: Record<Plan, number> = { FREE: 0, SOLO: 1, STUDIO: 2 }

const PLAN_LABEL: Record<Plan, string> = { FREE: 'Free', SOLO: 'Pro', STUDIO: 'Studio' }

function meetsRequirement(current: Plan, required: Plan) {
  return PLAN_RANK[current] >= PLAN_RANK[required]
}

interface PlanGateProps {
  requiredPlan: Plan
  feature: string
  description: string
  bullets?: string[]
  children: React.ReactNode
}

export default function PlanGate({
  requiredPlan,
  feature,
  description,
  bullets = [],
  children,
}: PlanGateProps) {
  const navigate       = useNavigate()
  const { data: profile, isPending } = useProfile()

  if (isPending) return null

  const currentPlan = (profile?.plan ?? 'FREE') as Plan

  if (meetsRequirement(currentPlan, requiredPlan)) return <>{children}</>

  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-sm mx-auto">
      {/* Lock badge */}
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#6366F1] to-[#8B5CF6] flex items-center justify-center mb-5 shadow-lg shadow-[#6366F1]/25">
        <Lock size={22} className="text-white" />
      </div>

      {/* Heading */}
      <h3 className="text-[16px] font-bold text-[#101828] dark:text-[#ECEEF3] mb-2">{feature}</h3>
      <p className="text-[13px] text-[#667085] dark:text-[#8B92A8] leading-relaxed mb-5">{description}</p>

      {/* Bullets */}
      {bullets.length > 0 && (
        <div className="w-full bg-[#F9FAFB] dark:bg-[#1C1E2D] border border-[#EAECF0] dark:border-[#26283A] rounded-xl p-4 mb-5 text-left space-y-2">
          {bullets.map(b => (
            <div key={b} className="flex items-start gap-2">
              <div className="w-4 h-4 rounded-full bg-[#DCFCE7] flex items-center justify-center mt-0.5 shrink-0">
                <Check size={9} strokeWidth={3} className="text-[#16A34A]" />
              </div>
              <span className="text-[12.5px] text-[#344054] dark:text-[#C1C5D6]">{b}</span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => navigate('/billing')}
        className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#6366F1] to-[#8B5CF6] hover:from-[#5558E8] hover:to-[#7C3AED] text-white text-[13px] font-semibold flex items-center gap-2 shadow-md shadow-[#6366F1]/20 transition-all"
      >
        <Sparkles size={14} />
        Upgrade to {PLAN_LABEL[requiredPlan]}
      </button>

      <p className="text-[11.5px] text-[#98A2B3] mt-3">
        You're on the <span className="font-semibold text-[#667085] dark:text-[#8B92A8]">{PLAN_LABEL[currentPlan]}</span> plan
      </p>
    </div>
  )
}
