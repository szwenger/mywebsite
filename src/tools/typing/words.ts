export type L = 'en' | 'de' | 'ru';

/** Letters in the order they are taught: index fingers first, then outwards. The levels unlock them from the front. */
export const ORDER: Record<L, string> = {
  en: 'fjdkslaghrueiowtyqpbnvmcxz',
  de: 'fjdkslaghrueiowtzqpbnvmcxyöäüß',
  ru: 'аолдфывпржекнуигсмтьбчшщцйхзяъэюё',
};

/** Keyboard rows for the heat map, top to bottom. */
export const ROWS: Record<L, string[]> = {
  en: ['1234567890', 'qwertyuiop', "asdfghjkl;'", 'zxcvbnm,./'],
  de: ['1234567890ß', 'qwertzuiopü', 'asdfghjklöä', 'yxcvbnm,.-'],
  ru: ['1234567890', 'йцукенгшщзхъ', 'фывапролджэ', 'ячсмитьбю.'],
};

const w = (s: string) => s.trim().split(/\s+/);

export const WORDS: Record<L, string[]> = {
  en: w(`the be to of and in that have it for not on with he as you do at this but his by from they we say her she or an will my one all would there their what so up out if about who get which go me when make can like time no just him know take people into year your good some could them see other than then now look only come its over think also back after use two how our work first well way even new want because any these give day most us is are was were been has had did said each made find long down may more many write water little very still such here thing great where help through much before move right too mean old same tell boy follow came show also around form three small set put end does another large must big different line turn cause play spell air away animal house point page letter mother answer found study learn should world high every near add food between own below country plant last school father keep tree never start city earth eye light thought head under story saw left late run while press close night real life few north open seem together next white children begin got walk example ease paper group always music those both mark often until mile river car feet care second book carry took science eat room friend began idea fish mountain stop once base hear horse cut sure watch color face wood main enough plain girl usual young ready above ever red list though feel talk bird soon body dog family direct pose leave song measure door product black short numeral class wind question happen complete ship area half rock order fire south problem piece told knew pass since top whole king space heard best hour better true during hundred five remember step early hold west ground interest reach fast verb sing listen six table travel less morning ten simple several vowel toward war lay against pattern slow center love person money serve appear road map rain rule govern pull cold notice voice unit power town fine certain fly fall lead cry dark machine note wait plan figure star box noun field rest correct able pound done beauty drive stood contain front teach week final gave green oh quick develop ocean warm free minute strong special mind behind clear tail produce fact street inch multiply nothing course stay wheel full force blue object decide surface deep moon island foot system busy test record boat common gold possible plane stead dry wonder laugh thousand ago ran check game shape equate hot miss brought heat snow tire bring yes distant fill east paint language among`),
  de: w(`der die und in den von zu das mit sich des auf für ist im dem nicht ein eine als auch es an werden aus er hat dass sie nach wird bei einer um am sind noch wie einem über einen so zum war haben nur oder aber vor zur bis mehr durch man sein wurde sei prinzip kann gegen vom können schon wenn habe seine mark ihre dann unter wir soll ich eines es jahr zwei jahren diese dieser wieder keine uns nach ihm ihr jetzt immer gibt viel wo alle man neue heute sehr zeit gut hier mir ohne mein selbst machen weil leben tag welt land kein stadt ganz sagen geht vor schön größer älter müssen möchte hören gehören fühlen grüße straße groß weiß heiß schließen süß fröhlich später früher während könnte würde hätte größe füße tür bücher mädchen männer frühling sommer herbst winter morgen abend nacht woche monat stunde minute sekunde freund familie kinder mutter vater bruder schwester haus garten wasser feuer erde luft licht dunkel kalt warm schnell langsam klein neu alt jung lang kurz hoch tief weit nah laufen springen schreiben lesen sprechen denken fragen antworten arbeiten spielen lernen lehren essen trinken schlafen kommen gehen fahren fliegen sehen finden geben nehmen bringen halten bleiben stehen liegen sitzen warten helfen brauchen wissen glauben hoffen lieben mögen zeigen öffnen schließen beginnen enden`),
  ru: w(`и в не на я что он с как это по но они мы к у вы за от так же для из его её бы все был быть только уже или ещё если когда есть нет да можно будет где там человек время день рука работа слово дело жизнь глаз голова друг дом вода земля мир город страна друг мать отец брат сестра ребёнок книга письмо язык имя место сторона вопрос ответ правда жена муж сын дочь утро вечер ночь неделя месяц год час минута секунда погода зима весна лето осень солнце луна небо море река лес гора поле дорога улица площадь окно дверь стол стул комната кухня хлеб молоко мясо рыба яблоко чай кофе сахар соль красный синий зелёный белый чёрный жёлтый большой маленький новый старый хороший плохой быстрый медленный высокий низкий далёкий близкий тёплый холодный светлый тёмный идти бежать стоять сидеть лежать говорить сказать думать знать любить хотеть мочь делать видеть слышать читать писать играть учить работать жить ждать помнить понимать начинать кончать открыть закрыть взять дать найти потерять купить продать спросить ответить позвонить приехать уйти вернуться встретить пожалуйста спасибо здравствуйте привет пока сегодня завтра вчера сейчас потом всегда никогда иногда очень много мало совсем почти вместе один два три четыре пять шесть семь восемь девять десять сто тысяча`),
};

export const SENTENCES: Record<L, string[]> = {
  en: [
    'The quick brown fox jumps over the lazy dog.',
    'A small team can ship a surprisingly large idea when nobody waits for permission.',
    'Good software is mostly careful naming, honest error messages and a lot of deleted code.',
    'She poured a second cup of tea and watched the rain turn the street into a mirror.',
    'Before you optimise anything, measure it twice and write down what you expected to see.',
    'The train was late again, so we walked along the river and talked about nothing in particular.',
    'Learning to type fast is really learning to stop looking at your hands.',
    'If the build passes on your machine but fails on the server, check the environment first.',
    'Winter arrived overnight, and by morning every roof in the village wore a thin white coat.',
    'He kept a notebook of questions, and on quiet evenings he tried to answer one of them properly.',
    'Please back up your files today; the disk that has never failed is the one that is about to.',
    'We agreed to meet at noon, but the market was so busy that it took an hour to find each other.',
    'A calm voice, a clear plan and a short checklist solve most problems before they begin.',
    'The library smelled of dust and oranges, and the clock above the desk was always five minutes slow.',
    'Practise slowly and accurately first; speed is simply accuracy that has been repeated often enough.',
    'Nobody remembers the meeting, but everybody remembers the afternoon the power went out.',
    'The recipe calls for two eggs, a pinch of salt, and far more patience than the picture suggests.',
    'On Tuesday, the new router arrived, and by Wednesday the whole house had a better connection.',
    'Keep your wrists relaxed, your shoulders low and your eyes on the screen, not the keys.',
    'Every long journey is a series of short steps that someone decided to keep taking.',
  ],
  de: [
    'Der schnelle braune Fuchs springt über den faulen Hund, während die Sonne langsam untergeht.',
    'Ein kleines Team kann eine große Idee umsetzen, wenn niemand auf die Erlaubnis wartet.',
    'Gute Software besteht vor allem aus sorgfältigen Namen, ehrlichen Fehlermeldungen und viel gelöschtem Code.',
    'Sie schenkte sich noch eine Tasse Tee ein und sah zu, wie der Regen die Straße in einen Spiegel verwandelte.',
    'Bevor du etwas optimierst, miss es zweimal und schreib auf, was du erwartet hast.',
    'Der Zug hatte schon wieder Verspätung, also gingen wir am Fluss entlang und sprachen über Gott und die Welt.',
    'Schnell schreiben zu lernen heißt eigentlich, nicht mehr auf die eigenen Hände zu schauen.',
    'Wenn der Build bei dir läuft, aber auf dem Server scheitert, prüfe zuerst die Umgebung.',
    'Über Nacht kam der Winter, und am Morgen trug jedes Dach im Dorf eine dünne weiße Decke.',
    'Er führte ein Heft voller Fragen, und an ruhigen Abenden versuchte er, eine davon richtig zu beantworten.',
    'Bitte sichere heute deine Dateien; die Festplatte, die noch nie ausgefallen ist, fällt bestimmt als Nächste aus.',
    'Wir wollten uns um zwölf Uhr treffen, aber auf dem Markt war so viel los, dass wir eine Stunde suchten.',
    'Eine ruhige Stimme, ein klarer Plan und eine kurze Checkliste lösen die meisten Probleme, bevor sie entstehen.',
    'Die Bibliothek roch nach Staub und Orangen, und die Uhr über dem Tresen ging immer fünf Minuten nach.',
    'Übe zuerst langsam und genau; Geschwindigkeit ist nur Genauigkeit, die oft genug wiederholt wurde.',
    'An das Treffen erinnert sich niemand, aber an den Nachmittag, an dem der Strom ausfiel, jeder.',
    'Das Rezept verlangt zwei Eier, eine Prise Salz und viel mehr Geduld, als das Foto vermuten lässt.',
    'Am Dienstag kam der neue Router, und am Mittwoch hatte das ganze Haus eine bessere Verbindung.',
    'Halte die Handgelenke locker, die Schultern tief und die Augen auf dem Bildschirm, nicht auf den Tasten.',
    'Jede lange Reise besteht aus kleinen Schritten, die jemand immer weiter gegangen ist.',
  ],
  ru: [
    'Съешь же ещё этих мягких французских булок, да выпей чаю.',
    'Небольшая команда способна выпустить большую идею, если никто не ждёт разрешения.',
    'Хорошая программа состоит из аккуратных названий, честных сообщений об ошибках и большого количества удалённого кода.',
    'Она налила себе ещё одну чашку чая и смотрела, как дождь превращает улицу в зеркало.',
    'Прежде чем что-то оптимизировать, измерь это дважды и запиши, чего ты ожидал.',
    'Поезд снова опоздал, поэтому мы пошли вдоль реки и говорили ни о чём.',
    'Научиться быстро печатать — значит перестать смотреть на собственные руки.',
    'Если сборка проходит у тебя, но падает на сервере, сначала проверь окружение.',
    'Зима пришла за одну ночь, и к утру каждая крыша в деревне надела тонкое белое пальто.',
    'Он вёл тетрадь с вопросами и тихими вечерами пытался как следует ответить хотя бы на один.',
    'Сделай сегодня резервную копию: диск, который ни разу не ломался, скоро сломается.',
    'Мы договорились встретиться в полдень, но на рынке было так людно, что мы искали друг друга час.',
    'Спокойный голос, ясный план и короткий список решают большинство проблем до их появления.',
    'В библиотеке пахло пылью и апельсинами, а часы над столом всегда отставали на пять минут.',
    'Сначала тренируйся медленно и точно: скорость — это точность, повторённая достаточно часто.',
    'Никто не помнит то собрание, но все помнят вечер, когда отключили свет.',
    'По рецепту нужны два яйца, щепотка соли и гораздо больше терпения, чем кажется на фото.',
    'Во вторник привезли новый роутер, а к среде во всём доме связь стала лучше.',
    'Держи запястья расслабленными, плечи опущенными, а глаза на экране, а не на клавишах.',
    'Любой долгий путь — это череда коротких шагов, которые кто-то продолжал делать.',
  ],
};

export const CODE: string[] = [
  'const total = items.filter((x) => x.price > 0).reduce((a, b) => a + b.price, 0);',
  'if (user && user.age >= 18) { grant(user.id); } else { deny(); }',
  'for (let i = 0; i < list.length; i++) { sum += list[i] * 2; }',
  'function add(a, b) { return a + b; }',
  'SELECT name, COUNT(*) AS n FROM orders WHERE total > 100 GROUP BY name;',
  'git commit -m "Fix rounding of totals" && git push origin main',
  '<div class="card"><a href="/tools/">Tools</a></div>',
  'const map = new Map([["a", 1], ["b", 2]]); map.set("c", 3);',
  'def mean(xs): return sum(xs) / len(xs) if xs else 0',
  'docker run --rm -p 8080:80 -v "$PWD":/data nginx:latest',
  'ssh -i ~/.ssh/id_ed25519 user@192.168.1.10 -p 2222',
  'const { data, error } = await fetch(url).then((r) => r.json());',
  '.card { display: grid; gap: 12px; padding: 16px 24px; }',
  'let x = arr.map((v, i) => `${i}: ${v}`).join(", ");',
  'ffmpeg -i in.mp4 -c:v libx264 -crf 23 -preset slow out.mp4',
  '#!/bin/bash\nset -euo pipefail\necho "done" > /tmp/log.txt',
];
