import React, { useState } from 'react';
import clsx from 'clsx';
import { Star } from 'lucide-react';
import { Order } from '@/shared/db';
import { Button, Card, CardBody, CardHeader, Textarea } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { formatDate } from '@/shared/lib';
import { leaveReview } from './api';
import { useOrderReview } from './hooks';
import { REVIEW_MAX_LENGTH, SellerStats, canBeReviewed, formatRating } from './model';

const LABELS = ['', 'Décevant', 'Moyen', 'Bien', 'Très bien', 'Excellent'];

/** Five stars, filled up to the (rounded) rating. */
export const Stars: React.FC<{ rating: number; size?: 'sm' | 'md'; className?: string }> = ({ rating, size = 'sm', className }) => (
  <span role="img" aria-label={`${formatRating(rating)} sur 5`} className={clsx('inline-flex items-center gap-0.5', className)}>
    {[1, 2, 3, 4, 5].map((n) => (
      <Star
        key={n}
        className={clsx(
          size === 'sm' ? 'w-3.5 h-3.5' : 'w-5 h-5',
          n <= Math.round(rating) ? 'fill-amber-500 text-amber-500' : 'text-gray-300'
        )}
      />
    ))}
  </span>
);

/** "★ 4,8 · 12 avis" */
export const RatingSummary: React.FC<{ stats: Pick<SellerStats, 'rating' | 'reviews'>; className?: string }> = ({ stats, className }) => (
  <span className={clsx('inline-flex items-center gap-1 tabular-nums', className)}>
    <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" aria-hidden />
    <span className="font-semibold text-gray-900">{formatRating(stats.rating)}</span>
    <span className="text-gray-500">· {stats.reviews} avis</span>
  </span>
);

const StarInput: React.FC<{ value: number; onChange: (value: number) => void; small?: boolean }> = ({ value, onChange, small = false }) => {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" aria-label="Note" className="flex items-center gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
            onMouseEnter={() => setHover(n)}
            onClick={() => onChange(n)}
            className="p-1 -m-0.5 rounded-md transition-transform hover:scale-110"
          >
            <Star className={clsx(small ? 'w-5 h-5' : 'w-7 h-7', 'transition-colors', n <= shown ? 'fill-amber-500 text-amber-500' : 'text-gray-300')} />
          </button>
        ))}
      </div>
      {shown > 0 && <span className="text-sm font-medium text-gray-700">{LABELS[shown]}</span>}
    </div>
  );
};

/**
 * On a completed order: the buyer rates it once; afterwards both sides see the review.
 * Renders nothing before completion.
 */
export const OrderReviewCard: React.FC<{ order: Order; isBuyer: boolean; userId: string }> = ({ order, isBuyer, userId }) => {
  const review = useOrderReview(order.id);
  const run = useServiceAction();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (review) {
    return (
      <Card>
        <CardHeader title={isBuyer ? 'Votre avis' : 'Avis du client'} description={formatDate(review.createdAt)} />
        <CardBody className="pt-0 space-y-2">
          <Stars rating={review.rating} size="md" />
          {review.comment && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{review.comment}</p>}
        </CardBody>
      </Card>
    );
  }

  if (!isBuyer || !canBeReviewed(order)) return null;

  return (
    <Card>
      <CardHeader title="Notez cette commande" description="Votre avis aide les autres acheteurs et met en avant les bons créateurs." />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          run(() => leaveReview({ orderId: order.id, userId, rating, comment }), 'Merci pour votre avis !');
        }}
      >
        <CardBody className="pt-0 space-y-4">
          <StarInput value={rating} onChange={setRating} />
          <Textarea
            aria-label="Votre avis (facultatif)"
            placeholder="Qu’avez-vous pensé de la commande ? (facultatif)"
            value={comment}
            maxLength={REVIEW_MAX_LENGTH}
            rows={3}
            onChange={(e) => setComment(e.target.value)}
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" disabled={rating === 0}>
              Publier l’avis
            </Button>
          </div>
        </CardBody>
      </form>
    </Card>
  );
};

/**
 * One quiet line at the bottom of a purchase: stars first; the comment box opens only
 * once a star is picked. Shows the review once given.
 */
export const CompactReview: React.FC<{ order: Order; userId: string; className?: string }> = ({ order, userId, className }) => {
  const review = useOrderReview(order.id);
  const run = useServiceAction();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  if (review) {
    return (
      <div className={clsx('flex flex-wrap items-center gap-x-3 gap-y-1 px-1 text-sm', className)}>
        <span className="text-gray-500">Votre note</span>
        <Stars rating={review.rating} />
        {review.comment && <span className="text-gray-500 truncate max-w-full">« {review.comment} »</span>}
      </div>
    );
  }
  if (!canBeReviewed(order)) return null;

  return (
    <div className={clsx('rounded-2xl border border-gray-200/70 bg-surface px-4 py-3', className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-gray-600">Notez ce produit</span>
        <StarInput small value={rating} onChange={setRating} />
      </div>
      <div className={clsx('grid transition-[grid-template-rows] duration-300', rating ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="pt-3 space-y-2">
            <Textarea
              rows={2}
              aria-label="Votre avis (facultatif)"
              placeholder="Un mot sur le produit ? (facultatif)"
              maxLength={REVIEW_MAX_LENGTH}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex justify-end">
              <Button size="sm" variant="primary" onClick={() => run(() => leaveReview({ orderId: order.id, userId, rating, comment }), 'Merci pour votre avis !')}>
                Publier
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Average, count and how the stars are spread (5 → 1). */
export const RatingBreakdown: React.FC<{ reviews: { rating: number }[]; stacked?: boolean; className?: string }> = ({ reviews, stacked = false, className }) => {
  const count = reviews.length;
  const average = count ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;
  return (
    <div className={clsx('flex flex-col gap-6', !stacked && 'sm:flex-row sm:items-center', className)}>
      <div className="shrink-0 text-center sm:text-left">
        <div className="text-4xl font-semibold tracking-tight text-gray-900 tabular-nums">{formatRating(average)}</div>
        <Stars rating={average} className="mt-1" />
        <div className="mt-1 text-xs text-gray-500">{count} avis</div>
      </div>
      <ul className="flex-1 space-y-1.5">
        {[5, 4, 3, 2, 1].map((n) => {
          const k = reviews.filter((r) => r.rating === n).length;
          return (
            <li key={n} className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-3 tabular-nums">{n}</span>
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" aria-hidden />
              <span className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <span className="block h-full rounded-full bg-amber-500" style={{ width: count ? `${(k / count) * 100}%` : 0 }} />
              </span>
              <span className="w-5 text-right tabular-nums">{k}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export const ReviewList: React.FC<{ reviews: import('./hooks').ReviewView[] }> = ({ reviews }) => (
  <ul className="divide-y divide-gray-100">
    {reviews.map((r) => (
      <li key={r.id} className="py-4 first:pt-0 last:pb-0">
        <div className="flex items-center justify-between gap-3">
          <Stars rating={r.rating} />
          <span className="text-xs text-gray-400">{formatDate(r.createdAt)}</span>
        </div>
        {r.comment && <p className="mt-2 text-sm text-gray-800 leading-relaxed">{r.comment}</p>}
        <p className="mt-1.5 text-xs text-gray-500 truncate">
          {r.author} · {r.itemTitle}
        </p>
      </li>
    ))}
  </ul>
);
