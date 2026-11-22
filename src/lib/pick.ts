/** `n` distinct random items (Fisher-Yates on a copy); the input is left alone. */
export function pickRandom<T>(xs: T[], n: number, rng: () => number = Math.random): T[] {
  const a = [...xs];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
