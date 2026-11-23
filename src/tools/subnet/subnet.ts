import { parseCidr, split } from './logic';

const root = document.querySelector<HTMLElement>('[data-subnet]');
if (root) {
  const s = JSON.parse(root.dataset.s!) as Record<string, any>;
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const cidr = q<HTMLInputElement>('[name="cidr"]');
  const to = q<HTMLInputElement>('[name="to"]');
  const fmt = new Intl.NumberFormat();
  const err = (e: unknown) => { const el = q('[data-error]'); el.hidden = false; el.textContent = s[(e as Error).message === 'mask' ? 'badmask' : (e as Error).message] ?? String(e); };
  const line = (th: string, td: string) => { const tr = document.createElement('tr'); tr.append(Object.assign(document.createElement('th'), { textContent: th }), Object.assign(document.createElement('td'), { className: 'mono', textContent: td })); return tr; };

  function render() {
    q('[data-error]').hidden = true;
    try {
      const n = parseCidr(cidr.value);
      q('[data-ok]').hidden = false;
      q('[data-rows]').replaceChildren(
        line(s.ip, `${n.ip}/${n.prefix}`), line(s.mask, n.mask), line(s.wild, n.wildcard), line(s.net, n.network), line(s.bc, n.broadcast),
        line(s.range, `${n.first} – ${n.last}`), line(s.hosts, fmt.format(n.hosts)), line(s.total, fmt.format(n.total)), line(s.kind, s.kinds[n.kind]),
      );
      if (Number(to.value) <= n.prefix) to.value = String(Math.min(32, n.prefix + 2));
    } catch (e) { q('[data-ok]').hidden = true; err(e); }
    q('[data-subs]').replaceChildren();
    q('[data-split-note]').textContent = '';
  }
  function doSplit() {
    q('[data-error]').hidden = true;
    try {
      const r = split(cidr.value, Number(to.value));
      q('[data-subs]').replaceChildren(...r.subnets.map((x) => Object.assign(document.createElement('li'), { textContent: `${x.network}/${x.prefix}  ${x.first} – ${x.last}` })));
      q('[data-split-note]').textContent = s.count.replace('{n}', fmt.format(r.count)) + (r.count > r.subnets.length ? ` ${s.more.replace('{n}', String(r.subnets.length))}` : '');
    } catch (e) { err(e); }
  }
  cidr.addEventListener('input', render);
  q('[data-split]').addEventListener('click', doSplit);
  render();
}
