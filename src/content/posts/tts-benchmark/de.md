---
title: "Sprachausgabe auf der CPU: Die Thread-Zahl war wichtiger als die Engine"
date: 2026-11-22T21:25:00Z
cover: /posts/tts-benchmark.jpg
tags: [tts, benchmark, cpu, local-ai]
---
Mein Open WebUI liest Antworten über zwei Engines hinter einem kleinen Router vor: Kokoro für Englisch und Piper für Deutsch und Russisch. Ich wollte wissen, ob eine einzige reine CPU-Engine beide ersetzen und alle drei Sprachen abdecken kann. Ich habe Kitten TTS 2 (Nano und Mini) und Supertonic 3 gegen das aktuelle Setup getestet. Alle sind um ein Vielfaches schneller als Echtzeit, die Geschwindigkeit entscheidet also nicht. **Die Thread-Zahl entscheidet aber, wie schnell jede Engine ist, und zwar um bis zu das Dreifache.**

![Punktdiagramm des Echtzeitfaktors für sieben Setups, mit je einem Punkt für Englisch, Deutsch und Russisch. Kitten Nano ist mit 0,05 am schnellsten, Supertonic mit 2 Threads liegt bei 0,09 bis 0,15, die Baseline aus Kokoro und Piper reicht von 0,03 (Russisch) bis 0,19 (Englisch), und Supertonic mit allen 20 Threads ist mit 0,22 bis 0,31 am langsamsten.](/posts/tts-benchmark.jpg)

## So habe ich getestet

Der Rechner ist ein i5-13600K mit 14 Kernen und 20 Threads, nur CPU, die GPU blieb ungenutzt. Das Testset umfasst 4 Sätze pro Sprache: kurz, mittel, lang und einer mit Zahlen und Datum. Jeder Satz lief einmal zum Aufwärmen und danach 5-mal, ich gebe Mediane an. Open WebUI schickt einen Satz nach dem anderen, deshalb habe ich die komplette Synthese eines Satzes gemessen. Der Echtzeitfaktor (RTF) ist die Synthesezeit geteilt durch die Länge des Audios: 0,1 heißt, zehn Sekunden Sprache brauchen eine Sekunde.

Die Baseline ist der laufende Router, gemessen über HTTP, also mit Router-Hop und mp3-Kodierung. Die Kandidaten liefen in-process unter Python 3.12 und haben dadurch einen kleinen Vorsprung, wahrscheinlich deutlich unter 0,1 Sekunden.

## Ergebnisse

RTF und Zeit für den langen Satz (etwa 11 Sekunden Audio), jeweils mit der besten Thread-Einstellung pro Engine.

| Engine | Englisch | Deutsch | Russisch | RAM | Sprachen |
|--------|----------|---------|----------|-----|----------|
| Baseline (Kokoro und Piper) | 0,19 / 2,1 s | 0,03-0,11 / 0,3-1,2 s | 0,03 / 0,3 s | 1,3 GiB | 3 |
| Kitten Nano, 8 Threads | 0,05 / 0,45 s | 0,05 / 0,5 s | 0,05 / 0,5 s | etwa 1,4 GB | 8 |
| Kitten Mini int8 | 0,17 / 1,7 s | 0,17 / 1,9 s | 0,17 / 1,7 s | etwa 1,2 GB | 16 |
| Supertonic 3, 8 Schritte, 2 Threads | 0,15 / 1,7 s | 0,15 / 1,9 s | 0,15 / 1,9 s | 0,58 GB | 31 |
| Supertonic 3, 4 Schritte, 2 Threads | 0,09 / 1,0 s | 0,09 / 1,1 s | 0,08 / 1,1 s | 0,58 GB | 31 |

Beim ersten Satz, der die Wartezeit bis zum Audio bestimmt, braucht die Baseline 0,4-0,5 s auf Englisch, 0,1-0,2 s auf Deutsch und 0,06 s auf Russisch. Kitten Nano braucht 0,17-0,2 s, Kitten Mini 0,4-0,5 s und Supertonic 0,2-0,3 s bei 4 Schritten beziehungsweise 0,4-0,5 s bei 8 Schritten.

## Selbst anhören

Hier ist derselbe Satz von vier Setups, in jeder Sprache. Eine Zeile anklicken, um sie abzuspielen.

<div class="player">
<section class="panel" data-label="Englisch">
<p class="said">The meeting moved to Thursday afternoon, so please send me the updated slides before then.</p>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Baseline (Kokoro und Piper)"></button><div class="info"><span class="who">Baseline (Kokoro und Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-en.mp3"></audio></div>
</section>
<section class="panel" data-label="Deutsch">
<p class="said">Das Treffen wurde auf Donnerstagnachmittag verschoben, schick mir also bitte vorher die aktualisierten Folien.</p>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Baseline (Kokoro und Piper)"></button><div class="info"><span class="who">Baseline (Kokoro und Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-de.mp3"></audio></div>
</section>
<section class="panel" data-label="Russisch">
<p class="said">Встречу перенесли на четверг после обеда, поэтому, пожалуйста, пришли мне обновлённые слайды заранее.</p>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Baseline (Kokoro und Piper)"></button><div class="info"><span class="who">Baseline (Kokoro und Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Abspielen: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-ru.mp3"></audio></div>
</section>
</div>

<p class="caption">Mittlerer Satz, männliche Stimme. Supertonic ist die Einstellung mit 8 Schritten und 2 Threads. Das Audio ist für diese Seite mono und als 64-kbps-mp3 neu kodiert und klingt deshalb etwas schlechter als die Originale.</p>

## Was die Zahlen sagen

- **Threads verändern das Ergebnis um das 2- bis 3-Fache, und zwar in entgegengesetzte Richtungen.** Supertonic mit dem ONNX-Standard von 20 Threads hatte bei 8 Schritten einen RTF von 0,30. Auf 2 Threads begrenzt fiel er auf 0,15. Die selbst angegebene Geschwindigkeit stammt von einem M4 Pro und lässt sich auf diese Hybrid-CPU nicht übertragen. Kitten verhält sich umgekehrt: Mit 2 Threads wurde es langsamer (0,29), und 8 Threads waren minimal schlechter als der Standard.
- **Ein Router, der mehrere Synthesen gleichzeitig ausführt, muss Threads einteilen.** Jeder Synthese den Standard zu geben, würde Geschwindigkeit kosten.
- **Die Baseline ist schon schnell, und Piper ist der schnellste Teil.** Russisch läuft mit RTF 0,03, Deutsch je nach Stimme mit 0,03 bis 0,11. Kokoro für Englisch ist mit 0,19 der langsamste Teil.
- **Jeder Kandidat ist in allen drei Sprachen gleich schnell.** Der RTF ist pro Engine für Englisch, Deutsch und Russisch identisch, keine Sprache wird benachteiligt.
- **Kitten braucht mehr, als die Doku sagt.** Die Model Card behauptet, PyTorch sei nicht nötig, aber der englische Phonemizer zieht PyTorch und spacy nach, und die dokumentierte `--no-deps`-Installation funktioniert nicht. Das kostet etwa 1,2-1,4 GB RAM und eine große Installation. Supertonic braucht nur ONNX Runtime und belegt 0,58 GB.
- **Kitten Nano ist am schnellsten.** Es hat mit 0,05 den niedrigsten RTF, ist aber auch das kleinste Modell.

Geschwindigkeit sagt nichts darüber, welche Stimme am besten klingt. Deshalb habe ich mir jede Engine für jeden Satz nebeneinander angehört, mit einem weiblichen und einem männlichen Set. Ich habe auf Betonung im Deutschen und Russischen geachtet, auf den Satz mit Zahlen und Datum und darauf, ob die Stimme über die Sprachen hinweg derselbe Sprecher bleibt. Ich habe Supertonic für einen Testlauf gewählt.

## Der Testlauf

Das laufende Setup habe ich nicht angefasst. Zwei zusätzliche Container laufen im selben Docker-Netzwerk, ohne veröffentlichte Ports: einer mit Supertonic 3 samt Gewichten (ein 1,27-GB-Image) und eine Kopie des Routers, die die Stimme `auto` auf Supertonic abbildet. Der mitgelieferte Supertonic-Server kann kein mp3 erzeugen und ignoriert die Thread- und Schritt-Einstellungen auf seiner OpenAI-Route. Deshalb übernimmt ein kleiner Wrapper beides, und der Router wandelt das wav in mp3 um.

Von Ende zu Ende über HTTP, mit mp3-Kodierung, Median aus 5, männliche Stimme:

| Sprache | Kurz | Mittel | Lang | Zahlen | RTF (lang) |
|---------|------|--------|------|--------|------------|
| Englisch | 0,39 s | 0,97 s | 1,76 s | 1,30 s | 0,156 |
| Deutsch | 0,47 s | 1,12 s | 1,93 s | 1,41 s | 0,150 |
| Russisch | 0,48 s | 1,16 s | 1,99 s | 1,41 s | 0,151 |

Der Aufwand durch HTTP und mp3 ist klein. Englisch ist gleichauf oder schneller als Kokoro (1,76 s gegenüber 2,1 s für den langen Satz). Deutsch und Russisch sind langsamer als Piper (etwa 1,9-2,0 s gegenüber 0,3-1,2 s), aber immer noch 6- bis 7-mal schneller als Echtzeit. Der Container belegt 0,56 GiB.

## Einschränkungen

Das ist Geschwindigkeit auf einem Rechner plus mein eigenes Hören bei 12 Sätzen, keine Qualitätsnote. Nicht getestet habe ich Kitten TTS 2 1.7B (laut Model Card auf der CPU 2- bis 3-mal langsamer als Echtzeit), Qwen3-TTS, Chatterbox, XTTS und Pocket TTS. Die Thread-Ergebnisse gelten für diese Hybrid-CPU, und die Gewichte von Supertonic stehen unter der Lizenz OpenRAIL-M, Kitten unter Apache-2.0.
