export type Lang = 'en' | 'de' | 'ru';
export const LANGS: Lang[] = ['en', 'de', 'ru'];

// DE and RU are drafts; Simon reviews them before launch.
export const ui = {
  en: {
    notesTitle: 'Notes', latestVideos: 'Latest videos', allVideos: 'All videos',
    leadVideo: 'New on YouTube', leadPost: 'Latest post',
    twitchTitle: 'Live on Twitch', twitchText: 'I stream on Twitch as galuin. The player loads from twitch.tv only after you click; Twitch may set cookies then.',
    twitchLoad: 'Load player', watchOnTwitch: 'Watch on Twitch',
    toolsIntro: 'Small tools that run in your browser. Your files never leave your device.', allTools: 'All tools',
    videosIntro: 'Gaming and tech videos from my YouTube channel.',
    hardwareIntro: 'What I play, edit and stream on. Links open the product page on the shop.',
    hwHint: 'Hover a part, click to zoom in', hwHintTouch: 'Tap a part to zoom in', hwParts: 'Parts of the desk', hwClose: 'Back to the desk', hwPrev: 'Previous part', hwNext: 'Next part', hwOpen: 'View in shop', hwOff: 'Lights off', hwOn: 'Lights on', hwAll: 'Everything on one list',
    hwAlt: 'Render of my desk: three monitors, a PC tower with a lit side panel, a 60% keyboard, mouse, microphone on an arm, speakers and a VR headset.',
    legalUpdated: 'Last updated',
    toolsLocal: 'Runs in your browser. Your files and data never leave your device.', toolsCategories: 'Tool categories',
    moreOnYouTube: 'More on YouTube',
    shortsTitle: 'Shorts',
    searchLabel: 'Search posts', searchPlaceholder: 'Search', noResults: 'Nothing found', toolsSearch: 'Search tools', searchClear: 'Clear search',
    pagerLabel: 'Pages', pagePrev: 'Previous page', pageNext: 'Next page', pageWord: 'Page',
    gridLabel: 'Grid size', gridLarge: 'Large grid', gridSmall: 'Small grid',
    blogIntro: 'Short notes, project updates and longer write-ups.',
    fallbackNote: 'Not translated yet. Showing the original in',
    backToBlog: 'All posts',
    latestPosts: 'Latest posts', moreToRead: 'More to read', onThisPage: 'On this page', updatedOn: 'Updated',
    siteTitle: 'Galuin',
    siteDescription: 'Simon (Galuin): notes, videos, stream and handy browser tools.',
    langName: 'English',
    skip: 'Skip to content',
    closeImage: 'Close image',
    navBlog: 'Blog', navVideos: 'Videos', navTools: 'Tools', navSetup: 'Setup', navHangout: 'Hangout',
    navLabel: 'Main', langLabel: 'Language', themeToggle: 'Toggle light/dark theme',
    footerLine: 'Games, code and a few tools that run in your browser.',
    footerWork: 'Work & projects', impressum: 'Legal notice', privacy: 'Privacy',
    nfTitle: 'This page does not exist.', nfHome: 'Back home',
  },
  de: {
    notesTitle: 'Notizen', latestVideos: 'Neueste Videos', allVideos: 'Alle Videos',
    leadVideo: 'Neu auf YouTube', leadPost: 'Neuester Beitrag',
    twitchTitle: 'Live auf Twitch', twitchText: 'Ich streame auf Twitch als galuin. Der Player lädt erst nach einem Klick von twitch.tv; Twitch kann dann Cookies setzen.',
    twitchLoad: 'Player laden', watchOnTwitch: 'Auf Twitch ansehen',
    toolsIntro: 'Kleine Tools, die im Browser laufen. Deine Dateien verlassen nie dein Gerät.', allTools: 'Alle Tools',
    videosIntro: 'Gaming- und Tech-Videos von meinem YouTube-Kanal.',
    hardwareIntro: 'Womit ich spiele, schneide und streame. Die Links öffnen die Produktseite im Shop.',
    hwHint: 'Teil anfahren, anklicken zum Zoomen', hwHintTouch: 'Teil antippen zum Zoomen', hwParts: 'Teile des Schreibtischs', hwClose: 'Zurück zum Schreibtisch', hwPrev: 'Vorheriges Teil', hwNext: 'Nächstes Teil', hwOpen: 'Im Shop ansehen', hwOff: 'Licht aus', hwOn: 'Licht an', hwAll: 'Alles in einer Liste',
    hwAlt: 'Render meines Schreibtischs: drei Monitore, ein PC-Tower mit beleuchtetem Seitenteil, eine 60-%-Tastatur, Maus, Mikrofon am Arm, Lautsprecher und eine VR-Brille.',
    legalUpdated: 'Stand',
    toolsLocal: 'Läuft in deinem Browser. Deine Dateien und Daten verlassen nie dein Gerät.', toolsCategories: 'Tool-Kategorien',
    moreOnYouTube: 'Mehr auf YouTube',
    shortsTitle: 'Shorts',
    searchLabel: 'Beiträge durchsuchen', searchPlaceholder: 'Suchen', noResults: 'Nichts gefunden', toolsSearch: 'Tools durchsuchen', searchClear: 'Suche leeren',
    pagerLabel: 'Seiten', pagePrev: 'Vorherige Seite', pageNext: 'Nächste Seite', pageWord: 'Seite',
    gridLabel: 'Rastergröße', gridLarge: 'Großes Raster', gridSmall: 'Kleines Raster',
    blogIntro: 'Kurze Notizen, Projekt-Updates und längere Beiträge.',
    fallbackNote: 'Noch nicht übersetzt. Hier das Original auf',
    backToBlog: 'Alle Beiträge',
    latestPosts: 'Neueste Beiträge', moreToRead: 'Weiterlesen', onThisPage: 'Auf dieser Seite', updatedOn: 'Aktualisiert',
    siteTitle: 'Galuin',
    siteDescription: 'Simon (Galuin): Notizen, Videos, Stream und praktische Browser-Tools.',
    langName: 'Deutsch',
    skip: 'Zum Inhalt springen',
    closeImage: 'Bild schließen',
    navBlog: 'Blog', navVideos: 'Videos', navTools: 'Tools', navSetup: 'Setup', navHangout: 'Hangout',
    navLabel: 'Hauptmenü', langLabel: 'Sprache', themeToggle: 'Hell/Dunkel umschalten',
    footerLine: 'Games, Code und ein paar Tools, die im Browser laufen.',
    footerWork: 'Arbeit & Projekte', impressum: 'Impressum', privacy: 'Datenschutz',
    nfTitle: 'Diese Seite gibt es nicht.', nfHome: 'Zur Startseite',
  },
  ru: {
    notesTitle: 'Заметки', latestVideos: 'Свежие видео', allVideos: 'Все видео',
    leadVideo: 'Новое на YouTube', leadPost: 'Свежая запись',
    twitchTitle: 'Стримы на Twitch', twitchText: 'Я стримлю на Twitch под ником galuin. Плеер загружается с twitch.tv только после клика; тогда Twitch может сохранить cookie.',
    twitchLoad: 'Загрузить плеер', watchOnTwitch: 'Смотреть на Twitch',
    toolsIntro: 'Небольшие инструменты прямо в браузере. Ваши файлы не покидают устройство.', allTools: 'Все инструменты',
    videosIntro: 'Видео об играх и технологиях с моего YouTube-канала.',
    hardwareIntro: 'На чём я играю, монтирую и стримлю. Ссылки ведут на страницу товара в магазине.',
    hwHint: 'Наведите на деталь и нажмите', hwHintTouch: 'Нажмите на деталь, чтобы приблизить', hwParts: 'Детали стола', hwClose: 'Назад к столу', hwPrev: 'Предыдущая деталь', hwNext: 'Следующая деталь', hwOpen: 'Открыть в магазине', hwOff: 'Свет выкл.', hwOn: 'Свет вкл.', hwAll: 'Всё одним списком',
    hwAlt: 'Рендер моего стола: три монитора, системный блок с подсвеченной боковой панелью, клавиатура 60%, мышь, микрофон на пантографе, колонки и VR-шлем.',
    legalUpdated: 'Редакция от',
    toolsLocal: 'Работает в вашем браузере. Ваши файлы и данные не покидают устройство.', toolsCategories: 'Категории инструментов',
    moreOnYouTube: 'Больше на YouTube',
    shortsTitle: 'Shorts',
    searchLabel: 'Поиск по записям', searchPlaceholder: 'Поиск', noResults: 'Ничего не найдено', toolsSearch: 'Поиск по инструментам', searchClear: 'Очистить поиск',
    pagerLabel: 'Страницы', pagePrev: 'Предыдущая страница', pageNext: 'Следующая страница', pageWord: 'Страница',
    gridLabel: 'Размер сетки', gridLarge: 'Крупная сетка', gridSmall: 'Мелкая сетка',
    blogIntro: 'Короткие заметки, новости проектов и большие статьи.',
    fallbackNote: 'Пока не переведено. Показан оригинал на языке:',
    backToBlog: 'Все записи',
    latestPosts: 'Свежие записи', moreToRead: 'Ещё почитать', onThisPage: 'На этой странице', updatedOn: 'Обновлено',
    siteTitle: 'Galuin',
    siteDescription: 'Саймон (Galuin): заметки, видео, стримы и полезные инструменты прямо в браузере.',
    langName: 'Русский',
    skip: 'Перейти к содержанию',
    closeImage: 'Закрыть изображение',
    navBlog: 'Блог', navVideos: 'Видео', navTools: 'Инструменты', navSetup: 'Сетап', navHangout: 'Тусовка',
    navLabel: 'Главное меню', langLabel: 'Язык', themeToggle: 'Светлая/тёмная тема',
    footerLine: 'Игры, код и пара инструментов, работающих прямо в браузере.',
    footerWork: 'Работа и проекты', impressum: 'Выходные данные', privacy: 'Конфиденциальность',
    nfTitle: 'Такой страницы нет.', nfHome: 'На главную',
  },
} as const satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof typeof ui.en;

export function t(lang: Lang, key: UiKey): string {
  return ui[lang][key];
}

/** Site-relative URL of page `p` (starting with "/") in `lang`. */
export function path(lang: Lang, p: string): string {
  return lang === 'en' ? p : `/${lang}${p}`;
}

/** The same page in another language: strips a /de or /ru prefix, then adds the target one. */
export function localize(pathname: string, lang: Lang): string {
  return path(lang, pathname.replace(/^\/(de|ru)(?=\/|$)/, '') || '/');
}
