import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { MessageCircle, Share2, Lock, AlertCircle } from 'lucide-react'
import { usePublicProfile } from '@/features/public-profiles/hooks/usePublicProfile'
import ProfileHero from '@/features/public-profiles/components/ProfileHero'
import ProfileMain from '@/features/public-profiles/components/ProfileMain'
import ContactModal from '@/features/public-profiles/components/ContactModal'

export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>()
  const { data: profile, isLoading, isError } = usePublicProfile(username ?? '')
  const [contactOpen, setContactOpen] = useState(false)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen bg-[#F5F6FA] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={40} className="mx-auto text-[#D0D5DD] mb-3" />
          <p className="text-[16px] font-bold text-[#344054]">Profile not found</p>
          <p className="text-[13px] text-[#98A2B3] mt-1">
            This profile doesn't exist or the freelancer has made it private.
          </p>
          <a href="https://clearwork.in" className="text-[13px] text-[#6366F1] font-semibold hover:underline mt-3 inline-block">
            Discover freelancers on ClearWork →
          </a>
        </div>
      </div>
    )
  }

  const displayName = profile.businessName ?? profile.name
  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: displayName, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="min-h-screen bg-[#F5F6FA]" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* ── Top nav bar (mirrors invoice brand bar) ── */}
      <div className="bg-white border-b border-[#EAECF0] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={displayName} className="h-8 w-8 rounded-lg object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[#6366F1] flex items-center justify-center text-white text-[13px] font-bold shrink-0">
                {initials}
              </div>
            )}
            <span className="text-[14px] font-bold text-[#101828]">{displayName}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setContactOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#6366F1] text-white text-[12px] font-semibold hover:bg-[#4F46E5] transition-colors cursor-pointer"
            >
              <MessageCircle size={12} strokeWidth={2} />
              Message
            </button>
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8EBF2] text-[12px] text-[#667085] hover:bg-[#F5F6FA] hover:text-[#344054] transition-colors cursor-pointer"
              aria-label="Share profile"
            >
              <Share2 size={12} strokeWidth={2} />
              Share
            </button>
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#667085]">
              <Lock size={11} strokeWidth={2} />
              Secured by ClearWork
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-4">
        <ProfileHero profile={profile} />
        <ProfileMain profile={profile} onContact={() => setContactOpen(true)} />
      </div>

      {/* ── Footer ── */}
      <div className="max-w-3xl mx-auto px-6 pb-10 flex items-center justify-between">
        <span className="text-[12px] text-[#D0D5DD]">
          Powered by{' '}
          <a href="https://clearwork.in" target="_blank" rel="noopener noreferrer" className="text-[#6366F1] font-semibold hover:underline">
            ClearWork
          </a>
        </span>
        <span className="text-[12px] text-[#D0D5DD]">India's platform for freelancers</span>
      </div>

      {/* ── Mobile sticky CTA ── */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 backdrop-blur border-t border-[#EAECF0] px-4 py-3">
        <div className="flex gap-2">
          {profile.publicWhatsapp && (
            <a
              href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-12 w-12 flex items-center justify-center bg-[#F0FDF4] text-[#16A34A] rounded-xl border border-[#BBF7D0] cursor-pointer shrink-0"
              aria-label="WhatsApp"
            >
              <MessageCircle size={18} />
            </a>
          )}
          <button
            onClick={() => setContactOpen(true)}
            className="flex-1 h-12 bg-[#6366F1] text-white text-[14px] font-bold rounded-xl hover:bg-[#4F46E5] transition-all cursor-pointer"
          >
            Send a message
          </button>
        </div>
      </div>
      <div className="h-20 sm:hidden" />

      <ContactModal profile={profile} open={contactOpen} onClose={() => setContactOpen(false)} />
    </div>
  )
}
