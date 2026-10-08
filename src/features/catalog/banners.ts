import { useEffect, useState } from 'react';
import { request } from '@/shared/api';

/** One advertising slot of the storefront banner, set by an administrator. */
export interface Banner {
  position: number;
  image: string;
  title: string;
  link: string;
}

// Kept for the session: coming back to the storefront shows the banner at once, and refreshes it in the background.
let cache: Banner[] | null = null;

export function useBanners(): Banner[] | null {
  const [banners, setBanners] = useState<Banner[] | null>(cache);
  useEffect(() => {
    let live = true;
    request<{ banners: Banner[] }>('GET', '/banners').then(
      (r) => {
        cache = r.banners;
        if (live) setBanners(r.banners);
      },
      () => live && setBanners((b) => b ?? [])
    );
    return () => {
      live = false;
    };
  }, []);
  return banners;
}
