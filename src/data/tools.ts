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
  {
    slug: 'pdf',
    icon: 'M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM14 3v5h5M9 13h6M9 17h4',
    name: { en: 'PDF tools', de: 'PDF-Werkzeuge', ru: 'PDF-инструменты' },
    blurb: {
      en: 'Merge, split, rotate, reorder and delete pages, or turn images into a PDF.',
      de: 'PDFs zusammenfügen, teilen, drehen, Seiten umsortieren und löschen oder Bilder in ein PDF verwandeln.',
      ru: 'Объединение, разделение, поворот и перестановка страниц PDF, а также превращение картинок в PDF.',
    },
  },
  {
    slug: 'image',
    icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5v.01M4 17l5-5 4 4 3-3 4 4',
    name: { en: 'Image converter', de: 'Bild-Konverter', ru: 'Конвертер изображений' },
    blurb: {
      en: 'Convert images between PNG, JPG and WebP, set the quality and shrink them to a maximum size.',
      de: 'Bilder zwischen PNG, JPG und WebP umwandeln, Qualität einstellen und auf eine Höchstgröße verkleinern.',
      ru: 'Преобразование изображений между PNG, JPG и WebP, настройка качества и уменьшение до нужного размера.',
    },
  },
];
