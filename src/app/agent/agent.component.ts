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
    '[style.bottom.px]': 'posY'
  },
  templateUrl: './agent.component.html',
  styleUrls: ['./agent.component.scss']
})
export class AgentComponent implements OnInit, OnDestroy {

  posX = 24;
  posY = 80;
  facingRight = true;

  isChatOpen    = false;
  isSettingsOpen = false;
  isThinking    = false;
  bubbleText    = '';
  inputMessage  = '';
  settings: AgentSettings = { ...DEFAULT_SETTINGS };

  private wanderTimer?: ReturnType<typeof setTimeout>;
  private dismissTimer?: ReturnType<typeof setTimeout>;

  private readonly idlePhrases = [
    "Hey there! Ask me anything about Emmanuel 😸",
    "Psst, I know all about his projects! 🐱",
    "Curious about his AI work? Just ask! 🤖",
    "Click me to chat — I don't bite! 🐾",
    "I've read all his articles! Ask away ✨",
    "Want to know Emmanuel's tech stack? Ask! 🔮"
  ];

  constructor(private agentService: AgentService, private zone: NgZone) {}

  ngOnInit(): void {
    this.settings = this.agentService.getSettings();
    this.agentService.loadContext(environment.baseUrl);

    this.posX = Math.max(16, Math.min((window.innerWidth || 800) - 120, 80));
    this.posY = 80;

    setTimeout(() => this.showIdle(this.idlePhrases[0], 5500), 2200);
    this.scheduleWander();
  }

  ngOnDestroy(): void {
    clearTimeout(this.wanderTimer as any);
    clearTimeout(this.dismissTimer as any);
  }

  // ── Wander ──────────────────────────────────────────────────────────────────
  private scheduleWander(): void {
    const delay = 9000 + Math.random() * 9000;
    this.zone.runOutsideAngular(() => {
      this.wanderTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isChatOpen && !this.isSettingsOpen) this.wander();
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

    if (Math.random() < 0.32 && !this.bubbleText) {
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

  // ── Clicks ──────────────────────────────────────────────────────────────────
  @HostListener('click', ['$event'])
  stopBubble(e: Event): void { e.stopPropagation(); }

  @HostListener('document:click')
  onOutsideClick(): void {
    if (this.isChatOpen || this.isSettingsOpen) {
      this.isChatOpen    = false;
      this.isSettingsOpen = false;
    }
  }

  onCatClick(e: Event): void {
    e.stopPropagation();
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
      this.settings = this.agentService.getSettings();
    }
  }

  // ── Chat ────────────────────────────────────────────────────────────────────
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

  // ── Settings ────────────────────────────────────────────────────────────────
  saveSettings(): void {
    this.agentService.saveSettings(this.settings);
    this.isSettingsOpen = false;
    this.showIdle("Settings saved! Let's chat 😸", 3500);
  }

  get currentApiKey(): string {
    if (this.settings.provider === 'openai') return this.settings.openaiKey;
    if (this.settings.provider === 'claude') return this.settings.claudeKey;
    return '';
  }
  set currentApiKey(v: string) {
    if (this.settings.provider === 'openai') this.settings.openaiKey = v;
    else if (this.settings.provider === 'claude') this.settings.claudeKey = v;
  }

  get currentModel(): string {
    if (this.settings.provider === 'openai') return this.settings.openaiModel;
    if (this.settings.provider === 'claude') return this.settings.claudeModel;
    return this.settings.ollamaModel;
  }
  set currentModel(v: string) {
    if (this.settings.provider === 'openai') this.settings.openaiModel = v;
    else if (this.settings.provider === 'claude') this.settings.claudeModel = v;
    else this.settings.ollamaModel = v;
  }

  get modelPlaceholder(): string {
    if (this.settings.provider === 'openai') return 'gpt-4o-mini';
    if (this.settings.provider === 'claude') return 'claude-haiku-4-5-20251001';
    return 'llama3.1:8b';
  }

  get bubbleVisible(): boolean {
    return !!(this.bubbleText || this.isChatOpen || this.isThinking || this.isSettingsOpen);
  }

  get bubbleAlign(): string {
    const mid = this.posX + 45;
    const w   = window.innerWidth || 800;
    if (mid < 140)     return 'align-left';
    if (mid > w - 140) return 'align-right';
    return 'align-center';
  }
}
