const LOCALE = 'fr-FR';

/** 12500 -> "12 500 FCFA" */
export const formatXaf = (amount: number): string => `${Math.round(amount).toLocaleString(LOCALE)} FCFA`;

/** 12500 -> "12 500" */
export const formatNumber = (value: number): string => value.toLocaleString(LOCALE);

const safeFormat = (value: string | undefined, options?: Intl.DateTimeFormatOptions): string => {
  if (!value) return '';
  try {
    return new Intl.DateTimeFormat(LOCALE, options).format(new Date(value));
  } catch {
    return value;
  }
};

/** "12 mars 2026" */
export const formatDate = (value?: string): string =>
  safeFormat(value, { day: 'numeric', month: 'short', year: 'numeric' });

/** "12 mars 2026, 14:05" */
export const formatDateTime = (value?: string): string =>
  safeFormat(value, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

/** "mars 2026" */
export const formatMonthYear = (value?: string): string => safeFormat(value, { month: 'long', year: 'numeric' });

const rtf = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' });

/** "il y a 3 heures", "hier", "dans 2 jours" */
export const formatRelative = (value?: string, now = Date.now()): string => {
  if (!value) return '';
  const diffSec = (new Date(value).getTime() - now) / 1000;
  const abs = Math.abs(diffSec);
  if (abs < 60) return "à l'instant";
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 86400 * 30) return rtf.format(Math.round(diffSec / 86400), 'day');
  return formatDate(value);
};

/** "Grace Ntsiba" -> "GN" */
export const getInitials = (name: string, max = 2): string =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, max)
    .toUpperCase();

/** File size in bytes -> "820 Ko" / "2,4 Mo" */
export const formatFileSize = (bytes: number): string => {
  const mb = bytes / (1024 * 1024);
  return mb < 1 ? `${Math.max(1, Math.round(bytes / 1024))} Ko` : `${mb.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} Mo`;
};

export const plural = (count: number, singular: string, pluralForm = `${singular}s`) =>
  `${formatNumber(count)} ${count > 1 ? pluralForm : singular}`;
