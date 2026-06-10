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
  MessageCircle,
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

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ label, badge }: { label: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="w-1 h-5 bg-[#6366F1] rounded-full" />
      <div className="text-[18px] sm:text-[20px] font-black text-[#09090B] leading-tight">{label}</div>
      {badge}
    </div>
  )
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function StatTile({ icon, value, label }: { icon: React.ReactNode; value: string; label: string }) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl p-4 flex items-start gap-3 shadow-sm">
      <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <div className="text-[22px] font-black text-[#09090B] leading-none tabular-nums mb-1">{value}</div>
        <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-wide">{label}</div>
      </div>
    </div>
  )
}

// ─── Portfolio card ────────────────────────────────────────────────────────────

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden hover:border-[#6366F1]/40 hover:shadow-md transition-all group cursor-default shadow-sm">
      <div className="h-[140px] bg-[#F4F4F5] relative overflow-hidden">
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
          <div className="absolute top-2.5 left-2.5 bg-white/95 text-[#09090B] text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
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
    <div className="pb-8 space-y-8 pt-8">

      {/* ── Verified Stats ── */}
      {hasStats && (
        <div>
          <SectionHeader
            label="Stats"
            badge={
              <div className="flex items-center gap-1 text-[11px] text-[#6366F1] font-bold bg-[#EEF2FF] border border-[#C7D2FE] px-2.5 py-1 rounded-full">
                <CheckCircle2 size={10} />
                Verified
              </div>
            }
          />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {profile.statsProjectsCompleted > 0 && (
              <StatTile
                icon={<TrendingUp size={16} className="text-[#6366F1]" />}
                value={String(profile.statsProjectsCompleted)}
                label="Projects"
              />
            )}
            {profile.statsTotalEarned > 0 && (
              <StatTile
                icon={<Award size={16} className="text-[#6366F1]" />}
                value={formatEarned(profile.statsTotalEarned)}
                label="Earned"
              />
            )}
            {profile.statsRepeatClientPct > 0 && (
              <StatTile
                icon={<Users size={16} className="text-[#6366F1]" />}
                value={`${profile.statsRepeatClientPct}%`}
                label="Repeat clients"
              />
            )}
            {profile.statsAcceptanceRate > 0 && (
              <StatTile
                icon={<CheckCircle2 size={16} className="text-[#6366F1]" />}
                value={`${profile.statsAcceptanceRate}%`}
                label="Acceptance"
              />
            )}
            {profile.statsAvgResponseHrs > 0 && (
              <StatTile
                icon={<Zap size={16} className="text-[#6366F1]" />}
                value={responseLabel}
                label="Response"
              />
            )}
          </div>
        </div>
      )}

      {/* ── My Story ── */}
      {profile.publicBio && (
        <div>
          <SectionHeader label="My Story" />
          <div className="bg-white border border-[#EAECF0] rounded-xl p-5 sm:p-6 space-y-3 shadow-sm">
            {profile.publicBio
              .split('\n')
              .filter(Boolean)
              .map((para, i) => (
                <p key={i} className="text-[15px] text-[#3F3F46] leading-[1.8]">
                  {para}
                </p>
              ))}
          </div>
        </div>
      )}

      {/* ── About ── */}
      <div>
        <SectionHeader label="About" />
        <div className="flex flex-wrap gap-2">
          {profile.publicCity && (
            <span className="flex items-center gap-1.5 bg-white border border-[#EAECF0] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full shadow-sm">
              <MapPin size={13} className="text-[#6366F1]" />
              {profile.publicCity}
            </span>
          )}
          <span className="flex items-center gap-1.5 bg-white border border-[#EAECF0] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full shadow-sm">
            <Calendar size={13} className="text-[#6366F1]" />
            On ClearWork since {memberSince}
          </span>
          {profile.publicLanguages.length > 0 && (
            <span className="flex items-center gap-1.5 bg-white border border-[#EAECF0] text-[#3F3F46] text-[13px] font-semibold px-3.5 py-2 rounded-full shadow-sm">
              <Globe size={13} className="text-[#6366F1]" />
              {profile.publicLanguages.join(' · ')}
            </span>
          )}
        </div>
      </div>

      {/* ── Services ── */}
      {profile.publicServices.length > 0 && (
        <div>
          <SectionHeader label="Services" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.publicServices.map((svc) => (
              <div
                key={svc.id}
                className="bg-white border border-[#EAECF0] rounded-xl p-4 hover:border-[#6366F1]/40 hover:shadow-md transition-all cursor-default shadow-sm"
              >
                <div className="flex items-center gap-2.5 mb-2.5">
                  <div className="w-9 h-9 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0">
                    <ServiceIcon name={svc.icon} />
                  </div>
                  <div className="text-[14px] font-black text-[#09090B] leading-snug">{svc.name}</div>
                </div>
                {svc.description && (
                  <p className="text-[13px] text-[#71717A] leading-relaxed mb-3">{svc.description}</p>
                )}
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
                <div className="flex items-center justify-between pt-3 border-t border-[#F4F4F5]">
                  <div>
                    <div className="text-[10px] text-[#A1A1AA] font-semibold uppercase tracking-wide">Starting from</div>
                    <div className="text-[20px] font-black text-[#6366F1] leading-tight tabular-nums">
                      {formatPrice(svc.priceFrom)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[12px] text-[#71717A] font-medium bg-[#F9F9F9] px-3 py-1.5 rounded-lg border border-[#E4E4E7]">
                    <Clock size={11} className="text-[#A1A1AA]" />
                    {svc.deliveryDays}d delivery
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={onContact}
            className="mt-4 flex items-center gap-2 text-[13px] font-bold text-[#71717A] hover:text-[#6366F1] transition-colors cursor-pointer"
          >
            Enquire about a service
            <ArrowRight size={14} />
          </button>
        </div>
      )}

      {/* ── Portfolio ── */}
      {profile.publicPortfolio.length > 0 && (
        <div>
          <SectionHeader label="Portfolio" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.publicPortfolio.slice(0, 6).map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Hire CTA ── */}
      <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="text-[18px] font-black text-[#09090B] mb-1">Ready to work together?</div>
          <div className="text-[14px] text-[#71717A]">Send a message and get a response fast.</div>
        </div>
        <div className="flex gap-2.5 shrink-0">
          {profile.publicWhatsapp && (
            <a
              href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-11 px-4 flex items-center gap-2 bg-white text-[#09090B] text-[13px] font-semibold rounded-xl border border-[#EAECF0] hover:border-[#09090B] transition-all cursor-pointer shadow-sm"
            >
              <MessageCircle size={15} />
              WhatsApp
            </a>
          )}
          <button
            onClick={onContact}
            className="h-11 px-6 flex items-center gap-2 bg-[#6366F1] text-white text-[13px] font-black rounded-xl hover:bg-[#4F46E5] transition-all cursor-pointer shadow-sm"
          >
            Send a message
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

    </div>
  )
}
