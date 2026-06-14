import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { CheckCircle2, AlertCircle, Loader2, Users } from 'lucide-react'
import { useAcceptInvite, useInvitePreview } from '@/features/team/hooks/useTeam'
import { useAuthStore } from '@/store/authStore'

export default function AcceptInvitePage() {
  const [params]   = useSearchParams()
  const navigate   = useNavigate()
  const token      = params.get('token') ?? ''

  const { session, isLoading: authLoading } = useAuthStore()
  const { mutate: accept } = useAcceptInvite()
  const { data: preview, error: previewError } = useInvitePreview(token)

  const [status,  setStatus]  = useState<'loading' | 'unauthenticated' | 'accepting' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  // Resolve state once auth is known
  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Invalid or missing invite link.'); return }
    if (authLoading) return

    if (!session) {
      setStatus('unauthenticated')
      return
    }

    // Logged in → accept
    setStatus('accepting')
    accept(token, {
      onSuccess: () => setStatus('success'),
      onError: (err: unknown) => {
        setStatus('error')
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? (err as Error)?.message
        setMessage(msg ?? 'Could not accept invite.')
      },
    })
  }, [token, authLoading, session]) // eslint-disable-line react-hooks/exhaustive-deps

  const loginUrl    = `/login?invite=${encodeURIComponent(token)}`
  const signupUrl   = `/signup?invite=${encodeURIComponent(token)}`

  const senderName  = preview?.senderName ?? 'your team'
  const previewFailed = !!previewError

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-10 max-w-sm w-full text-center">

        {/* Loading auth */}
        {(status === 'loading' || status === 'accepting') && (
          <>
            <Loader2 size={32} className="animate-spin text-[#6366F1] mx-auto mb-4" />
            <p className="text-[14px] font-semibold text-[#101828]">
              {status === 'accepting' ? 'Joining workspace…' : 'Loading…'}
            </p>
          </>
        )}

        {/* Not logged in — show invite context */}
        {status === 'unauthenticated' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <Users size={22} className="text-[#6366F1]" />
            </div>
            {previewFailed ? (
              <>
                <h1 className="text-[16px] font-bold text-[#101828] mb-1">Invite link</h1>
                <p className="text-[13px] text-[#667085] mb-6">
                  Sign in or create an account to accept this workspace invite.
                </p>
              </>
            ) : (
              <>
                <h1 className="text-[16px] font-bold text-[#101828] mb-1">
                  {preview ? `Join ${senderName}'s workspace` : "You've been invited"}
                </h1>
                <p className="text-[13px] text-[#667085] mb-6">
                  {preview
                    ? `${senderName} has invited you to collaborate on ClearWork. Sign in or create a free account to accept.`
                    : 'Sign in or create a free account to accept this invite.'}
                </p>
              </>
            )}
            <div className="space-y-3">
              <Link
                to={signupUrl}
                className="flex items-center justify-center w-full h-10 rounded-xl bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold transition-colors"
              >
                Create free account
              </Link>
              <Link
                to={loginUrl}
                className="flex items-center justify-center w-full h-10 rounded-xl border border-[#D0D5DD] text-[13px] font-semibold text-[#344054] hover:bg-[#F9FAFB] transition-colors"
              >
                Sign in to existing account
              </Link>
            </div>
          </>
        )}

        {/* Success */}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 rounded-2xl bg-[#ECFDF3] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={24} className="text-[#027A48]" />
            </div>
            <h1 className="text-[16px] font-bold text-[#101828] mb-1">You've joined the workspace</h1>
            <p className="text-[13px] text-[#667085] mb-6">
              You now have access to {senderName}'s ClearWork workspace.
            </p>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full h-10 rounded-xl bg-[#6366F1] hover:bg-[#5558E8] text-white text-[13px] font-semibold transition-colors"
            >
              Go to dashboard
            </button>
          </>
        )}

        {/* Error */}
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
