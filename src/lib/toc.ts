/** Index of the heading the reader is in: the last one whose top edge has passed `offset` (a heading near the top counts as reached). -1 when there are none. */
export function activeHeading(tops: number[], offset: number): number {
  if (tops.length === 0) return -1;
  let active = 0;
  tops.forEach((top, i) => { if (top <= offset) active = i; });
  return active;
}
