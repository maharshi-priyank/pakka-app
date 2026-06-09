import { MapPin, Calendar, Globe, ExternalLink } from 'lucide-react'
import type { PublicProfileData, PublicPortfolioItem } from '../hooks/usePublicProfile'

interface Props {
  profile: PublicProfileData
}

function PortfolioCard({ item }: { item: PublicPortfolioItem }) {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] overflow-hidden">
      {/* Thumbnail */}
      <div className="h-[64px] bg-gradient-to-br from-[#EEF2FF] to-[#C7D2FE] relative flex items-center justify-center">
        {item.thumbnailUrl ? (
          <img
            src={item.thumbnailUrl}
            alt={item.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="text-[#6366F1] text-[9px] font-semibold">Project Screenshot</span>
        )}
        <div className="absolute top-1.5 right-2 bg-white text-[#344054] text-[7px] font-semibold px-1.5 py-0.5 rounded border border-[#EAECF0]">
          {item.category}
        </div>
      </div>
      <div className="p-2.5">
        <div className="text-[10px] font-bold text-[#101828] mb-1">{item.title}</div>
        {item.outcome && (
          <div className="text-[8.5px] text-[#667085] leading-relaxed mb-1.5">{item.outcome}</div>
        )}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {item.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="bg-[#EEF2FF] text-[#6366F1] px-1.5 py-0.5 rounded-md text-[7.5px] font-semibold"
              >
                {tag}
              </span>
            ))}
          </div>
          {item.liveUrl && (
            <a
              href={item.liveUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 text-[8px] text-[#6366F1] font-semibold hover:underline"
            >
              View
              <ExternalLink size={8} />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ProfileMain({ profile }: Props) {
  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="flex flex-col gap-3">

      {/* About */}
      {(profile.publicBio || profile.publicCity) && (
        <div className="bg-white rounded-xl border border-[#EAECF0] p-3">
          <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase mb-2">
            About
          </div>
          {profile.publicBio && (
            <p className="text-[10px] text-[#344054] leading-[1.7]">{profile.publicBio}</p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2">
            {profile.publicCity && (
              <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]">
                <MapPin size={8} />
                {profile.publicCity}
              </span>
            )}
            <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]">
              <Calendar size={8} />
              {memberSince}
            </span>
            {profile.publicLanguages.length > 0 && (
              <span className="flex items-center gap-1 bg-[#F2F4F7] text-[#344054] px-2 py-0.5 rounded-md text-[8px]">
                <Globe size={8} />
                {profile.publicLanguages.join(' · ')}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Portfolio */}
      {profile.publicPortfolio.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[9px] font-bold text-[#344054] tracking-wide uppercase">
              Portfolio
            </div>
            {profile.publicPortfolio.length > 3 && (
              <div className="text-[9px] text-[#6366F1] font-semibold">
                {profile.publicPortfolio.length} projects
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {profile.publicPortfolio.slice(0, 6).map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      )}

    </div>
  )
}
