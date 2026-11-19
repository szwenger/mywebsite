export type Lang = 'en' | 'de' | 'ru';
export const LANGS: Lang[] = ['en', 'de', 'ru'];

// DE and RU are drafts; Simon reviews them before launch.
export const ui = {
  en: {
    videosIntro: 'Gaming and tech videos from my YouTube channel.',
    moreOnYouTube: 'More on YouTube',
    shortBadge: 'Short',
    blogIntro: 'Short notes, project updates and longer write-ups.',
    fallbackNote: 'Not translated yet. Showing the original in',
    backToBlog: 'All posts',
    siteTitle: 'Galuin',
    siteDescription: 'Simon (Galuin): notes, videos, stream and handy browser tools.',
    langName: 'English',
    skip: 'Skip to content',
    navBlog: 'Blog', navVideos: 'Videos', navTools: 'Tools', navHardware: 'Hardware', navTwitch: 'Twitch',
    navLabel: 'Main', langLabel: 'Language', themeToggle: 'Toggle light/dark theme',
    footerLine: 'Games, code and a few tools that run in your browser.',
    footerWork: 'Work & projects', impressum: 'Legal notice', privacy: 'Privacy',
    homeSoon: 'New front page in the works.',
    nfTitle: 'This page does not exist.', nfHome: 'Back home',
  },
  de: {
    videosIntro: 'Gaming- und Tech-Videos von meinem YouTube-Kanal.',
    moreOnYouTube: 'Mehr auf YouTube',
    shortBadge: 'Short',
    blogIntro: 'Kurze Notizen, Projekt-Updates und längere Beiträge.',
    fallbackNote: 'Noch nicht übersetzt. Hier das Original auf',
    backToBlog: 'Alle Beiträge',
    siteTitle: 'Galuin',
    siteDescription: 'Simon (Galuin): Notizen, Videos, Stream und praktische Browser-Tools.',
    langName: 'Deutsch',
    skip: 'Zum Inhalt springen',
    navBlog: 'Blog', navVideos: 'Videos', navTools: 'Tools', navHardware: 'Hardware', navTwitch: 'Twitch',
    navLabel: 'Hauptmenü', langLabel: 'Sprache', themeToggle: 'Hell/Dunkel umschalten',
    footerLine: 'Games, Code und ein paar Tools, die im Browser laufen.',
    footerWork: 'Arbeit & Projekte', impressum: 'Impressum', privacy: 'Datenschutz',
    homeSoon: 'Die neue Startseite entsteht gerade.',
    nfTitle: 'Diese Seite gibt es nicht.', nfHome: 'Zur Startseite',
  },
  ru: {
    videosIntro: 'Видео об играх и технологиях с моего YouTube-канала.',
    moreOnYouTube: 'Больше на YouTube',
    shortBadge: 'Short',
    blogIntro: 'Короткие заметки, новости проектов и большие статьи.',
    fallbackNote: 'Пока не переведено. Показан оригинал на языке:',
    backToBlog: 'Все записи',
    siteTitle: 'Galuin',
    siteDescription: 'Саймон (Galuin): заметки, видео, стримы и полезные инструменты прямо в браузере.',
    langName: 'Русский',
    skip: 'Перейти к содержанию',
    navBlog: 'Блог', navVideos: 'Видео', navTools: 'Инструменты', navHardware: 'Железо', navTwitch: 'Twitch',
    navLabel: 'Главное меню', langLabel: 'Язык', themeToggle: 'Светлая/тёмная тема',
    footerLine: 'Игры, код и пара инструментов, работающих прямо в браузере.',
    footerWork: 'Работа и проекты', impressum: 'Выходные данные', privacy: 'Конфиденциальность',
    homeSoon: 'Новая главная страница в работе.',
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
