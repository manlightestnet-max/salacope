import React from 'react';
import clsx from 'clsx';
import { Check, Heart, Plus } from 'lucide-react';
import { Button } from '@/shared/ui';
import { useFavorite, useFollow } from './hooks';

export const FavoriteButton: React.FC<{
  listingId: string;
  variant?: 'icon' | 'button';
  /** Icon variant: hidden until the parent `group` is hovered, unless already saved. */
  revealOnHover?: boolean;
  className?: string;
}> = ({ listingId, variant = 'icon', revealOnHover = false, className }) => {
  const { active, toggle } = useFavorite(listingId);
  const label = active ? 'Retirer des favoris' : 'Ajouter aux favoris';

  if (variant === 'button') {
    return (
      <Button
        onClick={toggle}
        icon={<Heart className={clsx('w-4 h-4', active && 'fill-red-500 text-red-500')} />}
        className={className}
      >
        {active ? 'Enregistré' : 'Enregistrer'}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle();
      }}
      className={clsx(
        'w-8 h-8 rounded-full flex items-center justify-center bg-surface/90 backdrop-blur shadow-xs transition-colors',
        active ? 'text-red-500' : 'text-gray-500 hover:text-gray-900',
        revealOnHover && !active && 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
        className
      )}
    >
      <Heart className={clsx('w-4 h-4', active && 'fill-current')} />
    </button>
  );
};

export const FollowButton: React.FC<{ sellerId: string; size?: 'sm' | 'md' }> = ({ sellerId, size = 'sm' }) => {
  const { active, toggle, isSelf } = useFollow(sellerId);
  if (isSelf) return null;
  return (
    <Button size={size} onClick={toggle} icon={active ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}>
      {active ? 'Abonné' : 'Suivre'}
    </Button>
  );
};
