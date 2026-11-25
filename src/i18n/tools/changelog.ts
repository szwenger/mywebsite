/** Strings of the /changelog/ page and the version link on /tools/. tests/toolstrings.test.mjs keeps the three languages in step. */
export const s = {
  en: {
    title: 'Changelog', description: 'What changed on the site and in the tools, version by version.',
    current: 'Version {v}, updated {date}', versions: 'Versions', newTool: 'New',
    kindNew: 'New', kindChanged: 'Changed', kindFixed: 'Fixed', kindInternal: 'Internal', internalN: 'Internal changes ({n})',
    earlierRail: 'Earlier', earlierTitle: 'Earlier versions, {from} to {to}', version: 'Version', notes: 'Release notes',
  },
  de: {
    title: 'Änderungen', description: 'Was sich auf der Seite und bei den Tools geändert hat, Version für Version.',
    current: 'Version {v}, aktualisiert am {date}', versions: 'Versionen', newTool: 'Neu',
    kindNew: 'Neu', kindChanged: 'Geändert', kindFixed: 'Behoben', kindInternal: 'Intern', internalN: 'Interne Änderungen ({n})',
    earlierRail: 'Früher', earlierTitle: 'Frühere Versionen, {from} bis {to}', version: 'Version', notes: 'Änderungen',
  },
  ru: {
    title: 'История изменений', description: 'Что изменилось на сайте и в инструментах, версия за версией.',
    current: 'Версия {v}, обновлено {date}', versions: 'Версии', newTool: 'Новое',
    kindNew: 'Новое', kindChanged: 'Изменено', kindFixed: 'Исправлено', kindInternal: 'Внутреннее', internalN: 'Внутренние изменения ({n})',
    earlierRail: 'Раньше', earlierTitle: 'Прежние версии, от {from} до {to}', version: 'Версия', notes: 'История изменений',
  },
};
