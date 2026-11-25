/** Paper sizes in millimetres (portrait, width first) and their size in other units. */
export interface Paper { name: string; group: 'A' | 'B' | 'C' | 'US'; mm: [number, number] }

export const PAPERS: Paper[] = [
  ...([[841, 1189], [594, 841], [420, 594], [297, 420], [210, 297], [148, 210], [105, 148], [74, 105], [52, 74], [37, 52], [26, 37]] as [number, number][]).map((mm, n): Paper => ({ name: `A${n}`, group: 'A', mm })),
  ...([[1000, 1414], [707, 1000], [500, 707], [353, 500], [250, 353], [176, 250], [125, 176], [88, 125], [62, 88], [44, 62], [31, 44]] as [number, number][]).map((mm, n): Paper => ({ name: `B${n}`, group: 'B', mm })),
  ...([[917, 1297], [648, 917], [458, 648], [324, 458], [229, 324], [162, 229], [114, 162], [81, 114], [57, 81]] as [number, number][]).map((mm, n): Paper => ({ name: `C${n}`, group: 'C', mm })),
  { name: 'Letter', group: 'US', mm: [215.9, 279.4] },
  { name: 'Legal', group: 'US', mm: [215.9, 355.6] },
  { name: 'Tabloid', group: 'US', mm: [279.4, 431.8] },
  { name: 'Executive', group: 'US', mm: [184.15, 266.7] },
];

type Pair = [number, number];
const map = (p: Pair, f: (v: number) => number): Pair => [f(p[0]), f(p[1])];

/** Millimetres, inches (two decimals), points (1/72 in) and pixels at `ppi`. Unknown names give A4. */
export function paperSize(name: string, ppi: number, landscape: boolean): { mm: Pair; inch: Pair; pt: Pair; px: Pair } {
  const paper = PAPERS.find((p) => p.name === name) ?? PAPERS.find((p) => p.name === 'A4')!;
  const mm: Pair = landscape ? [paper.mm[1], paper.mm[0]] : [...paper.mm];
  return { mm, inch: map(mm, (v) => Math.round((v / 25.4) * 100) / 100), pt: map(mm, (v) => Math.round((v / 25.4) * 72)), px: map(mm, (v) => Math.round((v / 25.4) * ppi)) };
}
