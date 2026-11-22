// 24x24 line icons (stroke = currentColor), inner SVG markup only. Rendered by components/Icon.astro.
export const icons = {
  // nav
  blog: '<path d="M6 3.5h8l4 4V20.5H6z"/><path d="M14 3.5v4h4M9 12.5h6M9 16h4"/>',
  videos: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M10 9.5v5l4.5-2.5z"/>',
  tools: '<path d="M14.5 6a4 4 0 0 0-5 5L4 16.5 7.5 20l5.5-5.5a4 4 0 0 0 5-5l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  setup: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  twitch: '<circle cx="12" cy="12" r="1.8"/><path d="M8 8a5.5 5.5 0 0 0 0 8M16 8a5.5 5.5 0 0 1 0 8M5 5a10 10 0 0 0 0 14M19 5a10 10 0 0 1 0 14"/>',
  hangout: '<path d="M4 5.5h16v10H12l-4.5 4v-4H4z"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5v5l4.5-2.5z"/>',
  x: '<path d="M5 4.5l14 15M19 4.5l-14 15"/>',
  // desk parts (same ids as the spots)
  pc: '<rect x="6" y="3" width="12" height="18" rx="2"/><path d="M9 7h6M9 10h6"/><circle cx="12" cy="16.5" r="1.2"/>',
  mouse: '<rect x="7" y="3" width="10" height="18" rx="5"/><path d="M12 3v6"/>',
  kb: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><path d="M6.5 10h.01M10 10h.01M14 10h.01M17.5 10h.01M7.5 14h9"/>',
  pad: '<rect x="2.5" y="6.5" width="19" height="11" rx="2"/><rect x="13" y="9" width="4" height="6" rx="2"/>',
  m1: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  m2: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M9 20h6M12 16v4"/>',
  m3: '<rect x="7" y="2.5" width="10" height="15" rx="2"/><path d="M9.5 21.5h5M12 17.5v4"/>',
  hp: '<path d="M4 15v-3a8 8 0 0 1 16 0v3"/><rect x="3" y="14" width="4" height="7" rx="1.5"/><rect x="17" y="14" width="4" height="7" rx="1.5"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6"/>',
  ai: '<rect x="2.5" y="7" width="19" height="10" rx="2"/><circle cx="8" cy="12" r="1.8"/><circle cx="14" cy="12" r="1.8"/><path d="M18.5 10v4"/>',
  vr: '<path d="M3 9.5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-3.5L14 14h-4l-1.5 2.5H5a2 2 0 0 1-2-2z"/>',
  // controls
  bulb: '<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>',
} as const;
export type IconName = keyof typeof icons;
