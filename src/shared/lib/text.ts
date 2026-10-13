/** Words for search and recommendations: lower case, no accents, no small words. */

export const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[’']/g, ' ');

const STOP = new Set(
  'les des une pour avec dans sur par aux est son ses vos votre vous nous notre leur leurs qui que quoi dont tout tous toute toutes plus moins tres bien comme sans sous entre chez mais donc ainsi cette ces cet sont etre avoir fait faire mon mes ton tes the and for with your from into guide'.split(' ')
);

/** Meaningful words of a text (3 letters or more, common words left out), each once. */
export const words = (s: string): string[] => [...new Set(fold(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w)))];

/** Rough stem, so "formations" finds "formation" and "marketing" finds "marketeur": the first letters of the word. */
export const stem = (w: string) => (w.length > 6 ? w.slice(0, Math.max(5, w.length - 3)) : w.replace(/s$/, ''));

/** Two words that differ by one letter (typo), for words long enough not to confuse. */
export function nearlySame(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < 5 || b.length < 5 || Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
