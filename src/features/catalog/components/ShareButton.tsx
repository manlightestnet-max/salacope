import React from 'react';
import { Facebook, Link2, Mail, MessageCircle, Send, Share2, Twitter } from 'lucide-react';
import { Button, Menu, MenuItem, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { formatXaf } from '@/shared/lib';
import { User } from '@/shared/db';
import { storeHref } from '../model';

/** The public address of an offer: the one anybody can open, signed in or not. */
export const publicListingUrl = (listingId: string) => `${window.location.origin}${ROUTES.listing(listingId)}`;

const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

/**
 * Share a public page: on a phone the system's own share sheet (WhatsApp, Facebook, SMS… whatever is installed); on a
 * computer a menu with WhatsApp, Facebook, Telegram, X, e-mail and copy link.
 */
export const ShareMenu: React.FC<{ url: string; title: string; text: string; className?: string }> = ({ url, title, text, className }) => {
  const toast = useToast();
  const enc = encodeURIComponent;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Lien copié');
    } catch {
      toast.error('Copie impossible : sélectionnez le lien dans la barre d’adresse');
    }
  };

  const items: (MenuItem | 'divider')[] = [
    { label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, onSelect: () => open(`https://wa.me/?text=${enc(`${text} ${url}`)}`) },
    { label: 'Facebook', icon: <Facebook className="w-4 h-4" />, onSelect: () => open(`https://www.facebook.com/sharer/sharer.php?u=${enc(url)}`) },
    { label: 'Telegram', icon: <Send className="w-4 h-4" />, onSelect: () => open(`https://t.me/share/url?url=${enc(url)}&text=${enc(text)}`) },
    { label: 'X (Twitter)', icon: <Twitter className="w-4 h-4" />, onSelect: () => open(`https://twitter.com/intent/tweet?text=${enc(text)}&url=${enc(url)}`) },
    { label: 'E-mail', icon: <Mail className="w-4 h-4" />, onSelect: () => (window.location.href = `mailto:?subject=${enc(title)}&body=${enc(`${text}
${url}`)}`) },
    'divider',
    { label: 'Copier le lien', icon: <Link2 className="w-4 h-4" />, onSelect: () => void copy() },
  ];

  const touch = typeof navigator !== 'undefined' && typeof navigator.share === 'function' && window.matchMedia('(pointer: coarse)').matches;
  if (touch) {
    return (
      <Button
        className={className}
        icon={<Share2 className="w-4 h-4" />}
        onClick={() => {
          // Closing the sheet counts as an answer, not an error.
          void navigator.share({ title, text, url }).catch(() => undefined);
        }}
      >
        Partager
      </Button>
    );
  }

  return (
    <Menu
      align="right"
      items={items}
      trigger={({ toggle }) => (
        <Button className={className} icon={<Share2 className="w-4 h-4" />} onClick={toggle} aria-haspopup="menu">
          Partager
        </Button>
      )}
    />
  );
};

/** Share an offer (its public page). */
export const ShareButton: React.FC<{ listing: { id: string; title: string; priceXaf: number }; className?: string }> = ({ listing, className }) => (
  <ShareMenu url={publicListingUrl(listing.id)} title={listing.title} text={`${listing.title} · ${formatXaf(listing.priceXaf)} sur Salacope`} className={className} />
);

/** Share a store: its own address (@name once verified), else its public page. */
export const ShareStoreButton: React.FC<{ seller: Pick<User, 'id' | 'merchant'>; name: string; className?: string }> = ({ seller, name, className }) => (
  <ShareMenu url={`${window.location.origin}${storeHref(seller)}`} title={name} text={`${name} sur Salacope`} className={className} />
);
