import React, { useState } from 'react';
import clsx from 'clsx';
import { Moon, Sun } from 'lucide-react';
import { Theme, applyTheme, getTheme } from '../lib/theme';

/** Night / light switch. */
export const ThemeToggle: React.FC<{ className?: string }> = ({ className }) => {
  const [theme, setTheme] = useState<Theme>(getTheme);
  const next: Theme = theme === 'dark' ? 'light' : 'dark';
  const label = next === 'light' ? 'Passer en thème clair' : 'Passer en thème nuit';
  const Icon = theme === 'dark' ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        setTheme(next);
      }}
      aria-label={label}
      title={label}
      className={clsx('w-8 h-8 flex items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-900', className)}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
};
