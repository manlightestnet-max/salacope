import React from 'react';
import { Button } from './Button';

/** End of a paged list: the next page loads when this comes near; the button covers browsers that cannot tell. */
export const MoreRows: React.FC<{ hasMore: boolean; loading: boolean; sentinelRef: React.Ref<HTMLDivElement>; onMore: () => void }> = ({ hasMore, loading, sentinelRef, onMore }) =>
  hasMore ? (
    <div ref={sentinelRef} className="h-12 flex items-center justify-center text-xs text-gray-500">
      {loading ? 'Chargement…' : (
        <Button size="sm" variant="ghost" onClick={onMore}>
          Voir plus
        </Button>
      )}
    </div>
  ) : null;
