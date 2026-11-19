// The Twitch player is a third-party load (and may set cookies), so it only appears after an explicit click.
const SRC = 'https://player.twitch.tv/?channel=galuin&parent=galuin.com&parent=localhost&muted=true';

export function initTwitch(): void {
  document.querySelectorAll<HTMLButtonElement>('[data-twitch-load]').forEach((button) => {
    button.addEventListener('click', () => {
      const frame = document.createElement('iframe');
      frame.src = SRC;
      frame.title = 'Twitch: galuin';
      frame.allowFullscreen = true;
      frame.setAttribute('allow', 'autoplay; fullscreen');
      button.closest('[data-twitch-slot]')?.replaceChildren(frame);
    }, { once: true });
  });
}
