import type { Lang } from '../i18n/ui';

/**
 * Version numbers are 0.MINOR.PATCH. A commit that adds a tool starts a new MINOR (patch 0, kind 'new');
 * every other commit is the next PATCH of the current MINOR. The leading 0 stays until the site counts as finished.
 * Add a Change here whenever a commit changes something a visitor can notice (kind 'internal' for the rest).
 * DE and RU are drafts; Simon reviews them.
 */
export type Kind = 'new' | 'changed' | 'fixed' | 'internal';
type T = Record<Lang, string>;
/** `tool` is a slug from tools.ts; the line links to it. */
export interface Change { patch: number; kind: Kind; date: string; tool?: string; text: T }
export interface Release { minor: number; tool: string; blurb: T; changes: Change[] }
export interface Earlier { v: string; date: string; text: T }

const c = (patch: number, kind: Kind, date: string, en: string, de: string, ru: string, tool?: string): Change => ({ patch, kind, date, tool, text: { en, de, ru } });
const t = (en: string, de: string, ru: string): T => ({ en, de, ru });

/** Newest first. */
export const releases: Release[] = [
  {
    minor: 21, tool: 'handfont',
    blurb: t('A font in your own handwriting.', 'Eine Schrift in deiner Handschrift.', 'Шрифт вашим почерком.'),
    changes: [
      c(0, 'new', '2026-11-25', 'Print a template, write your letters, photograph the pages and download a TrueType font with several versions of each letter that take turns in your text.', 'Vorlage ausdrucken, Buchstaben schreiben, Seiten fotografieren und eine TrueType-Schrift herunterladen, deren Buchstabenversionen sich im Text abwechseln.', 'Распечатайте шаблон, напишите буквы, сфотографируйте страницы и скачайте шрифт TrueType, в котором варианты букв чередуются в тексте.', 'handfont'),
      c(1, 'fixed', '2026-11-25', 'LaTeX downloads (PNG, SVG, PDF) are cropped to the formula instead of coming out as a wide strip with empty space.', 'LaTeX-Downloads (PNG, SVG, PDF) werden auf die Formel zugeschnitten, statt als breiter Streifen mit leerem Raum zu erscheinen.', 'Скачанные файлы LaTeX (PNG, SVG, PDF) теперь обрезаются по формуле, а не получаются широкой полосой с пустым местом.', 'latex'),
      c(2, 'changed', '2026-11-27', 'The PDF tool can make scans searchable (OCR): it reads the text on your device in English, German or Russian, adds it to the pages invisibly and shows it for copying or as a .txt file. Nothing is uploaded.', 'Das PDF-Werkzeug kann Scans durchsuchbar machen (OCR): Es liest den Text auf deinem Gerät auf Englisch, Deutsch oder Russisch, fügt ihn unsichtbar in die Seiten ein und zeigt ihn zum Kopieren oder als .txt-Datei. Nichts wird hochgeladen.', 'Инструмент PDF умеет делать сканы доступными для поиска (OCR): читает текст на вашем устройстве на английском, немецком или русском, невидимо добавляет его на страницы и показывает для копирования или в виде файла .txt. Ничего не загружается.', 'pdf'),
    ],
  },
  {
    minor: 20, tool: 'paper',
    blurb: t('Paper sizes in every unit.', 'Papierformate in jeder Einheit.', 'Форматы бумаги во всех единицах.'),
    changes: [
      c(0, 'new', '2026-11-25', 'A, B and C series and US paper sizes in millimetres, inches, points and pixels at the resolution you pick, portrait or landscape.', 'A-, B- und C-Reihe und US-Papierformate in Millimetern, Zoll, Punkt und Pixeln bei der gewählten Auflösung, hoch oder quer.', 'Серии A, B, C и американские форматы бумаги в миллиметрах, дюймах, пунктах и пикселях при выбранном разрешении, книжная или альбомная.', 'paper'),
      c(1, 'changed', '2026-11-25', 'The colour tools have a Pixel picker tab: point at a picture, read the exact colour in a loupe and keep the ones you want.', 'Die Farbwerkzeuge haben einen Tab „Pixel-Pipette“: auf ein Bild zeigen, die genaue Farbe in einer Lupe lesen und die gewünschten behalten.', 'В цветовых инструментах появилась вкладка «Пипетка»: наведите на картинку, смотрите точный цвет в лупе и сохраняйте нужные.', 'color'),
      c(2, 'changed', '2026-11-25', 'The unit converter has silly yardsticks: bananas, giraffes, football pitches, Wales and more.', 'Der Einheiten-Umrechner kennt alberne Maße: Bananen, Giraffen, Fußballfelder, Wales und mehr.', 'В конвертере единиц появились шуточные мерки: бананы, жирафы, футбольные поля, Уэльс и другие.', 'units'),
      c(3, 'changed', '2026-11-25', 'Press ? anywhere for a list of keyboard shortcuts, and Ctrl+Enter runs the main action where a tool has one.', 'Mit ? gibt es überall eine Liste der Tastenkürzel, und Strg+Enter führt die Hauptaktion aus, wo ein Werkzeug eine hat.', 'Клавиша ? показывает список горячих клавиш на любой странице, а Ctrl+Enter запускает главное действие, если оно есть.'),
      c(4, 'changed', '2026-11-25', 'The benchmark charts in the LLM and speech posts, and their covers on the blog page, now follow the light or dark theme.', 'Die Diagramme in den Beiträgen zu LLM und Sprachausgabe und ihre Titelbilder auf der Blogseite folgen jetzt dem hellen oder dunklen Design.', 'Графики в статьях про LLM и синтез речи и их обложки на странице блога теперь следуют светлой или тёмной теме.'),
      c(5, 'changed', '2026-11-25', 'QR codes can be styled: rounded or dotted modules, round corner eyes, a colour fade, a picture in the centre and a frame with your own label.', 'QR-Codes lassen sich gestalten: abgerundete oder runde Module, runde Eckaugen, ein Farbverlauf, ein Bild in der Mitte und ein Rahmen mit eigener Beschriftung.', 'QR-коды можно оформлять: скруглённые или круглые модули, круглые угловые маркеры, градиент, картинка в центре и рамка с вашей подписью.', 'qr'),
    ],
  },
  {
    minor: 19, tool: 'lineheight',
    blurb: t('A comfortable line height for any text.', 'Eine angenehme Zeilenhöhe für jeden Text.', 'Комфортная высота строки для любого текста.'),
    changes: [
      c(0, 'new', '2026-11-25', 'Find a line height for a font size and line length, in pixels, rem and unitless CSS, with a live preview.', 'Eine Zeilenhöhe für Schriftgröße und Zeilenlänge finden, in Pixel, rem und einheitenlosem CSS, mit Live-Vorschau.', 'Подберите высоту строки для размера шрифта и длины строки: в пикселях, rem и CSS без единиц, с живым превью.', 'lineheight'),
    ],
  },
  {
    minor: 18, tool: 'metatags',
    blurb: t('Meta tags for search and sharing.', 'Meta-Tags für Suche und Teilen.', 'Мета-теги для поиска и репостов.'),
    changes: [
      c(0, 'new', '2026-11-25', 'Write the title, description, canonical, Open Graph and Twitter tags for a page, with a preview of the search result and the share card.', 'Titel, Beschreibung, Canonical, Open-Graph- und Twitter-Tags für eine Seite schreiben, mit Vorschau von Suchergebnis und Vorschaukarte.', 'Заголовок, описание, canonical, теги Open Graph и Twitter для страницы, с превью результата поиска и карточки при отправке.', 'metatags'),
    ],
  },
  {
    minor: 17, tool: 'dither',
    blurb: t('Turn a photo into a few shades or two colours.', 'Aus einem Foto wenige Farbtöne oder zwei Farben machen.', 'Превратите фото в несколько оттенков или два цвета.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Floyd-Steinberg, Atkinson, Bayer or threshold, in shades or two colours, with chunky dots if you like.', 'Floyd-Steinberg, Atkinson, Bayer oder Schwellwert, in Farbtönen oder zwei Farben, auf Wunsch mit groben Punkten.', 'Floyd-Steinberg, Atkinson, Bayer или порог — в оттенках или двух цветах, при желании с крупными точками.', 'dither'),
      c(1, 'internal', '2026-11-24', 'Project notes updated.', 'Projektnotizen aktualisiert.', 'Заметки по проекту обновлены.'),
      c(2, 'changed', '2026-11-24', 'PDF to images is now the Convert tab. The old link still works.', 'PDF zu Bildern ist jetzt der Tab „Umwandeln“. Der alte Link funktioniert weiter.', 'PDF в изображения теперь вкладка «Конвертация». Старая ссылка работает.', 'pdf'),
      c(3, 'changed', '2026-11-24', 'Pull a palette out of any image in the new From image tab.', 'Eine Palette aus einem beliebigen Bild ziehen, im neuen Tab „Aus Bild“.', 'Палитра из любого изображения — во вкладке «Из изображения».', 'color'),
      c(4, 'changed', '2026-11-24', 'Barcodes now live here as a second type.', 'Barcodes gibt es jetzt hier als zweiten Typ.', 'Штрихкоды теперь здесь, как второй тип.', 'qr'),
      c(5, 'fixed', '2026-11-24', 'The dark mode switch works again on iPhone and iPad.', 'Der Dunkelmodus-Schalter funktioniert auf iPhone und iPad wieder.', 'Переключатель тёмной темы снова работает на iPhone и iPad.'),
      c(6, 'changed', '2026-11-24', 'Hangout moved into the footer, with the real brand icons.', 'Hangout ist in den Footer gezogen, mit den echten Markensymbolen.', 'Hangout переехал в подвал сайта, с настоящими логотипами.'),
      c(7, 'fixed', '2026-11-24', 'The ink reveal when switching theme is back on touch devices.', 'Der Tinten-Effekt beim Themenwechsel läuft auf Touch-Geräten wieder.', 'Эффект чернил при смене темы снова работает на сенсорных устройствах.'),
      c(8, 'changed', '2026-11-25', 'Release notes have their own page with version numbers. Blog posts link to a page per tag, PDF previews work on phones, and blog charts follow the light or dark theme.', 'Die Änderungsliste hat jetzt eine eigene Seite mit Versionsnummern. Blogbeiträge verlinken auf eine Seite pro Tag, PDF-Vorschauen funktionieren auf Smartphones, und Diagramme im Blog folgen dem hellen oder dunklen Thema.', 'У истории изменений теперь своя страница с номерами версий. Записи блога ведут на страницу каждого тега, предпросмотр PDF работает на телефонах, а диаграммы в блоге следуют светлой или тёмной теме.'),
      c(9, 'changed', '2026-11-25', 'Every page in PDF Organize has a magnifier button to view it large, with pinch zoom on phones.', 'Jede Seite in PDF Organisieren hat eine Lupe, um sie groß anzusehen, auf dem Smartphone mit Zoom per Pinch.', 'У каждой страницы в «Организации PDF» есть лупа для просмотра в большом размере, на телефоне с масштабом щипком.', 'pdf'),
      c(10, 'changed', '2026-11-25', 'Scan with camera now finds the page, flattens its perspective and cleans it up like a scanner (shadows gone, paper white). Pick the scanner look, colour, grey or black and white from small previews of your page, and scan page after page. A minus button shows the whole page at once, and a corner button lets you drag the page corners into place by hand. On phones the two start buttons are now a camera and a files icon. The zoom view buttons are readable in the light theme again.', 'Mit Kamera scannen findet jetzt die Seite, entzerrt die Perspektive und bereitet sie auf wie ein Scanner (Schatten weg, Papier weiß). Scanner-Optik, Farbe, Grau oder Schwarzweiß wählst du an kleinen Vorschauen deiner Seite, und du kannst Seite für Seite scannen. Ein Minus-Knopf zeigt die ganze Seite auf einmal, mit dem Ecken-Knopf ziehst du die Seitenecken von Hand zurecht. Auf dem Handy sind die beiden Startknöpfe jetzt ein Kamera- und ein Dateien-Symbol. Die Schaltflächen der Zoomansicht sind im hellen Thema wieder lesbar.', 'Сканирование камерой теперь находит страницу, выравнивает перспективу и обрабатывает её как сканер (тени убраны, бумага белая). Вид сканера, цвет, серый или чёрно-белый выбираются по маленьким превью вашей страницы, и можно сканировать страницу за страницей. Кнопка «минус» показывает страницу целиком, а кнопка углов позволяет вручную подогнать углы страницы. На телефоне две кнопки старта теперь значки камеры и файлов. Кнопки окна увеличения снова читаются в светлой теме.', 'pdf'),
    ],
  },
  {
    minor: 16, tool: 'placeholder',
    blurb: t('Dummy images of any size and colour.', 'Platzhalterbilder in jeder Größe und Farbe.', 'Картинки-заглушки любого размера и цвета.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Any size and colour, as SVG, PNG or a ready-to-paste data URI.', 'In jeder Größe und Farbe, als SVG, PNG oder fertige Data-URI zum Einfügen.', 'Любого размера и цвета — SVG, PNG или готовый data URI.', 'placeholder'),
    ],
  },
  {
    minor: 15, tool: 'tiles',
    blurb: t('Cut an image into tiles or join images.', 'Ein Bild in Kacheln schneiden oder Bilder zusammenfügen.', 'Нарезка изображения на плитки и склейка изображений.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Cut an image into a grid of tiles (ZIP), or join images side by side or stacked.', 'Ein Bild in ein Raster aus Kacheln schneiden (ZIP) oder Bilder neben- oder untereinander zusammenfügen.', 'Нарезать изображение на сетку плиток (ZIP) или склеить изображения рядом или друг под другом.', 'tiles'),
      c(1, 'changed', '2026-11-23', 'Turn an image into a data URI, with HTML and CSS snippets, and back.', 'Ein Bild in eine Data-URI umwandeln, mit HTML- und CSS-Schnipseln, und zurück.', 'Превратить изображение в data URI с фрагментами HTML и CSS и обратно.', 'encode'),
    ],
  },
  {
    minor: 14, tool: 'codes',
    blurb: t('Text codes, with sound for Morse.', 'Textcodes, Morse mit Ton.', 'Текстовые коды, морзе со звуком.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Morse with sound, the NATO alphabet, braille, Caesar, ROT13 and Vigenère.', 'Morse mit Ton, NATO-Alphabet, Braille, Caesar, ROT13 und Vigenère.', 'Морзе со звуком, алфавит НАТО, Брайль, Цезарь, ROT13 и Виженер.', 'codes'),
      c(1, 'changed', '2026-11-23', 'Palette with harmonies and shade scale, OKLab gradients and a colour-blindness preview, as tabs.', 'Palette mit Harmonien und Farbstufen, OKLab-Verläufe und eine Farbfehlsichtigkeits-Vorschau, als Tabs.', 'Палитра с гармониями и шкалой оттенков, градиенты OKLab и просмотр для дальтоников — во вкладках.', 'color'),
      c(2, 'changed', '2026-11-23', 'Straighten a skewed scan, automatically or by hand, and trim transparent or solid borders.', 'Einen schiefen Scan geraderichten, automatisch oder von Hand, und transparente oder einfarbige Ränder entfernen.', 'Выровнять кривой скан, автоматически или вручную, и обрезать прозрачные или однотонные поля.', 'crop'),
    ],
  },
  {
    minor: 13, tool: 'timecode',
    blurb: t('SMPTE timecode maths with drop frame.', 'SMPTE-Timecode-Rechnen mit Drop Frame.', 'Расчёты с таймкодом SMPTE, включая drop frame.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Add and subtract SMPTE timecodes, convert to frames and seconds, drop frame for 29.97 and 59.94.', 'SMPTE-Timecodes addieren und subtrahieren, in Frames und Sekunden umrechnen, Drop Frame für 29,97 und 59,94.', 'Сложение и вычитание таймкодов SMPTE, перевод в кадры и секунды, drop frame для 29,97 и 59,94.', 'timecode'),
    ],
  },
  {
    minor: 12, tool: 'http',
    blurb: t('Every status code in plain words.', 'Jeder Statuscode in einfachen Worten.', 'Каждый код состояния простыми словами.'),
    changes: [
      c(0, 'new', '2026-11-23', 'Searchable by number, class (4xx) or a word like redirect.', 'Durchsuchbar nach Nummer, Klasse (4xx) oder Wort wie „redirect“.', 'Поиск по номеру, классу (4xx) или слову вроде redirect.', 'http'),
      c(1, 'changed', '2026-11-23', 'PDF to images takes a page range, and a quality setting.', 'PDF zu Bildern nimmt einen Seitenbereich und eine Qualitätseinstellung.', 'PDF в изображения принимает диапазон страниц и настройку качества.', 'pdf'),
    ],
  },
];

/** One line per older version, newest first. Versions 0.0 to 0.11 were counted afterwards from the git history. */
const e = (v: string, date: string, en: string, de: string, ru: string): Earlier => ({ v, date, text: { en, de, ru } });
export const earlier: Earlier[] = [
  e('0.11', '2026-11-23', 'Function grapher and code screenshots', 'Funktionsplotter und Code-Screenshots', 'Графики функций и скриншоты кода'),
  e('0.10', '2026-11-23', 'Markdown preview, chart maker, LaTeX formulas', 'Markdown-Vorschau, Diagramm-Ersteller, LaTeX-Formeln', 'Просмотр Markdown, диаграммы, формулы LaTeX'),
  e('0.9', '2026-11-23', 'HEIC input, unit converter, palette, SVG, image watermark, audio trimmer', 'HEIC-Eingabe, Einheitenrechner, Palette, SVG, Bild-Wasserzeichen, Audio-Trimmer', 'Чтение HEIC, конвертер единиц, палитра, SVG, водяной знак на изображении, обрезка аудио'),
  e('0.8', '2026-11-23', 'Typing trainer with 50 levels', 'Tipptrainer mit 50 Stufen', 'Клавиатурный тренажёр на 50 уровней'),
  e('0.7', '2026-11-23', 'PDF suite with 16 tools and live previews', 'PDF-Suite mit 16 Werkzeugen und Live-Vorschau', 'Набор из 16 PDF-инструментов с живым просмотром'),
  e('0.6', '2026-11-22', 'Subtitles, calendar file, regex, colour, cron, text, ffmpeg', 'Untertitel, Kalenderdatei, Regex, Farbe, Cron, Text, ffmpeg', 'Субтитры, файл календаря, regex, цвет, cron, текст, ffmpeg'),
  e('0.5', '2026-11-22', 'VRAM calculator, hash, time zones, bitrate, Docker to Compose, JSON, diff', 'VRAM-Rechner, Hash, Zeitzonen, Bitrate, Docker zu Compose, JSON, Diff', 'Калькулятор VRAM, хеш, часовые пояса, битрейт, Docker в Compose, JSON, diff'),
  e('0.4', '2026-11-22', 'PDF presenter', 'PDF-Präsentation', 'Показ PDF-презентаций'),
  e('0.3', '2026-11-20', 'Image converter', 'Bildkonverter', 'Конвертер изображений'),
  e('0.2', '2026-11-20', 'PDF merge, split, rotate, reorder', 'PDF zusammenfügen, teilen, drehen, sortieren', 'PDF: объединение, разделение, поворот, порядок страниц'),
  e('0.1', '2026-11-20', 'QR code generator', 'QR-Code-Generator', 'Генератор QR-кодов'),
  e('0.0', '2026-11-20', 'First deploy: blog, videos, hardware, Impressum', 'Erster Deploy: Blog, Videos, Hardware, Impressum', 'Первый запуск: блог, видео, железо, Impressum'),
];

/** The newest version and the date of its last change. */
export function latest(): { version: string; date: string } {
  const r = releases[0];
  const last = r.changes[r.changes.length - 1];
  return { version: `0.${r.minor}.${last.patch}`, date: last.date };
}

/** True while the version link should stand out: the visitor has not opened the changelog since this version. A first-time visitor only sees it while the version is under 14 days old. */
export function isNew(version: string, seen: string | null, date: string, today: string): boolean {
  if (seen) return seen !== version;
  return (Date.parse(today) - Date.parse(date)) / 864e5 < 14;
}
