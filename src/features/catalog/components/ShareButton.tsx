import React from 'react';
import { Facebook, Link2, Mail, MessageCircle, Send, Share2, Twitter } from 'lucide-react';
import { Button, Menu, MenuItem, useToast } from '@/shared/ui';
import { ROUTES } from '@/shared/config/routes';
import { formatXaf } from '@/shared/lib';

/** The public address of an offer: the one anybody can open, signed in or not. */
export const publicListingUrl = (listingId: string) => `${window.location.origin}${ROUTES.listing(listingId)}`;

const open = (url: string) => window.open(url, '_blank', 'noopener,noreferrer');

/**
 * Share an offer: on a phone the system's own share sheet (WhatsApp, Facebook, SMS… whatever is installed); on a computer
 * a menu with WhatsApp, Facebook, Telegram, X, e-mail and copy link. The link is always the public page of the offer.
 */
export const ShareButton: React.FC<{ listing: { id: string; title: string; priceXaf: number }; className?: string }> = ({ listing, className }) => {
  const toast = useToast();
  const url = publicListingUrl(listing.id);
  const text = `${listing.title} · ${formatXaf(listing.priceXaf)} sur Salacope`;
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
    { label: 'E-mail', icon: <Mail className="w-4 h-4" />, onSelect: () => (window.location.href = `mailto:?subject=${enc(listing.title)}&body=${enc(`${text}\n${url}`)}`) },
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
          void navigator.share({ title: listing.title, text, url }).catch(() => undefined);
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
