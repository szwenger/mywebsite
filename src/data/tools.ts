import type { Lang } from '../i18n/ui';

/** One entry per tool page at /tools/<slug>/. `icon` is SVG path data on a 24×24 viewBox, drawn with currentColor. */
export interface Tool { slug: string; cat: Category; featured?: boolean; icon: string; name: Record<Lang, string>; blurb: Record<Lang, string> }

export type Category = 'files' | 'text' | 'dev' | 'ai' | 'media';
/** Order here is the order of the groups on the overview page. */
export const categories: Record<Category, Record<Lang, string>> = {
  files: { en: 'Files & documents', de: 'Dateien & Dokumente', ru: 'Файлы и документы' },
  text: { en: 'Text & time', de: 'Text & Zeit', ru: 'Текст и время' },
  dev: { en: 'Developer', de: 'Entwickler', ru: 'Разработка' },
  ai: { en: 'Local AI', de: 'Lokale KI', ru: 'Локальный ИИ' },
  media: { en: 'Streaming & video', de: 'Streaming & Video', ru: 'Стриминг и видео' },
};

export const tools: Tool[] = [
  {
    slug: 'qr',
    cat: 'files',
    featured: true,
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
    cat: 'files',
    featured: true,
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
    cat: 'files',
    featured: true,
    icon: 'M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8.5 9.5v.01M4 17l5-5 4 4 3-3 4 4',
    name: { en: 'Image converter', de: 'Bild-Konverter', ru: 'Конвертер изображений' },
    blurb: {
      en: 'Convert images between PNG, JPG and WebP, set the quality and shrink them to a maximum size.',
      de: 'Bilder zwischen PNG, JPG und WebP umwandeln, Qualität einstellen und auf eine Höchstgröße verkleinern.',
      ru: 'Преобразование изображений между PNG, JPG и WebP, настройка качества и уменьшение до нужного размера.',
    },
  },
  {
    slug: 'presenter',
    cat: 'files',
    featured: true,
    icon: 'M3 4h18v12H3zM12 16v4M8 20h8M10 8.5v3l3-1.5z',
    name: { en: 'PDF presenter', de: 'PDF-Präsentator', ru: 'PDF-презентатор' },
    blurb: {
      en: 'Present a PDF with a speaker view: next slide, timer and a separate beamer window.',
      de: 'Ein PDF mit Referentenansicht präsentieren: nächste Folie, Timer und ein eigenes Beamer-Fenster.',
      ru: 'Показ PDF с режимом докладчика: следующий слайд, таймер и отдельное окно для проектора.',
    },
  },
  {
    slug: 'vram',
    cat: 'ai',
    featured: true,
    icon: 'M7 7h10v10H7zM10 10h4v4h-4zM9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4',
    name: { en: 'GGUF VRAM calculator', de: 'GGUF-VRAM-Rechner', ru: 'Калькулятор VRAM для GGUF' },
    blurb: {
      en: 'Estimate how much GPU memory a local LLM needs: model size, quantisation and context length, and the longest context that fits.',
      de: 'Schätze, wie viel GPU-Speicher ein lokales LLM braucht: Modellgröße, Quantisierung und Kontextlänge, dazu der längste Kontext, der noch passt.',
      ru: 'Оценка памяти GPU для локальной LLM: размер модели, квантование и длина контекста, а также максимальный контекст, который поместится.',
    },
  },
  {
    slug: 'checksum',
    cat: 'files',
    icon: 'M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6zM9 12l2 2 4-4',
    name: { en: 'Checksum verifier', de: 'Prüfsummen-Prüfer', ru: 'Проверка контрольной суммы' },
    blurb: {
      en: 'Compute the SHA-256 of a file of any size and compare it with the published hash. Nothing is uploaded.',
      de: 'SHA-256 einer beliebig großen Datei berechnen und mit dem veröffentlichten Hash vergleichen. Es wird nichts hochgeladen.',
      ru: 'Вычисление SHA-256 файла любого размера и сравнение с опубликованным хешем. Ничего не загружается.',
    },
  },
  {
    slug: 'tz',
    cat: 'text',
    featured: true,
    icon: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2',
    name: { en: 'Time zone and Discord timestamps', de: 'Zeitzonen und Discord-Zeitstempel', ru: 'Часовые пояса и метки времени Discord' },
    blurb: {
      en: 'Turn a date and time into a link that shows it in each viewer\'s own time zone, plus ready-made Discord timestamps.',
      de: 'Mach aus Datum und Uhrzeit einen Link, der den Zeitpunkt in der Zeitzone jedes Betrachters zeigt, dazu fertige Discord-Zeitstempel.',
      ru: 'Превратите дату и время в ссылку, которая показывает момент в часовом поясе каждого зрителя, плюс готовые метки времени Discord.',
    },
  },
  {
    slug: 'bitrate',
    cat: 'media',
    icon: 'M4 18V9M9 18V5M14 18v-7M19 18V8',
    name: { en: 'Bitrate and file size calculator', de: 'Bitrate- und Dateigrößen-Rechner', ru: 'Калькулятор битрейта и размера файла' },
    blurb: {
      en: 'How big is a recording at a given bitrate, which bitrate fits a target size, and how much upload a stream needs.',
      de: 'Wie groß ist eine Aufnahme bei einer Bitrate, welche Bitrate passt zu einer Zielgröße und wie viel Upload braucht ein Stream.',
      ru: 'Каков размер записи при заданном битрейте, какой битрейт подходит под нужный размер и сколько отдачи нужно для стрима.',
    },
  },
  {
    slug: 'compose',
    cat: 'dev',
    icon: 'M12 3l9 5-9 5-9-5zM3 13l9 5 9-5',
    name: { en: 'docker run to Compose', de: 'docker run zu Compose', ru: 'docker run в Compose' },
    blurb: {
      en: 'Paste a docker run command and get a docker-compose.yml service, with ports, volumes, environment and GPU access.',
      de: 'Füge einen docker-run-Befehl ein und erhalte einen Dienst für die docker-compose.yml, mit Ports, Volumes, Umgebung und GPU-Zugriff.',
      ru: 'Вставьте команду docker run и получите сервис для docker-compose.yml: порты, тома, окружение и доступ к GPU.',
    },
  },
  {
    slug: 'meta',
    cat: 'files',
    icon: 'M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6zM12 9.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4 4l16 16',
    name: { en: 'Metadata viewer and remover', de: 'Metadaten anzeigen und entfernen', ru: 'Просмотр и удаление метаданных' },
    blurb: {
      en: 'See what a JPEG, PNG or PDF reveals (location, camera, author) and remove it without re-encoding.',
      de: 'Sieh, was ein JPEG, PNG oder PDF verrät (Standort, Kamera, Autor), und entferne es ohne Neukodierung.',
      ru: 'Посмотрите, что выдаёт JPEG, PNG или PDF (место, камера, автор), и удалите это без перекодирования.',
    },
  },
  {
    slug: 'favicon',
    cat: 'files',
    icon: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.5 6.6 19.5l1.2-6L3.3 9.3l6.1-.7z',
    name: { en: 'Favicon generator', de: 'Favicon-Generator', ru: 'Генератор favicon' },
    blurb: {
      en: 'Make favicon.ico and all PNG sizes from one image, with the HTML to paste. Download as a ZIP.',
      de: 'Erstelle favicon.ico und alle PNG-Größen aus einem Bild, mit fertigem HTML zum Einfügen. Als ZIP laden.',
      ru: 'Создайте favicon.ico и все размеры PNG из одной картинки, с готовым HTML. Скачивание в ZIP.',
    },
  },
  {
    slug: 'json',
    cat: 'dev',
    icon: 'M8 4c-2 0-3 1-3 3v2c0 1-1 2-2 3 1 1 2 2 2 3v2c0 2 1 3 3 3M16 4c2 0 3 1 3 3v2c0 1 1 2 2 3-1 1-2 2-2 3v2c0 2-1 3-3 3',
    name: { en: 'JSON formatter and validator', de: 'JSON-Formatierer und -Prüfer', ru: 'Форматирование и проверка JSON' },
    blurb: {
      en: 'Format, minify, sort and validate JSON with exact line and column errors. Long numbers are not rounded.',
      de: 'JSON formatieren, minimieren, sortieren und prüfen, mit Fehlern nach Zeile und Spalte. Lange Zahlen werden nicht gerundet.',
      ru: 'Форматирование, минимизация, сортировка и проверка JSON с ошибками по строке и столбцу. Длинные числа не округляются.',
    },
  },
  {
    slug: 'gen',
    cat: 'dev',
    icon: 'M4 4h16v16H4zM8.5 8.5v.01M15.5 8.5v.01M12 12v.01M8.5 15.5v.01M15.5 15.5v.01',
    name: { en: 'Password, UUID and token generator', de: 'Passwort-, UUID- und Token-Generator', ru: 'Генератор паролей, UUID и токенов' },
    blurb: {
      en: 'Secure passwords, UUID v4 and v7, and random tokens in hex or base64. Made in your browser.',
      de: 'Sichere Passwörter, UUID v4 und v7 und Zufalls-Tokens in Hex oder Base64. Im Browser erzeugt.',
      ru: 'Надёжные пароли, UUID v4 и v7 и случайные токены в hex или base64. Создаётся в браузере.',
    },
  },
  {
    slug: 'diff',
    cat: 'text',
    icon: 'M8 4v8M4 8h8M13 18h7',
    name: { en: 'Text diff checker', de: 'Text-Vergleich', ru: 'Сравнение текстов' },
    blurb: {
      en: 'Compare two texts line by line and see what was added and removed.',
      de: 'Vergleiche zwei Texte Zeile für Zeile und sieh, was hinzugekommen und was weggefallen ist.',
      ru: 'Построчное сравнение двух текстов: что добавлено и что удалено.',
    },
  },
];
