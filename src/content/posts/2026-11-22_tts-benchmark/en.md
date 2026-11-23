---
title: "Text-to-speech on the CPU: the thread count mattered more than the engine"
date: 2026-11-22T20:25:00Z
cover: /posts/tts-benchmark-cover.webp
tags: [tts, benchmark, cpu, local-ai]
---
My Open WebUI reads answers aloud through two engines behind a small router: Kokoro for English and Piper for German and Russian. I wanted to know if a single CPU-only engine could replace both and cover all three languages. I tested Kitten TTS 2 (Nano and Mini) and Supertonic 3 against the current setup. Every one of them is many times faster than real time, so speed does not pick the winner. **The thread count does decide how fast each one is, by up to 3×.**

![Dot chart of the real-time factor for seven setups, with one dot each for English, German and Russian. Kitten Nano is fastest at 0.05, Supertonic with 2 threads at 0.09 to 0.15, the Kokoro and Piper baseline ranges from 0.03 (Russian) to 0.19 (English), and Supertonic with all 20 threads is slowest at 0.22 to 0.31.](/posts/tts-benchmark.jpg)

## How I tested

The machine is an i5-13600K with 14 cores and 20 threads, CPU only, and the GPU was not used. The test set is 4 sentences per language: short, medium, long and one with numbers and dates. Each sentence ran once as warmup and then 5 times, and I report medians. Open WebUI sends one sentence at a time, so I measured the full synthesis of one sentence. The real-time factor (RTF) is the synthesis time divided by the length of the audio, so 0.1 means ten seconds of speech take one second to make.

The baseline is the live router, measured over HTTP, so it includes the router hop and the mp3 encoding. The candidates ran in-process in Python 3.12, which gives them a small head start, probably well under 0.1 seconds.

## Results

RTF and the time for the long sentence (about 11 seconds of audio), using the best thread setting for each engine.

| Engine | English | German | Russian | RAM | Languages |
|--------|---------|--------|---------|-----|-----------|
| Baseline (Kokoro and Piper) | 0.19 / 2.1 s | 0.03-0.11 / 0.3-1.2 s | 0.03 / 0.3 s | 1.3 GiB | 3 |
| Kitten Nano, 8 threads | 0.05 / 0.45 s | 0.05 / 0.5 s | 0.05 / 0.5 s | about 1.4 GB | 8 |
| Kitten Mini int8 | 0.17 / 1.7 s | 0.17 / 1.9 s | 0.17 / 1.7 s | about 1.2 GB | 16 |
| Supertonic 3, 8 steps, 2 threads | 0.15 / 1.7 s | 0.15 / 1.9 s | 0.15 / 1.9 s | 0.58 GB | 31 |
| Supertonic 3, 4 steps, 2 threads | 0.09 / 1.0 s | 0.09 / 1.1 s | 0.08 / 1.1 s | 0.58 GB | 31 |

For the first sentence, the one that sets the wait before audio starts, the baseline needs 0.4-0.5 s in English, 0.1-0.2 s in German and 0.06 s in Russian. Kitten Nano needs 0.17-0.2 s, Kitten Mini 0.4-0.5 s, and Supertonic 0.2-0.3 s at 4 steps or 0.4-0.5 s at 8 steps.

## Listen for yourself

Here is the same sentence from four setups, in each language. Press a row to play it.

<div class="player">
<section class="panel" data-label="English">
<p class="said">The meeting moved to Thursday afternoon, so please send me the updated slides before then.</p>
<div class="track"><button type="button" class="play" aria-label="Play: Baseline (Kokoro and Piper)"></button><div class="info"><span class="who">Baseline (Kokoro and Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-en.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-en.mp3"></audio></div>
</section>
<section class="panel" data-label="German">
<p class="said">Das Treffen wurde auf Donnerstagnachmittag verschoben, schick mir also bitte vorher die aktualisierten Folien.</p>
<div class="track"><button type="button" class="play" aria-label="Play: Baseline (Kokoro and Piper)"></button><div class="info"><span class="who">Baseline (Kokoro and Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-de.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-de.mp3"></audio></div>
</section>
<section class="panel" data-label="Russian">
<p class="said">Встречу перенесли на четверг после обеда, поэтому, пожалуйста, пришли мне обновлённые слайды заранее.</p>
<div class="track"><button type="button" class="play" aria-label="Play: Baseline (Kokoro and Piper)"></button><div class="info"><span class="who">Baseline (Kokoro and Piper)</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/baseline-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Nano"></button><div class="info"><span class="who">Kitten Nano</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-nano-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Kitten Mini"></button><div class="info"><span class="who">Kitten Mini</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/kitten-mini-ru.mp3"></audio></div>
<div class="track"><button type="button" class="play" aria-label="Play: Supertonic 3"></button><div class="info"><span class="who">Supertonic 3</span><span class="bar"><i></i></span></div><span class="dur"></span><audio preload="metadata" src="/posts/tts-benchmark/supertonic-ru.mp3"></audio></div>
</section>
</div>

<p class="caption">Medium sentence, male voice. Supertonic is the 8-step, 2-thread setting. The audio is mono and re-encoded to 64 kbps mp3 for this page, so it sounds a little worse than the originals.</p>

## What the numbers say

- **Threads change the result by 2-3×, in opposite directions.** Supertonic with the ONNX default of all 20 threads had an RTF of 0.30 at 8 steps. Limited to 2 threads it dropped to 0.15. Its own published speed is for an M4 Pro and does not carry over to this hybrid CPU. Kitten does the reverse: capped to 2 threads it got slower (0.29), and 8 threads was marginally worse than its default.
- **A router that runs several syntheses at once has to budget threads.** Giving each one the default would cost speed.
- **The baseline is already fast, and Piper is the quickest part.** Russian runs at RTF 0.03 and German at 0.03 to 0.11 depending on the voice. Kokoro for English is the slowest piece at 0.19.
- **Each candidate runs at the same speed in all three languages.** The RTF is identical per engine across English, German and Russian, so none of them penalises one language.
- **Kitten needs more than its docs say.** The model card says no PyTorch is needed, but the English phonemizer pulls in PyTorch and spacy, and the documented `--no-deps` install does not work. That costs about 1.2-1.4 GB of RAM and a large install. Supertonic needs only ONNX Runtime and uses 0.58 GB.
- **Kitten Nano is the fastest.** It has the lowest RTF at 0.05, but it is the smallest model.

Speed does not tell you which voice sounds best, so I listened to every engine side by side for each sentence, with a female and a male set. I looked for German and Russian stress, the numbers and dates sentence, and whether the voice stays the same speaker across languages. I picked Supertonic for a trial.

## The trial setup

I did not touch the live setup. Two extra containers run on the same Docker network, with no published ports: one with Supertonic 3 and its weights baked in (a 1.27 GB image), and a copy of the router that maps the `auto` voice to Supertonic. The bundled Supertonic server cannot produce mp3 and ignores the thread and step settings on its OpenAI route, so a small wrapper handles both and the router converts the wav to mp3.

End to end over HTTP, with the mp3 encode included, the median of 5 for the male voice:

| Language | Short | Medium | Long | Numbers | RTF (long) |
|----------|-------|--------|------|---------|------------|
| English | 0.39 s | 0.97 s | 1.76 s | 1.30 s | 0.156 |
| German | 0.47 s | 1.12 s | 1.93 s | 1.41 s | 0.150 |
| Russian | 0.48 s | 1.16 s | 1.99 s | 1.41 s | 0.151 |

The HTTP and mp3 overhead is small. English is on par or faster than Kokoro (1.76 s against 2.1 s for the long sentence). German and Russian are slower than Piper (about 1.9-2.0 s against 0.3-1.2 s) but still 6-7× faster than real time. The container uses 0.56 GiB.

## Caveats

This is speed on one machine plus my own listening on 12 sentences, not a quality score. I did not test Kitten TTS 2 1.7B (its model card says 2-3× slower than real time on a CPU), Qwen3-TTS, Chatterbox, XTTS or Pocket TTS. The thread results are specific to this hybrid CPU, and Supertonic's weights use the OpenRAIL-M license, while Kitten is Apache-2.0.
