// A bare <input type="file"> shows the browser's own language ("Datei auswählen"), not the page's.
// Tool pages keep the plain input for no-JS; here it is hidden and replaced by a translated button plus the file name.
const TEXT = {
  en: ['Choose file', 'No file chosen'],
  de: ['Datei wählen', 'Keine Datei gewählt'],
  ru: ['Выбрать файл', 'Файл не выбран'],
} as const;

export function initFilePick(): void {
  const [pick, none] = TEXT[(document.documentElement.lang as keyof typeof TEXT)] ?? TEXT.en;
  for (const input of document.querySelectorAll<HTMLInputElement>('input[type="file"]')) {
    if (input.closest('.drop, .dropzone, .pick, [data-drop]') || input.classList.contains('sr-only')) continue;
    const btn = Object.assign(document.createElement('button'), { type: 'button', className: 'btn alt fp-btn', textContent: pick });
    const name = Object.assign(document.createElement('span'), { className: 'meta fp-name', textContent: none });
    const row = Object.assign(document.createElement('span'), { className: 'fp' });
    row.append(btn, name);
    input.classList.add('sr-only');
    input.after(row);
    btn.addEventListener('click', (e) => { e.preventDefault(); input.click(); });
    const sync = () => { name.textContent = input.files?.length ? [...input.files].map((f) => f.name).join(', ') : none; };
    input.addEventListener('change', sync);
  }
}
