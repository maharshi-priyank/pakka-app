import * as Icons from 'lucide-react'
import {
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
  return Icon ? <Icon size={15} className="text-[#6366F1]" /> : <Icons.Briefcase size={15} className="text-[#6366F1]" />
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

// ─── Card section label (matches invoice "FROM" / "LINE ITEMS" style) ─────────

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#98A2B3] mb-4">{children}</p>
  )
}

// ─── Portfolio card ────────────────────────────────────────────────────────────

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  return (
    <div className="bg-white border border-[#EAECF0] rounded-xl overflow-hidden hover:border-[#C7D2FE] transition-colors group cursor-default">
      <div className="h-[130px] bg-[#F5F6FA] relative overflow-hidden">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-[#D0D5DD] text-[12px] font-medium">No preview</span>
          </div>
        )}
        {item.category && (
          <div className="absolute top-2 left-2 bg-white/90 text-[#344054] text-[10px] font-semibold px-2 py-0.5 rounded-md border border-[#EAECF0]">
            {item.category}
          </div>
        )}
        {item.liveUrl && (
          <a
            href={item.liveUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-2 right-2 bg-[#101828] text-white text-[10px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          >
            View <ArrowUpRight size={9} />
          </a>
        )}
      </div>
      <div className="p-3">
        <p className="text-[13px] font-semibold text-[#101828] mb-1 leading-snug">{item.title}</p>
        {item.outcome && (
          <p className="text-[12px] text-[#667085] leading-relaxed mb-2">{item.outcome}</p>
        )}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="bg-[#F5F6FA] text-[#667085] px-2 py-0.5 rounded text-[10px] font-medium border border-[#EAECF0]">
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
    <>
      {/* ── Verified Stats ── */}
      {hasStats && (
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <CardLabel>Stats</CardLabel>
            <div className="flex items-center gap-1 text-[11px] text-[#067647] font-semibold bg-[#ECFDF3] border border-[#ABEFC6] px-2.5 py-1 rounded-full -mt-4">
              <CheckCircle2 size={10} />
              Verified
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.statsProjectsCompleted > 0 && (
              <div className="border border-[#EAECF0] rounded-xl p-3.5">
                <TrendingUp size={14} className="text-[#98A2B3] mb-2" />
                <p className="text-[24px] font-bold text-[#101828] leading-none tabular-nums">{profile.statsProjectsCompleted}</p>
                <p className="text-[11px] text-[#98A2B3] font-medium mt-1.5">Projects</p>
              </div>
            )}
            {profile.statsTotalEarned > 0 && (
              <div className="border border-[#EAECF0] rounded-xl p-3.5">
                <Award size={14} className="text-[#98A2B3] mb-2" />
                <p className="text-[24px] font-bold text-[#101828] leading-none tabular-nums">{formatEarned(profile.statsTotalEarned)}</p>
                <p className="text-[11px] text-[#98A2B3] font-medium mt-1.5">Earned</p>
              </div>
            )}
            {profile.statsRepeatClientPct > 0 && (
              <div className="border border-[#EAECF0] rounded-xl p-3.5">
                <Users size={14} className="text-[#98A2B3] mb-2" />
                <p className="text-[24px] font-bold text-[#101828] leading-none tabular-nums">{profile.statsRepeatClientPct}%</p>
                <p className="text-[11px] text-[#98A2B3] font-medium mt-1.5">Repeat clients</p>
              </div>
            )}
            {profile.statsAcceptanceRate > 0 && (
              <div className="border border-[#EAECF0] rounded-xl p-3.5">
                <CheckCircle2 size={14} className="text-[#98A2B3] mb-2" />
                <p className="text-[24px] font-bold text-[#101828] leading-none tabular-nums">{profile.statsAcceptanceRate}%</p>
                <p className="text-[11px] text-[#98A2B3] font-medium mt-1.5">Acceptance</p>
              </div>
            )}
            {profile.statsAvgResponseHrs > 0 && (
              <div className="border border-[#EAECF0] rounded-xl p-3.5">
                <Zap size={14} className="text-[#98A2B3] mb-2" />
                <p className="text-[24px] font-bold text-[#101828] leading-none tabular-nums">{responseLabel}</p>
                <p className="text-[11px] text-[#98A2B3] font-medium mt-1.5">Response time</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── My Story ── */}
      {profile.publicBio && (
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6">
          <CardLabel>About</CardLabel>
          <div className="space-y-3">
            {profile.publicBio.split('\n').filter(Boolean).map((para, i) => (
              <p key={i} className="text-[14px] text-[#344054] leading-[1.8]">{para}</p>
            ))}
          </div>
        </div>
      )}

      {/* ── Services ── */}
      {profile.publicServices.length > 0 && (
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6">
          <CardLabel>Services</CardLabel>
          <div className="space-y-3">
            {profile.publicServices.map((svc, idx) => (
              <>
                {idx > 0 && <div key={`div-${svc.id}`} className="border-t border-[#F2F4F7]" />}
                <div key={svc.id} className="flex items-start gap-3 py-1">
                  <div className="w-8 h-8 rounded-lg bg-[#EEF2FF] flex items-center justify-center shrink-0 mt-0.5">
                    <ServiceIcon name={svc.icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-[14px] font-semibold text-[#101828] leading-snug">{svc.name}</p>
                        {svc.description && (
                          <p className="text-[13px] text-[#667085] leading-relaxed mt-1">{svc.description}</p>
                        )}
                        {svc.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {svc.tags.slice(0, 3).map((tag) => (
                              <span key={tag} className="bg-[#F5F6FA] text-[#667085] px-2 py-0.5 rounded text-[11px] font-medium border border-[#EAECF0]">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-[#98A2B3] font-medium uppercase tracking-wide">From</p>
                        <p className="text-[18px] font-bold text-[#101828] tabular-nums leading-tight">{formatPrice(svc.priceFrom)}</p>
                        <div className="flex items-center gap-1 text-[11px] text-[#98A2B3] mt-1 justify-end">
                          <Clock size={10} />
                          {svc.deliveryDays}d delivery
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ))}
          </div>
          <div className="border-t border-[#F2F4F7] mt-4 pt-4">
            <button
              onClick={onContact}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-[#6366F1] hover:text-[#4F46E5] transition-colors cursor-pointer"
            >
              Enquire about a service <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Portfolio ── */}
      {profile.publicPortfolio.length > 0 && (
        <div className="bg-white border border-[#EAECF0] rounded-2xl p-6">
          <CardLabel>Portfolio</CardLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {profile.publicPortfolio.slice(0, 6).map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* ── Hire CTA ── */}
      <div className="bg-white border border-[#EAECF0] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-[16px] font-bold text-[#101828]">Ready to work together?</p>
          <p className="text-[13px] text-[#667085] mt-0.5">Send a message and get a response fast.</p>
        </div>
        <div className="flex gap-2.5 shrink-0">
          {profile.publicWhatsapp && (
            <a
              href={`https://wa.me/${profile.publicWhatsapp.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-10 px-4 flex items-center gap-2 border border-[#EAECF0] text-[#344054] text-[13px] font-semibold rounded-lg hover:bg-[#F5F6FA] transition-colors cursor-pointer"
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          )}
          <button
            onClick={onContact}
            className="h-10 px-5 flex items-center gap-2 bg-[#6366F1] text-white text-[13px] font-semibold rounded-lg hover:bg-[#4F46E5] transition-colors cursor-pointer"
          >
            Send a message <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </>
  )
}
