import { toCompose } from './logic';
import { copy, download } from '../dom';

const root = document.querySelector<HTMLElement>('[data-compose]');
if (root) {
  const q = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const input = q<HTMLTextAreaElement>('[name="cmd"]');
  const pre = q('[data-yaml]');
  let yaml = '';

  function render() {
    const r = toCompose(input.value);
    yaml = r.yaml;
    pre.textContent = yaml || (input.value.trim() ? '' : root!.dataset.empty!);
    root!.querySelectorAll<HTMLButtonElement>('[data-copy],[data-save]').forEach((b) => (b.disabled = !yaml));
    q('[data-warn]').hidden = r.warnings.length === 0;
    q('[data-warn-list]').replaceChildren(...r.warnings.map((w) => Object.assign(document.createElement('li'), { textContent: w })));
  }

  input.addEventListener('input', render);
  q('[data-example-btn]').addEventListener('click', () => { input.value = root!.dataset.example!; render(); });
  q('[data-copy]').addEventListener('click', (e) => copy(yaml, e.currentTarget as HTMLElement));
  q('[data-save]').addEventListener('click', () => download(yaml, 'docker-compose.yml', 'text/yaml'));
  render();
}
