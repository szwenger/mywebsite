import type { Lang } from '../i18n/ui';

/** One entry per tool page at /tools/<slug>/. `icon` is SVG path data on a 24×24 viewBox, drawn with currentColor. */
export interface Tool { slug: string; icon: string; name: Record<Lang, string>; blurb: Record<Lang, string> }

export const tools: Tool[] = [
  {
    slug: 'qr',
    icon: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h3v3h-3zM20 14v.01M14 20h.01M20 20v.01M17 17v3',
    name: { en: 'QR code generator', de: 'QR-Code-Generator', ru: 'Генератор QR-кодов' },
    blurb: {
      en: 'Make QR codes for links, Wi-Fi and contacts. Download as PNG or SVG.',
      de: 'QR-Codes für Links, WLAN und Kontakte erstellen. Als PNG oder SVG laden.',
      ru: 'QR-коды для ссылок, Wi-Fi и контактов. Скачивание в PNG или SVG.',
    },
  },
];
