// Behaviour of components/ExpandSearch.astro. It never filters anything: it only opens and closes the field and
// fires a normal `input` event when the text is cleared, so any listener on the input keeps working.
const form = document.querySelector<HTMLFormElement>('[data-xsearch]');
if (form) {
  const input = form.querySelector<HTMLInputElement>('input')!;
  const toggle = form.querySelector<HTMLButtonElement>('[data-xs-toggle]')!;
  const clear = form.querySelector<HTMLButtonElement>('[data-xs-clear]')!;
  form.hidden = false;

  const setOpen = (open: boolean) => {
    form.classList.toggle('open', open);
    toggle.setAttribute('aria-expanded', String(open));
    input.tabIndex = open ? 0 : -1;
    if (open) input.focus(); else input.blur();
  };
  const sync = () => { clear.hidden = !input.value; };
  const empty = () => { input.value = ''; input.dispatchEvent(new Event('input', { bubbles: true })); };

  toggle.addEventListener('mousedown', (e) => e.preventDefault()); // keep the focus in the field so the blur handler does not close it first
  toggle.addEventListener('click', () => setOpen(!(form.classList.contains('open') && !input.value)));
  clear.addEventListener('click', () => { empty(); input.focus(); });
  input.addEventListener('input', sync);
  input.addEventListener('blur', () => { if (!input.value) setOpen(false); });
  input.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (input.value) empty(); else { setOpen(false); toggle.focus(); }
  });
  form.addEventListener('submit', (e) => e.preventDefault());
  document.addEventListener('keydown', (e) => {
    if ((e.target as HTMLElement).closest('input, textarea, select, [contenteditable]') || e.altKey) return;
    if ((e.key === '/' && !e.ctrlKey && !e.metaKey) || (e.key.toLowerCase() === 'k' && (e.ctrlKey || e.metaKey))) { e.preventDefault(); setOpen(true); input.select(); }
  });

  // A page script may have filled the field from ?q= by now (module scripts all run before DOMContentLoaded).
  const restore = () => { sync(); if (input.value) setOpen(true); };
  // Module scripts run while readyState is still "interactive", so only "complete" means DOMContentLoaded is behind us.
  if (document.readyState === 'complete') restore(); else document.addEventListener('DOMContentLoaded', restore);
}
