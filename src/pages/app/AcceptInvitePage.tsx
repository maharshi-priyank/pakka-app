import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { useAcceptInvite } from '@/features/team/hooks/useTeam'

export default function AcceptInvitePage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const { mutate: accept } = useAcceptInvite()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('Invalid or missing invite link.')
      return
    }
    accept(token, {
      onSuccess: () => setStatus('success'),
      onError: (err: unknown) => {
        setStatus('error')
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        setMessage(msg ?? 'Could not accept invite.')
      },
    })
  }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-10 max-w-sm w-full text-center">
        {status === 'loading' && (
          <>
            <Loader2 size={32} className="animate-spin text-[#6366F1] mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-[#101828]">Accepting invite…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-[#027A48]" />
            </div>
            <h1 className="text-[16px] font-bold text-[#101828] mb-1">You've joined the workspace</h1>
            <p className="text-[13px] text-[#667085] mb-6">You now have access to your team's ClearWork workspace.</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-10 rounded-xl bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} className="text-[#D92D20]" />
            </div>
            <h1 className="text-[16px] font-bold text-[#101828] mb-1">Invite could not be accepted</h1>
            <p className="text-[13px] text-[#667085] mb-6">{message}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-10 rounded-xl border border-[#D0D5DD] text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}
      </div>
    </div>
  )
}
