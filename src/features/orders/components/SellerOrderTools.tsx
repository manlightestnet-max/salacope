import React, { useState } from 'react';
import clsx from 'clsx';
import { Pin, PinOff, Tag, X } from 'lucide-react';
import { Order } from '@/shared/db';
import { Button, Dialog, Input } from '@/shared/ui';
import { useServiceAction } from '@/shared/hooks';
import { MAX_SELLER_TAGS, cleanSellerTags } from '@/shared/domain';
import { setPinned, setSellerTags } from '../api';

/** The seller's labels on a sale, as small chips (only the seller ever sees them). */
export const SellerTags: React.FC<{ tags?: string[]; className?: string }> = ({ tags, className }) =>
  tags?.length ? (
    <span className={clsx('inline-flex flex-wrap gap-1', className)}>
      {tags.map((t) => (
        <span key={t} className="h-5 px-1.5 rounded-md bg-gray-100 text-[11px] text-gray-600 flex items-center">
          {t}
        </span>
      ))}
    </span>
  ) : null;

/** Tags already used on this seller's other sales, offered while typing. */
const TagsDialog: React.FC<{ order: Order; known: string[]; open: boolean; onClose: () => void }> = ({ order, known, open, onClose }) => {
  const [tags, setTags] = useState<string[]>(order.sellerMeta?.tags ?? []);
  const [draft, setDraft] = useState('');
  const run = useServiceAction();
  const add = (t: string) => {
    setTags((prev) => cleanSellerTags([...prev, t]));
    setDraft('');
  };
  const suggestions = known.filter((k) => !tags.includes(k) && k.includes(draft.trim().toLowerCase())).slice(0, 8);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Tags de la vente"
      description={`Pour retrouver et trier vos ventes. ${MAX_SELLER_TAGS} au maximum ; le client ne les voit jamais.`}
      footer={
        <Button variant="primary" onClick={async () => (await run(() => setSellerTags(order.id, tags), 'Tags enregistrés')) && onClose()}>
          Enregistrer
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="h-7 pl-2.5 pr-1 rounded-full bg-gray-100 text-xs text-gray-700 flex items-center gap-1">
              {t}
              <button type="button" onClick={() => setTags(tags.filter((x) => x !== t))} className="p-0.5 rounded-full hover:bg-gray-200" aria-label={`Retirer ${t}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {!tags.length && <span className="text-xs text-gray-400">Aucun tag.</span>}
        </div>
        {tags.length < MAX_SELLER_TAGS && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (draft.trim()) add(draft);
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} placeholder="Ex. : urgent, fidèle, à relancer" aria-label="Nouveau tag" />
          </form>
        )}
        {suggestions.length > 0 && tags.length < MAX_SELLER_TAGS && (
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((k) => (
              <button key={k} type="button" onClick={() => add(k)} className="h-7 px-2.5 rounded-full border border-gray-200 text-xs text-gray-600 hover:border-gray-300">
                + {k}
              </button>
            ))}
          </div>
        )}
      </div>
    </Dialog>
  );
};

/** Seller's own organisation of a sale, in the order page header: pin it on top, tag it. */
export const SellerOrderTools: React.FC<{ order: Order; knownTags: string[] }> = ({ order, knownTags }) => {
  const [tagging, setTagging] = useState(false);
  const run = useServiceAction();
  const pinned = Boolean(order.sellerMeta?.pinnedAt);
  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        icon={pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
        onClick={() => run(() => setPinned(order.id, !pinned), pinned ? 'Vente désépinglée' : 'Vente épinglée en haut de la liste')}
      >
        {pinned ? 'Désépingler' : 'Épingler'}
      </Button>
      <Button size="sm" variant="ghost" icon={<Tag className="w-3.5 h-3.5" />} onClick={() => setTagging(true)}>
        Tags{order.sellerMeta?.tags.length ? ` · ${order.sellerMeta.tags.length}` : ''}
      </Button>
      {tagging && <TagsDialog order={order} known={knownTags} open onClose={() => setTagging(false)} />}
    </>
  );
};
