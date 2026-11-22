/** `docker run …` to a docker-compose service. Covers the flags people actually use; anything else is reported, not guessed. */

export function tokenize(src: string): string[] {
  const text = src.replace(/(?:\\|`|\^)[ \t]*\r?\n/g, ' ');
  const out: string[] = [];
  let cur = '', has = false, q = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === q) q = '';
      else if (c === '\\' && q === '"' && /["\\$`]/.test(text[i + 1] ?? '')) cur += text[++i];
      else cur += c;
    } else if (c === '"' || c === "'") { q = c; has = true; }
    else if (c === '\\' && i + 1 < text.length) { cur += text[++i]; has = true; }
    else if (/\s/.test(c)) { if (has || cur) { out.push(cur); cur = ''; has = false; } }
    else { cur += c; has = true; }
  }
  if (has || cur) out.push(cur);
  return out;
}

const WITH_VALUE: Record<string, string> = {
  '-p': 'ports', '--publish': 'ports', '-v': 'volumes', '--volume': 'volumes', '-e': 'environment', '--env': 'environment', '--env-file': 'env_file',
  '--name': 'container_name', '--restart': 'restart', '--network': 'network_mode', '--net': 'network_mode', '--gpus': 'gpus', '-w': 'working_dir', '--workdir': 'working_dir',
  '-u': 'user', '--user': 'user', '-h': 'hostname', '--hostname': 'hostname', '--entrypoint': 'entrypoint', '-l': 'labels', '--label': 'labels', '--add-host': 'extra_hosts',
  '--cap-add': 'cap_add', '--device': 'devices', '--shm-size': 'shm_size', '--platform': 'platform', '--dns': 'dns', '--pid': 'pid', '--ipc': 'ipc', '--security-opt': 'security_opt', '--tmpfs': 'tmpfs', '--group-add': 'group_add',
};
const BOOL: Record<string, string | null> = { '-d': null, '--detach': null, '-i': null, '-t': null, '--interactive': null, '--tty': null, '-P': null, '--privileged': 'privileged', '--init': 'init', '--read-only': 'read_only' };
const SERVICE_KEY_ORDER = ['image', 'container_name', 'hostname', 'platform', 'restart', 'network_mode', 'user', 'working_dir', 'privileged', 'init', 'read_only', 'shm_size', 'pid', 'ipc'];

const scalar = (v: string): string => (/^[A-Za-z_/.][\w./@:+=-]*$/.test(v) && !/^(true|false|yes|no|null|on|off)$/i.test(v) ? v : JSON.stringify(v));
const list = (items: string[], indent = '    '): string => items.map((x) => `${indent}  - ${x}`).join('\n');

export function toCompose(cmd: string): { yaml: string; warnings: string[] } {
  const warnings: string[] = [];
  let a = tokenize(cmd);
  if (a[0] === 'docker') a = a.slice(1);
  if (a[0] === 'run') a = a.slice(1);
  const lists: Record<string, string[]> = {};
  const one: Record<string, string> = {};
  let gpus = '';
  let image = '';
  let command: string[] = [];

  for (let i = 0; i < a.length; i++) {
    let t = a[i];
    if (!t.startsWith('-') || t === '-') { image = t; command = a.slice(i + 1); break; }
    let val: string | undefined;
    const eq = t.startsWith('--') ? t.indexOf('=') : -1;
    if (eq > 0) { val = t.slice(eq + 1); t = t.slice(0, eq); }
    else if (/^-[a-zA-Z].+/.test(t) && !t.startsWith('--') && !(t in WITH_VALUE) && !(t in BOOL)) {
      const flag = t.slice(0, 2);
      if (flag in WITH_VALUE) { val = t.slice(2); t = flag; } // -p8080:80
      else if ([...t.slice(1)].every((c) => `-${c}` in BOOL)) { for (const c of t.slice(1)) { const k = BOOL[`-${c}`]; if (k) one[k] = 'true'; } continue; } // -dit
    }
    if (t in WITH_VALUE) {
      const v = val ?? a[++i] ?? '';
      const key = WITH_VALUE[t];
      if (key === 'gpus') gpus = v;
      else if (['ports', 'volumes', 'environment', 'env_file', 'labels', 'extra_hosts', 'cap_add', 'devices', 'dns', 'security_opt', 'tmpfs', 'group_add'].includes(key)) (lists[key] ??= []).push(v);
      else one[key] = v;
    } else if (t in BOOL) { if (BOOL[t]) one[BOOL[t]!] = 'true'; }
    else warnings.push(t === '--rm' ? '--rm has no compose equivalent (use `docker compose run --rm`).' : `${t} was not converted.`);
  }
  if (!image) return { yaml: '', warnings: [...warnings, 'No image found in the command.'] };

  const name = one.container_name ?? image.split('/').pop()!.split(/[:@]/)[0];
  const svc: string[] = [`    image: ${scalar(image)}`];
  one.image = image;
  for (const k of SERVICE_KEY_ORDER.slice(1)) if (one[k] !== undefined) svc.push(`    ${k}: ${/^\d+$/.test(one[k]) || one[k] === 'true' ? (one[k] === 'true' ? 'true' : JSON.stringify(one[k])) : scalar(one[k])}`);
  if (one.entrypoint) svc.push(`    entrypoint: ${JSON.stringify(tokenize(one.entrypoint))}`.replace(/","/g, '", "'));
  if (command.length) svc.push(`    command: ${command.length === 1 ? scalar(command[0]) : `[${command.map((x) => JSON.stringify(x)).join(', ')}]`}`);
  const named: string[] = [];
  for (const [key, items] of Object.entries(lists)) {
    const q = key === 'ports' || key === 'environment' || key === 'labels' ? (x: string) => (key === 'ports' ? JSON.stringify(x) : /[\s:#]/.test(x.split('=').slice(1).join('=')) || /["']/.test(x) ? JSON.stringify(x) : x) : scalarList;
    svc.push(`    ${key}:\n${list(items.map(q))}`);
    if (key === 'volumes') for (const v of items) { const src = v.split(':')[0]; if (src && !/^[./~]|^[A-Za-z]:[\\/]/.test(src) && v.includes(':')) named.push(src); }
  }
  if (gpus) {
    const dev = gpus.startsWith('device=') ? `\n              device_ids: [${gpus.slice(7).split(',').map((x) => JSON.stringify(x.replace(/"/g, ''))).join(', ')}]` : `\n              count: ${gpus === 'all' ? 'all' : /^\d+$/.test(gpus) ? gpus : 'all'}`;
    svc.push(`    deploy:\n      resources:\n        reservations:\n          devices:\n            - driver: nvidia${dev}\n              capabilities: [gpu]`);
  }
  let yaml = `services:\n  ${scalar(name)}:\n${svc.join('\n')}\n`;
  if (named.length) yaml += `volumes:\n${[...new Set(named)].map((v) => `  ${scalar(v)}:`).join('\n')}\n`;
  return { yaml, warnings };
}

function scalarList(x: string): string { return /^[^\s:"'#]+(:[^\s"'#]+)*$/.test(x) ? x : JSON.stringify(x); }
