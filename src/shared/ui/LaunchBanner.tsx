import React from 'react';

/** Thin notice above the header until the public launch (FR, and EN for partners reviewing the site). */
export const LaunchBanner: React.FC = () => (
  <div role="note" className="shrink-0 bg-gray-100 border-b border-gray-200/60 text-gray-700 text-xs">
    <p className="h-8 px-4 flex items-center justify-center gap-2 text-center truncate">
      <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
      <span>Site en cours de développement, lancement très bientôt</span>
      <span className="hidden sm:inline text-gray-400" aria-hidden>
        ·
      </span>
      <span className="hidden sm:inline text-gray-500" lang="en">
        Under development, going live soon
      </span>
    </p>
  </div>
);
