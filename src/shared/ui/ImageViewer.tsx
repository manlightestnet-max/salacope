import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { ChevronLeft, ChevronRight, Minus, Plus, X } from 'lucide-react';
import { useBodyScrollLock, useKeyPress } from '../hooks';

export interface ViewerImage {
  src: string;
  alt?: string;
}

export interface ImageViewerProps {
  images: ViewerImage[];
  /** Image shown; `null` = closed. */
  index: number | null;
  onIndex: (index: number | null) => void;
}

const MIN = 1;
const MAX = 4;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Full-screen image viewer shared by the whole app (chat, offers, reviews): zoom with the wheel,
 * the buttons, a double click or two fingers; drag to explore a zoomed image; arrows to browse.
 */
export const ImageViewer: React.FC<ImageViewerProps> = ({ images, index, onIndex }) => {
  const open = index !== null && images.length > 0;
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ distance: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useBodyScrollLock(open);
  const close = () => onIndex(null);
  const go = (step: number) => index !== null && images.length > 1 && onIndex((index + step + images.length) % images.length);
  useKeyPress('Escape', close, open);
  useKeyPress('ArrowLeft', () => go(-1), open);
  useKeyPress('ArrowRight', () => go(1), open);

  // A new image always opens whole and centred.
  useEffect(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, [index]);

  if (!open) return null;
  const image = images[index!];

  const zoomTo = (next: number) => {
    const s = clamp(next, MIN, MAX);
    setScale(s);
    if (s === 1) setOffset({ x: 0, y: 0 });
  };

  const distance = () => {
    const [a, b] = [...pointers.current.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return; // arrows keep their click
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) pinch.current = { distance: distance(), scale };
    else drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      zoomTo(pinch.current.scale * (distance() / pinch.current.distance));
    } else if (drag.current && scale > 1) {
      setOffset({ x: drag.current.ox + e.clientX - drag.current.x, y: drag.current.oy + e.clientY - drag.current.y });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
  };

  const control = 'w-10 h-10 rounded-full flex items-center justify-center bg-white/10 text-white hover:bg-white/20 transition-colors';

  return createPortal(
    <div className="fixed inset-0 z-[60] bg-black/90 flex flex-col" role="dialog" aria-modal="true" aria-label="Image">
      <div className="shrink-0 h-14 px-3 flex items-center gap-2 text-white">
        <span className="text-sm tabular-nums text-white/70">{images.length > 1 ? `${index! + 1} / ${images.length}` : ''}</span>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className={control} onClick={() => zoomTo(scale - 0.5)} disabled={scale <= MIN} aria-label="Dézoomer">
            <Minus className="w-4 h-4" />
          </button>
          <button type="button" className={control} onClick={() => zoomTo(scale + 0.5)} disabled={scale >= MAX} aria-label="Zoomer">
            <Plus className="w-4 h-4" />
          </button>
          <button type="button" className={control} onClick={close} aria-label="Fermer">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={clsx('relative flex-1 min-h-0 overflow-hidden touch-none select-none', scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
        onWheel={(e) => zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15))}
        onDoubleClick={() => zoomTo(scale > 1 ? 1 : 2)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClick={(e) => e.target === e.currentTarget && scale === 1 && close()}
      >
        <img
          src={image.src}
          alt={image.alt ?? ''}
          draggable={false}
          className="absolute inset-0 m-auto max-w-full max-h-full object-contain transition-transform duration-75 motion-reduce:transition-none"
          style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})` }}
        />
        {images.length > 1 && (
          <>
            <button type="button" className={clsx(control, 'absolute left-3 top-1/2 -translate-y-1/2')} onClick={() => go(-1)} aria-label="Image précédente">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button type="button" className={clsx(control, 'absolute right-3 top-1/2 -translate-y-1/2')} onClick={() => go(1)} aria-label="Image suivante">
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
