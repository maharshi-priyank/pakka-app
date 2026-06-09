import * as Icons from 'lucide-react'
import { Clock, ArrowRight } from 'lucide-react'
import type { LucideProps } from 'lucide-react'
import type { PublicProfileData, PublicPortfolioItem } from '../hooks/usePublicProfile'

function ServiceIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = (Icons as Record<string, React.ComponentType<LucideProps>>)[name]
  return Icon ? (
    <Icon size={size} className="text-[#6366F1]" />
  ) : (
    <Icons.Briefcase size={size} className="text-[#6366F1]" />
  )
}

function formatPrice(amount: number): string {
  if (amount >= 1_00_000) return `₹${(amount / 1_00_000).toFixed(1)}L`
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(0)}k`
  return `₹${amount}`
}

interface ServicesProps {
  services: PublicProfileData['publicServices']
  onContact: () => void
}

export function ServicesSection({ services, onContact }: ServicesProps) {
  if (services.length === 0) {
    return (
      <div className="py-16 text-center text-[#A1A1AA] text-[15px]">
        No services listed yet.
      </div>
    )
  }

  return (
    <div className="divide-y divide-[#F4F4F5]">
      {services.map((svc) => (
        <div key={svc.id} className="py-10 sm:py-12 grid grid-cols-1 sm:grid-cols-[220px,1fr] gap-6 sm:gap-16 items-start">
          {/* Left: icon + price */}
          <div className="flex flex-col gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#EEF2FF] flex items-center justify-center">
              <ServiceIcon name={svc.icon} size={22} />
            </div>
            <div>
              <div className="text-[11px] text-[#A1A1AA] font-semibold uppercase tracking-widest mb-0.5">
                Starting from
              </div>
              <div className="text-[28px] font-black text-[#09090B] tabular-nums leading-none">
                {formatPrice(svc.priceFrom)}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#71717A] font-medium">
              <Clock size={13} className="text-[#A1A1AA]" />
              {svc.deliveryDays} day delivery
            </div>
          </div>

          {/* Right: details */}
          <div>
            <h3 className="text-[22px] sm:text-[26px] font-black text-[#09090B] mb-3 leading-tight">
              {svc.name}
            </h3>
            {svc.description && (
              <p className="text-[15px] text-[#52525B] leading-[1.75] mb-5">{svc.description}</p>
            )}
            {svc.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {svc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-[#F4F4F5] text-[#3F3F46] px-3.5 py-1.5 rounded-full text-[12px] font-semibold"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
            <button
              onClick={onContact}
              className="flex items-center gap-2 bg-[#09090B] text-white text-[13px] font-bold px-5 py-2.5 rounded-xl hover:bg-[#27272A] transition-all cursor-pointer"
            >
              Enquire about this
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

interface PortfolioProps {
  items: PublicPortfolioItem[]
}

export function PortfolioSection({ items }: PortfolioProps) {
  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-[#A1A1AA] text-[15px]">
        No portfolio items yet.
      </div>
    )
  }

  return (
    <div className="py-10">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {items.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-2xl border border-[#E4E4E7] overflow-hidden hover:border-[#09090B] transition-all group"
          >
            {/* Thumbnail */}
            <div className="h-[180px] bg-[#F4F4F5] relative overflow-hidden">
              {item.thumbnailUrl ? (
                <img
                  src={item.thumbnailUrl}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#EEF2FF] to-[#E0E7FF]">
                  <span className="text-[#A5B4FC] text-[13px] font-semibold">No preview</span>
                </div>
              )}
              {item.category && (
                <div className="absolute top-3 left-3 bg-white/95 text-[#09090B] text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                  {item.category}
                </div>
              )}
              {item.liveUrl && (
                <a
                  href={item.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute top-3 right-3 bg-[#09090B] text-white text-[11px] font-bold px-2.5 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center gap-1"
                >
                  View live
                  <Icons.ArrowUpRight size={11} />
                </a>
              )}
            </div>

            <div className="p-5">
              <h3 className="text-[15px] font-black text-[#09090B] mb-1.5 leading-snug">
                {item.title}
              </h3>
              {item.outcome && (
                <p className="text-[13px] text-[#71717A] leading-relaxed mb-3">{item.outcome}</p>
              )}
              {item.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {item.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="bg-[#EEF2FF] text-[#4F46E5] px-2.5 py-1 rounded-lg text-[11px] font-semibold"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Default export kept for backward compatibility (no longer used directly by page)
export default function ProfileSidebar({
  profile,
  onContact,
}: {
  profile: PublicProfileData
  onContact: () => void
}) {
  return <ServicesSection services={profile.publicServices} onContact={onContact} />
}
