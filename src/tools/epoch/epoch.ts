import { copy, iconButton } from '../dom';
import { iso, isoWeek, parseStamp, stamps, type Unit } from './logic';

const root = document.querySelector<HTMLElement>('[data-epoch]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const loc = root.dataset.lang!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const input = q<HTMLInputElement>('[name="v"]');
  const unit = q<HTMLSelectElement>('[name="unit"]');
  const names: Record<Unit, string> = { s: s.sec, ms: s.ms, us: s.us, ns: s.ns };

  const relative = (ms: number) => {
    const diff = ms - Date.now();
    const steps: [Intl.RelativeTimeFormatUnit, number][] = [['year', 31557600e3], ['month', 2629800e3], ['day', 864e5], ['hour', 36e5], ['minute', 6e4], ['second', 1e3]];
    const [u, size] = steps.find(([, z]) => Math.abs(diff) >= z) ?? steps[5];
    return new Intl.RelativeTimeFormat(loc, { numeric: 'auto' }).format(Math.round(diff / size), u);
  };

  function row(label: string, value: string) {
    const tr = document.createElement('tr');
    const th = Object.assign(document.createElement('th'), { textContent: label });
    const td = Object.assign(document.createElement('td'), { className: 'val mono' });
    const b = iconButton('copy', s.copy, true);
    b.addEventListener('click', () => copy(value, b));
    td.append(value, b);
    tr.append(th, td);
    return tr;
  }

  function render() {
    const r = parseStamp(input.value, (unit.value || undefined) as Unit | undefined);
    const bad = !!input.value.trim() && !r;
    q('[data-error]').hidden = !bad;
    q('[data-ok]').hidden = !r;
    q('[data-unit-note]').textContent = r?.unit && !unit.value ? s.unitNote.replace('{u}', names[r.unit]) : '';
    if (!r) return;
    const st = stamps(r.ms);
    const when = new Date(r.ms);
    const local = new Intl.DateTimeFormat(loc, { dateStyle: 'full', timeStyle: 'long' }).format(when);
    const wk = isoWeek(r.ms);
    q('[data-rows]').replaceChildren(
      row(s.sec, st.s), row(s.ms, st.ms), row(s.us, st.us), row(s.ns, st.ns),
      row(s.utc, iso(r.ms) ?? ''), row(s.local, local), row(s.rel, relative(r.ms)),
      row(s.week, `${wk.year}-W${String(wk.week).padStart(2, '0')}`),
      row(s.day, new Intl.DateTimeFormat(loc, { weekday: 'long', timeZone: 'UTC' }).format(when)),
    );
  }

  const tick = () => { q('[data-tick]').textContent = String(Math.floor(Date.now() / 1000)); };
  tick();
  setInterval(tick, 1000);
  root.addEventListener('input', render);
  q('[data-now]').addEventListener('click', () => { input.value = String(Math.floor(Date.now() / 1000)); unit.value = ''; render(); });
  input.value = String(Math.floor(Date.now() / 1000));
  render();
}
