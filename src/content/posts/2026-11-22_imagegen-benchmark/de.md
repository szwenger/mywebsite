---
title: "Bildgenerierung ohne GPU: 12 Sekunden auf der CPU"
date: 2026-11-22T19:10:00Z
cover: /posts/imagegen-benchmark-cover.webp
tags: [image-generation, benchmark, cpu, local-ai]
---
Meine GPU ist mit dem Sprachmodell ausgelastet, deshalb wollte ich für Open WebUI eine Bildgenerierung, die allein auf der CPU läuft. Ich habe fünf Setups getestet. Das beste erzeugt auf einem i5-13600K ein 512×512-Bild in etwa 12 Sekunden: **SDXL-Turbo mit 2 Schritten über FastSD CPU mit OpenVINO**.

![Zwei Reihen mit je vier Bildern, eine Spalte pro Setup (SD-Turbo mit OpenVINO, SD-Turbo mit stable-diffusion.cpp, SDXS-512, SDXL-Turbo). Obere Reihe: ein alter Fischer mit grauem Bart. Untere Reihe: ein mittelalterlicher Marktplatz in der Dämmerung. Über jeder Spalte steht die Generierungszeit.](/posts/imagegen-benchmark.jpg)

## So habe ich getestet

Jeder Kandidat lief in einem eigenen Docker-Container, begrenzt auf 7 CPUs, also die Hälfte der 14 physischen Kerne, ohne durchgereichte GPU. Gleicher Seed, fünf Prompts (Porträt, Landschaft, ein Schild mit Text, eine detailreiche Szene, ein einfaches Objekt), je drei Durchläufe, Median der Zeit. Ich habe mir jedes Bild angesehen und die Qualität selbst von 1 bis 5 bewertet.

| Setup | Modell | Schritte | Zeit (warm) | RAM-Spitze | Qualität |
|-------|--------|----------|-------------|------------|----------|
| FastSD CPU, OpenVINO | SD-Turbo | 4 | 10,8 s | 8,0 GB | 3,5 |
| LocalAI, stablediffusion-ggml | SD-Turbo | 4 | 22,7 s | 7,7 GB | 3,5 |
| stable-diffusion.cpp | SD-Turbo q8_0 | 4 | 22,2 s | 6,1 GB | 3,5 |
| FastSD CPU, OpenVINO | SDXS-512 | 1 | 5,3 s | 5,5 GB | 2,5 |
| FastSD CPU, OpenVINO | SDXL-Turbo int8 | 2 | 11,8 s | 8,0 GB | 4,0 |

## Gleicher Prompt, vier Setups

Gleicher Seed und gleicher Prompt in jeder Spalte. Den LocalAI-Lauf habe ich weggelassen: Er nutzt dieselbe Engine wie stable-diffusion.cpp und lieferte fast identische Bilder.

**Porträt.** Alle vier sind scharf, und die SD-Turbo-Gesichter sind in Ordnung. SDXL-Turbo wirkt weicher und natürlicher, mit wärmerer Haut und einer Schiebermütze.

![Vier Porträts eines älteren Fischers, eines pro Setup. Die ersten drei sind kontrastreiche Nahaufnahmen mit tiefen Falten; das SDXL-Turbo-Bild rechts ist weicher, wärmer und zeigt eine Schiebermütze.](/posts/imagegen-portrait.jpg)

**Bei belebten Szenen unterscheiden sie sich.** SDXS baut einen vollen Platz, aber Kathedrale und Häuser verschmelzen ineinander. SD-Turbo liefert saubere Straßen, und die Menschen sind kleine Flecken. SDXL-Turbo hat den stimmigsten Platz, mit Menschen, die noch wie Menschen aussehen.

![Vier mittelalterliche Marktplätze in der Dämmerung, einer pro Setup. Das SDXS-512-Bild ist überfüllt, mit verschmolzenen, sich überlagernden Türmen; das SDXL-Turbo-Bild rechts zeigt eine stimmige Straße, einen hohen Kirchturm und Marktstände mit Figuren.](/posts/imagegen-scene.jpg)

**Text scheitert überall.** Der Prompt verlangt ein Schild mit „OPEN LATE“. Keines schafft das. SDXL-Turbo kommt am nächsten: ein grünes Schild, das fast „OPEN“ liest.

![Vier Schilder an Backsteinwänden, eines pro Setup. Die SD-Turbo-Schilder zeigen doppelte, verzerrte Buchstaben, das SDXS-512-Schild ist unleserlich, und das SDXL-Turbo-Schild ist grün mit orangen Buchstaben, die fast OPEN ergeben.](/posts/imagegen-text.jpg)

## Was die Zahlen sagen

- **OpenVINO ist etwa doppelt so schnell wie die ggml-Engine.** Die beiden ggml-Setups (LocalAI und stable-diffusion.cpp) lieferten fast gleiche Bilder und Geschwindigkeit, weil sie dieselbe Engine nutzen. Etwa die Hälfte der 22 Sekunden geht für das Dekodieren des Bildes am Ende drauf.
- **SDXL-Turbo kostet fast nichts extra.** Es braucht 11,8 Sekunden gegenüber 10,8 bei SD-Turbo, und die Bilder sind deutlich besser: ein natürliches Porträt, eine saubere Landschaft, eine Marktszene, in der die Menschen noch Menschen sind.
- **Das schnellste ist nicht brauchbar.** SDXS braucht 5 Sekunden, aber die Bilder sind übersättigt, mit verschmolzenen Gebäuden.
- **Text bleibt kaputt.** Jedes Modell verhaspelt das Schild. Das beste schreibt fast „OPEN“, wie der letzte Vergleich zeigt. Lesbaren Text solltest du von dieser Modellklasse nicht erwarten.

## Was es das Sprachmodell kostet

Der Bildgenerator nutzt etwa 6,4 seiner 7 Kerne. Solange er arbeitet, fällt das LLM von etwa 82 auf 45-50 Token pro Sekunde, rund 40 % langsamer, bei jedem Kandidaten gleich. Anfragen werden weiter in unter 2 Sekunden beantwortet. Da ein Bild etwa 12 Sekunden braucht, ist das ein kurzes Zeitfenster.

## So läuft es jetzt

FastSD CPU hat keine OpenAI-artige Bilder-API, deshalb spricht ein kleiner Adapter davor diese API, und Open WebUI redet mit dem Adapter. Einige Grenzen, die ich gemessen habe:

- Ein Bild nach dem anderen. Eine zweite Anfrage wartet, etwa 12 Sekunden pro Bild in der Warteschlange.
- Andere Größen kosten mehr: 768×512 dauert etwa 17 Sekunden, 768×768 etwa 25. Alles Größere wird auf ein festes Pixelbudget verkleinert, weil größere Formate den Speicher sprengten.
- Nach 15 Minuten Leerlauf stoppt der Container und gibt seinen Speicher frei (auf etwa 120 MB). Das nächste Bild braucht dann 30-35 Sekunden.

## Einschränkungen

Die Qualitätsnote ist meine eigene Einschätzung auf fünf Prompts, keine Standardmetrik. Die Zeiten sind Mediane aus drei Durchläufen auf einem Rechner, und die 768×768-Werte sind jeweils ein einzelner Lauf. In dieser Größe habe ich nur die ersten drei Setups getestet.
