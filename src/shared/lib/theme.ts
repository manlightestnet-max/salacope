export type Theme = 'dark' | 'light';

/** Night is the default; the choice is stored per browser. Applied before render by index.html. */
export const THEME_KEY = 'salacope.theme';
export const DEFAULT_THEME: Theme = 'dark';

const THEME_COLOR: Record<Theme, string> = { dark: '#0b0b0c', light: '#ffffff' };

export const getTheme = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : DEFAULT_THEME);

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // preference only
  }
}
