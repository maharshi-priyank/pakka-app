import { MessageCircle, MapPin, Share2, CheckCircle2, Globe, Sparkles } from 'lucide-react'
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
    <div className="bg-[#F4F6FB] border-b border-[#EAECF0]">
      <div className="max-w-5xl mx-auto px-5 sm:px-8 py-8 sm:py-10">

        {/* ── Main card ── */}
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-6 sm:gap-8">

            {/* ── Avatar + availability ── */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden ring-4 ring-white shadow-md">
                  {profile.logoUrl ? (
                    <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[32px] sm:text-[40px] font-black text-[#6366F1] leading-none select-none">
                      {initials}
                    </span>
                  )}
                </div>
                <div className="absolute bottom-0.5 right-0.5 w-7 h-7 bg-[#6366F1] rounded-full flex items-center justify-center ring-2 ring-white">
                  <CheckCircle2 size={13} className="text-white" />
                </div>
              </div>

              {/* Availability badge */}
              <div className="flex items-center gap-1.5 bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-[11px] font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
                <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full animate-pulse" />
                Available
              </div>
            </div>

            {/* ── Info ── */}
            <div className="flex-1 min-w-0">

              {/* Name + actions */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                <div>
                  <h1 className="text-[28px] sm:text-[38px] font-black text-[#09090B] leading-[1.1] tracking-tight">
                    {displayName}
                  </h1>
                  {profile.businessName && profile.name !== profile.businessName && (
                    <div className="text-[14px] text-[#71717A] font-medium mt-0.5">{profile.name}</div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {profile.publicWhatsapp && (
                    <a
                      href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-10 px-4 flex items-center gap-2 bg-white text-[#09090B] text-[13px] font-semibold rounded-xl border border-[#EAECF0] hover:border-[#09090B] transition-all shadow-sm cursor-pointer"
                    >
                      <MessageCircle size={14} />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </a>
                  )}
                  <button
                    onClick={onContact}
                    className="h-10 px-5 flex items-center gap-1.5 bg-[#6366F1] text-white text-[13px] font-black rounded-xl hover:bg-[#4F46E5] transition-all cursor-pointer shadow-sm"
                  >
                    Message
                  </button>
                  <button
                    onClick={handleShare}
                    className="h-10 w-10 flex items-center justify-center bg-white text-[#71717A] rounded-xl border border-[#EAECF0] hover:border-[#09090B] hover:text-[#09090B] transition-all shadow-sm cursor-pointer"
                    aria-label="Share profile"
                  >
                    <Share2 size={14} />
                  </button>
                </div>
              </div>

              {/* Meta chips row */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
                <div>
                  <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">Member since</div>
                  <div className="text-[14px] font-bold text-[#09090B]">{memberSince}</div>
                </div>
                {profile.statsProjectsCompleted > 0 && (
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">Projects done</div>
                    <div className="text-[14px] font-bold text-[#09090B]">{profile.statsProjectsCompleted}</div>
                  </div>
                )}
                {profile.statsRepeatClientPct > 0 && (
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">Repeat clients</div>
                    <div className="text-[14px] font-bold text-[#09090B]">{profile.statsRepeatClientPct}%</div>
                  </div>
                )}
                {profile.publicCity && (
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">Location</div>
                    <div className="flex items-center gap-1 text-[14px] font-bold text-[#09090B]">
                      <MapPin size={12} className="text-[#6366F1]" />
                      {profile.publicCity}
                    </div>
                  </div>
                )}
                {profile.publicLanguages.length > 0 && (
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">Languages</div>
                    <div className="flex items-center gap-1 text-[14px] font-bold text-[#09090B]">
                      <Globe size={12} className="text-[#6366F1]" />
                      {profile.publicLanguages.join(' · ')}
                    </div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {profile.publicSkills.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {profile.publicSkills.map((skill) => (
                    <div
                      key={skill}
                      className="flex items-center gap-1.5 bg-[#EEF2FF] border border-[#C7D2FE] text-[#4338CA] text-[12px] font-semibold px-3 py-1.5 rounded-full"
                    >
                      <Sparkles size={10} className="text-[#6366F1]" />
                      {skill}
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
