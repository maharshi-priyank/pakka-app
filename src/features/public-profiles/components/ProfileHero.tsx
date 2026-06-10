import { CheckCircle2, Sparkles } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
}

export default function ProfileHero({ profile }: Props) {
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

  return (
    <div className="bg-white border border-[#EAECF0] rounded-2xl p-6">

      {/* ── Top row: avatar + name + status ── */}
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-xl bg-[#EEF2FF] flex items-center justify-center overflow-hidden">
            {profile.logoUrl ? (
              <img src={profile.logoUrl} alt={displayName} className="w-full h-full object-cover" />
            ) : (
              <span className="text-[20px] font-black text-[#6366F1] leading-none select-none">{initials}</span>
            )}
          </div>
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#6366F1] rounded-full flex items-center justify-center ring-2 ring-white">
            <CheckCircle2 size={10} className="text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-[20px] font-bold text-[#101828] leading-snug tracking-tight truncate">{displayName}</h1>
              {profile.businessName && profile.name !== profile.businessName && (
                <p className="text-[13px] text-[#667085] mt-0.5 truncate">{profile.name}</p>
              )}
            </div>
            <div className="flex items-center gap-1.5 bg-[#ECFDF3] border border-[#ABEFC6] text-[#067647] text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0">
              <div className="w-1.5 h-1.5 bg-[#17B26A] rounded-full animate-pulse" />
              Available
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="border-t border-[#EAECF0] my-5" />

      {/* ── Meta grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-1">Member since</p>
          <p className="text-[14px] font-semibold text-[#344054]">{memberSince}</p>
        </div>
        {profile.statsProjectsCompleted > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-1">Projects done</p>
            <p className="text-[14px] font-semibold text-[#344054]">{profile.statsProjectsCompleted}</p>
          </div>
        )}
        {profile.statsRepeatClientPct > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-1">Repeat clients</p>
            <p className="text-[14px] font-semibold text-[#344054]">{profile.statsRepeatClientPct}%</p>
          </div>
        )}
        {profile.publicCity && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-1">Location</p>
            <p className="text-[14px] font-semibold text-[#344054]">{profile.publicCity}</p>
          </div>
        )}
        {profile.publicLanguages.length > 0 && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-1">Languages</p>
            <p className="text-[14px] font-semibold text-[#344054]">{profile.publicLanguages.join(' · ')}</p>
          </div>
        )}
      </div>

      {/* ── Skills ── */}
      {profile.publicSkills.length > 0 && (
        <>
          <div className="border-t border-[#EAECF0] my-5" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-3">Skills</p>
            <div className="flex flex-wrap gap-2">
              {profile.publicSkills.map((skill) => (
                <span
                  key={skill}
                  className="flex items-center gap-1.5 bg-[#F5F6FA] border border-[#EAECF0] text-[#344054] text-[12px] font-semibold px-3 py-1.5 rounded-full"
                >
                  <Sparkles size={10} className="text-[#6366F1]" />
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
