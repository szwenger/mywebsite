import { buildIcs } from './logic';
import { wallToInstant } from '../tz/logic';
import { download } from '../dom';

const root = document.querySelector<HTMLElement>('[data-ics]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const f = (n: string) => root.querySelector<HTMLInputElement & HTMLSelectElement & HTMLTextAreaElement>(`[name="${n}"]`)!;
  const status = root.querySelector<HTMLElement>('[data-status]')!;
  const local = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const zones: string[] = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.('timeZone') ?? [local];
  f('zone').replaceChildren(...[...new Set([local, 'UTC', ...zones])].map((z) => Object.assign(document.createElement('option'), { value: z, textContent: z })));
  f('zone').value = local;
  const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  f('sd').value = f('ed').value = today;

  const say = (msg: string, kind: 'good' | 'bad') => { status.hidden = false; status.className = `note ${kind}`; status.textContent = msg; };
  const toggle = () => root.querySelectorAll<HTMLElement>('[data-timed]').forEach((el) => { el.hidden = f('allday').checked; });
  toggle();

  root.addEventListener('change', (e) => {
    toggle();
    // Keep the end from falling behind the start while the user fills in the form.
    if ((e.target as HTMLInputElement).name === 'sd' && f('ed').value < f('sd').value) f('ed').value = f('sd').value;
  });

  root.querySelector('[data-save]')!.addEventListener('click', () => {
    const title = f('title').value.trim();
    const allDay = f('allday').checked;
    if (!title || !f('sd').value) return say(s.badStart, 'bad');
    const ed = f('ed').value || f('sd').value;
    const start = allDay ? f('sd').value : wallToInstant(f('sd').value, f('st').value || '00:00', f('zone').value);
    const end = allDay ? ed : wallToInstant(ed, f('et').value || f('st').value || '00:00', f('zone').value);
    if (allDay ? ed < f('sd').value : !(end > (start as number))) return say(s.badEnd, 'bad');
    const remind = Number(f('remind').value);
    download(buildIcs({
      uid: `${crypto.randomUUID()}@galuin.com`, now: Date.now(), title, start, end,
      location: f('place').value.trim(), description: f('desc').value.trim(), url: f('url').value.trim(),
      remindMin: remind >= 0 ? remind : undefined, repeat: f('repeat').value as '',
    }), `${title.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '').slice(0, 40) || 'event'}.ics`, 'text/calendar');
    say(s.ready, 'good');
  });
}
