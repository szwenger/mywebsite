/** Line diff with Myers' O(ND) algorithm, after trimming the common head and tail. */
export type Op = { t: 'eq' | 'add' | 'del'; text: string };
export interface Opts { ignoreWs?: boolean; ignoreCase?: boolean }

export function splitLines(s: string): string[] {
  if (!s) return [];
  const lines = s.replace(/\r\n?/g, '\n').split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines;
}

export function diffLines(a: string, b: string, o: Opts = {}): { ops: Op[]; stats: { added: number; removed: number } } {
  const A = splitLines(a), B = splitLines(b);
  const norm = (s: string) => { if (o.ignoreWs) s = s.replace(/\s+/g, ' ').trim(); return o.ignoreCase ? s.toLowerCase() : s; };
  const na = A.map(norm), nb = B.map(norm);
  let head = 0;
  while (head < na.length && head < nb.length && na[head] === nb[head]) head++;
  let tail = 0;
  while (tail < na.length - head && tail < nb.length - head && na[na.length - 1 - tail] === nb[nb.length - 1 - tail]) tail++;
  const mid = myers(na.slice(head, na.length - tail), nb.slice(head, nb.length - tail));
  const ops: Op[] = [];
  for (let i = 0; i < head; i++) ops.push({ t: 'eq', text: B[i] });
  let ia = head, ib = head;
  for (const m of mid) {
    if (m === 'eq') { ops.push({ t: 'eq', text: B[ib] }); ia++; ib++; }
    else if (m === 'del') ops.push({ t: 'del', text: A[ia++] });
    else ops.push({ t: 'add', text: B[ib++] });
  }
  for (let i = 0; i < tail; i++) ops.push({ t: 'eq', text: B[nb.length - tail + i] });
  return { ops, stats: { added: ops.filter((x) => x.t === 'add').length, removed: ops.filter((x) => x.t === 'del').length } };
}

/** Past this many edits the texts are too different to align line by line; the rest is shown as removed and added (memory stays below ~100 MB). */
const MAX_EDITS = 4000;

function myers(a: string[], b: string[]): ('eq' | 'add' | 'del')[] {
  const n = a.length, m = b.length;
  if (!n) return b.map(() => 'add');
  if (!m) return a.map(() => 'del');
  const max = Math.min(n + m, MAX_EDITS), off = max + 1;
  const v = new Int32Array(2 * max + 3);
  const trace: Int32Array[] = []; // trace[d] holds v for diagonals -d-1 .. d+1 as they were before round d
  for (let d = 0; d <= max; d++) {
    trace.push(v.slice(off - d - 1, off + d + 2));
    for (let k = -d; k <= d; k += 2) {
      let x = k === -d || (k !== d && v[off + k - 1] < v[off + k + 1]) ? v[off + k + 1] : v[off + k - 1] + 1;
      let y = x - k;
      while (x < n && y < m && a[x] === b[y]) { x++; y++; }
      v[off + k] = x;
      if (x >= n && y >= m) return backtrack(trace, n, m, d);
    }
  }
  return [...a.map((): 'del' => 'del'), ...b.map((): 'add' => 'add')];
}

function backtrack(trace: Int32Array[], n: number, m: number, dEnd: number): ('eq' | 'add' | 'del')[] {
  const out: ('eq' | 'add' | 'del')[] = [];
  let x = n, y = m;
  for (let d = dEnd; d > 0; d--) {
    const v = trace[d], at = (k: number) => v[d + 1 + k];
    const k = x - y;
    const prevK = k === -d || (k !== d && at(k - 1) < at(k + 1)) ? k + 1 : k - 1;
    const px = at(prevK), py = px - prevK;
    const midX = prevK === k + 1 ? px : px + 1;
    while (x > midX) { out.push('eq'); x--; y--; }
    out.push(prevK === k + 1 ? 'add' : 'del');
    x = px; y = py;
  }
  while (x > 0) { out.push('eq'); x--; }
  return out.reverse();
}
