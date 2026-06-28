'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Star, Loader2, Send } from 'lucide-react';
import { createReview } from '@/actions/reviews';

type ReviewFormProps = {
  bookingId: string;
};

export default function ReviewForm({ bookingId }: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (rating < 1 || rating > 5) {
      setError('Rating harus antara 1 sampai 5 bintang');
      return;
    }

    startTransition(async () => {
      const result = await createReview(bookingId, rating, comment);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
      }
    });
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-success/20 bg-success/5 p-6 text-center space-y-2">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success">
          <Star className="h-6 w-6 fill-current" />
        </div>
        <h3 className="font-semibold text-success">Terima Kasih Atas Ulasan Anda!</h3>
        <p className="text-xs text-muted">Ulasan dan rating Anda telah berhasil dikirim dan akan membantu penyewa lain.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6 space-y-4 shadow-xs">
      <div>
        <h3 className="text-lg font-semibold">Berikan Ulasan Anda</h3>
        <p className="text-xs text-muted mt-0.5">Bagaimana pengalaman Anda menyewa kendaraan ini?</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Star Rating Select */}
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => {
            const active = hoverRating !== null ? star <= hoverRating : star <= rating;
            return (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(null)}
                disabled={isPending}
                className="text-warning p-1 transition-transform active:scale-95 focus:outline-none"
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    active ? 'fill-warning text-warning' : 'text-subtle'
                  }`}
                />
              </button>
            );
          })}
          <span className="ml-2 text-sm font-medium text-muted">
            ({rating} Bintang)
          </span>
        </div>

        {/* Comment Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="comment" className="text-xs font-semibold text-muted uppercase tracking-wide">
            Komentar / Ulasan (opsional)
          </label>
          <textarea
            id="comment"
            rows={3}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            disabled={isPending}
            placeholder="Tulis ulasan Anda di sini tentang kebersihan kendaraan, performa mesin, atau keramahan pelayanan..."
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm transition-colors placeholder:text-subtle focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none resize-none"
          />
        </div>

        {error && <p className="text-xs text-danger">{error}</p>}

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-fg shadow-lg shadow-primary/25 transition-all hover:bg-primary-hover disabled:opacity-60"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Mengirim...
            </>
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              Kirim Ulasan
            </>
          )}
        </button>
      </form>
    </div>
  );
}
