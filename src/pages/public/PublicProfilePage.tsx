import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Search, MessageCircle } from 'lucide-react'
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
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#09090B] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (isError || !profile) {
    return (
      <div className="min-h-dvh bg-white flex flex-col items-center justify-center gap-6 px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-[#F4F4F5] flex items-center justify-center">
          <Search size={28} className="text-[#A1A1AA]" />
        </div>
        <div>
          <div className="text-[20px] font-black text-[#09090B] mb-2 tracking-tight">
            Profile not found
          </div>
          <div className="text-[14px] text-[#71717A] max-w-sm leading-relaxed">
            This profile doesn't exist or the freelancer has made it private.
          </div>
        </div>
        <a
          href="https://clearwork.in"
          className="text-[14px] text-[#6366F1] font-bold hover:underline cursor-pointer"
        >
          Discover freelancers on ClearWork →
        </a>
      </div>
    )
  }

  return (
    <div className="min-h-dvh bg-white" style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>

      {/* Hero */}
      <ProfileHero profile={profile} onContact={() => setContactOpen(true)} />

      {/* All sections — single scrollable page */}
      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        <ProfileMain profile={profile} onContact={() => setContactOpen(true)} />
      </div>

      {/* Footer */}
      <div className="border-t border-[#F4F4F5]">
        <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 flex items-center justify-between">
          <div className="text-[12px] text-[#D4D4D8]">
            Powered by{' '}
            <a
              href="https://clearwork.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#6366F1] font-bold hover:underline cursor-pointer"
            >
              ClearWork
            </a>
          </div>
          <div className="text-[12px] text-[#D4D4D8]">India's platform for freelancers</div>
        </div>
      </div>

      {/* Mobile sticky CTA */}
      <div className="fixed bottom-0 inset-x-0 z-40 sm:hidden bg-white/95 backdrop-blur border-t border-[#E4E4E7] px-4 py-3">
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
            className="flex-1 h-12 bg-[#09090B] text-white text-[14px] font-black rounded-xl hover:bg-[#27272A] transition-all cursor-pointer"
          >
            Send a message
          </button>
        </div>
      </div>
      <div className="h-20 sm:hidden" />

      <ContactModal
        profile={profile}
        open={contactOpen}
        onClose={() => setContactOpen(false)}
      />
    </div>
  )
}
