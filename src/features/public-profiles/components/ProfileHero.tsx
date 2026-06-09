import { MessageCircle, MapPin, Share2, CheckCircle2, Star, Globe } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
  onContact: () => void
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
    month: 'long',
    year: 'numeric',
  })

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: displayName, url: window.location.href })
    } else {
      navigator.clipboard.writeText(window.location.href)
    }
  }

  return (
    <div className="bg-[#F8F7FF] border-b border-[#E4E4E7]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <div className="flex flex-col sm:flex-row gap-8 sm:gap-12">

          {/* ── Left col: avatar + status ── */}
          <div className="flex flex-col items-center sm:items-start gap-3 shrink-0">
            {/* Avatar */}
            <div className="relative">
              <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                {profile.logoUrl ? (
                  <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[36px] sm:text-[44px] font-black text-[#6366F1] leading-none select-none">
                    {initials}
                  </span>
                )}
              </div>
              {/* Verified dot */}
              <div className="absolute bottom-1 right-1 w-8 h-8 bg-[#6366F1] rounded-full flex items-center justify-center border-[3px] border-white shadow-sm">
                <CheckCircle2 size={14} className="text-white" />
              </div>
            </div>

            {/* Availability badge */}
            <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-[12px] font-bold px-3 py-1.5 rounded-full">
              <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse" />
              Available for work
            </div>

            {/* Location */}
            {profile.publicCity && (
              <div className="flex items-center gap-1.5 text-[13px] text-[#71717A] font-medium">
                <MapPin size={14} className="text-[#A1A1AA]" />
                {profile.publicCity}
              </div>
            )}

            {/* Languages */}
            {profile.publicLanguages.length > 0 && (
              <div className="flex items-center gap-1.5 text-[13px] text-[#71717A] font-medium">
                <Globe size={14} className="text-[#A1A1AA]" />
                {profile.publicLanguages.join(' · ')}
              </div>
            )}
          </div>

          {/* ── Right col: name + info ── */}
          <div className="flex-1 min-w-0">
            {/* Name row */}
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
              <h1 className="text-[32px] sm:text-[44px] font-black text-[#09090B] leading-[1.05] tracking-tight">
                {displayName}
              </h1>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 shrink-0">
                {profile.publicWhatsapp && (
                  <a
                    href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 flex items-center gap-2 bg-white text-[#09090B] text-[13px] font-bold rounded-xl border border-[#E4E4E7] hover:border-[#09090B] transition-all shadow-sm cursor-pointer"
                  >
                    <MessageCircle size={15} />
                    WhatsApp
                  </a>
                )}
                <button
                  onClick={onContact}
                  className="h-10 px-5 flex items-center gap-1.5 bg-[#09090B] text-white text-[13px] font-bold rounded-xl hover:bg-[#27272A] transition-all shadow-sm cursor-pointer"
                >
                  Message
                </button>
                <button
                  onClick={handleShare}
                  className="h-10 w-10 flex items-center justify-center bg-white text-[#71717A] rounded-xl border border-[#E4E4E7] hover:border-[#09090B] hover:text-[#09090B] transition-all shadow-sm cursor-pointer"
                  aria-label="Share profile"
                >
                  <Share2 size={15} />
                </button>
              </div>
            </div>

            {/* Role + Member since */}
            <div className="flex flex-wrap gap-x-10 gap-y-3 mb-6">
              {profile.businessName && (
                <div>
                  <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">
                    Business
                  </div>
                  <div className="text-[16px] font-bold text-[#09090B]">
                    {profile.businessName}
                  </div>
                </div>
              )}
              <div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">
                  Member since
                </div>
                <div className="text-[16px] font-bold text-[#09090B]">{memberSince}</div>
              </div>
              {profile.statsProjectsCompleted > 0 && (
                <div>
                  <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">
                    Projects done
                  </div>
                  <div className="text-[16px] font-bold text-[#09090B]">
                    {profile.statsProjectsCompleted}
                  </div>
                </div>
              )}
              {profile.statsRepeatClientPct > 0 && (
                <div>
                  <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">
                    Repeat clients
                  </div>
                  <div className="text-[16px] font-bold text-[#09090B]">
                    {profile.statsRepeatClientPct}%
                  </div>
                </div>
              )}
            </div>

            {/* Skills — "Superpower Skills" */}
            {profile.publicSkills.length > 0 && (
              <div>
                <div className="text-[12px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-2.5">
                  Superpower Skills
                </div>
                <div className="flex flex-wrap gap-2">
                  {profile.publicSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1.5 bg-white border border-[#E4E4E7] text-[#09090B] text-[13px] font-semibold px-3.5 py-2 rounded-full hover:border-[#09090B] transition-all"
                    >
                      <Star size={11} className="text-[#A1A1AA]" />
                      {skill}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
