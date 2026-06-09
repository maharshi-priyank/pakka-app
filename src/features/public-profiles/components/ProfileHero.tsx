import { MessageCircle } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
  onContact: () => void
}

function formatEarned(amount: number): string {
  if (amount >= 10_00_000) return `₹${(amount / 10_00_000).toFixed(1)}Cr+`
  if (amount >= 1_00_000) return `₹${Math.floor(amount / 1_00_000)}L+`
  if (amount >= 1_000) return `₹${Math.floor(amount / 1_000)}k+`
  return `₹${amount}`
}

export default function ProfileHero({ profile, onContact }: Props) {
  const displayName = profile.businessName ?? profile.name
  const initials = displayName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="bg-white border-b border-[#EAECF0]">
      {/* Cover banner */}
      <div className="h-[72px] bg-gradient-to-r from-[#4338CA] via-[#6366F1] to-[#818CF8]" />

      <div className="px-5 pb-5">
        {/* Avatar row */}
        <div className="flex items-end justify-between -mt-6 mb-3">
          <div className="w-[52px] h-[52px] rounded-full border-[3px] border-white shadow-sm bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[18px] font-bold text-[#6366F1]">{initials}</span>
            )}
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={onContact}
              className="bg-[#6366F1] text-white text-[11px] font-bold px-4 py-2 rounded-lg hover:bg-[#4F46E5] transition-colors"
            >
              Get in touch
            </button>
            {profile.publicWhatsapp && (
              <a
                href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white text-[#16A34A] p-2 rounded-lg border-[1.5px] border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors flex items-center justify-center"
                aria-label="Chat on WhatsApp"
              >
                <MessageCircle size={14} />
              </a>
            )}
          </div>
        </div>

        {/* Name + tagline */}
        <div className="text-[15px] font-bold text-[#101828] mb-0.5">{displayName}</div>
        <div className="text-[11px] text-[#667085] mb-2">
          {profile.publicBio ? profile.publicBio.split('.')[0] : 'Freelancer on ClearWork'}
          {profile.publicCity && ` · ${profile.publicCity}`}
        </div>

        {/* Bio */}
        {profile.publicBio && (
          <p className="text-[10px] text-[#475569] leading-relaxed mb-3 max-w-md">
            {profile.publicBio}
          </p>
        )}

        {/* Stats row */}
        <div className="flex gap-5">
          <div>
            <div className="text-[15px] font-extrabold text-[#101828]">
              {profile.statsProjectsCompleted}
            </div>
            <div className="text-[9px] text-[#98A2B3]">Projects</div>
          </div>
          {profile.statsTotalEarned > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">
                {formatEarned(profile.statsTotalEarned)}
              </div>
              <div className="text-[9px] text-[#98A2B3]">Earned</div>
            </div>
          )}
          {profile.statsRepeatClientPct > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">
                {profile.statsRepeatClientPct}%
              </div>
              <div className="text-[9px] text-[#98A2B3]">Repeat clients</div>
            </div>
          )}
          {profile.statsAcceptanceRate > 0 && (
            <div>
              <div className="text-[15px] font-extrabold text-[#101828]">
                {profile.statsAcceptanceRate}%
              </div>
              <div className="text-[9px] text-[#98A2B3]">Acceptance rate</div>
            </div>
          )}
          <div>
            <div className="text-[15px] font-extrabold text-[#101828]">{memberSince}</div>
            <div className="text-[9px] text-[#98A2B3]">Member since</div>
          </div>
        </div>
      </div>
    </div>
  )
}
