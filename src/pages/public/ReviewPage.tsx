import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Star, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useReview, useSubmitReview } from '@/features/reviews/hooks/useReview'

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return <div className={cn('animate-pulse bg-[#EEF2F7] rounded-lg', className)} />
}

function ReviewSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-7 w-64" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-6 w-36 rounded-full mt-1" />
      </div>
      {/* Divider */}
      <div className="border-t border-[#F2F4F7]" />
      {/* Stars */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-20" />
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="w-9 h-9 rounded-lg" />
          ))}
        </div>
      </div>
      {/* Textarea */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
      {/* Name */}
      <div className="space-y-1.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-11 w-full rounded-xl" />
      </div>
      {/* Button */}
      <Skeleton className="h-12 w-full rounded-xl" />
    </div>
  )
}

// ─── Star rating labels ────────────────────────────────────────────────────────

const RATING_LABELS: Record<number, string> = {
  1: 'Poor',
  2: 'Below average',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
}

// ─── Thank-you state ──────────────────────────────────────────────────────────

function ThankYouCard({ workspaceName, highRating }: { workspaceName: string; highRating?: boolean }) {
  return (
    <div className="text-center py-4">
      <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
      <h2 className="text-[20px] font-bold text-[#0F172A]">Thank you for your feedback!</h2>
      <p className="text-[13px] text-[#667085] mt-2 leading-relaxed">
        Your review has been submitted. It helps <span className="font-semibold text-[#344054]">{workspaceName}</span> grow and build trust.
      </p>
      {highRating && (
        <p className="text-[13px] text-indigo-600 mt-1 font-medium">
          We really appreciate the kind words!
        </p>
      )}
      <div className="border-t border-[#F2F4F7] mt-6 mb-4" />
      <p className="text-[12px] text-[#98A2B3]">You can close this tab.</p>
    </div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ReviewPage() {
  const { token } = useParams<{ token: string }>()

  const { data, isLoading, isError } = useReview(token ?? '')
  const submitReview = useSubmitReview(token ?? '')

  const [hoveredStar,     setHoveredStar]     = useState(0)
  const [selectedRating,  setSelectedRating]  = useState(0)
  const [body,            setBody]            = useState('')
  const [authorName,      setAuthorName]      = useState('')
  const [submitted,       setSubmitted]       = useState(false)
  const [submittedRating, setSubmittedRating] = useState(0)

  async function handleSubmit() {
    if (selectedRating === 0 || submitReview.isPending) return
    try {
      await submitReview.mutateAsync({
        rating: selectedRating,
        body: body.trim() || undefined,
        authorName: authorName.trim() || undefined,
      })
      setSubmittedRating(selectedRating)
      setSubmitted(true)
    } catch {
      // error surfaces via submitReview.isError
    }
  }

  // ── Page shell ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-dvh bg-[#F4F6FB] py-16 px-4">
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-[#EAECF0] p-8">

          {/* Loading skeleton */}
          {isLoading && <ReviewSkeleton />}

          {/* Error / not found */}
          {!isLoading && isError && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-2xl bg-[#FEF3F2] flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={22} className="text-[#D92D20]" />
              </div>
              <h1 className="text-[16px] font-bold text-[#0F172A] mb-1">Review link invalid</h1>
              <p className="text-[13px] text-[#667085]">
                This review link is invalid or has expired. Contact the sender for a new link.
              </p>
            </div>
          )}

          {/* Already submitted (pre-existing) or just submitted */}
          {!isLoading && !isError && data && (data.status === 'SUBMITTED' || submitted) && (
            <ThankYouCard
              workspaceName={data.workspaceName}
              highRating={submitted ? submittedRating >= 4 : (data.rating ?? 0) >= 4}
            />
          )}

          {/* Pending form */}
          {!isLoading && !isError && data && data.status === 'PENDING' && !submitted && (
            <>
              {/* Top section */}
              <div>
                <p className="text-[11px] font-semibold text-[#98A2B3] uppercase tracking-wider mb-1">
                  {data.workspaceName}
                </p>
                <h1 className="text-[22px] font-bold text-[#0F172A]">How was your experience?</h1>
                <p className="text-[13px] text-[#667085] mt-2 leading-relaxed">
                  Your review helps <span className="font-semibold text-[#344054]">{data.workspaceName}</span> grow and helps others make informed decisions.
                </p>
                <span className="inline-flex items-center mt-4 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold">
                  Project: {data.projectName}
                </span>
              </div>

              {/* Divider */}
              <div className="border-t border-[#F2F4F7] mt-6 mb-6" />

              {/* Star rating */}
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[#667085] mb-3">
                  Your Rating
                </p>
                <div
                  className="flex gap-1.5"
                  onMouseLeave={() => setHoveredStar(0)}
                  role="group"
                  aria-label="Star rating"
                >
                  {[1, 2, 3, 4, 5].map(n => {
                    const isActive = n <= (hoveredStar || selectedRating)
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} star${n > 1 ? 's' : ''}`}
                        onMouseEnter={() => setHoveredStar(n)}
                        onClick={() => setSelectedRating(n)}
                        className="focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded transition-transform hover:scale-110 active:scale-95"
                        style={{ lineHeight: 0 }}
                      >
                        <Star
                          size={36}
                          strokeWidth={1.5}
                          className={cn(
                            'transition-colors duration-100',
                            isActive
                              ? 'text-amber-400 fill-amber-400'
                              : hoveredStar >= n
                                ? 'text-amber-300'
                                : 'text-[#E4E7EC]',
                          )}
                        />
                      </button>
                    )
                  })}
                </div>
                {/* Reserve height so layout doesn't shift */}
                <p className="text-[12px] text-[#667085] mt-2 h-4">
                  {selectedRating > 0 ? RATING_LABELS[selectedRating] : ''}
                </p>
              </div>

              {/* Text review */}
              <div className="mt-6">
                <label
                  htmlFor="review-body"
                  className="block text-[12px] font-semibold text-[#344054] mb-1.5"
                >
                  Tell us more <span className="font-normal text-[#98A2B3]">(optional)</span>
                </label>
                <div className="relative">
                  <textarea
                    id="review-body"
                    rows={4}
                    maxLength={500}
                    placeholder="What did you love? What could be better?"
                    value={body}
                    onChange={e => setBody(e.target.value)}
                    className={cn(
                      'w-full px-3.5 py-3 text-[13px] text-[#344054] placeholder-[#98A2B3]',
                      'border border-[#EAECF0] rounded-xl resize-none',
                      'focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400',
                      'transition-colors',
                    )}
                  />
                  <span className="absolute bottom-2.5 right-3 text-[11px] text-[#98A2B3] pointer-events-none">
                    {body.length}/500
                  </span>
                </div>
              </div>

              {/* Author name */}
              <div className="mt-4">
                <label
                  htmlFor="author-name"
                  className="block text-[12px] font-semibold text-[#344054] mb-1.5"
                >
                  Your name <span className="font-normal text-[#98A2B3]">(optional)</span>
                </label>
                <input
                  id="author-name"
                  type="text"
                  placeholder="Jane Smith"
                  value={authorName}
                  onChange={e => setAuthorName(e.target.value)}
                  className={cn(
                    'w-full px-3.5 py-2.5 text-[13px] text-[#344054] placeholder-[#98A2B3]',
                    'border border-[#EAECF0] rounded-xl',
                    'focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400',
                    'transition-colors',
                    'min-h-[44px]',
                  )}
                />
              </div>

              {/* Submit */}
              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={selectedRating === 0 || submitReview.isPending}
                  className={cn(
                    'w-full h-12 flex items-center justify-center gap-2',
                    'bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-[14px]',
                    'rounded-xl transition-colors',
                    'disabled:opacity-40 disabled:cursor-not-allowed',
                  )}
                >
                  {submitReview.isPending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Submitting…
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </button>

                {submitReview.isError && (
                  <p className="mt-2 text-[12px] text-[#D92D20] text-center" role="alert">
                    Something went wrong. Please try again.
                  </p>
                )}
              </div>

              {/* Privacy note */}
              <p className="mt-4 text-center text-[11px] text-[#98A2B3]">
                Your review may be displayed publicly on{' '}
                <span className="font-medium">{data.workspaceName}</span>'s profile.
              </p>
            </>
          )}

        </div>
      </div>
    </div>
  )
}
