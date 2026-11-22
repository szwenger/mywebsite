// IPv4 only. ponytail: IPv6 needs BigInt maths and a different "host" idea; add when asked.
export const toIp = (n: number): string => [n >>> 24, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');

/** Dotted quad to a 32-bit unsigned number, or null. Rejects leading zeros ("010" is octal in some tools). */
export function fromIp(s: string): number | null {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(s.trim());
  if (!m) return null;
  const p = m.slice(1).map((x) => (x.length > 1 && x[0] === '0' ? NaN : Number(x)));
  return p.some((x) => !(x <= 255)) ? null : ((p[0] << 24) | (p[1] << 16) | (p[2] << 8) | p[3]) >>> 0;
}

const maskOf = (prefix: number): number => (prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0);

export interface Subnet { ip: string; prefix: number; mask: string; wildcard: string; network: string; broadcast: string; first: string; last: string; hosts: number; total: number; kind: string }

/** "192.168.1.10/24", "10.0.0.1 255.255.0.0" or a bare address (/32). Throws Error('format'|'prefix'|'mask'). */
export function parseCidr(input: string): Subnet {
  const m = /^\s*(\S+?)\s*(?:\/\s*(\d+)|\s+(\d+\.\d+\.\d+\.\d+))?\s*$/.exec(input);
  const ip = m && fromIp(m[1]);
  if (!m || ip === null) throw new Error('format');
  let prefix = 32;
  if (m[2] !== undefined) { prefix = Number(m[2]); if (prefix > 32) throw new Error('prefix'); }
  else if (m[3] !== undefined) {
    const mk = fromIp(m[3]);
    // A valid mask is ones followed by zeros: its complement plus one is a power of two (2^32 for 0.0.0.0).
    const inv = mk === null ? 1 : ~mk >>> 0;
    if (mk === null || (inv & (inv + 1)) !== 0) throw new Error('mask');
    prefix = 32 - Math.log2(inv + 1);
  }
  return describe(ip, prefix);
}

function describe(ip: number, prefix: number): Subnet {
  const mask = maskOf(prefix);
  const network = (ip & mask) >>> 0;
  const broadcast = (network | ~mask) >>> 0;
  const total = 2 ** (32 - prefix);
  // /31 (point-to-point, RFC 3021) and /32 have no network or broadcast address to spare.
  const usable = prefix >= 31;
  return {
    ip: toIp(ip), prefix, mask: toIp(mask), wildcard: toIp(~mask >>> 0), network: toIp(network), broadcast: toIp(broadcast),
    first: toIp(usable ? network : network + 1), last: toIp(usable ? broadcast : broadcast - 1),
    hosts: prefix === 32 ? 1 : prefix === 31 ? 2 : total - 2, total, kind: kindOf(network),
  };
}

/** Private, loopback, link-local, CGNAT, multicast or public, by the first address of the network. */
export function kindOf(n: number): string {
  const r = (a: string, p: number) => (n & maskOf(p)) >>> 0 === fromIp(a);
  if (r('10.0.0.0', 8) || r('172.16.0.0', 12) || r('192.168.0.0', 16)) return 'private';
  if (r('127.0.0.0', 8)) return 'loopback';
  if (r('169.254.0.0', 16)) return 'linklocal';
  if (r('100.64.0.0', 10)) return 'cgnat';
  if (r('224.0.0.0', 4)) return 'multicast';
  if (r('240.0.0.0', 4)) return 'reserved';
  if (n === 0) return 'this';
  return 'public';
}

/** Splits a network into equal subnets of a longer prefix; at most `max` are returned. Throws Error('prefix') unless it is longer than the current one. */
export function split(input: string, newPrefix: number, max = 256): { subnets: Subnet[]; count: number } {
  const s = parseCidr(input);
  if (!Number.isInteger(newPrefix) || newPrefix <= s.prefix || newPrefix > 32) throw new Error('prefix');
  const count = 2 ** (newPrefix - s.prefix);
  const base = fromIp(s.network)!;
  const step = 2 ** (32 - newPrefix);
  return { count, subnets: Array.from({ length: Math.min(count, max) }, (_, i) => describe(base + i * step, newPrefix)) };
}
