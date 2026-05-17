import { cn, formatRelativeTime } from '@/lib/utils'
import type { AutomationRule } from '../hooks/useAutomations'

interface Props {
  rule:     AutomationRule
  onToggle: (id: string, isActive: boolean) => void
  loading?: boolean
}

const ACTION_LABEL: Record<string, string> = {
  'send_email.client':  'Email → Client',
  'send_email.user':    'Email → You',
  'send_email.digest':  'Digest Email → You',
  'create.contract':    'Auto-create contract',
  'create.invoice':     'Auto-create invoice',
}

export default function AutomationCard({ rule, onToggle, loading }: Props) {
  return (
    <div className={cn(
      'flex items-start gap-4 px-5 py-4 hover:bg-[#FAFBFF] transition-colors',
      !rule.isActive && 'opacity-60',
    )}>
      {/* Toggle */}
      <button
        role="switch"
        aria-checked={rule.isActive}
        disabled={loading}
        onClick={() => onToggle(rule.id, !rule.isActive)}
        className={cn(
          'relative mt-0.5 inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
          rule.isActive ? 'bg-[#2563EB]' : 'bg-[#D0D5DD]',
          loading && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn(
          'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200',
          rule.isActive ? 'translate-x-4' : 'translate-x-0',
        )} />
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13.5px] font-semibold text-[#101828]">{rule.name}</p>
          <span className="text-[11px] font-medium text-[#667085] bg-[#F2F4F7] px-2 py-0.5 rounded-full">
            {ACTION_LABEL[rule.actionType] ?? rule.actionType}
          </span>
        </div>
        {rule.description && (
          <p className="text-[12px] text-[#667085] mt-0.5 leading-relaxed">{rule.description}</p>
        )}
        <div className="flex items-center gap-3 mt-1.5">
          {rule.lastRunAt ? (
            <span className="text-[11px] text-[#98A2B3]">
              Last ran {formatRelativeTime(rule.lastRunAt)}
            </span>
          ) : (
            <span className="text-[11px] text-[#98A2B3]">Never ran</span>
          )}
          {rule.runCount > 0 && (
            <span className="text-[11px] text-[#98A2B3]">· {rule.runCount} run{rule.runCount !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>
    </div>
  )
}
