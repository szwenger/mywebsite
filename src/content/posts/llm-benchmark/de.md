---
title: "Lokale LLMs auf einer 16 GB GPU: Die Einstellungen waren wichtiger als die Modelle"
date: 2026-11-20
cover: /posts/llm-benchmark.png
tags: [llm, benchmark, amd, local-ai]
---
Ich habe mehrere Tage damit verbracht, 13 lokale Sprachmodelle auf einer Radeon RX 6800 XT (16 GB) zu benchmarken. Das Ergebnis hat mich überrascht: Welches Modell du wählst, ist weniger wichtig als die Art, wie du es laufen lässt. Gleiche GPU, gleiche Weights und die Geschwindigkeit bei langen Prompts variierte um bis zu 17×.

![Dumbbell-Chart der Prompt-Verarbeitungsgeschwindigkeit bei 16k Tokens für sieben Modelle: Vulkan mit Flash Attention versus ROCm mit Flash Attention, mit Geschwindigkeitssteigerungen von 0,7× bis 16,9×.](/posts/llm-benchmark.png)

## Was ich gemessen habe

Ich wollte wissen, welches Modell ich für drei Aufgaben laufen lassen soll: agentic Coding mit OpenCode, Chat in Open WebUI und längeres Schreiben. Alles wird automatisch bewertet, ohne KI-Judge, bei Temperatur 0:

- **Tool-Aufrufe:** 13 Fälle mit OpenCodes echten Tool-Definitionen, gestreamt und nicht gestreamt, drei Wiederholungen pro Fall.
- **Agentic Coding:** 7 kleine Repository-Aufgaben (Python, JavaScript, Java, PowerShell), die über headless OpenCode in einer Sandbox ausgeführt werden, mit einer versteckten Prüfung, die entweder besteht oder fehlschlägt.
- **Allgemein:** 35 überprüfbare Fragen auf Englisch, Deutsch und Russisch: Reasoning, Formatbeschränkungen, kurzer Code und gefälschte Referenzen, die ein Modell nicht erfinden sollte.
- **Langer Kontext:** Nadel-im-Heuhaufen bis zu 32k Tokens, mehrere Nadeln und ein 40-Wechsel-Gespräch.
- **Geschwindigkeit:** Prompt- und Generierungsgeschwindigkeit bei 1k bis 32k Tokens Kontext.

## Ergebnis 1: Die Standardeinstellungen waren der langsame Weg

LM Studio lädt Modelle mit aktiviertem Flash Attention. Auf meiner GPU führte das mit dem Vulkan-Backend dazu, dass einige Modelle komplett abstürzten und die Prompt-Verarbeitung zusammenbrach, als der Kontext wuchs. Ein 8B-Modell fiel von 295 Tokens pro Sekunde bei 1k Tokens auf 84 bei 16k. Das Deaktivieren von Flash Attention pro Ladung behob die Abstürze und war meine Basislinie für die LM Studio-Zahlen.

## Ergebnis 2: Eine andere Laufzeit schlug alles

AMDs eigenes ROCm 7.1 für Windows erkennt meine Karte nicht (RDNA2 wird dort nicht mehr unterstützt, und AMDs eigenes Diagnosewerkzeug stimmt dem zu). Ein Community-Build von llama.cpp für diese GPU-Familie funktioniert jedoch, und mit aktiviertem Flash Attention war es die schnellste Option für 6 der 7 Modelle, die ich im direkten Vergleich getestet habe. Das ist der obige Chart: 17× bei Qwen3-Coder, 12× bei DeepSeek-R1 8B und immer noch 2× bei dem Modell, das bereits schnell war. Die Ausnahme ist LFM2.5, das lange Prompts auf Vulkan schneller liest.

Auf ROCm ist Flash Attention erforderlich. Wenn es ausgeschaltet ist, bricht auch dort die Verarbeitung langer Prompts zusammen, also funktionieren die beiden Einstellungen nur als Paar.

## Ergebnis 3: Was ich tatsächlich laufen werde

Für OpenCode und Chat habe ich mich für **Qwen3.5 35B-A3B in einer kleinen IQ3_XXS-Quantisierung, mit Thinking ausgeschaltet**, entschieden. Agentic Coding: 14 von 14 Läufen bestanden, mit einer Medianzeit von 20 Sekunden pro Aufgabe statt 52 mit aktiviertem Thinking. Es bestand 92 % der Tool-Aufruf-Fälle, generiert etwa 100 Tokens pro Sekunde und beantwortete 31 von 35 allgemeinen Fragen richtig.

Der Zweitplatzierte ist **gpt-oss-20b**: 13 von 14 agentic Läufen bei etwa 125 Tokens pro Sekunde, aber nur auf llama.cpp. LM Studios Parser scheiterte an seinen Tool-Aufrufen, und seine Geschwindigkeitszahlen dort waren falsch, weil das Reasoning versteckt ist.

## Was nicht half

- **Größere Quantisierungen.** Die 4-Bit-Dateien der 30-35B-Modelle sind 17,5 GB groß und passen nicht in 16 GB. Die Generierung fiel auf 25-35 Tokens pro Sekunde ohne klaren Qualitätszugewinn.
- **N-gram speculative decoding.** Keine Geschwindigkeitssteigerung im Agenten-Einsatz.
- **Repeat- oder Presence-Penalties.** Sie stoppen Reasoning-Schleifen im Chat, machen aber Tool-Call-JSON schlechter. Das Deaktivieren von Thinking behob die Schleifen ohne diese Kosten.

Was geholfen hat, war ein quantisierter KV-Cache (q8_0) für die beiden Modelle, die mit einem 32k-Kontext nicht passten: Qwen3-Coder ging von 38 auf 105 Tokens pro Sekunde, und seine agentic-Läufe wurden dreimal schneller.

## Caveats

Das sind kleine Stichproben: jeweils ein bis drei Wiederholungen. Agentic-Läufe sind selbst bei Temperatur 0 verrauscht, und ein vollständiger Neulauf eines Modells ging von 12 auf 9 von 14. Ich betrachte Unterschiede bis zu etwa 3 von 14 als Unentschieden. Ich habe die heruntergeladenen quantisierten Dateien getestet, nicht die Basismodelle, und die Gewichte hinter den Use-Case-Scores sind meine eigene Wahl, also ändere sie, wenn dein Use-Case anders ist. Die Agenten hatten zudem eine Auto-Billigung innerhalb einer Sandbox, was eine normale interaktive Sitzung nicht hätte.

Das Harness, die Rohdaten und der Scoring-Code bleiben vorerst auf meinem Rechner. Die kurze Version: Wenn du lokale Modelle auf einer AMD-Karte betreibst, prüfe die Laufzeit und Flash Attention, bevor du ein größeres Modell kaufst.
