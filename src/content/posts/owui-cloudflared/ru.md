---
title: "Open WebUI в интернете без открытого порта: Cloudflare Tunnel и фильтр по почте"
date: 2026-11-22T21:04:00Z
cover: /posts/owui-cloudflared.png
tags: [open-webui, cloudflare, self-hosting, security]
---
Я держу Open WebUI дома, на том же ПК, где работают локальные модели. Раньше он был доступен через Tailscale. Мне это подходило, а жене было неудобно: для этого нужно ставить ещё одно приложение и входить в него. Поэтому я перевёл внешний доступ на Cloudflare Tunnel, чтобы она открывала чат в обычном браузере. **Туннелю не нужен входящий порт на роутере, а список почтовых адресов в Cloudflare Access означает, что никто другой даже не увидит страницу входа в Open WebUI.** Tailscale остаётся для закрытого доступа к самому ПК.

## Путь запроса

<div class="diagram">
<svg viewBox="0 0 760 250" role="img" aria-label="Путь запроса: браузер, Cloudflare Access, Cloudflare Tunnel, затем cloudflared и Open WebUI на моём ПК. Туннель открывается с ПК наружу.">
<defs><marker id="ah1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="4" y="24" width="156" height="206" rx="14"/><text class="zt" x="18" y="46">Интернет</text>
<rect class="z" x="180" y="24" width="212" height="206" rx="14"/><text class="zt" x="194" y="46">Cloudflare</text>
<rect class="z" x="436" y="24" width="320" height="206" rx="14"/><text class="zt" x="450" y="46">Мой ПК (Docker)</text>
<g><rect class="n" x="24" y="100" width="116" height="58" rx="10"/><text class="t" x="82.0" y="126.0" text-anchor="middle">Browser</text><text class="s" x="82.0" y="143.0" text-anchor="middle">телефон или ноутбук</text></g>
<g><rect class="n" x="192" y="62" width="188" height="56" rx="10"/><text class="t" x="286.0" y="87.0" text-anchor="middle">Access</text><text class="s" x="286.0" y="104.0" text-anchor="middle">список почт + код</text></g>
<g><rect class="n" x="192" y="146" width="188" height="56" rx="10"/><text class="t" x="286.0" y="171.0" text-anchor="middle">Tunnel</text><text class="s" x="286.0" y="188.0" text-anchor="middle">chat.example.com</text></g>
<g><rect class="n" x="452" y="146" width="122" height="56" rx="10"/><text class="t" x="513.0" y="171.0" text-anchor="middle">cloudflared</text><text class="s" x="513.0" y="188.0" text-anchor="middle">container</text></g>
<g><rect class="n" x="616" y="146" width="124" height="56" rx="10"/><text class="t" x="678.0" y="171.0" text-anchor="middle">Open WebUI</text><text class="s" x="678.0" y="188.0" text-anchor="middle">open-webui:8080</text></g>
<path class="l" d="M140 118 H166 V90 H190" marker-end="url(#ah1)"/>
<path class="l" d="M286 118 V144" marker-end="url(#ah1)"/>
<path class="l tun" d="M382 174 H450" marker-start="url(#ah1)" marker-end="url(#ah1)"/>
<path class="l" d="M576 174 H614" marker-end="url(#ah1)"/>
<circle class="b" cx="166" cy="76" r="10"/><text class="bn" x="166" y="80" text-anchor="middle">1</text><circle class="b" cx="302" cy="131" r="10"/><text class="bn" x="302" y="135" text-anchor="middle">2</text><circle class="b" cx="416" cy="156" r="10"/><text class="bn" x="416" y="160" text-anchor="middle">3</text><circle class="b" cx="595" cy="160" r="10"/><text class="bn" x="595" y="164" text-anchor="middle">4</text>
<text class="s" x="450" y="134">туннелю не нужен входящий порт</text>
<text class="s" x="448" y="222">cloudflared сам подключается: 4× QUIC, Франкфурт</text>
</svg>
</div>

<p class="caption">Туннель — это пунктирная двойная стрелка. <code>cloudflared</code> открывает его изнутри, поэтому снаружи ничто не подключается внутрь.</p>

1. Браузер запрашивает имя хоста. DNS и TLS заканчиваются на Cloudflare.
2. Cloudflare Access ищет сессию. Без неё он отвечает редиректом на свою страницу входа, где одноразовый код по почте получают только адреса из моего списка. Я проверил это снаружи: анонимный запрос получает `302` от самого Cloudflare с заголовком `Www-Authenticate: Cloudflare-Access` и не получает страницу Open WebUI.
3. Если сессия есть, запрос идёт в туннель. Туннель — это набор соединений, которые `cloudflared` открыл с моей стороны, и запросы возвращаются по ним внутрь. В логе видно 4 QUIC-соединения, все во Франкфурт.
4. `cloudflared` передаёт запрос на `http://open-webui:8080` в сети Docker. Универсальное правило отвечает 404 на любое другое имя хоста.

Туннель управляется удалённо. Правило ingress (имя хоста на `http://open-webui:8080`) лежит в панели Cloudflare, а контейнеру нужен только токен туннеля.

## Настройка

`cloudflared` — ещё один сервис в том же compose-файле, где работает Open WebUI. Токен берётся из файла `.env` рядом с ним, который не лежит ни в каком репозитории.

```yaml
  cloudflared:
    image: cloudflare/cloudflared:2025.11.1
    container_name: cloudflared
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${CF_TUNNEL_TOKEN}
    depends_on:
      - open-webui
    restart: unless-stopped
```

Записи `ports:` нет. Контейнер делает только исходящие соединения.

Раз Open WebUI теперь в интернете, я дополнительно его защитил:

```yaml
      - WEBUI_SECRET_KEY=${WEBUI_SECRET_KEY}
      - ENABLE_SIGNUP=false
      - WEBUI_SESSION_COOKIE_SECURE=true
      - WEBUI_SESSION_COOKIE_SAME_SITE=lax
      - WEBUI_AUTH_COOKIE_SECURE=true
      - WEBUI_AUTH_COOKIE_SAME_SITE=lax
      - CORS_ALLOW_ORIGIN=https://chat.example.com;http://localhost:3000
      - ENABLE_COMMUNITY_SHARING=false
      - ENABLE_VERSION_UPDATE_CHECK=false
      - ANONYMIZED_TELEMETRY=false
```

На стороне Cloudflare есть одно приложение Access на это имя хоста, с правилом, которое разрешает два адреса электронной почты (мой и жены) и способ входа One-time PIN. За ним остаётся собственный вход Open WebUI с отключённой регистрацией. Получается два барьера подряд.

## Что стоит за ним

Open WebUI — это интерфейс ко всему остальному, что я запускаю локально, а туннель открывает только это одно имя хоста.

<div class="diagram">
<svg viewBox="0 0 640 400" role="img" aria-label="Open WebUI общается с llama.cpp на хосте и с контейнерами для речи, изображений, MCP-мостов и конвертации документов. Узлы с рамкой ведут на соответствующие статьи.">
<defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="118" y="94" width="512" height="298" rx="14"/><text class="zt" x="132" y="116">Сеть Docker</text>
<g><rect class="n" x="4" y="168" width="100" height="54" rx="10"/><text class="t" x="54.0" y="192.0" text-anchor="middle">Cloudflare</text><text class="s" x="54.0" y="209.0" text-anchor="middle">edge</text></g>
<g><rect class="n" x="134" y="168" width="112" height="54" rx="10"/><text class="t" x="190.0" y="200.0" text-anchor="middle">cloudflared</text></g>
<g><rect class="n" x="278" y="148" width="130" height="94" rx="10"/><text class="t" x="343.0" y="192.0" text-anchor="middle">Open WebUI</text><text class="s" x="343.0" y="209.0" text-anchor="middle">встроенный Whisper (STT)</text></g>
<path class="l" d="M104 195 H132" marker-end="url(#ah2)"/><path class="l" d="M246 195 H276" marker-end="url(#ah2)"/>
<a href="/ru/blog/llm-benchmark/"><rect class="nh lk" x="462" y="10" width="150" height="54" rx="10"/><text class="t" x="537.0" y="34.0" text-anchor="middle">llama.cpp server</text><text class="s" x="537.0" y="51.0" text-anchor="middle">на хосте · GPU</text></a>
<path class="l" d="M408 195 C435 195 435 37 460 37" marker-end="url(#ah2)"/>
<a href="/ru/blog/tts-benchmark/"><rect class="n lk" x="462" y="122" width="150" height="54" rx="10"/><text class="t" x="537.0" y="146.0" text-anchor="middle">tts-router</text><text class="s" x="537.0" y="163.0" text-anchor="middle">Kokoro · Piper</text></a>
<path class="l" d="M408 195 C435 195 435 149 460 149" marker-end="url(#ah2)"/>
<a href="/ru/blog/imagegen-benchmark/"><rect class="n lk" x="462" y="190" width="150" height="54" rx="10"/><text class="t" x="537.0" y="214.0" text-anchor="middle">imagegen-api</text><text class="s" x="537.0" y="231.0" text-anchor="middle">FastSD CPU · SDXL-Turbo</text></a>
<path class="l" d="M408 195 C435 195 435 217 460 217" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="258" width="150" height="54" rx="10"/><text class="t" x="537.0" y="282.0" text-anchor="middle">MCP bridges</text><text class="s" x="537.0" y="299.0" text-anchor="middle">vault · paper · thunderbird</text></g>
<path class="l" d="M408 195 C435 195 435 285 460 285" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="326" width="150" height="54" rx="10"/><text class="t" x="537.0" y="350.0" text-anchor="middle">docling-serve</text><text class="s" x="537.0" y="367.0" text-anchor="middle">для paper-mcp</text></g>
<path class="l" d="M408 195 C435 195 435 353 460 353" marker-end="url(#ah2)"/>
</svg>
</div>

<p class="caption">Узлы с рамкой ведут на статьи с бенчмарками по соответствующей части. Всё, кроме сервера модели, работает в Docker.</p>

- **Модель:** llama.cpp на хосте, на GPU. Как я выбирал настройки, описано в [бенчмарке локальных LLM](/ru/blog/llm-benchmark/).
- **Речь:** небольшой роутер отправляет английский в Kokoro, а немецкий и русский в Piper. Замены я сравнивал в [бенчмарке TTS](/ru/blog/tts-benchmark/).
- **Изображения:** FastSD CPU генерирует их на процессоре, чтобы GPU оставалась свободной для модели. Сравнение — в [бенчмарке генерации изображений](/ru/blog/imagegen-benchmark/).
- **Инструменты:** небольшие MCP-мосты для моих заметок, поиска статей и почты, плюс Docling для конвертации документов.

## Работает ли всё целиком

Я открыл публичное имя хоста в браузере, где уже была сессия Access, и отправил короткий запрос.

![Open WebUI в браузере через туннель: вопрос о том, как работает Cloudflare Tunnel, и ответ qwen3.5-35b-a3b в трёх предложениях.](/posts/owui-chat.png)

Ответ пришёл потоком через туннель без проблем. Чтобы оценить цену сети, я измерил `/health` на контейнере Open WebUI, по 12 запросов, медиана и диапазон:

| Путь | Медиана | Диапазон |
|------|---------|----------|
| Локально, `localhost:3000` | 3 мс | 2-23 мс |
| Через туннель, из браузера с сессией | 58 мс | 34-88 мс |
| Анонимный запрос, ответ Access на краю | 73 мс | 63-109 мс |

Клиенты разные: локальные и анонимные цифры получены скриптом на Python, который каждый раз открывает новое соединение, а цифра через туннель — браузером, который переиспользует соединение. Поэтому строки показывают порядок величины, а не точную добавку. Туннель добавляет десятки миллисекунд, а край отвечает на анонимный запрос примерно за 70 мс.

Первый ответ занял 68 с, и сеть тут ни при чём. У меня есть небольшое собственное действие, Context Card, которое добавляет кнопку под каждым ответом (обведена ниже) и читает настоящие счётчики токенов и время из llama-server.

![Окно Context Card под ответом. Оно показывает контекстное окно, занятое на 55 процентов, новый запрос в 35,8K токенов, обработанный со скоростью 545 токенов в секунду за 65,6 секунды, и ответ в 108 токенов со скоростью 38,3 токена в секунду за 2,8 секунды. Кнопка, которая его открывает, обведена красным.](/posts/owui-context-card.png)

Запрос на три предложения занял 35,8K токенов, и его обработка заняла 65,6 с из 68,4 с. Ответ в 108 токенов занял 2,8 с. Что заполняет эти 35,8K токенов, я пока не разбирал. Это отдельная проблема, к туннелю она отношения не имеет, но я заметил её только потому, что было число, на которое можно посмотреть.

## Что я бы изменил

- **Опубликованные порты.** Туннелю они не нужны, но мой compose-файл публикует Open WebUI (3000), Kokoro (8880) и Docling (5001) на всех интерфейсах хоста, так что они доступны из домашней сети. Следующий шаг — привязать их к `127.0.0.1`. Мост к Thunderbird уже привязан.
- **Остаток от Tailscale.** В списке CORS в моём compose-файле всё ещё указан старый адрес Tailscale. Это безвредно, я его уберу.
- **Не проверено.** Я не настраивал ограничения частоты и правила WAF и не пробовал, что увидит второй пользователь, если контейнер туннеля не работает.

Это одна конфигурация на одной машине, измеренная за один вечер. Правило Access и список почт я бы не пропускал: туннель лишь прячет порт, а Access решает, кто вообще дойдёт до страницы входа.
