import {
  Component, OnInit, OnDestroy,
  NgZone, HostListener
} from '@angular/core';
import { AgentService, AgentSettings, DEFAULT_SETTINGS } from './agent.service';
import { environment } from 'src/environments/environment';

@Component({
  standalone: false,
  selector: 'app-agent',
  host: {
    '[style.left.px]':   'posX',
    '[style.bottom.px]': 'posY',
    '[class.dragging]':  'isDragging'
  },
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.scss']
})
export class AgentComponent implements OnInit, OnDestroy {

  posX = 24;
  posY = 80;
  facingRight = true;

  isChatOpen      = false;
  isSettingsOpen  = false;
  isThinking      = false;
  isRunning       = false;
  isListening     = false;
  idleAnimClass   = '';
  tfStatus        = '';
  bubbleText      = '';
  inputMessage    = '';
  settings: AgentSettings = { ...DEFAULT_SETTINGS };

  // ── Download bubble ─────────────────────────────────────────────────────────
  showDownloadModal  = false;
  downloadLabel      = '';
  downloadFile       = '';
  downloadPercent    = 0;
  downloadDone       = false;

  // ── Drag ────────────────────────────────────────────────────────────────────
  isDragging    = false;
  private dragMoved     = false;
  private dragStartX    = 0;
  private dragStartY    = 0;
  private dragStartPosX = 0;
  private dragStartPosY = 0;

  private wanderTimer?:    ReturnType<typeof setTimeout>;
  private dismissTimer?:   ReturnType<typeof setTimeout>;
  private runTimer?:       ReturnType<typeof setTimeout>;
  private idleAnimTimer?:  ReturnType<typeof setTimeout>;
  private recordingTimer?: ReturnType<typeof setTimeout>;
  private tfSub: any;
  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];

  private readonly idleAnims = ['lick', 'purr', 'ear-twitch'] as const;

  private readonly idlePhrases = [
    "Hey there! Ask me anything about Emmanuel 😸",
    "Psst, I know all about his projects! 🐱",
    "Curious about his AI work? Just ask! 🤖",
    "Click me to chat — I don't bite! 🐾",
    "I've read all his articles! Ask away ✨",
    "Want to know Emmanuel's tech stack? Ask! 🔮",
    "I run entirely in your browser! 🧠",
    "No cloud, no cookies — just vibes 🐾",
    "Try asking about my favourite Elixir patterns! ⚗️",
    "Meow! Healthcare tech, AI, Go — ask anything 😺"
  ];

  constructor(private agentService: AgentService, private zone: NgZone) {}

  ngOnInit(): void {
    this.settings = this.agentService.getSettings();
    this.agentService.loadContext(environment.baseUrl);

    this.posX = Math.max(16, Math.min((window.innerWidth || 800) - 120, 80));
    this.posY = 80;

    this.tfSub = this.agentService.tfStatus$.subscribe(status => {
      this.zone.run(() => {
        this.tfStatus = status;
        this.handleTfStatus(status);
      });
    });

    // Pre-download the browser model in the background on page load
    if (this.settings.provider === 'transformers') {
      const model = this.settings.tfModel || DEFAULT_SETTINGS.tfModel;
      this.agentService.preload(model);
    }

    setTimeout(() => this.showIdle(this.idlePhrases[0], 5500), 2200);
    this.scheduleWander();
    this.scheduleIdleAnim();
  }

  ngOnDestroy(): void {
    clearTimeout(this.wanderTimer as any);
    clearTimeout(this.dismissTimer as any);
    clearTimeout(this.runTimer as any);
    clearTimeout(this.idleAnimTimer as any);
    clearTimeout(this.recordingTimer as any);
    this.tfSub?.unsubscribe();
    this.mediaRecorder?.stop();
  }

  // ── Download bubble ─────────────────────────────────────────────────────────
  private handleTfStatus(status: string): void {
    if (!status) return;

    const [label, raw] = status.split(':');
    if (!label || !raw) return;

    const isChat    = label === 'chat';
    const isWhisper = label === 'whisper';
    if (!isChat && !isWhisper) return;

    if (raw === 'done') {
      this.downloadDone    = true;
      this.downloadPercent = 100;
      setTimeout(() => {
        this.showDownloadModal = false;
        this.downloadDone      = false;
      }, 1400);
      return;
    }

    this.showDownloadModal = true;
    this.downloadDone      = false;
    this.downloadLabel     = isChat ? 'Loading model' : 'Loading Whisper';

    if (raw === 'loading') {
      this.downloadFile    = 'Compiling…';
      this.downloadPercent = 99;
    } else {
      const pct = parseInt(raw, 10);
      if (!isNaN(pct)) this.downloadPercent = pct;
    }
  }

  updateDownloadFile(file: string): void {
    if (file) this.downloadFile = file;
  }

  // ── Drag ────────────────────────────────────────────────────────────────────
  onCatPointerDown(e: MouseEvent | TouchEvent): void {
    e.stopPropagation();
    const pt = this.eventPoint(e);
    this.isDragging    = true;
    this.dragMoved     = false;
    this.dragStartX    = pt.x;
    this.dragStartY    = pt.y;
    this.dragStartPosX = this.posX;
    this.dragStartPosY = this.posY;
    clearTimeout(this.wanderTimer as any);
    clearTimeout(this.runTimer as any);
    this.isRunning = false;
  }

  @HostListener('document:mousemove', ['$event'])
  onDocMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;
    this.applyDrag(e.clientX, e.clientY);
  }

  @HostListener('document:touchmove', ['$event'])
  onDocTouchMove(e: TouchEvent): void {
    if (!this.isDragging || !e.touches.length) return;
    this.applyDrag(e.touches[0].clientX, e.touches[0].clientY);
  }

  @HostListener('document:mouseup')
  @HostListener('document:touchend')
  onDragEnd(): void {
    if (!this.isDragging) return;
    this.isDragging = false;
    if (this.dragMoved) this.scheduleWander();
  }

  private applyDrag(clientX: number, clientY: number): void {
    const dx = clientX - this.dragStartX;
    const dy = clientY - this.dragStartY;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) this.dragMoved = true;
    if (!this.dragMoved) return;

    const w = window.innerWidth  || 800;
    const h = window.innerHeight || 600;
    this.posX = Math.max(0, Math.min(w - 90,  this.dragStartPosX + dx));
    this.posY = Math.max(0, Math.min(h - 140, this.dragStartPosY - dy));
    this.facingRight = dx >= 0;
  }

  private eventPoint(e: MouseEvent | TouchEvent): { x: number; y: number } {
    if ('touches' in e && e.touches.length) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
  }

  // ── Wander ───────────────────────────────────────────────────────────────────
  private scheduleWander(): void {
    const delay = 3000 + Math.random() * 3000;
    this.zone.runOutsideAngular(() => {
      this.wanderTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isChatOpen && !this.isSettingsOpen && !this.isDragging) this.wander();
          this.scheduleWander();
        });
      }, delay);
    });
  }

  private wander(): void {
    const maxX = (window.innerWidth || 800) - 120;
    const newX = Math.max(16, Math.floor(Math.random() * maxX));
    const newY = 60 + Math.floor(Math.random() * 100);
    this.facingRight = newX >= this.posX;
    this.posX = newX;
    this.posY = newY;

    this.idleAnimClass = '';
    this.isRunning = true;
    clearTimeout(this.runTimer as any);
    this.runTimer = setTimeout(() => { this.isRunning = false; }, 3200);

    if (Math.random() < 0.65 && !this.bubbleText) {
      const p = this.idlePhrases[Math.floor(Math.random() * this.idlePhrases.length)];
      setTimeout(() => { if (!this.isChatOpen) this.showIdle(p, 4500); }, 900);
    }
  }

  private showIdle(text: string, ms = 5000): void {
    this.bubbleText = text;
    clearTimeout(this.dismissTimer as any);
    this.dismissTimer = setTimeout(() => {
      if (!this.isChatOpen && !this.isSettingsOpen) this.bubbleText = '';
    }, ms);
  }

  // ── Idle animations ───────────────────────────────────────────────────────────
  private scheduleIdleAnim(): void {
    const delay = 4000 + Math.random() * 5000;
    this.zone.runOutsideAngular(() => {
      this.idleAnimTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isChatOpen && !this.isSettingsOpen && !this.isRunning && !this.isDragging) {
            this.triggerIdleAnim();
          }
          this.scheduleIdleAnim();
        });
      }, delay);
    });
  }

  private triggerIdleAnim(): void {
    const anim = this.idleAnims[Math.floor(Math.random() * this.idleAnims.length)];
    this.idleAnimClass = anim;
    const dur: Record<string, number> = { lick: 2400, purr: 3000, 'ear-twitch': 1200 };
    setTimeout(() => { this.idleAnimClass = ''; }, dur[anim] ?? 2000);
  }

  // ── Mic / Whisper ─────────────────────────────────────────────────────────────
  get isMicAvailable(): boolean {
    return !!(navigator.mediaDevices?.getUserMedia);
  }

  async toggleMic(e: Event): Promise<void> {
    e.stopPropagation();
    if (this.isListening) {
      this.mediaRecorder?.stop();
      this.isListening = false;
      clearTimeout(this.recordingTimer as any);
    } else {
      await this.startRecording();
    }
  }

  private async startRecording(): Promise<void> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.audioChunks = [];
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) this.audioChunks.push(ev.data);
      };
      this.mediaRecorder.onstop = () => this.handleAudioStop(stream);
      this.mediaRecorder.start();
      this.isListening = true;
      this.recordingTimer = setTimeout(() => {
        if (this.isListening) {
          this.mediaRecorder?.stop();
          this.isListening = false;
        }
      }, 12000);
    } catch {
      this.zone.run(() => { this.showIdle('Mic access denied 🎤', 3500); });
    }
  }

  private async handleAudioStop(stream: MediaStream): Promise<void> {
    clearTimeout(this.recordingTimer as any);
    stream.getTracks().forEach(t => t.stop());

    const blob = new Blob(this.audioChunks, { type: 'audio/webm' });
    const arrayBuffer = await blob.arrayBuffer();
    const audioCtx = new AudioContext();
    const decoded  = await audioCtx.decodeAudioData(arrayBuffer);
    const float32  = this.resampleTo16k(decoded);
    await audioCtx.close();

    this.zone.run(async () => {
      this.isThinking = true;
      this.bubbleText  = '';
      try {
        const text = (await this.agentService.transcribe(float32)).trim();
        if (text) {
          this.inputMessage = text;
          this.isThinking   = false;
          await this.sendMessage();
        } else {
          this.isThinking = false;
          this.showIdle("Couldn't catch that — try again? 🎤", 3500);
        }
      } catch {
        this.isThinking = false;
        this.showIdle('Voice failed — type instead? 🎤', 3500);
      }
    });
  }

  private resampleTo16k(buf: AudioBuffer): Float32Array {
    const src  = buf.getChannelData(0);
    const rate = buf.sampleRate;
    if (rate === 16000) return src;
    const ratio = rate / 16000;
    const out   = new Float32Array(Math.round(src.length / ratio));
    for (let i = 0; i < out.length; i++) {
      const j = i * ratio;
      const lo = Math.floor(j);
      const hi = Math.min(lo + 1, src.length - 1);
      out[i]   = src[lo] * (1 - (j - lo)) + src[hi] * (j - lo);
    }
    return out;
  }

  // ── Clicks ────────────────────────────────────────────────────────────────────
  @HostListener('click', ['$event'])
  stopBubble(e: Event): void { e.stopPropagation(); }

  @HostListener('document:click')
  onOutsideClick(): void {
    if (this.isChatOpen || this.isSettingsOpen) {
      this.isChatOpen     = false;
      this.isSettingsOpen = false;
    }
  }

  onCatClick(e: Event): void {
    e.stopPropagation();
    if (this.dragMoved) { this.dragMoved = false; return; }
    if (this.isSettingsOpen) { this.isSettingsOpen = false; return; }
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen && !this.bubbleText) this.bubbleText = "What would you like to know? 😺";
    if (!this.isChatOpen) this.bubbleText = '';
  }

  toggleSettings(e: Event): void {
    e.stopPropagation();
    this.isSettingsOpen = !this.isSettingsOpen;
    if (this.isSettingsOpen) {
      this.isChatOpen = false;
      this.settings   = this.agentService.getSettings();
    }
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────
  async sendMessage(): Promise<void> {
    const msg = this.inputMessage.trim();
    if (!msg || this.isThinking) return;
    this.inputMessage = '';
    this.isThinking   = true;
    this.bubbleText   = '';
    try {
      const resp = await this.agentService.chat(msg);
      this.isThinking = false;
      this.bubbleText = resp;
    } catch {
      this.isThinking = false;
      this.bubbleText = "Hmm, something went wrong. Try again? 😿";
    }
  }

  // ── Settings ──────────────────────────────────────────────────────────────────
  saveSettings(): void {
    this.agentService.saveSettings(this.settings);
    // Trigger preload if user switches to browser provider
    if (this.settings.provider === 'transformers') {
      const model = this.settings.tfModel || DEFAULT_SETTINGS.tfModel;
      this.agentService.preload(model);
    }
    this.isSettingsOpen = false;
    this.showIdle("Settings saved! Let's chat 😸", 3500);
  }

  get currentApiKey(): string {
    if (this.settings.provider === 'openai') return this.settings.openaiKey;
    if (this.settings.provider === 'claude') return this.settings.claudeKey;
    return '';
  }
  set currentApiKey(v: string) {
    if (this.settings.provider === 'openai')      this.settings.openaiKey = v;
    else if (this.settings.provider === 'claude') this.settings.claudeKey = v;
  }

  get currentModel(): string {
    if (this.settings.provider === 'openai')       return this.settings.openaiModel;
    if (this.settings.provider === 'claude')       return this.settings.claudeModel;
    if (this.settings.provider === 'transformers') return this.settings.tfModel;
    return this.settings.ollamaModel;
  }
  set currentModel(v: string) {
    if (this.settings.provider === 'openai')            this.settings.openaiModel = v;
    else if (this.settings.provider === 'claude')       this.settings.claudeModel = v;
    else if (this.settings.provider === 'transformers') this.settings.tfModel     = v;
    else                                                this.settings.ollamaModel = v;
  }

  get modelPlaceholder(): string {
    if (this.settings.provider === 'openai')       return 'gpt-4o-mini';
    if (this.settings.provider === 'claude')       return 'claude-haiku-4-5-20251001';
    if (this.settings.provider === 'transformers') return 'HuggingFaceTB/SmolLM2-135M-Instruct';
    return 'llama3.1:8b';
  }

  get bubbleVisible(): boolean {
    return !!(this.bubbleText || this.isChatOpen || this.isThinking || this.isSettingsOpen || this.showDownloadModal);
  }

  get bubbleAlign(): string {
    const mid = this.posX + 45;
    const w   = window.innerWidth || 800;
    if (mid < 140)     return 'align-left';
    if (mid > w - 140) return 'align-right';
    return 'align-center';
  }
}
