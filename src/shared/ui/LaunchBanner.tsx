import React from 'react';
import { Link } from 'react-router-dom';
import { isAdminHost } from '@/shared/config/hosts';
import { LaunchBannerSettings, useLaunchBannerSettings } from '@/shared/config/launchBanner';

/** How the notice looks (also used by the administration's preview). */
export const LaunchBannerView: React.FC<{ settings: LaunchBannerSettings }> = ({ settings: s }) => {
  const external = /^https?:\/\//.test(s.buttonLink);
  const buttonClass = 'shrink-0 h-6 px-2.5 inline-flex items-center rounded-full bg-accent text-on-accent text-[11px] font-medium hover:opacity-90';
  return (
    <div role="note" className="shrink-0 bg-gray-100 border-b border-gray-200/60 text-gray-700 text-xs">
      <p className="h-9 px-4 flex items-center justify-center gap-2 text-center">
        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden />
        <span className="truncate">{s.text}</span>
        {s.secondary && (
          <>
            <span className="hidden sm:inline text-gray-400" aria-hidden>
              ·
            </span>
            <span className="hidden sm:inline text-gray-500 truncate" lang="en">
              {s.secondary}
            </span>
          </>
        )}
        {s.style === 'button' && s.buttonLabel && s.buttonLink && (external ? (
          <a href={s.buttonLink} target="_blank" rel="noreferrer noopener" className={buttonClass}>
            {s.buttonLabel}
          </a>
        ) : (
          <Link to={s.buttonLink} className={buttonClass}>
            {s.buttonLabel}
          </Link>
        ))}
      </p>
    </div>
  );
};

/** Thin notice above the header, set from Admin > Bannière. */
export const LaunchBanner: React.FC = () => {
  const settings = useLaunchBannerSettings();
  if (isAdminHost() || !settings.enabled || !settings.text) return null;
  return <LaunchBannerView settings={settings} />;
};
