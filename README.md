<!--README -->

<h1 align="center">
  <img src="https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white"/>
  <img src="https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js&logoColor=white"/>
  <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white"/>
  <img src="https://img.shields.io/badge/OpenRouter-412991?style=for-the-badge&logo=openai&logoColor=white"/>
</h1>

<h1 align="center" style="font-size: 2.8em; font-weight: 800; letter-spacing: -1px;">
  Emmanuel Korir — Interactive Portfolio
</h1>

<p align="center">
  <em>A living, breathing portfolio — with a 3D AI cat assistant, real-time streaming chat, image generation, and a full blog engine. Built entirely in Angular.</em>
</p>

<p align="center">
  <a href="https://emmanuel1017.github.io/Angular-Resume/">🌐 Live Demo</a> &nbsp;|&nbsp;
  <a href="#kori--ai-cat-assistant">🐱 Meet Kori</a> &nbsp;|&nbsp;
  <a href="#getting-started">🚀 Getting Started</a>
</p>

---

## Screenshot

![Portfolio Screenshot](https://github.com/user-attachments/assets/fa4aa207-97f2-4a7e-b911-8d8a043ddd12)

---

## Demo Video

> 📹 **[Watch the demo on GitHub](https://github.com/Emmanuel1017/Angular-Resume)** — upload your screen recording to the repo's Releases or Issues for the embed to appear here.

To record your own demo:
1. Open the live site
2. Screen-record interactions with Kori, the blog reader, and image generation
3. Drag the `.mp4` / `.mov` into a GitHub Issue or Release → copy the URL → paste it here as `<video src="..."/>`

---

## Features at a Glance

| Feature | Description |
|---|---|
| 🐱 **Kori — 3D AI Cat** | WebGL cat built in Three.js, fully rigged with 15+ animations, physics ears, and streaming AI chat |
| 🎨 **Image Generation** | Ask Kori to draw anything — powered by Pollinations.ai, no API key required |
| 💬 **Streaming Chat** | Token-by-token streaming with animated thinking/speaking poses synced to the AI response |
| 📝 **Blog Engine** | Full post reader with reading-time, progress bar, scroll-lock, and mobile-optimised layout |
| 🌐 **Multi-Provider AI** | OpenRouter, OpenAI, Anthropic Claude, Ollama (local), or fully in-browser via Transformers.js |
| 🌍 **3D Avatar** | Perspective-stage profile photo with floating orbital rings, planet icons, and JS tilt tracking |
| 📱 **Responsive** | Mobile-first, tested across breakpoints, smooth CSS transitions throughout |
| 🎯 **Data-Driven** | All content loaded from JSON — sections, skills, projects, experience, blog posts |

---

## Kori — AI Cat Assistant

Kori is a fully custom **Three.js WebGL character** rendered in an `<canvas>` element — no sprite sheets, no SVG — pure 3D geometry assembled at runtime.

### 3D Rig

- **Body**: `CapsuleGeometry` torso with tabby fur texture generated pixel-by-pixel via `createImageData` (multi-frequency sine waves → organic mackerel stripe pattern)
- **Head**: Sphere with procedural eye canvases (iris, pupil, catch-light rendered to `CanvasTexture`), dynamic blink meshes (`depthTest: false` to prevent z-fighting), whisker groups, mouth
- **Ears**: Spring physics — each ear has its own velocity and restitution constants, reacts to idle animations and UI state
- **Limbs**: Arms and legs as `CapsuleGeometry` with per-joint rotation groups; paws with 3 toes each, each toe has a claw (`ConeGeometry`)
- **Tail**: Sine-wave lash driven by animation time
- **Lighting**: 3-point rig — warm key light, cool fill, amber rim

### Animations (15+)

| Anim | Trigger |
|---|---|
| `think` | Waiting for AI response — chin-rest pose, holds until first token |
| `speak` | Streaming tokens — head bob + body sway, auto-clears when done |
| `draw` | Image generation in progress — arm strokes, head tilts |
| `wave` | Image result ready |
| `lick` | Idle — arm raises to face |
| `purr` | Idle — full-body vibration at 44Hz |
| `bop` | Idle — head groove |
| `swipe` | Idle — paw swipe |
| `stretch` | Idle — squash & stretch |
| `ear-twitch` | Idle — ear spring flick |
| `tail-chase` | Idle — body rotation |
| `point` | Fact bubble — arm extends |
| `run` | Wander transitions |

### AI Providers

Kori routes messages through whichever backend is configured in the ⚙️ settings panel:

```
OpenRouter  → https://openrouter.ai/api/v1  (default, SSE streaming)
OpenAI      → https://api.openai.com/v1     (direct)
Claude      → https://api.anthropic.com/v1  (direct)
Ollama      → http://localhost:11434        (local, streaming)
Transformers.js → runs entirely in the browser via WebWorker (WebGPU / WASM)
```

Streaming is implemented with the **Fetch ReadableStream API** + `TextDecoder`. Angular's zone-coalescing issue (rapid `zone.run()` calls collapsing into one render frame) is solved by `await new Promise(r => setTimeout(r, 0))` after each SSE network chunk — forces a macrotask boundary so the browser paints each batch of tokens before reading the next.

### Image Generation

When Kori detects an image-intent phrase (`draw`, `paint`, `sketch`, `generate image of`, etc.) she:

1. Switches to the `draw` animation
2. Resolves the subject from the message
3. Constructs a [Pollinations.ai](https://image.pollinations.ai) URL — free, no API key, returns JPEG directly
4. Displays the result inside the speech bubble with a fade-in animation
5. Plays `wave` on reveal

---

## Blog Engine

- Posts stored in `src/assets/data/posts.json` with full i18n support (`internationalizations[]`)
- Post reader opens as a full-screen overlay — body scroll is locked via `position: fixed + top: -${scrollY}px + width: 100%` (prevents the browser scroll-jump that `overflow: hidden` alone causes)
- Exact scroll position restored on close via `window.scrollTo({ behavior: 'instant' })`
- Reading-time estimate (`words / 220 WPM`), progress bar driven by `onscroll`
- Escape key closes the reader

### Current Blog Posts

| Title | Topic |
|---|---|
| MCP: The Protocol Connecting AI Agents to Everything | Model Context Protocol architecture |
| Inference-Time Compute: Why Thinking Longer Beats a Bigger Model | o1 / R1 / extended thinking |
| The 2025 LLM Landscape: Claude 4, GPT-4.1, Gemini 2.5 | Practical model comparison |

---

## Tech Stack

### Core Framework
| Tech | Version | Role |
|---|---|---|
| **Angular** | 17+ | SPA framework, standalone + NgModule hybrid |
| **TypeScript** | 5.x | Type-safe throughout |
| **RxJS** | 7.x | `Subject` for TF status events, async pipe |
| **Angular Router** | — | Hash-free routing, fragment scrolling, `onSameUrlNavigation: 'ignore'` |

### 3D / Graphics
| Tech | Role |
|---|---|
| **Three.js** | WebGL renderer, geometries, materials, scene graph |
| **CanvasTexture** | Procedural fur pattern, iris/pupil eye textures |
| **OrthographicCamera** | Flat-projection cat that scales cleanly at any DPR |
| **WebGLRenderer** | Alpha background, 2× DPR, antialias |

### AI / ML
| Tech | Role |
|---|---|
| **OpenRouter API** | Multi-model gateway — default `openai/gpt-4o-mini` |
| **OpenAI API** | Direct GPT integration |
| **Anthropic API** | Direct Claude integration |
| **Ollama** | Local model serving (CORS: `OLLAMA_ORIGINS=*`) |
| **Transformers.js** | In-browser inference via WebWorker, WebGPU or WASM fallback |
| **Whisper (ONNX)** | In-browser speech-to-text for voice input |
| **Pollinations.ai** | Free image generation, no API key needed |

### Styling & Animation
| Tech | Role |
|---|---|
| **SCSS** | Component-scoped styles, design tokens, mixins |
| **CSS Custom Animations** | Orbital rings, avatar float, bubble spring, mic pulse |
| **CSS Filters** | Cartoon/cel-shaded profile photo effect (saturate + contrast) |
| **Bootstrap 5** | Grid, utilities |

### Infrastructure
| Tech | Role |
|---|---|
| **GitHub Pages** | Hosting via `angular-cli-ghpages` |
| **Google Analytics** | Page tracking |
| **JSON data files** | Content CMS (`about.json`, `posts.json`, `projects.json`, etc.) |
| **localStorage** | Persisted AI settings with versioned key + stale-model migration |
| **`.env` + `scripts/set-env.js`** | Secrets loaded at build time, never committed to git |

---

## Architecture

```
src/
├── app/
│   ├── agent/                    # Kori AI cat
│   │   ├── agent.component.ts    # Three.js rig, animations, chat flow
│   │   ├── agent.service.ts      # AI provider routing, streaming, image gen
│   │   ├── agent.component.html  # Speech bubble, settings panel, image display
│   │   ├── agent.component.scss  # Cat canvas, bubble, generated image styles
│   │   └── kori.worker.ts        # WebWorker — Transformers.js inference (off main thread)
│   ├── posts/
│   │   ├── posts.component.ts    # Blog grid
│   │   └── post-reader/          # Full-screen overlay reader
│   ├── resume/                   # Section host
│   ├── welcome/welcome-dp/       # 3D perspective avatar + orbital rings
│   ├── about/                    # About section + cartoon-filtered profile photo
│   ├── skills/, projects/,       # Other resume sections
│   │   experience/, education/
│   └── 404/                      # Not-found page
├── assets/
│   ├── data/                     # posts.json, about.json, projects.json …
│   └── kori-facts.json           # Random fact bubbles for Kori
├── environments/
│   ├── environment.example.ts    # ✅ committed — shows all available fields
│   ├── environment.ts            # ❌ gitignored — generated by set-env.js
│   └── environment.prod.ts       # ❌ gitignored — generated by set-env.js
└── scripts/
    └── set-env.js                # Reads .env → writes environment files
```

---

## Environment Setup & Secret Keys

API keys and secrets are managed via a `.env` file that is **never committed to git**. A Node script reads it and writes the Angular environment files before each build.

### Quick Setup

```bash
# 1. Copy the example file
cp .env.example .env

# 2. Fill in your keys (see table below)
#    Open .env in your editor and set the values

# 3. Generate environment files
node scripts/set-env.js

# 4. Start the dev server (set-env runs automatically via prestart)
npm start
```

> **`npm start` and `npm run build` both run `set-env.js` automatically** via `prestart` / `prebuild` hooks — you only need to run it manually if you change `.env` without restarting.

### Available Keys

| Variable | Required | Where to get it |
|---|---|---|
| `OPENROUTER_API_KEY` | ✅ For Kori chat | [openrouter.ai/keys](https://openrouter.ai/keys) — free tier available |
| `OPENAI_API_KEY` | Optional | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| `CLAUDE_API_KEY` | Optional | [console.anthropic.com](https://console.anthropic.com/) |
| `FIREBASE_API_KEY` | Optional | Firebase Console → Project Settings → Your apps |
| `FIREBASE_AUTH_DOMAIN` | Optional | Firebase Console |
| `FIREBASE_DATABASE_URL` | Optional | Firebase Console |
| `FIREBASE_PROJECT_ID` | Optional | Firebase Console |
| `FIREBASE_STORAGE_BUCKET` | Optional | Firebase Console |
| `FIREBASE_MESSAGING_SENDER_ID` | Optional | Firebase Console |
| `FIREBASE_APP_ID` | Optional | Firebase Console |
| `FIREBASE_MEASUREMENT_ID` | Optional | Firebase Console |

### How it works

```
.env  ──→  scripts/set-env.js  ──→  environment.ts        (dev)
                                └──→  environment.prod.ts   (prod)
```

- `.env` — your local secrets, gitignored
- `.env.example` — committed template with placeholder values
- `environment.example.ts` — committed TypeScript template showing all fields
- Both generated `environment*.ts` files are gitignored

Keys loaded into `environment` are used as **default values** for Kori's settings — users can always override them at runtime via the ⚙️ settings panel in the UI (stored in their browser's `localStorage`).

### CI / GitHub Actions

In CI, set the same variable names as **repository secrets** (`Settings → Secrets → Actions`). The `set-env.js` script reads from `process.env` as a fallback when no `.env` file is present:

```yaml
- name: Generate environment files
  run: node scripts/set-env.js
  env:
    OPENROUTER_API_KEY: ${{ secrets.OPENROUTER_API_KEY }}
    FIREBASE_API_KEY:   ${{ secrets.FIREBASE_API_KEY }}
```

---

## Getting Started

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org/)
- **npm** or **yarn**

```bash
npm install npm@latest -g
```

### Install & Run

```bash
git clone https://github.com/Emmanuel1017/Angular-Resume.git
cd Angular-Resume
npm install          # or: yarn
npm start            # serves at http://localhost:4200
```

### Build for Production

```bash
npm run build        # outputs to dist/live-resume/
```

### Deploy to GitHub Pages

```bash
npm run deploy       # runs ng build + angular-cli-ghpages
```

---

## AI Configuration

Open the ⚙️ gear button on Kori to switch providers. Settings are persisted in `localStorage`.

Keys baked in at build time (from `.env`) are used as defaults — but any user can override them in the settings panel without touching the source.

### OpenRouter (default)

1. Add your key to `.env`: `OPENROUTER_API_KEY=sk-or-v1-...`
2. Or paste it directly into Kori's ⚙️ settings → **OpenRouter** tab at runtime
3. Set model to any [OpenRouter model ID](https://openrouter.ai/models) e.g. `openai/gpt-4o-mini`

### Ollama (local, 100% private)

```bash
OLLAMA_ORIGINS=* ollama serve
ollama pull qwen2.5:1.5b
```

Then set Kori's provider to **Ollama** and URL to `http://localhost:11434`.

### Browser (Transformers.js — fully offline)

Switch to **Browser** tab — Kori will prompt to download the model (~270MB on first use, then cached). Runs via WebGPU if available, falls back to WASM CPU.

---

## Customising Content

All content lives in JSON files under `src/assets/data/`:

| File | Controls |
|---|---|
| `about.json` | Bio, title, description (i18n) |
| `posts.json` | Blog posts with full HTML content |
| `projects.json` | Project cards |
| `skills.json` | Skills + proficiency levels |
| `experience.json` | Work history |
| `education.json` | Education timeline |

Replace `src/assets/template/welcome/dp.png` and `src/assets/template/about/dp.png` with your own photo.

---

## Author

**Emmanuel Korir** — Senior Software Engineer  
Eldoret, Kenya · [GitHub @Emmanuel1017](https://github.com/Emmanuel1017)

> *Built with Angular, Three.js, and a lot of cat energy 🐾*
