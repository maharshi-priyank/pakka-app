import { Star, MessageCircle, FileText } from 'lucide-react'
import { useWorkspaceReviews, useReviewStats, type WorkspaceReview } from '../hooks/useWorkspaceReviews'

// ─── Helpers ───────────────────────────────────────────────────────────────

function StarRow({ rating, size = 14 }: { rating: number | null; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          size={size}
          strokeWidth={1.5}
          className={
            rating !== null && n <= Math.round(rating)
              ? 'fill-amber-400 text-amber-400'
              : 'fill-[#E4E7EC] text-[#E4E7EC]'
          }
        />
      ))}
    </div>
  )
}

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

// ─── Skeleton ──────────────────────────────────────────────────────────────

function ReviewSkeleton() {
  return (
    <div className="animate-pulse bg-white rounded-xl border border-[#EAECF0] p-4">
      <div className="flex justify-between items-start">
        <div className="h-3 w-32 bg-[#F2F4F7] rounded" />
        <div className="h-3 w-20 bg-[#F2F4F7] rounded" />
      </div>
      <div className="h-3 w-24 bg-[#F2F4F7] rounded mt-2" />
      <div className="h-3 w-full bg-[#F2F4F7] rounded mt-3" />
      <div className="h-3 w-4/5 bg-[#F2F4F7] rounded mt-1" />
    </div>
  )
}

// ─── Review Card ───────────────────────────────────────────────────────────

function ReviewCard({ review }: { review: WorkspaceReview }) {
  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-[13px] font-semibold text-[#344054] leading-tight">
            {review.authorName ?? 'Anonymous'}
          </p>
          <p className="text-[11px] text-[#98A2B3] mt-0.5">{review.authorEmail}</p>
        </div>
        <p className="text-[11px] text-[#98A2B3] shrink-0">{formatDate(review.submittedAt)}</p>
      </div>

      {/* Stars */}
      <div className="mt-2">
        <StarRow rating={review.rating} size={13} />
      </div>

      {/* Body */}
      {review.body && (
        <p className="text-[13px] text-[#475467] leading-relaxed mt-2">{review.body}</p>
      )}

      {/* Project badge */}
      <div className="mt-3">
        <span className="inline-flex items-center gap-1 text-[11px] text-[#667085] bg-[#F9FAFB] rounded-full px-2.5 py-0.5">
          <FileText size={10} strokeWidth={2} />
          {review.project.name}
        </span>
      </div>
    </div>
  )
}

// ─── Stats Header ──────────────────────────────────────────────────────────

function StatsHeader({ average, total }: { average: number | null; total: number }) {
  const plural = total === 1 ? 'review' : 'reviews'

  return (
    <div className="bg-white rounded-xl border border-[#EAECF0] p-6 mb-4">
      <div className="flex items-start justify-between gap-6">
        {/* Left */}
        <div>
          <p className="text-[16px] font-bold text-[#0F172A]">Client Reviews</p>
          <p className="text-[12px] text-[#98A2B3] mt-0.5">{total} {plural}</p>
        </div>

        {/* Right — only when there is a rating */}
        {average !== null && (
          <div className="flex flex-col items-end">
            <p className="text-[36px] font-bold text-[#0F172A] leading-none">
              {average.toFixed(1)}
            </p>
            <StarRow rating={average} size={14} />
            <p className="text-[11px] text-[#98A2B3] mt-1">{total} {plural}</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Empty State ───────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <MessageCircle size={32} className="text-[#B8C0CC]" strokeWidth={1.5} />
      <p className="text-[14px] font-semibold text-[#344054] mt-3">No reviews yet</p>
      <p className="text-[12px] text-[#98A2B3] mt-1">
        Client reviews appear here after projects are completed.
      </p>
    </div>
  )
}

// ─── Main Export ───────────────────────────────────────────────────────────

export default function WorkspaceReviewsSection() {
  const { data: reviews, isLoading: reviewsLoading } = useWorkspaceReviews()
  const { data: stats,   isLoading: statsLoading   } = useReviewStats()

  const isLoading = reviewsLoading || statsLoading

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="animate-pulse bg-white rounded-xl border border-[#EAECF0] p-6 mb-4 h-24" />
        {[0, 1, 2].map((i) => <ReviewSkeleton key={i} />)}
      </div>
    )
  }

  const total   = stats?.totalCount   ?? 0
  const average = stats?.averageRating ?? null

  return (
    <div>
      <StatsHeader average={average} total={total} />

      {!reviews || reviews.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  )
}
