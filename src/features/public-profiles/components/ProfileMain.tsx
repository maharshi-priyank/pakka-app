import * as Icons from 'lucide-react'
import {
  MapPin,
  Calendar,
  Globe,
  CheckCircle2,
  TrendingUp,
  Users,
  Zap,
  Award,
  Clock,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react'

import type { PublicProfileData, PublicPortfolioItem } from '../hooks/usePublicProfile'

// ─── helpers ──────────────────────────────────────────────────────────────────

type SimpleIcon = React.ComponentType<{ size?: number; className?: string }>

function ServiceIcon({ name }: { name: string }) {
  const Icon = (Icons as unknown as Record<string, SimpleIcon>)[name]
  return Icon ? (
    <Icon size={16} className="text-[#6366F1]" />
  ) : (
    <Icons.Briefcase size={16} className="text-[#6366F1]" />
  )
}

function formatPrice(n: number): string {
  if (n >= 1_00_000) return `₹${(n / 1_00_000).toFixed(1)}L`
  if (n >= 1_000) return `₹${(n / 1_000).toFixed(0)}k`
  return `₹${n}`
}

function formatEarned(n: number): string {
  if (n >= 1_00_000) return `₹${Math.floor(n / 1_00_000)}L+`
  if (n >= 1_000) return `₹${Math.floor(n / 1_000)}k+`
  return `₹${n}`
}

// ─── shared section row ───────────────────────────────────────────────────────

function SectionRow({
  label,
  sub,
  children,
}: {
  label: React.ReactNode
  sub?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="border-t border-[#F4F4F5] py-8 sm:py-10 grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-5 sm:gap-12 items-start">
      <div className="shrink-0">
        <div className="text-[20px] sm:text-[22px] font-black text-[#09090B] leading-tight">
          {label}
        </div>
        {sub && <div className="mt-1">{sub}</div>}
      </div>
      <div>{children}</div>
    </div>
  )
}

// ─── portfolio card ────────────────────────────────────────────────────────────

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  return (
    <div className="bg-white rounded-xl border border-[#E4E4E7] overflow-hidden hover:border-[#09090B] transition-all group">
      <div className="h-[148px] bg-[#F4F4F5] relative overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]">
            <span className="text-[#A5B4FC] text-[12px] font-semibold">No preview</span>
          </div>
        )}
        {item.category && (
          <div className="absolute top-2.5 left-2.5 bg-white/95 text-[#09090B] text-[11px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
            {item.category}
          </div>
        )}
        {item.liveUrl && (
          <a
            href={item.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2.5 right-2.5 bg-[#09090B] text-white text-[10px] font-bold px-2 py-0.5 rounded-lg flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            View <ArrowUpRight size={10} />
          </a>
        )}
      </div>
      <div className="p-3.5">
        <div className="text-[13px] font-black text-[#09090B] mb-1 leading-snug">{item.title}</div>
        {item.outcome && (
          <div className="text-[12px] text-[#71717A] leading-relaxed mb-2">{item.outcome}</div>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="bg-[#EEF2FF] text-[#4F46E5] px-2 py-0.5 rounded-md text-[10px] font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

interface Props {
  profile: PublicProfileData
  onContact: () => void
}

export default function ProfileMain({ profile, onContact }: Props) {
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  })

  const hasStats =
    profile.statsProjectsCompleted > 0 ||
    profile.statsTotalEarned > 0 ||
    profile.statsRepeatClientPct > 0 ||
    profile.statsAcceptanceRate > 0

  const responseLabel =
    profile.statsAvgResponseHrs < 2
      ? '< 2 hrs'
      : profile.statsAvgResponseHrs < 24
        ? `~${profile.statsAvgResponseHrs} hrs`
        : `~${Math.round(profile.statsAvgResponseHrs / 24)} days`

  return (
    <div className="pb-8">

      {/* ── My Story ── */}
      {profile.publicBio && (
        <SectionRow label="My Story">
          <div className="space-y-3">
            {profile.publicBio
              .split('\n')
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-[15px] text-[#3F3F46] leading-[1.75]">
                  {para}
                </p>
              ))}
          </div>
        </SectionRow>
      )}

      {/* ── About ── */}
      <SectionRow label="About">
        <div className="flex flex-wrap gap-2">
          {profile.publicCity && (
            <span className="flex items-center gap-1.5 bg-[#F4F4F5] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full">
              <MapPin size={13} className="text-[#6366F1]" />
              {profile.publicCity}
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-[#F4F4F5] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full">
            <Calendar size={13} className="text-[#6366F1]" />
            On ClearWork since {memberSince}
          </span>
          {profile.publicLanguages.length > 0 && (
            <span className="flex items-center gap-1.5 bg-[#F4F4F5] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full">
              <Globe size={13} className="text-[#6366F1]" />
              {profile.publicLanguages.join(' · ')}
            </span>
          )}
        </div>
      </SectionRow>

      {/* ── Verified Stats ── */}
      {hasStats && (
        <SectionRow
          label="Stats"
          sub={
            <div className="flex items-center gap-1 text-[11px] text-[#6366F1] font-bold mt-1">
              <CheckCircle2 size={11} />
              Verified
            </div>
          }
        >
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-5">
            {profile.statsProjectsCompleted > 0 && (
              <div>
                <TrendingUp size={13} className="text-[#A1A1AA] mb-1.5" />
                <div className="text-[24px] font-black text-[#09090B] leading-none tabular-nums">
                  {profile.statsProjectsCompleted}
                </div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide mt-1">
                  Projects
                </div>
              </div>
            )}
            {profile.statsTotalEarned > 0 && (
              <div>
                <Award size={13} className="text-[#A1A1AA] mb-1.5" />
                <div className="text-[24px] font-black text-[#09090B] leading-none tabular-nums">
                  {formatEarned(profile.statsTotalEarned)}
                </div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide mt-1">
                  Earned
                </div>
              </div>
            )}
            {profile.statsRepeatClientPct > 0 && (
              <div>
                <Users size={13} className="text-[#A1A1AA] mb-1.5" />
                <div className="text-[24px] font-black text-[#09090B] leading-none tabular-nums">
                  {profile.statsRepeatClientPct}%
                </div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide mt-1">
                  Repeat clients
                </div>
              </div>
            )}
            {profile.statsAcceptanceRate > 0 && (
              <div>
                <CheckCircle2 size={13} className="text-[#A1A1AA] mb-1.5" />
                <div className="text-[24px] font-black text-[#09090B] leading-none tabular-nums">
                  {profile.statsAcceptanceRate}%
                </div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide mt-1">
                  Acceptance
                </div>
              </div>
            )}
            {profile.statsAvgResponseHrs > 0 && (
              <div>
                <Zap size={13} className="text-[#A1A1AA] mb-1.5" />
                <div className="text-[24px] font-black text-[#09090B] leading-none tabular-nums">
                  {responseLabel}
                </div>
                <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide mt-1">
                  Response
                </div>
              </div>
            )}
          </div>
        </SectionRow>
      )}

      {/* ── Services ── */}
      {profile.publicServices.length > 0 && (
        <SectionRow label="Services">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.publicServices.map((svc) => (
              <div
                key={svc.id}
                className="bg-white border border-[#E4E4E7] rounded-xl p-4 hover:border-[#09090B] transition-all cursor-default"
              >
                {/* Icon + name row */}
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <ServiceIcon name={svc.icon} />
                  </div>
                  <div className="text-[14px] font-black text-[#09090B] leading-snug">{svc.name}</div>
                </div>
                {/* Description */}
                {svc.description && (
                  <p className="text-[13px] text-[#71717A] leading-relaxed mb-3">
                    {svc.description}
                  </p>
                )}
                {/* Tags */}
                {svc.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {svc.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#F4F4F5] text-[#52525B] px-2.5 py-0.5 rounded-full text-[11px] font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                {/* Price + delivery */}
                <div className="flex items-center justify-between pt-3 border-t border-[#F4F4F5]">
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wide">
                      Starting from
                    </div>
                    <div className="text-[18px] font-black text-[#09090B] leading-tight tabular-nums">
                      {formatPrice(svc.priceFrom)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#71717A] font-medium bg-[#F9F9F9] px-3 py-1.5 rounded-lg border border-[#E4E4E7]">
                    <Clock size={11} className="text-[#A1A1AA]" />
                    {svc.deliveryDays}d
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Hire CTA below service cards */}
          <button
            onClick={onContact}
            className="mt-4 flex items-center gap-2 text-[13px] font-bold text-[#09090B] hover:text-[#6366F1] transition-colors cursor-pointer"
          >
            Enquire about a service
            <ArrowRight size={14} />
          </button>
        </SectionRow>
      )}

      {/* ── Portfolio ── */}
      {profile.publicPortfolio.length > 0 && (
        <SectionRow label="Portfolio">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.publicPortfolio.slice(0, 6).map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </SectionRow>
      )}

    </div>
  )
}
