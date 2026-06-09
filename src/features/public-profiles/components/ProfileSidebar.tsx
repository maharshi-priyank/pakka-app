import * as Icons from 'lucide-react'
import { Clock, MessageCircle, CheckCircle2 } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { PublicProfileData } from '../hooks/usePublicProfile'

function ServiceIcon({ name, size = 14 }: { name: string; size?: number }) {
  const Icon = (Icons as Record<string, React.ComponentType<LucideProps>>)[name]
  return Icon ? (
    <Icon size={size} className="text-[#6366F1]" />
  ) : (
    <Icons.Briefcase size={size} className="text-[#6366F1]" />
  )
}

interface Props {
  profile: PublicProfileData
  onContact: () => void
}

function formatPrice(amount: number): string {
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}k`
  return `₹${amount}`
}

export default function ProfileSidebar({ profile, onContact }: Props) {
  const responseLabel =
    profile.statsAvgResponseHrs < 2
      ? '< 2 hrs'
      : profile.statsAvgResponseHrs < 24
        ? `~${profile.statsAvgResponseHrs} hrs`
        : `~${Math.round(profile.statsAvgResponseHrs / 24)} days`

  return (
    <div className="flex flex-col gap-3">

      {/* Services */}
      {profile.publicServices.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F2F4F7] text-[9px] font-bold text-[#344054] tracking-wide uppercase">
            Services
          </div>
          <div className="p-3 flex flex-col gap-3">
            {profile.publicServices.map((svc, i) => (
              <div key={svc.id} className={i > 0 ? 'border-t border-[#F2F4F7] pt-3' : ''}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-[22px] h-[22px] rounded-md bg-[#EEF2FF] flex items-center justify-center">
                    <ServiceIcon name={svc.icon} size={12} />
                  </div>
                  <div className="text-[10px] font-bold text-[#101828]">{svc.name}</div>
                </div>
                <div className="text-[9px] text-[#667085] leading-relaxed mb-2">
                  {svc.description}
                </div>
                {svc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {svc.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#F2F4F7] text-[#667085] px-1.5 py-0.5 rounded-md text-[8px]"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[8px] text-[#98A2B3]">From</div>
                    <div className="text-[11px] font-extrabold text-[#101828]">
                      {formatPrice(svc.priceFrom)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-[8px] text-[#667085]">
                    <Clock size={8} />
                    {svc.deliveryDays}d
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verified Stats */}
      <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
        <div className="px-3 py-2 border-b border-[#F2F4F7] flex items-center justify-between">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase">
            Verified Stats
          </div>
          <div className="flex items-center gap-1 text-[7px] text-[#6366F1] font-semibold bg-[#EEF2FF] px-1.5 py-0.5 rounded-md">
            <CheckCircle2 size={8} />
            ClearWork
          </div>
        </div>
        <div className="grid grid-cols-2">
          <div className="p-2.5 border-r border-b border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsProjectsCompleted}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Projects done</div>
          </div>
          <div className="p-2.5 border-b border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsTotalEarned > 0
                ? profile.statsTotalEarned >= 1_00_000
                  ? `₹${Math.floor(profile.statsTotalEarned / 1_00_000)}L+`
                  : `₹${Math.floor(profile.statsTotalEarned / 1_000)}k+`
                : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Total earned</div>
          </div>
          <div className="p-2.5 border-r border-[#F2F4F7]">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsRepeatClientPct > 0 ? `${profile.statsRepeatClientPct}%` : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Repeat clients</div>
          </div>
          <div className="p-2.5">
            <div className="text-[14px] font-extrabold text-[#101828]">
              {profile.statsAvgResponseHrs > 0 ? responseLabel : '—'}
            </div>
            <div className="text-[8px] text-[#667085] mt-0.5">Avg response</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      {profile.publicSkills.length > 0 && (
        <div className="bg-white rounded-xl border border-[#EAECF0] p-3">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase mb-2">
            Skills
          </div>
          <div className="flex flex-wrap gap-1.5">
            {profile.publicSkills.map((skill) => (
              <span
                key={skill}
                className="bg-[#EEF2FF] text-[#6366F1] px-2 py-0.5 rounded-lg text-[8px] font-semibold"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Contact CTA */}
      <div className="bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF] rounded-xl border border-[#C7D2FE] p-3">
        <div className="text-[10px] font-bold text-[#4338CA] mb-1">
          Work with {(profile.businessName ?? profile.name).split(' ')[0]}
        </div>
        {profile.statsAvgResponseHrs > 0 && (
          <div className="text-[8px] text-[#6366F1] mb-2">
            Usually responds in {responseLabel}
          </div>
        )}
        <button
          onClick={onContact}
          className="w-full bg-[#6366F1] text-white text-[10px] font-bold py-2 rounded-lg mb-2 hover:bg-[#4F46E5] transition-colors"
        >
          Get in touch →
        </button>
        <div className="flex items-center gap-1.5 mb-2">
          <div className="flex-1 h-px bg-[#C7D2FE]" />
          <div className="text-[7px] text-[#818CF8]">or</div>
          <div className="flex-1 h-px bg-[#C7D2FE]" />
        </div>
        {profile.publicWhatsapp ? (
          <a
            href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-1.5 bg-white text-[#16A34A] text-[9px] font-semibold py-1.5 rounded-lg border-[1.5px] border-[#86EFAC] hover:bg-[#F0FDF4] transition-colors"
          >
            <MessageCircle size={12} />
            Chat on WhatsApp
          </a>
        ) : (
          <button
            onClick={onContact}
            className="w-full bg-white text-[#667085] text-[9px] font-semibold py-1.5 rounded-lg border border-[#EAECF0]"
          >
            Send a message
          </button>
        )}
      </div>

    </div>
  )
}
