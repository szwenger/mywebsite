import { discord, parseStamp, wallToInstant } from './logic';
import { copy } from '../dom';

const root = document.querySelector<HTMLElement>('[data-tz]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const loc = root.dataset.lang!;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [local, 'UTC'];
  const SHOWN = ['UTC', 'Europe/London', 'Europe/Berlin', 'Europe/Moscow', 'America/New_York', 'America/Los_Angeles', 'Asia/Kolkata', 'Asia/Tokyo', 'Australia/Sydney'];
  let ms = NaN;

  const zone = f('zone') as HTMLSelectElement;
  for (const z of [...new Set(['UTC', local, ...zones])]) zone.add(new Option(z, z));
  zone.value = local;

  const fmt = (t: number, z: string) => new Intl.DateTimeFormat(loc, { timeZone: z, dateStyle: 'full', timeStyle: 'short' }).format(t);
  const tbody = q('[data-zones]');
  const row = (label: string, text: string) => {
    const th = document.createElement('th'), td = document.createElement('td');
    th.textContent = label; td.textContent = text;
    tbody.insertRow().append(th, td);
  };

  function show(t: number, viewOnly: boolean) {
    tbody.replaceChildren();
    row(s.local, fmt(t, local));
    for (const z of SHOWN) if (z !== local) row(z.replace('_', ' '), fmt(t, z));
    root!.querySelectorAll<HTMLElement>('[data-discord]').forEach((el) => { el.textContent = discord(t, el.dataset.discord!); });
    const v = q('[data-viewing]');
    v.hidden = !viewOnly;
    v.textContent = viewOnly ? `${s.viewing}: ${fmt(t, local)} (${local})` : '';
  }

  function update() {
    ms = wallToInstant(f('date').value, f('time').value, zone.value);
    q('[data-invalid]').hidden = !Number.isNaN(ms);
    if (Number.isNaN(ms)) return;
    q<HTMLInputElement>('[name="link"]').value = `${location.origin}${location.pathname}?t=${Math.floor(ms / 1000)}`;
    show(ms, false);
  }

  const shared = parseStamp(location.search);
  if (!Number.isNaN(shared)) {
    // Opened from a shared link: prefill the form with the moment in the viewer's own zone and say when it is for them.
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: local, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(shared).map((x) => [x.type, x.value]));
    f('date').value = `${p.year}-${p.month}-${p.day}`;
    f('time').value = `${p.hour}:${p.minute}`;
  } else {
    f('date').value = new Date(Date.now() + 86400000).toLocaleDateString('en-CA');
  }
  update();
  if (!Number.isNaN(shared)) show(shared, true);

  root.addEventListener('input', update);
  q('[data-copy-link]').addEventListener('click', (e) => copy(q<HTMLInputElement>('[name="link"]').value, e.currentTarget as HTMLElement));
  root.querySelectorAll<HTMLElement>('[data-copy-d]').forEach((b) => b.addEventListener('click', () => copy(discord(ms, b.dataset.copyD!), b)));
}
