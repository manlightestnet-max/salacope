/** Resolves with `promise`, but never before `ms` (so a transition screen is readable). */
export const atLeast = async <T>(promise: Promise<T>, ms: number): Promise<T> => {
  const [value] = await Promise.all([promise, new Promise((r) => setTimeout(r, ms))]);
  return value;
};
