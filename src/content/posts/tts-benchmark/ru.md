---
title: "Синтез речи на процессоре: число потоков оказалось важнее движка"
date: 2026-11-22T21:25:00Z
cover: /posts/tts-benchmark.jpg
tags: [tts, benchmark, cpu, local-ai]
---
Мой Open WebUI озвучивает ответы через два движка за небольшим роутером: Kokoro для английского и Piper для немецкого и русского. Я хотел узнать, сможет ли один движок, работающий только на процессоре, заменить оба и закрыть все три языка. Я сравнил Kitten TTS 2 (Nano и Mini) и Supertonic 3 с текущей настройкой. Все они во много раз быстрее реального времени, так что скорость не определяет победителя. **Зато число потоков определяет, насколько быстр каждый из них, причём до трёх раз.**

![Точечная диаграмма коэффициента реального времени для семи вариантов, по одной точке для английского, немецкого и русского. Kitten Nano быстрее всех, 0,05; Supertonic с 2 потоками даёт от 0,09 до 0,15; базовая связка Kokoro и Piper — от 0,03 (русский) до 0,19 (английский); Supertonic со всеми 20 потоками медленнее всех, от 0,22 до 0,31.](/posts/tts-benchmark.jpg)

## Как я тестировал

Машина — i5-13600K с 14 ядрами и 20 потоками, только процессор, видеокарта не использовалась. Тестовый набор — 4 предложения на язык: короткое, среднее, длинное и одно с числами и датами. Каждое предложение запускалось один раз для прогрева и затем 5 раз, я привожу медианы. Open WebUI отправляет по одному предложению, поэтому я измерял полный синтез одного предложения. Коэффициент реального времени (RTF) — это время синтеза, делённое на длину аудио: 0,1 означает, что десять секунд речи делаются за одну секунду.

Базовый вариант — работающий роутер, измеренный по HTTP, то есть с переходом через роутер и кодированием в mp3. Кандидаты работали в том же процессе под Python 3.12, из-за чего у них небольшое преимущество, вероятно, заметно меньше 0,1 секунды.

## Результаты

RTF и время для длинного предложения (около 11 секунд аудио) при лучшей настройке потоков для каждого движка.

| Движок | Английский | Немецкий | Русский | ОЗУ | Языков |
|--------|------------|----------|---------|-----|--------|
| Базовый (Kokoro и Piper) | 0,19 / 2,1 с | 0,03-0,11 / 0,3-1,2 с | 0,03 / 0,3 с | 1,3 ГиБ | 3 |
| Kitten Nano, 8 потоков | 0,05 / 0,45 с | 0,05 / 0,5 с | 0,05 / 0,5 с | около 1,4 ГБ | 8 |
| Kitten Mini int8 | 0,17 / 1,7 с | 0,17 / 1,9 с | 0,17 / 1,7 с | около 1,2 ГБ | 16 |
| Supertonic 3, 8 шагов, 2 потока | 0,15 / 1,7 с | 0,15 / 1,9 с | 0,15 / 1,9 с | 0,58 ГБ | 31 |
| Supertonic 3, 4 шага, 2 потока | 0,09 / 1,0 с | 0,09 / 1,1 с | 0,08 / 1,1 с | 0,58 ГБ | 31 |

Для первого предложения, которое определяет ожидание до начала звука, базовому варианту нужно 0,4-0,5 с на английском, 0,1-0,2 с на немецком и 0,06 с на русском. Kitten Nano нужно 0,17-0,2 с, Kitten Mini 0,4-0,5 с, а Supertonic 0,2-0,3 с при 4 шагах и 0,4-0,5 с при 8 шагах.

## Послушайте сами

Одно и то же предложение у четырёх вариантов, на каждом языке. Нажмите на строку, чтобы воспроизвести.

<div class="player">
<section class="panel" data-label="Английский">
<p class="said">The meeting moved to Thursday afternoon, so please send me the updated slides before then.</p>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Базовый (Kokoro и Piper)"></button><div class="info"><span class="who">Базовый (Kokoro и Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-en.mp3"></audio></div>
</section>
<section class="panel" data-label="Немецкий">
<p class="said">Das Treffen wurde auf Donnerstagnachmittag verschoben, schick mir also bitte vorher die aktualisierten Folien.</p>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Базовый (Kokoro и Piper)"></button><div class="info"><span class="who">Базовый (Kokoro и Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-de.mp3"></audio></div>
</section>
<section class="panel" data-label="Русский">
<p class="said">Встречу перенесли на четверг после обеда, поэтому, пожалуйста, пришли мне обновлённые слайды заранее.</p>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Базовый (Kokoro и Piper)"></button><div class="info"><span class="who">Базовый (Kokoro и Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Воспроизвести: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-ru.mp3"></audio></div>
</section>
</div>

<p class="caption">Среднее предложение, мужской голос. Supertonic — это вариант с 8 шагами и 2 потоками. Для этой страницы звук сделан моно и перекодирован в mp3 на 64 кбит/с, поэтому он звучит немного хуже оригиналов.</p>

## Что говорят цифры

- **Потоки меняют результат в 2-3 раза, причём в разные стороны.** У Supertonic со стандартными для ONNX 20 потоками RTF на 8 шагах был 0,30. С ограничением до 2 потоков он упал до 0,15. Скорость, заявленная самим проектом, получена на M4 Pro и на этот гибридный процессор не переносится. Kitten ведёт себя наоборот: при 2 потоках он стал медленнее (0,29), а 8 потоков оказались чуть хуже стандартной настройки.
- **Роутеру, который выполняет несколько синтезов одновременно, придётся распределять потоки.** Если каждому давать значение по умолчанию, скорость будет потеряна.
- **Базовый вариант и так быстр, а самый быстрый в нём Piper.** Русский работает с RTF 0,03, немецкий — от 0,03 до 0,11 в зависимости от голоса. Kokoro для английского — самое медленное звено, 0,19.
- **Каждый кандидат работает с одинаковой скоростью на всех трёх языках.** RTF у каждого движка одинаков для английского, немецкого и русского, так что ни один язык не страдает.
- **Kitten требует больше, чем сказано в документации.** В карточке модели написано, что PyTorch не нужен, но английский фонемизатор подтягивает PyTorch и spacy, а описанная в документации установка с `--no-deps` не работает. Это около 1,2-1,4 ГБ ОЗУ и тяжёлая установка. Supertonic нужен только ONNX Runtime, и он занимает 0,58 ГБ.
- **Kitten Nano самый быстрый.** У него самый низкий RTF, 0,05, но это и самая маленькая модель.

Скорость не говорит о том, какой голос звучит лучше, поэтому я послушал каждый движок рядом с другими на каждом предложении, с женским и мужским набором. Я обращал внимание на ударения и интонацию в немецком и русском, на предложение с числами и датами и на то, остаётся ли голос одним и тем же диктором на разных языках. Для пробного запуска я выбрал Supertonic.

## Пробный запуск

Рабочую настройку я не трогал. В той же сети Docker работают два дополнительных контейнера без опубликованных портов: один с Supertonic 3 и вшитыми весами (образ 1,27 ГБ) и копия роутера, которая направляет голос `auto` на Supertonic. Поставляемый с Supertonic сервер не умеет делать mp3 и игнорирует настройки потоков и шагов на своём маршруте в стиле OpenAI, поэтому и то и другое делает небольшая обёртка, а роутер конвертирует wav в mp3.

Сквозное измерение по HTTP, с кодированием в mp3, медиана из 5, мужской голос:

| Язык | Короткое | Среднее | Длинное | Числа | RTF (длинное) |
|------|----------|---------|---------|-------|---------------|
| Английский | 0,39 с | 0,97 с | 1,76 с | 1,30 с | 0,156 |
| Немецкий | 0,47 с | 1,12 с | 1,93 с | 1,41 с | 0,150 |
| Русский | 0,48 с | 1,16 с | 1,99 с | 1,41 с | 0,151 |

Накладные расходы на HTTP и mp3 невелики. Английский так же быстр, как Kokoro, или быстрее (1,76 с против 2,1 с для длинного предложения). Немецкий и русский медленнее Piper (около 1,9-2,0 с против 0,3-1,2 с), но всё равно в 6-7 раз быстрее реального времени. Контейнер занимает 0,56 ГиБ.

## Оговорки

Это скорость на одной машине плюс моё собственное прослушивание 12 предложений, а не оценка качества. Я не тестировал Kitten TTS 2 1.7B (по карточке модели на процессоре он в 2-3 раза медленнее реального времени), Qwen3-TTS, Chatterbox, XTTS и Pocket TTS. Результаты по потокам относятся к этому гибридному процессору, а веса Supertonic распространяются по лицензии OpenRAIL-M, тогда как Kitten — по Apache-2.0.
