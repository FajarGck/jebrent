import { Star, User } from 'lucide-react';
import type { Review } from '@/lib/db/reviews';

type ReviewListProps = {
  reviews: Review[];
};

export function ReviewList({ reviews }: ReviewListProps) {
  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted text-center py-8">
        Belum ada ulasan untuk kendaraan ini.
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {reviews.map((review) => {
        const reviewerName = review.profiles?.full_name || 'Pengguna Jebrent';
        const avatarUrl = review.profiles?.avatar_url;

        return (
          <div key={review.id} className="py-4 first:pt-0 last:pb-0 space-y-2">
            {/* User Info */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={reviewerName}
                    className="h-8 w-8 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-semibold">{reviewerName}</p>
                  <p className="text-[10px] text-muted">
                    {new Date(review.created_at).toLocaleDateString('id-ID', {
                      dateStyle: 'medium',
                    })}
                  </p>
                </div>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className={`h-3.5 w-3.5 ${
                      i < review.rating ? 'text-warning fill-warning' : 'text-subtle'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Comment */}
            {review.comment && (
              <p className="text-sm text-muted pl-10 leading-relaxed">
                {review.comment}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
