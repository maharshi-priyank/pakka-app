import { useNavigate } from 'react-router-dom'
import { XCircle } from 'lucide-react'

export default function BillingCancelPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-6" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div className="bg-white rounded-2xl border border-[#EAECF0] shadow-sm p-10 max-w-md w-full text-center">

        <div className="w-14 h-14 rounded-full bg-[#F4F5F8] flex items-center justify-center mx-auto mb-5">
          <XCircle size={26} className="text-[#98A2B3]" />
        </div>
        <h1 className="text-[18px] font-bold text-[#101828] mb-2">Checkout cancelled</h1>
        <p className="text-[13px] text-[#667085] mb-6">
          No charge was made. You can upgrade anytime from your settings.
        </p>

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/dashboard', { replace: true })}
            className="flex-1 h-11 bg-[#F4F5F8] text-[#344054] text-[13px] font-semibold rounded-xl hover:bg-[#EAECF0] transition-colors cursor-pointer"
          >
            Back to dashboard
          </button>
          <button
            onClick={() => navigate('/settings?tab=billing', { replace: true })}
            className="flex-1 h-11 bg-[#6366F1] text-white text-[13px] font-semibold rounded-xl hover:bg-[#4F46E5] transition-colors cursor-pointer"
          >
            View plans
          </button>
        </div>

      </div>
    </div>
  )
}
