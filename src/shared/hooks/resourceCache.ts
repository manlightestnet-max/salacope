/**
 * The last answer of each screen's data, kept for the whole visit. Going back to a tab or a screen shows it at once and the
 * data is checked again in the background (stale-while-revalidate, as the catalogue does): a shimmer is only for the very
 * first load of something never seen. The key is the loading code plus its arguments, so two screens loading the same thing
 * share the answer.
 */
const answers = new Map<string, unknown>();
const MAX = 150;

export const cacheKey = (load: unknown, deps: unknown[]) => {
  let args: string;
  try {
    args = JSON.stringify(deps);
  } catch {
    args = String(deps);
  }
  return `${String(load)}|${args}`;
};

export const cached = <T>(key: string): T | undefined => answers.get(key) as T | undefined;
export const remember = (key: string, value: unknown) => {
  if (value === undefined) return;
  answers.delete(key);
  answers.set(key, value);
  if (answers.size > MAX) answers.delete(answers.keys().next().value as string);
};
