---
title: "Open WebUI im Internet ohne offenen Port: Cloudflare Tunnel und ein E-Mail-Gate"
date: 2026-11-22T21:04:00Z
cover: /posts/owui-cloudflared-cover.webp
tags: [open-webui, cloudflare, self-hosting, security]
---
Ich betreibe Open WebUI zu Hause, auf demselben PC wie meine lokalen Modelle. Früher war es über Tailscale erreichbar. Für mich war das in Ordnung, für meine Frau umständlich, weil sie dafür eine weitere App installieren und sich anmelden müsste. Deshalb habe ich den Zugang von außen auf einen Cloudflare Tunnel umgestellt, damit sie den Chat in einem normalen Browser öffnen kann. **Der Tunnel braucht keinen eingehenden Port am Router, und eine E-Mail-Liste in Cloudflare Access sorgt dafür, dass niemand sonst die Anmeldeseite von Open WebUI überhaupt zu sehen bekommt.** Tailscale bleibt für den privaten Zugriff auf den PC selbst.

## Der Weg einer Anfrage

<div class="diagram">
<svg viewBox="0 0 760 250" role="img" aria-label="Weg einer Anfrage: Browser, Cloudflare Access, Cloudflare Tunnel, dann cloudflared und Open WebUI auf meinem PC. Der Tunnel wird vom PC nach außen aufgebaut.">
<defs><marker id="ah1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="4" y="24" width="156" height="206" rx="14"/><text class="zt" x="18" y="46">Internet</text>
<rect class="z" x="180" y="24" width="212" height="206" rx="14"/><text class="zt" x="194" y="46">Cloudflare</text>
<rect class="z" x="436" y="24" width="320" height="206" rx="14"/><text class="zt" x="450" y="46">Mein PC (Docker)</text>
<g><rect class="n" x="24" y="100" width="116" height="58" rx="10"/><text class="t" x="82.0" y="126.0" text-anchor="middle">Browser</text><text class="s" x="82.0" y="143.0" text-anchor="middle">Handy oder Laptop</text></g>
<g><rect class="n" x="192" y="62" width="188" height="56" rx="10"/><text class="t" x="286.0" y="87.0" text-anchor="middle">Access</text><text class="s" x="286.0" y="104.0" text-anchor="middle">E-Mail-Liste + Einmalcode</text></g>
<g><rect class="n" x="192" y="146" width="188" height="56" rx="10"/><text class="t" x="286.0" y="171.0" text-anchor="middle">Tunnel</text><text class="s" x="286.0" y="188.0" text-anchor="middle">chat.example.com</text></g>
<g><rect class="n" x="452" y="146" width="122" height="56" rx="10"/><text class="t" x="513.0" y="171.0" text-anchor="middle">cloudflared</text><text class="s" x="513.0" y="188.0" text-anchor="middle">container</text></g>
<g><rect class="n" x="616" y="146" width="124" height="56" rx="10"/><text class="t" x="678.0" y="171.0" text-anchor="middle">Open WebUI</text><text class="s" x="678.0" y="188.0" text-anchor="middle">open-webui:8080</text></g>
<path class="l" d="M140 118 H166 V90 H190" marker-end="url(#ah1)"/>
<path class="l" d="M286 118 V144" marker-end="url(#ah1)"/>
<path class="l tun" d="M382 174 H450" marker-start="url(#ah1)" marker-end="url(#ah1)"/>
<path class="l" d="M576 174 H614" marker-end="url(#ah1)"/>
<circle class="b" cx="166" cy="76" r="10"/><text class="bn" x="166" y="80" text-anchor="middle">1</text><circle class="b" cx="302" cy="131" r="10"/><text class="bn" x="302" y="135" text-anchor="middle">2</text><circle class="b" cx="416" cy="156" r="10"/><text class="bn" x="416" y="160" text-anchor="middle">3</text><circle class="b" cx="595" cy="160" r="10"/><text class="bn" x="595" y="164" text-anchor="middle">4</text>
<text class="s" x="450" y="134">Tunnel braucht keinen eingehenden Port</text>
<text class="s" x="448" y="222">cloudflared wählt sich selbst ein: 4× QUIC, Frankfurt</text>
</svg>
</div>

<p class="caption">Der Tunnel ist der gestrichelte Doppelpfeil. <code>cloudflared</code> baut ihn von innen auf, deshalb verbindet sich von außen nichts hinein.</p>

1. Der Browser fragt nach dem Hostnamen. DNS und TLS enden bei Cloudflare.
2. Cloudflare Access sucht nach einer Sitzung. Ohne Sitzung antwortet es mit einer Weiterleitung auf seine Anmeldeseite, wo nur Adressen von meiner Liste einen Einmalcode per E-Mail bekommen. Ich habe das von außen geprüft: Eine anonyme Anfrage bekommt ein `302` von Cloudflare selbst, mit einem `Www-Authenticate: Cloudflare-Access`-Header, und keine Open-WebUI-Seite.
3. Mit Sitzung geht die Anfrage in den Tunnel. Der Tunnel besteht aus Verbindungen, die `cloudflared` von meiner Seite aus geöffnet hat, und die Anfragen laufen darüber zurück. Im Log stehen 4 QUIC-Verbindungen, alle nach Frankfurt.
4. `cloudflared` leitet an `http://open-webui:8080` im Docker-Netzwerk weiter. Eine Catch-all-Regel antwortet auf jeden anderen Hostnamen mit 404.

Der Tunnel wird über Cloudflare verwaltet. Die Ingress-Regel (Hostname auf `http://open-webui:8080`) liegt im Cloudflare-Dashboard, und der Container braucht nur das Tunnel-Token.

## Die Einrichtung

`cloudflared` ist ein weiterer Dienst in der Compose-Datei, in der auch Open WebUI läuft. Das Token kommt aus einer `.env`-Datei daneben, die in keinem Repository liegt.

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

Es gibt keinen `ports:`-Eintrag. Der Container baut nur ausgehende Verbindungen auf.

Weil Open WebUI jetzt im Internet hängt, habe ich es zusätzlich abgesichert:

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

Auf der Cloudflare-Seite gibt es eine Access-Anwendung für den Hostnamen, mit einer Regel, die zwei E-Mail-Adressen erlaubt (meine und die meiner Frau), und der Anmeldemethode One-time PIN. Dahinter sitzt weiterhin die eigene Anmeldung von Open WebUI, mit abgeschalteter Registrierung. Es sind also zwei Tore hintereinander.

## Was dahinter hängt

Open WebUI ist die Oberfläche für alles andere, was ich lokal betreibe, und der Tunnel macht nur diesen einen Hostnamen erreichbar.

<div class="diagram">
<svg viewBox="0 0 640 400" role="img" aria-label="Open WebUI spricht mit llama.cpp auf dem Host und mit Containern für Sprache, Bilder, Tool-Brücken und Dokumentkonvertierung. Umrandete Knoten verlinken auf die passenden Benchmark-Artikel.">
<defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="118" y="94" width="512" height="298" rx="14"/><text class="zt" x="132" y="116">Docker-Netzwerk</text>
<g><rect class="n" x="4" y="168" width="100" height="54" rx="10"/><text class="t" x="54.0" y="192.0" text-anchor="middle">Cloudflare</text><text class="s" x="54.0" y="209.0" text-anchor="middle">edge</text></g>
<g><rect class="n" x="134" y="168" width="112" height="54" rx="10"/><text class="t" x="190.0" y="200.0" text-anchor="middle">cloudflared</text></g>
<g><rect class="n" x="278" y="148" width="130" height="94" rx="10"/><text class="t" x="343.0" y="192.0" text-anchor="middle">Open WebUI</text><text class="s" x="343.0" y="209.0" text-anchor="middle">eingebautes Whisper (STT)</text></g>
<path class="l" d="M104 195 H132" marker-end="url(#ah2)"/><path class="l" d="M246 195 H276" marker-end="url(#ah2)"/>
<a href="/de/blog/llm-benchmark/"><rect class="nh lk" x="462" y="10" width="150" height="54" rx="10"/><text class="t" x="537.0" y="34.0" text-anchor="middle">llama.cpp server</text><text class="s" x="537.0" y="51.0" text-anchor="middle">auf dem Host · GPU</text></a>
<path class="l" d="M408 195 C435 195 435 37 460 37" marker-end="url(#ah2)"/>
<a href="/de/blog/tts-benchmark/"><rect class="n lk" x="462" y="122" width="150" height="54" rx="10"/><text class="t" x="537.0" y="146.0" text-anchor="middle">tts-router</text><text class="s" x="537.0" y="163.0" text-anchor="middle">Kokoro · Piper</text></a>
<path class="l" d="M408 195 C435 195 435 149 460 149" marker-end="url(#ah2)"/>
<a href="/de/blog/imagegen-benchmark/"><rect class="n lk" x="462" y="190" width="150" height="54" rx="10"/><text class="t" x="537.0" y="214.0" text-anchor="middle">imagegen-api</text><text class="s" x="537.0" y="231.0" text-anchor="middle">FastSD CPU · SDXL-Turbo</text></a>
<path class="l" d="M408 195 C435 195 435 217 460 217" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="258" width="150" height="54" rx="10"/><text class="t" x="537.0" y="282.0" text-anchor="middle">MCP bridges</text><text class="s" x="537.0" y="299.0" text-anchor="middle">vault · paper · thunderbird</text></g>
<path class="l" d="M408 195 C435 195 435 285 460 285" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="326" width="150" height="54" rx="10"/><text class="t" x="537.0" y="350.0" text-anchor="middle">docling-serve</text><text class="s" x="537.0" y="367.0" text-anchor="middle">von paper-mcp genutzt</text></g>
<path class="l" d="M408 195 C435 195 435 353 460 353" marker-end="url(#ah2)"/>
</svg>
</div>

<p class="caption">Umrandete Knoten verlinken auf die Benchmark-Artikel zum jeweiligen Teil. Alles außer dem Modellserver läuft in Docker.</p>

- **Das Modell:** llama.cpp auf dem Host, mit der GPU. Wie ich die Einstellungen gewählt habe, steht im [lokalen LLM-Benchmark](/de/blog/llm-benchmark/).
- **Sprache:** Ein kleiner Router schickt Englisch an Kokoro, Deutsch und Russisch an Piper. Ersatzkandidaten habe ich im [TTS-Benchmark](/de/blog/tts-benchmark/) verglichen.
- **Bilder:** FastSD CPU erzeugt sie auf der CPU, damit die GPU für das Modell frei bleibt. Der Vergleich steht im [Benchmark zur Bildgenerierung](/de/blog/imagegen-benchmark/).
- **Werkzeuge:** kleine MCP-Brücken für meine Notizen, die Paper-Suche und E-Mails, dazu Docling zum Konvertieren von Dokumenten.

## Funktioniert es durchgehend

Ich habe den öffentlichen Hostnamen in einem Browser geöffnet, der schon eine Access-Sitzung hatte, und einen kurzen Prompt geschickt.

![Open WebUI im Browser über den Tunnel: ein Prompt dazu, wie ein Cloudflare Tunnel funktioniert, von qwen3.5-35b-a3b in drei Sätzen beantwortet.](/posts/owui-chat.png)

Die Antwort kam ohne Probleme durch den Tunnel gestreamt. Für die Kosten im Netzwerk habe ich `/health` auf dem Open-WebUI-Container gemessen, je 12 Anfragen, Median und Bereich:

| Weg | Median | Bereich |
|-----|--------|---------|
| Lokal, `localhost:3000` | 3 ms | 2-23 ms |
| Durch den Tunnel, aus einem angemeldeten Browser | 58 ms | 34-88 ms |
| Anonyme Anfrage, von Access am Edge beantwortet | 73 ms | 63-109 ms |

Die Clients unterscheiden sich: Die lokalen und die anonymen Werte stammen aus einem Python-Skript, das jedes Mal eine neue Verbindung aufbaut, der Tunnelwert aus einem Browser, der eine Verbindung wiederverwendet. Die Zeilen zeigen also die Größenordnung, nicht den genauen Aufschlag. Der Tunnel kostet einige zehn Millisekunden, und der Edge beantwortet eine anonyme Anfrage in etwa 70 ms.

Die erste Antwort brauchte 68 s, und das lag nicht am Netzwerk. Ich habe eine kleine eigene Aktion, die Context Card, die unter jeder Antwort einen Button hinzufügt (unten eingekreist) und die echten Token-Zahlen und Zeiten von llama-server ausliest.

![Das Context-Card-Popup unter der Antwort. Es zeigt ein zu 55 Prozent genutztes Kontextfenster, einen neuen Prompt mit 35,8K Tokens, verarbeitet mit 545 Tokens pro Sekunde in 65,6 Sekunden, und eine Antwort mit 108 Tokens bei 38,3 Tokens pro Sekunde in 2,8 Sekunden. Der Button, der es öffnet, ist rot eingekreist.](/posts/owui-context-card.png)

Der Prompt hatte 35,8K Tokens bei einer Frage in drei Sätzen, und seine Verarbeitung dauerte 65,6 s der 68,4 s. Die Antwort mit 108 Tokens brauchte 2,8 s. Ich habe noch nicht untersucht, was diese 35,8K Tokens füllt. Das ist ein eigenes Problem und hat mit dem Tunnel nichts zu tun, aber ich habe es nur bemerkt, weil es eine Zahl zum Ansehen gab.

## Was ich ändern würde

- **Veröffentlichte Ports.** Der Tunnel braucht keinen davon, aber meine Compose-Datei veröffentlicht Open WebUI (3000), Kokoro (8880) und Docling (5001) auf allen Schnittstellen des Hosts, sie sind also aus meinem Heimnetz erreichbar. Als Nächstes binde ich sie an `127.0.0.1`. Die Thunderbird-Brücke ist es schon.
- **Tailscale-Überbleibsel.** Die CORS-Liste in meiner Compose-Datei nennt noch die alte Tailscale-Adresse. Das ist harmlos, ich entferne sie noch.
- **Nicht getestet.** Ich habe weder Rate Limits noch WAF-Regeln eingerichtet, und ich habe nicht ausprobiert, was ein zweiter Nutzer sieht, wenn der Tunnel-Container ausfällt.

Das ist ein Aufbau auf einem Rechner, an einem Abend gemessen. Die Access-Regel und die E-Mail-Liste würde ich nicht weglassen: Der Tunnel versteckt nur den Port, Access entscheidet, wer überhaupt zur Anmeldeseite kommt.
