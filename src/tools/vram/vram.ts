import { estimate, PRESETS } from './logic';

const root = document.querySelector<HTMLElement>('[data-vram]');
if (root) {
  const f = (n: string) => root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${n}"]`)!;
  const num = (n: string) => Number(f(n).value);
  const out = (n: string, v: string) => { root.querySelector(`[data-out="${n}"]`)!.textContent = v; };
  const verdict = root.querySelector<HTMLElement>('[data-verdict]')!;
  const gb = (v: number) => `${v.toFixed(v < 10 ? 2 : 1)} GB`;

  function render() {
    const e = estimate({ paramsB: num('paramsB'), bpw: num('bpw'), layers: num('layers'), kvHeads: num('kvHeads'), headDim: num('headDim'), ctx: num('ctx'), kvBytes: num('kvBytes'), overheadGB: num('overheadGB'), vramGB: num('vramGB') });
    if (![e.weights, e.kv, e.total].every(Number.isFinite)) return;
    out('weights', gb(e.weights)); out('kv', gb(e.kv)); out('overhead', gb(e.overhead)); out('total', gb(e.total));
    out('maxCtx', `${e.maxCtx.toLocaleString()} ${root!.dataset.tokens}`);
    verdict.className = `note ${e.fits ? 'good' : 'bad'}`;
    verdict.textContent = e.fits ? root!.dataset.fits! : e.weights + e.overhead > num('vramGB') ? root!.dataset.nofit! : root!.dataset.tight!;
  }

  f('quant').addEventListener('change', () => { f('bpw').value = f('quant').value; });
  f('preset').addEventListener('change', () => {
    const p = PRESETS.find((x) => x.id === f('preset').value);
    if (p) for (const k of ['paramsB', 'layers', 'kvHeads', 'headDim'] as const) f(k).value = String(p[k]);
  });
  root.addEventListener('input', render);
  root.addEventListener('change', render);
  render();
}
