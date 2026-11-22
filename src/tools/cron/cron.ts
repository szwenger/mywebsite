import { nextRuns, parseCron } from './logic';

const root = document.querySelector<HTMLElement>('[data-cron]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, string>;
  const loc = root.dataset.lang!;
  const expr = root.querySelector<HTMLInputElement>('[name="expr"]')!;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const utc = () => root.querySelector<HTMLInputElement>('[name="tz"]:checked')!.value === 'utc';
  const el = (tag: string, text = '') => Object.assign(document.createElement(tag), { textContent: text });
  // 2026-01-04 is a Sunday: day-of-week number n is that date plus n days.
  const monthName = (m: number) => new Intl.DateTimeFormat(loc, { month: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, m - 1, 1));
  const dayName = (d: number) => new Intl.DateTimeFormat(loc, { weekday: 'short', timeZone: 'UTC' }).format(Date.UTC(2026, 0, 4 + d));

  function render() {
    try {
      const c = parseCron(expr.value);
      q('[data-error]').hidden = true;
      q('[data-ok]').hidden = false;
      const rows: [string, number[], number, (n: number) => string][] = [
        [s.min, c.min, 60, String], [s.hour, c.hour, 24, String], [s.dom, c.dom, 31, String],
        [s.mon, c.mon, 12, monthName], [s.dow, c.dow, 7, dayName],
      ];
      q('[data-fields]').replaceChildren(...rows.map(([name, vals, full, label]) => {
        const tr = el('tr');
        tr.append(el('th', name), el('td', vals.length === full ? s.every : vals.map(label).join(', ')));
        return tr;
      }));
      q('[data-both]').hidden = c.domAny || c.dowAny;
      const fmt = new Intl.DateTimeFormat(loc, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: utc() ? 'UTC' : undefined });
      const runs = nextRuns(c, new Date(), 10, utc());
      q('[data-runs]').replaceChildren(...(runs.length ? runs.map((d) => el('li', fmt.format(d))) : [el('li', s.none)]));
    } catch (e) {
      q('[data-ok]').hidden = true;
      q('[data-error]').hidden = false;
      q('[data-error]').textContent = s.bad.replace('{e}', (e as Error).message);
    }
  }

  root.addEventListener('input', render);
  root.addEventListener('change', render);
  root.querySelectorAll<HTMLElement>('[data-preset]').forEach((b) => b.addEventListener('click', () => { expr.value = b.dataset.preset!; render(); }));
  render();
}
