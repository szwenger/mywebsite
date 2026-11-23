---
title: "Open WebUI on the internet without opening a port: Cloudflare Tunnel and an email gate"
date: 2026-11-22T21:04:00Z
cover: /posts/owui-cloudflared-cover.webp
tags: [open-webui, cloudflare, self-hosting, security]
---
I run Open WebUI at home, on the same PC as my local models. It used to be reachable through Tailscale, which was fine for me and awkward for my wife, because it means installing and signing in to another app. I moved the public access to a Cloudflare Tunnel so she can open the chat in a normal browser. **The tunnel needs no inbound port on my router, and a Cloudflare Access email list means nobody else even sees the Open WebUI login page.** Tailscale stays for private access to the PC itself.

## The route

<div class="diagram">
<svg viewBox="0 0 760 250" role="img" aria-label="Request path: browser, Cloudflare Access, Cloudflare Tunnel, then cloudflared and Open WebUI on my PC. The tunnel is opened from the PC outwards.">
<defs><marker id="ah1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="4" y="24" width="156" height="206" rx="14"/><text class="zt" x="18" y="46">Internet</text>
<rect class="z" x="180" y="24" width="212" height="206" rx="14"/><text class="zt" x="194" y="46">Cloudflare</text>
<rect class="z" x="436" y="24" width="320" height="206" rx="14"/><text class="zt" x="450" y="46">My PC (Docker)</text>
<g><rect class="n" x="24" y="100" width="116" height="58" rx="10"/><text class="t" x="82.0" y="126.0" text-anchor="middle">Browser</text><text class="s" x="82.0" y="143.0" text-anchor="middle">phone or laptop</text></g>
<g><rect class="n" x="192" y="62" width="188" height="56" rx="10"/><text class="t" x="286.0" y="87.0" text-anchor="middle">Access</text><text class="s" x="286.0" y="104.0" text-anchor="middle">email list + one-time code</text></g>
<g><rect class="n" x="192" y="146" width="188" height="56" rx="10"/><text class="t" x="286.0" y="171.0" text-anchor="middle">Tunnel</text><text class="s" x="286.0" y="188.0" text-anchor="middle">chat.example.com</text></g>
<g><rect class="n" x="452" y="146" width="122" height="56" rx="10"/><text class="t" x="513.0" y="171.0" text-anchor="middle">cloudflared</text><text class="s" x="513.0" y="188.0" text-anchor="middle">container</text></g>
<g><rect class="n" x="616" y="146" width="124" height="56" rx="10"/><text class="t" x="678.0" y="171.0" text-anchor="middle">Open WebUI</text><text class="s" x="678.0" y="188.0" text-anchor="middle">open-webui:8080</text></g>
<path class="l" d="M140 118 H166 V90 H190" marker-end="url(#ah1)"/>
<path class="l" d="M286 118 V144" marker-end="url(#ah1)"/>
<path class="l tun" d="M382 174 H450" marker-start="url(#ah1)" marker-end="url(#ah1)"/>
<path class="l" d="M576 174 H614" marker-end="url(#ah1)"/>
<circle class="b" cx="166" cy="76" r="10"/><text class="bn" x="166" y="80" text-anchor="middle">1</text><circle class="b" cx="302" cy="131" r="10"/><text class="bn" x="302" y="135" text-anchor="middle">2</text><circle class="b" cx="416" cy="156" r="10"/><text class="bn" x="416" y="160" text-anchor="middle">3</text><circle class="b" cx="595" cy="160" r="10"/><text class="bn" x="595" y="164" text-anchor="middle">4</text>
<text class="s" x="450" y="134">tunnel needs no inbound port</text>
<text class="s" x="448" y="222">cloudflared dials out: 4× QUIC to Frankfurt</text>
</svg>
</div>

<p class="caption">The tunnel is the dashed double arrow. <code>cloudflared</code> opens it from inside, so nothing connects in from outside.</p>

1. The browser asks for the hostname. DNS and TLS end at Cloudflare.
2. Cloudflare Access looks for a session. Without one it answers with a redirect to its login page, where only the addresses on my list get a one-time code by email. I checked this from outside: an anonymous request gets a `302` from Cloudflare itself, with a `Www-Authenticate: Cloudflare-Access` header, and no Open WebUI page.
3. With a session, the request goes into the tunnel. The tunnel is a set of connections that `cloudflared` opened from my side, and requests ride them back in. The log shows 4 QUIC connections, all to Frankfurt.
4. `cloudflared` forwards to `http://open-webui:8080` on the Docker network. A catch-all rule answers 404 for any other hostname.

The tunnel is remotely managed. The ingress rule (hostname to `http://open-webui:8080`) lives in the Cloudflare dashboard, and the container only needs the tunnel token.

## The setup

`cloudflared` is one more service in the compose file that already runs Open WebUI. The token comes from a `.env` file next to it that is not in any repository.

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

There is no `ports:` entry. The container only makes outbound connections.

Since Open WebUI is now on the internet, I also tightened it:

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

On the Cloudflare side there is one Access application on the hostname, with a policy that allows two email addresses (mine and my wife's) and the one-time PIN login method. Open WebUI's own login still sits behind that, with signup off, so there are two gates in a row.

## What sits behind it

Open WebUI is the front for everything else I run locally, and the tunnel exposes only that one hostname.

<div class="diagram">
<svg viewBox="0 0 640 400" role="img" aria-label="Open WebUI talks to llama.cpp on the host and to containers for speech, images, tool bridges and document conversion. Outlined nodes link to the matching benchmark posts.">
<defs><marker id="ah2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path class="ah" d="M0 0L10 5L0 10z"/></marker></defs>
<rect class="z" x="118" y="94" width="512" height="298" rx="14"/><text class="zt" x="132" y="116">Docker network</text>
<g><rect class="n" x="4" y="168" width="100" height="54" rx="10"/><text class="t" x="54.0" y="192.0" text-anchor="middle">Cloudflare</text><text class="s" x="54.0" y="209.0" text-anchor="middle">edge</text></g>
<g><rect class="n" x="134" y="168" width="112" height="54" rx="10"/><text class="t" x="190.0" y="200.0" text-anchor="middle">cloudflared</text></g>
<g><rect class="n" x="278" y="148" width="130" height="94" rx="10"/><text class="t" x="343.0" y="192.0" text-anchor="middle">Open WebUI</text><text class="s" x="343.0" y="209.0" text-anchor="middle">built-in Whisper STT</text></g>
<path class="l" d="M104 195 H132" marker-end="url(#ah2)"/><path class="l" d="M246 195 H276" marker-end="url(#ah2)"/>
<a href="/blog/llm-benchmark/"><rect class="nh lk" x="462" y="10" width="150" height="54" rx="10"/><text class="t" x="537.0" y="34.0" text-anchor="middle">llama.cpp server</text><text class="s" x="537.0" y="51.0" text-anchor="middle">on the host · GPU</text></a>
<path class="l" d="M408 195 C435 195 435 37 460 37" marker-end="url(#ah2)"/>
<a href="/blog/tts-benchmark/"><rect class="n lk" x="462" y="122" width="150" height="54" rx="10"/><text class="t" x="537.0" y="146.0" text-anchor="middle">tts-router</text><text class="s" x="537.0" y="163.0" text-anchor="middle">Kokoro · Piper</text></a>
<path class="l" d="M408 195 C435 195 435 149 460 149" marker-end="url(#ah2)"/>
<a href="/blog/imagegen-benchmark/"><rect class="n lk" x="462" y="190" width="150" height="54" rx="10"/><text class="t" x="537.0" y="214.0" text-anchor="middle">imagegen-api</text><text class="s" x="537.0" y="231.0" text-anchor="middle">FastSD CPU · SDXL-Turbo</text></a>
<path class="l" d="M408 195 C435 195 435 217 460 217" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="258" width="150" height="54" rx="10"/><text class="t" x="537.0" y="282.0" text-anchor="middle">MCP bridges</text><text class="s" x="537.0" y="299.0" text-anchor="middle">vault · paper · thunderbird</text></g>
<path class="l" d="M408 195 C435 195 435 285 460 285" marker-end="url(#ah2)"/>
<g><rect class="n" x="462" y="326" width="150" height="54" rx="10"/><text class="t" x="537.0" y="350.0" text-anchor="middle">docling-serve</text><text class="s" x="537.0" y="367.0" text-anchor="middle">used by paper-mcp</text></g>
<path class="l" d="M408 195 C435 195 435 353 460 353" marker-end="url(#ah2)"/>
</svg>
</div>

<p class="caption">Outlined nodes link to the benchmark posts about that part. Everything except the model server runs in Docker.</p>

- **The model:** llama.cpp on the host, using the GPU. How I picked the settings is in [the local LLM benchmark](/blog/llm-benchmark/).
- **Speech:** a small router sends English to Kokoro and German and Russian to Piper. I compared replacements in [the TTS benchmark](/blog/tts-benchmark/).
- **Images:** FastSD CPU generates on the CPU, so the GPU stays free for the model. The comparison is in [the image generation benchmark](/blog/imagegen-benchmark/).
- **Tools:** small MCP bridges for my notes, paper search and mail, plus Docling for converting documents.

## Does it work end to end

I opened the public hostname in a browser that already had an Access session and sent a short prompt.

![Open WebUI in a browser through the tunnel: a prompt about how a Cloudflare Tunnel works, answered in three sentences by qwen3.5-35b-a3b.](/posts/owui-chat.png)

The reply streamed through the tunnel without trouble. For the network cost, I timed `/health` on the Open WebUI container, 12 requests each, median and range:

| Path | Median | Range |
|------|--------|-------|
| Local, `localhost:3000` | 3 ms | 2-23 ms |
| Through the tunnel, from a signed-in browser | 58 ms | 34-88 ms |
| Anonymous request, answered by Access at the edge | 73 ms | 63-109 ms |

The clients differ: the local and anonymous numbers come from a Python script that opens a new connection every time, the tunnel number from a browser that reuses one. So the rows show the order of magnitude, not a precise overhead. The tunnel adds tens of milliseconds, and the edge answers an anonymous request in about 70 ms.

The first reply took 68 s, and none of that was the network. I have a small custom action, Context Card, that adds a button under each reply (circled below) and reads the real token counts and timings from llama-server.

![The Context Card popup under the reply. It reports a context window 55 percent used, a new prompt of 35.8K tokens processed at 545 tokens per second in 65.6 seconds, and a reply of 108 tokens at 38.3 tokens per second in 2.8 seconds. The button that opens it is circled in red.](/posts/owui-context-card.png)

The prompt was 35.8K tokens for a three-sentence question, and processing it took 65.6 s of the 68.4 s. The 108-token reply took 2.8 s. I have not looked into what fills those 35.8K tokens yet. It is a separate problem from the tunnel, but I only noticed it because there was a number to look at.

## What I would change

- **Published ports.** The tunnel does not need any of them, but my compose file still publishes Open WebUI (3000), Kokoro (8880) and Docling (5001) on all host interfaces, so they are reachable from my home network. Binding them to `127.0.0.1` is next. The Thunderbird bridge already is.
- **Tailscale leftover.** The CORS list in my compose file still names the old Tailscale address. It is harmless, and I will remove it.
- **Not tested.** I did not set up rate limits or WAF rules, and I have not tried what a second user sees when the tunnel container is down.

This is one setup on one machine, measured on one evening. The Access policy and the email list are the part I would not skip: the tunnel only hides the port, while Access decides who gets to the login page at all.
