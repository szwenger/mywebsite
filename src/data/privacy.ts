import type { Lang } from '../i18n/ui';

export interface PrivacyDoc { title: string; updated: string; sections: { h: string; p: string[] }[] }

const GH = 'https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement';
const TW = 'https://www.twitch.tv/p/en/legal/privacy-notice/';
const YT = 'https://policies.google.com/privacy';
const AZ = 'https://www.amazon.de/gp/help/customer/display.html?nodeId=201909010';
const SQ = 'https://www.squarespace.com/privacy';
const MAIL = '<a href="mailto:request@galuin.com">request@galuin.com</a>';

export const privacy: Record<Lang, PrivacyDoc> = {
  de: {
    title: 'Datenschutzerklärung',
    updated: '23. November 2026',
    sections: [
      { h: 'Verantwortlicher', p: [`Simon Zwenger, Kontakt: ${MAIL}. Die Anschrift steht im <a href="../impressum/">Impressum</a>.`] },
      { h: 'Hosting über GitHub Pages', p: [
        'Diese Website wird über GitHub Pages ausgeliefert. Beim Aufruf verarbeitet GitHub technisch notwendige Server-Logdaten, darunter deine IP-Adresse, Datum und Uhrzeit, die abgerufene Seite und deinen Browsertyp. Das ist nötig, um die Seite auszuliefern und missbräuchliche Zugriffe abzuwehren (Art. 6 Abs. 1 lit. f DSGVO). Anbieter sind GitHub Inc. (USA) und GitHub B.V. (Niederlande).',
        `GitHub kann diese Daten in die USA übermitteln. Nach eigener Angabe stützt sich GitHub dabei auf das EU-US Data Privacy Framework und auf Standardvertragsklauseln. Wie lange GitHub die Logdaten speichert, bestimmt GitHub; einen konkreten Zeitraum nennt die <a href="${GH}" rel="noopener">Datenschutzerklärung von GitHub</a> nicht. Ich selbst erhebe keine Zugriffsstatistiken und setze keine Tracker ein.`,
      ] },
      { h: 'Cookies und lokaler Speicher', p: ['Diese Website setzt keine Cookies. Im <code>localStorage</code> deines Browsers speichere ich Einstellungen und Arbeitsstände, damit sie beim nächsten Besuch noch da sind: das Farbschema (hell/dunkel), die Größe der Videokacheln, den zuletzt geöffneten Reiter und den Stand im Funktionsplotter, deine Eingaben in den Werkzeugen Code-Screenshots, LaTeX und Markdown sowie Einstellungen und Ergebnisse des Tipptrainers. Im <code>sessionStorage</code> liegt nur ein Merker für die Animation beim Sprachwechsel; er verschwindet, wenn du den Tab schließt. Diese Werte verlassen dein Gerät nicht, ich kann sie nicht sehen, und du kannst sie in den Browsereinstellungen löschen. Rechtsgrundlage: § 25 Abs. 2 Nr. 2 TDDDG, weil der Speicher nötig ist, damit die von dir genutzte Funktion arbeitet, und Art. 6 Abs. 1 lit. f DSGVO.'] },
      { h: 'Keine Drittinhalte beim Laden', p: ['Schriften und Vorschaubilder liegen auf galuin.com. Beim Laden einer Seite werden keine Inhalte von Dritten nachgeladen, deshalb erhalten Dritte dabei auch keine Daten von dir.'] },
      { h: 'Twitch-Player (nur nach Klick)', p: [`Der Twitch-Player wird erst geladen, wenn du auf „Player laden“ klickst. Dann stellt dein Browser eine Verbindung zu Twitch her; Twitch erhält deine IP-Adresse und kann Cookies setzen. Rechtsgrundlage ist deine Einwilligung durch den Klick (Art. 6 Abs. 1 lit. a DSGVO). Details: <a href="${TW}" rel="noopener">Datenschutzhinweis von Twitch</a>.`] },
      { h: 'Links zu YouTube, Twitch und Amazon', p: [
        'Wenn du einem Link zu YouTube, Twitch oder Amazon folgst, verlässt du diese Website. Ab dann gelten die Datenschutzbestimmungen des jeweiligen Anbieters: ' +
        `<a href="${YT}" rel="noopener">YouTube (Google)</a>, <a href="${TW}" rel="noopener">Twitch</a>, <a href="${AZ}" rel="noopener">Amazon</a>.`,
      ] },
      { h: 'Browser-Tools', p: ['Die Tools (z. B. QR-Code, PDF, Bildkonverter) verarbeiten deine Dateien ausschließlich lokal im Browser. Es wird nichts hochgeladen oder an einen Server gesendet.'] },
      { h: 'Kontakt per E-Mail', p: [
        `Wenn du mir schreibst (${MAIL}), verarbeite ich deine Nachricht und Absenderadresse nur, um zu antworten. Ich lösche sie, sobald die Angelegenheit erledigt ist und keine Aufbewahrungspflicht besteht.`,
        `Mails an diese Adresse leitet mein Domain-Anbieter Squarespace (Squarespace Ireland Limited) in mein Postfach weiter; laut DNS-Eintrag nimmt dafür ein Mailserver von Mailgun (USA) die Nachricht an. Nach eigener Angabe stützt sich Squarespace bei Übermittlungen in die USA auf das EU-US Data Privacy Framework und Standardvertragsklauseln (<a href="${SQ}" rel="noopener">Datenschutzerklärung von Squarespace</a>). Wie lange weitergeleitete Nachrichten dort gespeichert werden, nennt Squarespace dort nicht.`,
      ] },
      { h: 'Deine Rechte', p: ['Du hast das Recht auf Auskunft (Art. 15 DSGVO), Berichtigung (Art. 16), Löschung (Art. 17), Einschränkung der Verarbeitung (Art. 18), Datenübertragbarkeit (Art. 20) und Widerspruch (Art. 21). Eine erteilte Einwilligung kannst du jederzeit mit Wirkung für die Zukunft widerrufen. Außerdem hast du das Recht auf Beschwerde bei einer Datenschutz-Aufsichtsbehörde. Schreib dazu einfach an ' + MAIL + '.'] },
    ],
  },
  en: {
    title: 'Privacy policy',
    updated: '23 November 2026',
    sections: [
      { h: 'Controller', p: [`Simon Zwenger, contact: ${MAIL}. The postal address is in the <a href="../impressum/">legal notice</a>. This is a translation; the German version applies.`] },
      { h: 'Hosting on GitHub Pages', p: [
        'This website is served by GitHub Pages. When you open a page, GitHub processes technically necessary server logs, including your IP address, date and time, the page requested and your browser type. This is needed to deliver the site and to fend off abuse (Art. 6(1)(f) GDPR). The providers are GitHub Inc. (USA) and GitHub B.V. (Netherlands).',
        `GitHub may transfer this data to the USA. By its own statement, GitHub relies on the EU-US Data Privacy Framework and on standard contractual clauses for this. GitHub decides how long it keeps the logs; the <a href="${GH}" rel="noopener">GitHub privacy statement</a> gives no specific period. I do not run analytics or trackers myself.`,
      ] },
      { h: 'Cookies and local storage', p: ['This site sets no cookies. In your browser\'s <code>localStorage</code> I store settings and work in progress so they are still there on your next visit: the colour scheme (light/dark), the size of the video tiles, the last open tab and the state of the graphing calculator, what you type into the Code screenshots, LaTeX and Markdown tools, and the typing trainer\'s settings and results. <code>sessionStorage</code> holds only a flag for the animation when you switch language; it disappears when you close the tab. These values never leave your device, I cannot see them, and you can delete them in your browser settings. Legal basis: § 25(2) no. 2 TDDDG, because the storage is needed for the feature you are using to work, and Art. 6(1)(f) GDPR.'] },
      { h: 'No third-party content on load', p: ['Fonts and thumbnails are served from galuin.com. Loading a page requests nothing from third parties, so no third party receives data about you when you do.'] },
      { h: 'Twitch player (only after a click)', p: [`The Twitch player loads only after you click “Load player”. Your browser then connects to Twitch; Twitch receives your IP address and may set cookies. The legal basis is your consent by clicking (Art. 6(1)(a) GDPR). Details: <a href="${TW}" rel="noopener">Twitch privacy notice</a>.`] },
      { h: 'Links to YouTube, Twitch and Amazon', p: [
        'When you follow a link to YouTube, Twitch or Amazon you leave this site, and that provider\'s privacy rules apply: ' +
        `<a href="${YT}" rel="noopener">YouTube (Google)</a>, <a href="${TW}" rel="noopener">Twitch</a>, <a href="${AZ}" rel="noopener">Amazon</a>.`,
      ] },
      { h: 'Browser tools', p: ['The tools (such as QR code, PDF and image converter) process your files only locally in your browser. Nothing is uploaded or sent to a server.'] },
      { h: 'Contact by email', p: [
        `If you write to me (${MAIL}), I use your message and address only to reply. I delete them once the matter is closed and no retention duty applies.`,
        `My domain provider Squarespace (Squarespace Ireland Limited) forwards mail to this address into my mailbox; according to the DNS record, a Mailgun (USA) mail server accepts the message for that. By its own statement, Squarespace relies on the EU-US Data Privacy Framework and standard contractual clauses for transfers to the USA (<a href="${SQ}" rel="noopener">Squarespace privacy policy</a>). Squarespace does not say there how long forwarded messages are kept.`,
      ] },
      { h: 'Your rights', p: ['You have the right of access (Art. 15 GDPR), rectification (Art. 16), erasure (Art. 17), restriction (Art. 18), data portability (Art. 20) and objection (Art. 21). You can withdraw consent at any time with effect for the future. You can also lodge a complaint with a data protection supervisory authority. To exercise any of these, email ' + MAIL + '.'] },
    ],
  },
  ru: {
    title: 'Политика конфиденциальности',
    updated: '23 ноября 2026',
    sections: [
      { h: 'Ответственное лицо', p: [`Simon Zwenger, контакт: ${MAIL}. Почтовый адрес указан в разделе <a href="../impressum/">«Выходные данные»</a>. Это перевод; юридическую силу имеет немецкая версия.`] },
      { h: 'Хостинг на GitHub Pages', p: [
        'Сайт отдаётся через GitHub Pages. При открытии страницы GitHub обрабатывает технически необходимые серверные логи: IP-адрес, дату и время, запрошенную страницу и тип браузера. Это нужно, чтобы показать сайт и отражать злоупотребления (ст. 6(1)(f) GDPR). Поставщики: GitHub Inc. (США) и GitHub B.V. (Нидерланды).',
        `GitHub может передавать эти данные в США. По собственному заявлению, GitHub опирается на EU-US Data Privacy Framework и стандартные договорные положения. Как долго хранятся логи, решает GitHub; конкретный срок в <a href="${GH}" rel="noopener">политике конфиденциальности GitHub</a> не указан. Сам я не веду статистику и не использую трекеры.`,
      ] },
      { h: 'Cookies и локальное хранилище', p: ['Сайт не устанавливает cookies. В <code>localStorage</code> браузера я сохраняю настройки и черновики, чтобы они были на месте при следующем визите: тему (светлая/тёмная), размер карточек видео, последнюю открытую вкладку и состояние графического калькулятора, то, что вы вводите в инструментах «Скриншоты кода», LaTeX и Markdown, а также настройки и результаты клавиатурного тренажёра. В <code>sessionStorage</code> лежит только метка для анимации при смене языка; она исчезает при закрытии вкладки. Эти данные не покидают ваше устройство, я их не вижу, а удалить их можно в настройках браузера. Основание: § 25 абз. 2 п. 2 TDDDG, так как хранилище нужно для работы используемой вами функции, и ст. 6(1)(f) GDPR.'] },
      { h: 'Нет сторонних загрузок при открытии', p: ['Шрифты и превью лежат на galuin.com. При загрузке страницы ничего не запрашивается у третьих лиц, поэтому они не получают ваших данных.'] },
      { h: 'Плеер Twitch (только после клика)', p: [`Плеер Twitch загружается только после нажатия «Загрузить плеер». Тогда браузер подключается к Twitch; Twitch получает ваш IP-адрес и может установить cookies. Основание — ваше согласие через клик (ст. 6(1)(a) GDPR). Подробнее: <a href="${TW}" rel="noopener">уведомление Twitch о конфиденциальности</a>.`] },
      { h: 'Ссылки на YouTube, Twitch и Amazon', p: [
        'Переходя по ссылке на YouTube, Twitch или Amazon, вы покидаете этот сайт, и действуют правила конфиденциальности соответствующего сервиса: ' +
        `<a href="${YT}" rel="noopener">YouTube (Google)</a>, <a href="${TW}" rel="noopener">Twitch</a>, <a href="${AZ}" rel="noopener">Amazon</a>.`,
      ] },
      { h: 'Инструменты в браузере', p: ['Инструменты (QR-код, PDF, конвертер изображений) обрабатывают ваши файлы только локально в браузере. Ничего не загружается и не отправляется на сервер.'] },
      { h: 'Связь по почте', p: [
        `Если вы пишете мне (${MAIL}), я использую письмо и адрес только для ответа и удаляю их, когда вопрос решён и нет обязанности хранить.`,
        `Почту на этот адрес пересылает в мой ящик регистратор домена Squarespace (Squarespace Ireland Limited); по записи DNS письмо принимает почтовый сервер Mailgun (США). По собственному заявлению, при передаче в США Squarespace опирается на EU-US Data Privacy Framework и стандартные договорные положения (<a href="${SQ}" rel="noopener">политика конфиденциальности Squarespace</a>). Как долго пересланные письма хранятся, Squarespace там не указывает.`,
      ] },
      { h: 'Ваши права', p: ['Вы вправе получить доступ к данным (ст. 15 GDPR), исправить (ст. 16), удалить (ст. 17), ограничить обработку (ст. 18), перенести данные (ст. 20) и возразить (ст. 21). Согласие можно отозвать в любой момент на будущее. Также можно подать жалобу в надзорный орган по защите данных. Для этого напишите на ' + MAIL + '.'] },
    ],
  },
};
