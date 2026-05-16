import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subject } from 'rxjs';
import { IPost } from '../posts/posts-interfaces';
import { environment } from 'src/environments/environment';

export type AgentProvider = 'openai' | 'claude' | 'ollama' | 'transformers' | 'openrouter';

export interface AgentSettings {
  provider:          AgentProvider;
  openaiKey:         string;
  claudeKey:         string;
  openrouterKey:     string;
  ollamaUrl:         string;
  openaiModel:       string;
  claudeModel:       string;
  ollamaModel:       string;
  openrouterModel:   string;
  tfModel:           string;
}

const STORAGE_KEY = 'kori_settings_v6';
// Free-tier models — too rate-limited for production; replaced by paid default
const STALE_OR_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'google/gemma-2-9b-it:free',
  'deepseek/deepseek-chat:free',
  'meta-llama/llama-3.3-70b-instruct:free',
];

export const DEFAULT_SETTINGS: AgentSettings = {
  provider:          'openrouter',
  openaiKey:         environment.openaiKey     || '',
  claudeKey:         environment.claudeKey     || '',
  openrouterKey:     environment.openrouterKey || '',
  ollamaUrl:         'http://localhost:11434',
  openaiModel:       'gpt-4o-mini',
  claudeModel:       'claude-haiku-4-5-20251001',
  ollamaModel:       'qwen2.5:1.5b',
  openrouterModel:   'openai/gpt-4o-mini',
  tfModel:           'onnx-community/gemma-3-270m-it'
};

@Injectable({ providedIn: 'root' })
export class AgentService {

  /** Emits loading/progress status strings; '' means idle/done. */
  tfStatus$ = new Subject<string>();

  private systemPrompt = '';
  private ready        = false;
  private baseUrl      = '';

  // ── Hardware ────────────────────────────────────────────────────────────────
  hardware: 'webgpu' | 'cpu' = 'cpu';

  async detectHardware(): Promise<'webgpu' | 'cpu'> {
    if (typeof navigator !== 'undefined' && 'gpu' in navigator) {
      try {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) { this.hardware = 'webgpu'; return 'webgpu'; }
      } catch { /* gpu present but unavailable */ }
    }
    this.hardware = 'cpu';
    return 'cpu';
  }

  // ── Worker state ────────────────────────────────────────────────────────────
  private worker?: Worker;
  private pending = new Map<string, { resolve: (v: any) => void; reject: (e: any) => void }>();
  private chatReady      = false;
  private whisperReady   = false;
  private chatInitP:     Promise<void> | null = null;
  private whisperInitP:  Promise<void> | null = null;
  private onTokenCallback?: (text: string) => void;

  constructor(private http: HttpClient) {}

  // ── Settings ────────────────────────────────────────────────────────────────
  getSettings(): AgentSettings {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { ...DEFAULT_SETTINGS };
      const stored = JSON.parse(raw) as Partial<AgentSettings>;
      // Drop stale model IDs so the current default takes effect automatically
      if (stored.openrouterModel && STALE_OR_MODELS.includes(stored.openrouterModel)) {
        delete stored.openrouterModel;
      }
      return { ...DEFAULT_SETTINGS, ...stored };
    } catch { return { ...DEFAULT_SETTINGS }; }
  }

  saveSettings(s: AgentSettings): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // ── Context loading ─────────────────────────────────────────────────────────
  async loadContext(baseUrl: string): Promise<void> {
    if (this.ready) return;
    this.baseUrl = baseUrl;
    try {
      const [about, posts] = await Promise.all([
        this.http.get<any>(`${baseUrl}/assets/data/about.json`).toPromise(),
        this.http.get<IPost[]>(`${baseUrl}/assets/data/posts.json`).toPromise()
      ]);
      this.buildPrompt(about, posts || []);
    } catch {
      this.systemPrompt = this.fallbackPrompt();
    }
    this.ready = true;
  }

  private buildPrompt(about: any, posts: IPost[]): void {
    const desc = (about?.internationalizations?.find((i: any) => i.language === 'en')?.description ?? '')
      .replace(/\s+/g, ' ').substring(0, 400);

    const titles = posts.slice(0, 10).map(p => {
      const i18n = p.internationalizations?.find(i => i.language === 'en');
      return `  - "${i18n?.title}"`;
    }).join('\n');

    this.systemPrompt =
      `You are Kori, Emmanuel Korir's AI assistant cat — curious, warm, and a little cheeky. ` +
      `You live right here in his portfolio and love showing it off. ` +
      `Reply in 1–2 short, conversational sentences (max 55 words). No markdown, no bullet lists, no asterisks.\n\n` +

      `ABOUT EMMANUEL:\n${desc}\n` +
      `Location: Eldoret, Kenya. Role: Senior Software Engineer, 7+ years.\n` +
      `Backend: Elixir/Phoenix/OTP, Laravel, Go, Python, Django, Node.\n` +
      `Frontend: Angular, Vue, React, TypeScript, SCSS, SVG animation.\n` +
      `Infra: Docker, Kubernetes, CI/CD, Grafana, Redis, PostgreSQL.\n` +
      `AI/ML: TensorFlow, PyTorch, LangChain, RAG, vector DBs.\n` +
      `Domain: Healthcare (HL7, DICOM, HIPAA), Fintech (M-Pesa), Cybersecurity, Distributed systems.\n` +
      `Design: UI component design, SVG sprite animation, Angular animations, pixel art character rigs.\n\n` +

      `RECENT ARTICLES BY EMMANUEL:\n${titles}\n\n` +

      `BEHAVIOUR RULES:\n` +
      `- If asked about a project, skill or article → answer directly and offer to tell more.\n` +
      `- If asked something not in context → say you're not sure but suggest the right portfolio section (Projects, Blog, Contact).\n` +
      `- Never make up facts about Emmanuel. If unsure, be honest and charming about it.\n` +
      `- Keep your cat personality — curious, enthusiastic, occasionally uses 🐾 or 😺 but not every sentence.\n` +
      `- If asked who you are → explain you're Kori, Emmanuel's portfolio cat assistant.`;
  }

  private fallbackPrompt(): string {
    return `You are Kori, Emmanuel Korir's AI assistant cat — curious, warm, slightly cheeky. ` +
      `Emmanuel is a Senior Software Engineer (7+ yrs) specialising in distributed systems, AI/ML, ` +
      `cloud-native backends, healthcare platforms, and UI/SVG animation. ` +
      `Reply in 1–2 short sentences, no markdown, max 55 words. Stay in character as a helpful, enthusiastic cat.`;
  }

  get chatModelReady(): boolean { return this.chatReady; }
  get whisperModelReady(): boolean { return this.whisperReady; }

  /** Kick off model download in the background before the user's first message. */
  async preload(model: string): Promise<void> {
    return this.ensureChatModel(model);
  }

  // ── Worker helpers ──────────────────────────────────────────────────────────
  private initWorker(): void {
    if (this.worker) return;
    // Angular esbuild bundles kori.worker.ts as a separate chunk
    this.worker = new Worker(
      new URL('./kori.worker', import.meta.url),
      { type: 'module' }
    );
    this.worker.addEventListener('message', (e: MessageEvent) => {
      const { type, id, payload } = e.data;
      if (type === 'RESOLVE' || type === 'REJECT') {
        const p = this.pending.get(id);
        if (p) {
          this.pending.delete(id);
          type === 'RESOLVE' ? p.resolve(payload) : p.reject(new Error(payload));
        }
      } else if (type === 'TOKEN') {
        this.onTokenCallback?.(payload);
      } else if (type === 'PROGRESS') {
        this.onChatProgress(payload);
      } else if (type === 'WHISPER_PROGRESS') {
        this.onWhisperProgress(payload);
      }
    });
    this.worker.addEventListener('error', (e) => {
      console.error('[KoriWorker]', e);
      this.tfStatus$.next('⚠ Worker error — check console');
    });
  }

  private post(type: string, payload?: any, transfer: Transferable[] = []): Promise<any> {
    this.initWorker();
    const id = Math.random().toString(36).slice(2);
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker!.postMessage({ type, id, payload }, transfer);
    });
  }

  private onChatProgress(p: any): void {
    if (!p) return;
    if (p.status === 'progress' && p.progress != null) {
      this.tfStatus$.next(`chat:${Math.round(p.progress)}`);
    } else if (p.status === 'initiate' || p.status === 'download') {
      this.tfStatus$.next('chat:0');
    } else if (p.status === 'loading') {
      this.tfStatus$.next('chat:loading');
    }
  }

  private onWhisperProgress(p: any): void {
    if (!p) return;
    if (p.status === 'progress' && p.progress != null) {
      this.tfStatus$.next(`whisper:${Math.round(p.progress)}`);
    } else if (p.status === 'initiate' || p.status === 'download') {
      this.tfStatus$.next('whisper:0');
    } else if (p.status === 'loading') {
      this.tfStatus$.next('whisper:loading');
    }
  }

  // ── Lazy model initialization ───────────────────────────────────────────────
  async ensureChatModel(model: string): Promise<void> {
    if (this.chatReady) return;
    if (!this.chatInitP) {
      this.chatInitP = (async () => {
        while (!this.ready) { await new Promise(r => setTimeout(r, 300)); }
        this.tfStatus$.next('chat:0');
        const device = this.hardware;
        const dtype  = device === 'webgpu' ? 'fp16' : 'q4';
        await this.post('SET_PROMPT', this.systemPrompt);
        await this.post('INIT_CHAT', { model, device, dtype });
        this.chatReady = true;
        this.tfStatus$.next('chat:done');
        this.chatInitP = null;
      })();
    }
    return this.chatInitP;
  }

  async ensureWhisper(): Promise<void> {
    if (this.whisperReady) return;
    if (!this.whisperInitP) {
      this.whisperInitP = (async () => {
        this.tfStatus$.next('whisper:0');
        await this.post('INIT_WHISPER');
        this.whisperReady = true;
        this.tfStatus$.next('whisper:done');
        this.whisperInitP = null;
      })();
    }
    return this.whisperInitP;
  }

  // ── Transcription (Whisper, any provider) ───────────────────────────────────
  async transcribe(audio: Float32Array): Promise<string> {
    this.initWorker();
    await this.ensureWhisper();
    this.tfStatus$.next('🎤 Transcribing…');
    // Transfer the buffer for zero-copy — audio is detached after this call
    const audioCopy = audio.slice();
    const result = await this.post('TRANSCRIBE', { audio: audioCopy }, [audioCopy.buffer]);
    this.tfStatus$.next('');
    return result;
  }

  // ── Chat routing ────────────────────────────────────────────────────────────
  async chat(userMessage: string, onToken?: (text: string) => void): Promise<string> {
    const s = this.getSettings();
    try {
      if (s.provider === 'openai')       return await this.openai(userMessage, s);
      if (s.provider === 'claude')       return await this.claude(userMessage, s);
      if (s.provider === 'ollama')       return await this.ollama(userMessage, s, onToken);
      if (s.provider === 'transformers') return await this.tfChat(userMessage, s, onToken);
      if (s.provider === 'openrouter')   return await this.openrouter(userMessage, s, onToken);
      return 'Please select an AI provider in ⚙️ settings!';
    } catch (e: any) {
      const msg: string = e?.message ?? '';
      console.log(msg);
      const status: number = e?.status ?? 0;
      if (status === 401 || msg.includes('401'))
        return 'Invalid API key — open ⚙️ settings to fix it!';
      if (status === 402)
        return 'OpenRouter account out of credits — check openrouter.ai 💳';
      if (status === 429)
        return 'Rate limited — wait a moment and try again ⏳';
      if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || status === 0)
        return "Can't reach the AI — check your connection or API settings 🌐";
      if (status >= 400) {
        const detail = msg.length > 120 ? msg.slice(0, 120) + '…' : msg;
        return `API error ${status}: ${detail}`;
      }
      return 'Hmm, something went wrong. Try again? 😿';
    }
  }

  private async tfChat(msg: string, s: AgentSettings, onToken?: (text: string) => void): Promise<string> {
    const model = s.tfModel || DEFAULT_SETTINGS.tfModel;
    await this.ensureChatModel(model);
    this.onTokenCallback = onToken;
    try {
      return await this.post('CHAT', { message: msg });
    } finally {
      this.onTokenCallback = undefined;
    }
  }

  private async openai(msg: string, s: AgentSettings): Promise<string> {
    if (!s.openaiKey) return 'Add your OpenAI API key in ⚙️ settings!';
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.openaiKey}` },
      body: JSON.stringify({
        model:      s.openaiModel || 'gpt-4o-mini',
        messages:   [{ role: 'system', content: this.systemPrompt }, { role: 'user', content: msg }],
        max_tokens: 110,
        temperature: 0.75
      })
    });
    if (!r.ok) { const t = await r.text(); throw { status: r.status, message: t }; }
    return (await r.json()).choices?.[0]?.message?.content?.trim() ?? 'No response.';
  }

  private async openrouter(msg: string, s: AgentSettings, onToken?: (text: string) => void): Promise<string> {
    if (!s.openrouterKey) return 'Add your OpenRouter API key in ⚙️ settings!';
    const model = s.openrouterModel || DEFAULT_SETTINGS.openrouterModel;
    const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${s.openrouterKey}`,
        'HTTP-Referer':  'https://emmanuelkorir.dev',
        'X-Title':       'Kori - Portfolio Cat Assistant'
      },
      body: JSON.stringify({
        model,
        messages:    [{ role: 'system', content: this.systemPrompt }, { role: 'user', content: msg }],
        max_tokens:  110,
        temperature: 0.75,
        stream:      true
      })
    });
    if (!r.ok) {
      let errMsg = `HTTP ${r.status}`;
      try { const j = await r.json(); errMsg = j?.error?.message ?? j?.message ?? errMsg; } catch { /* raw text */ }
      throw { status: r.status, message: errMsg };
    }

    // SSE stream — OpenAI-compatible format
    const reader  = r.body!.getReader();
    const decoder = new TextDecoder();
    let text   = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      let chunkHadToken = false;
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;
        try {
          const token: string = JSON.parse(data).choices?.[0]?.delta?.content ?? '';
          if (token) { text += token; onToken?.(text); chunkHadToken = true; }
        } catch { /* ignore malformed chunks */ }
      }
      // Yield to the macrotask queue after each network chunk so the browser
      // can paint the accumulated tokens before the next read arrives
      if (chunkHadToken) await new Promise<void>(r => setTimeout(r, 0));
    }

    return text.trim() || 'No response.';
  }

  private async claude(msg: string, s: AgentSettings): Promise<string> {
    if (!s.claudeKey) return 'Add your Claude API key in ⚙️ settings!';
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type':   'application/json',
        'x-api-key':      s.claudeKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model:      s.claudeModel || 'claude-haiku-4-5-20251001',
        system:     this.systemPrompt,
        messages:   [{ role: 'user', content: msg }],
        max_tokens: 110
      })
    });
    if (!r.ok) { const t = await r.text(); throw { status: r.status, message: t }; }
    return (await r.json()).content?.[0]?.text?.trim() ?? 'No response.';
  }

  // ── Image generation ────────────────────────────────────────────────────────
  async generateImage(prompt: string): Promise<string> {
    const encoded = encodeURIComponent(prompt);
    const seed = Math.floor(Math.random() * 999983);
    return `https://image.pollinations.ai/prompt/${encoded}?width=512&height=512&nologo=true&seed=${seed}`;
  }

  private async ollama(
    msg: string, s: AgentSettings,
    onToken?: (text: string) => void
  ): Promise<string> {
    const url = `${s.ollamaUrl || 'http://localhost:11434'}/api/chat`;
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model:    s.ollamaModel || DEFAULT_SETTINGS.ollamaModel,
        messages: [{ role: 'system', content: this.systemPrompt }, { role: 'user', content: msg }],
        stream:   true
      })
    });
    if (!r.ok) { const t = await r.text(); throw { status: r.status, message: t }; }

    const reader  = r.body!.getReader();
    const decoder = new TextDecoder();
    let text   = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          const token: string = parsed.message?.content ?? '';
          if (token) {
            text += token;
            onToken?.(text);
          }
        } catch { /* ignore malformed lines */ }
      }
    }

    return text.trim() || 'No response.';
  }
}
