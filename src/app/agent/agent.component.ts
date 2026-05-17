import {
  Component, OnInit, OnDestroy, AfterViewInit,
  NgZone, HostListener, ViewChild, ElementRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import * as THREE from 'three';
import { AgentService, AgentSettings, DEFAULT_SETTINGS } from './agent.service';
import { environment } from 'src/environments/environment';
import { PortfolioSettingsService } from '../core/portfolio-settings.service';

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
export class AgentComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('koriCanvas') private canvasRef!: ElementRef<HTMLCanvasElement>;

  posX = 24;
  posY = 80;
  facingRight = true;

  isChatOpen        = false;
  isSettingsOpen    = false;
  isThinking        = false;
  isStreaming       = false;
  isRunning         = false;
  isListening       = false;
  isShowingFact     = false;
  showModelPrompt   = false;
  modelPromptMsg    = '';
  tfStatus        = '';
  bubbleText      = '';
  inputMessage    = '';
  generatedImageUrl = '';
  settings: AgentSettings = { ...DEFAULT_SETTINGS };

  // Three.js scene
  private renderer!: THREE.WebGLRenderer;
  private scene!:    THREE.Scene;
  private camera!:   THREE.OrthographicCamera;
  private animId    = 0;

  // Kori 3D groups
  private koriRoot!:       THREE.Group;
  private tailGroup!:      THREE.Group;
  private headGroup!:      THREE.Group;
  private earLGroup!:      THREE.Group;
  private earRGroup!:      THREE.Group;
  private irisLGroup!:     THREE.Group;
  private irisRGroup!:     THREE.Group;
  private blinkLMesh!:     THREE.Mesh;
  private blinkRMesh!:     THREE.Mesh;
  private armLGroup!:      THREE.Group;
  private armRGroup!:      THREE.Group;
  private bodyGroup!:      THREE.Group;
  private eyeLMesh!:       THREE.Mesh;   // canvas iris plane
  private eyeRMesh!:       THREE.Mesh;
  private mouthMesh!:      THREE.Mesh;
  private whiskerLGroup!:  THREE.Group;
  private whiskerRGroup!:  THREE.Group;

  // Animation state
  private currentAnim  = '';
  private animStart    = 0;
  private mouseWorld   = { x: 0, y: 0 };
  private floatT       = 0;

  // Ear spring physics
  private earLRot = 0.28;
  private earRRot = -0.28;
  private earLVel = 0;
  private earRVel = 0;

  // Squash & stretch
  private squashY    = 1;
  private squashVel  = 0;

  // Expression
  private currentExpr = '';

  private facts: string[] = [];
  private lastFactIndex   = -1;

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

  // ── Thought bubble ────────────────────────────────────────────────────────
  thoughtBubbleVisible = false;
  thoughtBubbleImage   = '';
  private readonly thoughtImages = [
    'assets/template/me_code.png',
    'assets/template/me_cyber.png',
    'assets/template/me_cyber_2.png',
    'assets/template/me_tricycle.png',
  ];

  private wanderTimer?:        ReturnType<typeof setTimeout>;
  private dismissTimer?:       ReturnType<typeof setTimeout>;
  private runTimer?:           ReturnType<typeof setTimeout>;
  private idleAnimTimer?:      ReturnType<typeof setTimeout>;
  private factTimer?:          ReturnType<typeof setTimeout>;
  private modelPromptTimer?:   ReturnType<typeof setTimeout>;
  private recordingTimer?:     ReturnType<typeof setTimeout>;
  private thoughtBubbleTimer?: ReturnType<typeof setTimeout>;
  private tfSub: any;
  private mediaRecorder?: MediaRecorder;
  private audioChunks: Blob[] = [];

  private readonly idleAnims = ['lick', 'purr', 'ear-twitch', 'swipe', 'bop', 'stretch', 'tail-chase', 'wave', 'draw', 'think'] as const;

  private readonly idlePhrases = [
    "Hey there! Ask me anything about Emmanuel 😸",
    "Psst, I know all about his projects! 🐱",
    "Curious about his AI work? Just ask! 🤖",
    "Click me to chat — I don't bite! 🐾",
    "I've read all his articles! Ask away ✨",
    "Want to know Emmanuel's tech stack? Ask! 🔮",
    "I run entirely in your browser! 🧠",
    "No cloud, no cookies — just vibes 🐾",
    "Try asking about his Elixir / Phoenix work! ⚗️",
    "Healthcare, AI compliance, Go — ask anything 😺",
    "Hiring? Try the contact form, I'll relay it 📬",
    "Ask me about his MTRH hospital ERP work 🏥",
    "Selstan, Value Chain Factory, Dunia Tech… ask! 💼"
  ];

  /**
   * Suggested first-message prompts shown beneath the greeting bubble. Tap a
   * chip and it auto-sends. Curated to surface the most interview-relevant
   * facets first — these get the conversation flowing in 1 click instead of
   * staring at a blank input.
   */
  readonly suggestedQuestions: string[] = [
    'What does Emmanuel do?',
    'Tell me about his AI compliance work',
    'What stack does he use?',
    'Where is he based?',
    'Is he available for hire?',
    'Show me his healthcare projects',
  ];

  private koriGreeting = '';
  private settingsSub!: Subscription;

  constructor(
    private agentService: AgentService,
    private zone: NgZone,
    private portfolioSettings: PortfolioSettingsService,
    private sanitizer: DomSanitizer,
  ) {}

  /**
   * Tiny markdown → HTML renderer for Kori's replies. Covers the small set we
   * actually want her to use: `**bold**`, `*italic*`, `[label](url)` links,
   * `` `code` `` spans, and `\n\n` paragraph breaks. Bypassing the sanitizer
   * is safe here because the input is always Kori's own model output passed
   * through escape-and-rewrite — not user-typed content.
   */
  renderKori(text: string): SafeHtml {
    if (!text) return '';
    // 1. Escape every HTML char first so model output can't smuggle tags.
    let s = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    // 2. Inline rewrites — code, bold, italic, links.
    s = s.replace(/`([^`]+?)`/g, '<code>$1</code>');
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[\s(])_(?!_)(.+?)_(?=[\s).,!?]|$)/g, '$1<em>$2</em>');
    s = s.replace(
      /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
    // 3. Paragraph breaks for double-newline; single-newlines stay as <br>.
    s = s.replace(/\n\n+/g, '</p><p>').replace(/\n/g, '<br>');
    return this.sanitizer.bypassSecurityTrustHtml(`<p>${s}</p>`);
  }

  ngOnInit(): void {
    this.settings = this.agentService.getSettings();
    this.agentService.loadContext(environment.baseUrl);
    this.settingsSub = this.portfolioSettings.settings$.subscribe(s => {
      this.koriGreeting = s.koriGreeting;
    });

    this.posX = Math.max(16, Math.min((window.innerWidth || 800) - 120, 80));
    this.posY = 80;

    this.tfSub = this.agentService.tfStatus$.subscribe(status => {
      this.zone.run(() => {
        this.tfStatus = status;
        this.handleTfStatus(status);
      });
    });

    fetch(`${environment.baseUrl}/assets/kori-facts.json`)
      .then(r => r.json())
      .then((facts: string[]) => { this.facts = facts; });

    // Detect hardware then either prompt for model download (transformers) or just greet
    this.agentService.detectHardware().then(hw => {
      this.zone.run(() => {
        if (this.settings.provider === 'transformers') {
          setTimeout(() => this.showModelConfirm(hw), 1600);
        }
      });
    });

    this.scheduleWander();
    this.scheduleIdleAnim();
    this.scheduleFactBubble();
    this.scheduleThoughtBubble();
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => this.initThree());
  }

  private initThree(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr    = Math.min(window.devicePixelRatio || 1, 2);
    const W = 90, H = 128;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setSize(W, H, false);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setClearColor(0x000000, 0);

    const aspect = W / H;
    const vH = 4.2;
    const vW = vH * aspect;
    this.camera = new THREE.OrthographicCamera(-vW / 2, vW / 2, vH / 2, -vH / 2, 0.1, 100);
    this.camera.position.set(0, 0, 10);

    this.scene = new THREE.Scene();
    // 3-point lighting for depth and warmth
    const keyLight = new THREE.DirectionalLight(0xfff5e0, 1.9);
    keyLight.position.set(-2, 5, 6);
    this.scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xd0e8ff, 0.55);
    fillLight.position.set(4, 1, 4);
    this.scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xffcc88, 0.75);
    rimLight.position.set(0, -3, -6);
    this.scene.add(rimLight);
    this.scene.add(new THREE.AmbientLight(0xffeedd, 0.32));

    this.buildKori();
    this.scene.add(this.koriRoot);
    this.animate();
  }

  // ── Texture generators ────────────────────────────────────────────────────────

  private makeFurTexture(): THREE.CanvasTexture {
    const size = 256;
    const can  = document.createElement('canvas');
    can.width  = can.height = size;
    const ctx  = can.getContext('2d')!;

    // ── Pixel-level mackerel tabby pattern ────────────────────────────────
    // Multi-frequency sine fields approximate Perlin noise → organic curved
    // stripes that look like a real ginger cat's markings when UV-wrapped
    const img = ctx.createImageData(size, size);
    const d   = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const idx = (y * size + x) * 4;
        let r = 244, g = 147, b = 74;   // base #F4934A

        // Overlapping sine waves at different scales/angles create organic
        // tabby markings without repeating any single obvious direction
        const n =
          Math.sin(x * 0.10  + y * 0.013) * 0.30 +  // primary stripe axis
          Math.sin(x * 0.052 - y * 0.068) * 0.22 +  // slow sinuous curve
          Math.sin(x * 0.195 + y * 0.044) * 0.14 +  // thin ticking detail
          Math.sin(y * 0.062 + x * 0.026) * 0.13 +  // cross-body break
          Math.sin(x * 0.285 - y * 0.145) * 0.11 +  // fine grain
          Math.sin(x * 0.042 + y * 0.110) * 0.10;   // large swirl

        if (n > 0.26) {
          const t = Math.min((n - 0.26) * 3.0, 1.0);
          // Blend toward deep rust-brown — darker than Garfield cartoon orange
          r = Math.round(r + (138 - r) * t * 0.78);
          g = Math.round(g + (46  - g) * t * 0.78);
          b = Math.round(b + (4   - b) * t * 0.78);
        }

        // Subtle lighter highlight between stripes (guard hairs catch light)
        if (n < -0.38) {
          const h = Math.min((-n - 0.38) * 2.5, 1.0);
          r = Math.round(r + (255 - r) * h * 0.12);
          g = Math.round(g + (180 - g) * h * 0.12);
        }

        d[idx]   = r;
        d[idx+1] = g;
        d[idx+2] = b;
        d[idx+3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);

    // ── Individual fur stroke detail on top ───────────────────────────────
    for (let i = 0; i < 340; i++) {
      const x  = Math.random() * size;
      const y  = Math.random() * size;
      const a  = (Math.random() - 0.5) * 1.4;
      const l  = 4 + Math.random() * 14;
      const op = 0.04 + Math.random() * 0.11;
      const rv = Math.random() > 0.5 ? 175 + (Math.random() * 40 | 0) : 215 + (Math.random() * 30 | 0);
      const gv = 60 + (Math.random() * 36 | 0);
      ctx.strokeStyle = `rgba(${rv},${gv},18,${op})`;
      ctx.lineWidth   = 0.6 + Math.random() * 1.4;
      ctx.lineCap     = 'round';
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(can);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(2, 2);
    return tex;
  }

  private makeIrisTexture(expr: 'neutral' | 'happy' | 'think' | 'surprised' | 'heart'): THREE.CanvasTexture {
    const size = 256;
    const can  = document.createElement('canvas');
    can.width  = can.height = size;
    const ctx  = can.getContext('2d')!;
    const cx   = size / 2, cy = size / 2;
    ctx.clearRect(0, 0, size, size);

    if (expr === 'happy') {
      // Cute upward arch filling whole circle area ( ^‿^ )
      ctx.fillStyle = '#7EC8A0';
      ctx.beginPath();
      ctx.arc(cx, cy, 118, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1a1020';
      ctx.beginPath();
      ctx.arc(cx, cy + 52, 102, Math.PI + 0.15, -0.15);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.78)';
      ctx.beginPath();
      ctx.ellipse(cx - 24, cy + 22, 17, 14, -0.4, 0, Math.PI * 2);
      ctx.fill();
      return new THREE.CanvasTexture(can);
    }

    // Iris gradient fills whole circle (CircleGeometry clips to circle shape)
    const irisH = expr === 'think' ? 118 : expr === 'surprised' ? 128 : 120;
    const ig = ctx.createRadialGradient(cx, cy - 18, 8, cx, cy, 118);
    ig.addColorStop(0,   '#c6f0d8');
    ig.addColorStop(0.3, '#7EC8A0');
    ig.addColorStop(0.7, '#4a9a70');
    ig.addColorStop(1,   '#1e5c3c');
    ctx.fillStyle = ig;
    ctx.beginPath();
    ctx.arc(cx, cy, 118, 0, Math.PI * 2);
    ctx.fill();

    // Limbal ring
    ctx.strokeStyle = '#143d28';
    ctx.lineWidth = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, 116, 0, Math.PI * 2);
    ctx.stroke();

    // Iris fibre lines
    ctx.save();
    ctx.globalAlpha = 0.20;
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * Math.PI * 2;
      ctx.strokeStyle = '#205840';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * 28, cy + Math.sin(a) * 28);
      ctx.lineTo(cx + Math.cos(a) * 112, cy + Math.sin(a) * 112);
      ctx.stroke();
    }
    ctx.restore();

    // Pupil
    if (expr === 'heart') {
      const hs = 58;
      ctx.fillStyle = '#e0304a';
      ctx.beginPath();
      ctx.moveTo(cx, cy + hs * 0.46);
      ctx.bezierCurveTo(cx + hs, cy - hs * 0.06, cx + hs * 0.55, cy - hs * 0.72, cx, cy - hs * 0.08);
      ctx.bezierCurveTo(cx - hs * 0.55, cy - hs * 0.72, cx - hs, cy - hs * 0.06, cx, cy + hs * 0.46);
      ctx.fill();
    } else {
      ctx.fillStyle = '#080818';
      const pw = expr === 'surprised' ? 64 : expr === 'think' ? 26 : 36;
      const ph = expr === 'think'     ? 60 : 90;
      ctx.beginPath();
      ctx.ellipse(cx, cy, pw, ph, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Catchlights — large primary + small secondary
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.ellipse(cx + 32, cy - 34, 22, 20, -0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.beginPath();
    ctx.ellipse(cx + 52, cy - 10, 10, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // Upper eyelash shadow arc
    ctx.strokeStyle = 'rgba(18,8,2,0.35)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.ellipse(cx, cy - irisH + 14, 116, 26, 0, Math.PI, 0);
    ctx.stroke();

    return new THREE.CanvasTexture(can);
  }

  private setExpression(expr: 'neutral' | 'happy' | 'think' | 'surprised' | 'heart'): void {
    if (this.currentExpr === expr) return;
    this.currentExpr = expr;
    const tex = this.makeIrisTexture(expr);
    for (const m of [this.eyeLMesh, this.eyeRMesh]) {
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.map?.dispose();
      mat.map = tex;
      mat.depthTest = false;
      mat.needsUpdate = true;
    }
  }

  // ── Build Kori ────────────────────────────────────────────────────────────────

  private buildKori(): void {
    const FUR   = 0xF4934A;
    const BELLY = 0xFDDCB5;
    const PINK  = 0xFFB3C6;
    const WHITE = 0xffffff;

    const furTex = this.makeFurTexture();
    const furM   = new THREE.MeshStandardMaterial({ color: FUR,   map: furTex, roughness: 0.86, metalness: 0 });
    const bellyM = new THREE.MeshStandardMaterial({ color: BELLY, roughness: 0.90, metalness: 0 });
    const pinkM  = new THREE.MeshStandardMaterial({ color: PINK,  roughness: 0.88, metalness: 0 });
    const whiteM = new THREE.MeshStandardMaterial({ color: WHITE, roughness: 0.18, metalness: 0.02 });
    const noseM  = new THREE.MeshStandardMaterial({ color: 0xFF8FAB, roughness: 0.62, metalness: 0 });
    const toeM   = new THREE.MeshStandardMaterial({ color: 0xC05C1A, roughness: 0.90 });
    const clawM  = new THREE.MeshStandardMaterial({ color: 0xF0E0C0, roughness: 0.28, metalness: 0.06 });
    const blinkM = new THREE.MeshStandardMaterial({ color: FUR });

    this.koriRoot = new THREE.Group();

    // ── TAIL — pivot at body surface, z=0.5 keeps it in front ─────────────────
    this.tailGroup = new THREE.Group();
    this.tailGroup.position.set(0.60, -1.28, 0);
    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0,      0,    0.02),  // base — flush with body side
      new THREE.Vector3(0.40,   0.52, 0.14),  // sweeps out gradually
      new THREE.Vector3(0.32,   1.14, 0.30),  // curls inward, now visible
      new THREE.Vector3(-0.14,  1.58, 0.38),  // tip — comfortably in front
    ]);
    const tailTipPos = tailCurve.getPoint(1);
    const tailTip    = new THREE.Mesh(new THREE.SphereGeometry(0.30, 14, 10), furM);
    tailTip.position.copy(tailTipPos);
    tailTip.scale.set(1.15, 1.0, 1.15);
    this.tailGroup.add(
      new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 24, 0.18, 10, false), furM),
      tailTip
    );
    this.koriRoot.add(this.tailGroup);

    // ── BODY ──────────────────────────────────────────────────────────────────
    this.bodyGroup = new THREE.Group();
    const bodyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.84, 24, 18), furM);
    bodyMesh.scale.set(1, 0.70, 0.88);
    bodyMesh.position.set(0, -1.10, 0);
    const bellyMesh = new THREE.Mesh(new THREE.SphereGeometry(0.54, 18, 14), bellyM);
    bellyMesh.scale.set(1, 0.68, 0.54);
    bellyMesh.position.set(0, -1.02, 0.32);
    this.bodyGroup.add(bodyMesh, bellyMesh);

    // ── FRONT PAWS with toe marks ──────────────────────────────────────────────
    for (const [px, sign] of [[-0.44, -1], [0.44, 1]] as [number, number][]) {
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 8), furM);
      paw.scale.set(1.5, 0.68, 1.1);
      paw.position.set(px, -1.68, 0.34);
      for (let i = -1; i <= 1; i++) {
        const toe = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.014, 0.045, 4), toeM);
        toe.position.set(i * 0.11, 0.05, 0.13);
        toe.rotation.x = -0.42;
        // Claw — sharp cream cone extending from each toe tip
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.013, 0.064, 5), clawM);
        claw.position.set(0, 0.054, 0);
        claw.rotation.x = 0.22;  // curve forward/downward
        toe.add(claw);
        paw.add(toe);
      }
      this.bodyGroup.add(paw);
    }

    // ── ARMS ──────────────────────────────────────────────────────────────────
    const armGeo = new THREE.CapsuleGeometry(0.135, 0.50, 8, 8);
    for (const [px, ref] of [[-0.72, 'L'], [0.72, 'R']] as [number, string][]) {
      const g    = new THREE.Group();
      g.position.set(px, -0.82, 0);
      const arm  = new THREE.Mesh(armGeo, furM);
      arm.position.set(0, -0.30, 0);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), furM);
      hand.scale.set(1.2, 0.82, 1);
      hand.position.set(0, -0.60, 0);
      g.add(arm, hand);
      this.bodyGroup.add(g);
      if (ref === 'L') this.armLGroup = g; else this.armRGroup = g;
    }
    this.koriRoot.add(this.bodyGroup);

    // ── HEAD (chibi: bigger than body) ────────────────────────────────────────
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.18, 0);
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(1.0, 28, 20), furM);
    this.headGroup.add(headMesh);

    // ── EARS ──────────────────────────────────────────────────────────────────
    const earGeo  = new THREE.ConeGeometry(0.35, 0.62, 4);
    const earIGeo = new THREE.ConeGeometry(0.24, 0.44, 4);
    for (const [ex, rz, ref] of [[-0.64, 0.28, 'L'], [0.64, -0.28, 'R']] as [number, number, string][]) {
      const g    = new THREE.Group();
      g.position.set(ex, 0.82, 0);
      g.rotation.z = rz;
      const outer = new THREE.Mesh(earGeo,  furM);
      const inner = new THREE.Mesh(earIGeo, pinkM);
      inner.position.set(0, 0.04, 0.10);
      g.add(outer, inner);
      this.headGroup.add(g);
      if (ref === 'L') { this.earLGroup = g; this.earLRot = rz; }
      else             { this.earRGroup = g; this.earRRot = rz; }
    }

    // ── CHEEK BLUSH — soft circles ─────────────────────────────────────────────
    const blushGeo = new THREE.CircleGeometry(0.30, 18);
    const blushM2  = new THREE.MeshBasicMaterial({ color: PINK, transparent: true, opacity: 0.50, depthWrite: false });
    for (const [bx] of [[-0.72], [0.72]] as [number][]) {
      const b = new THREE.Mesh(blushGeo, blushM2);
      b.position.set(bx, -0.22, 0.82);
      this.headGroup.add(b);
    }

    // ── EYE WHITES — large friendly sclera ───────────────────────────────────
    const eyeWGeo = new THREE.SphereGeometry(0.32, 16, 14);
    const eyeWL = new THREE.Mesh(eyeWGeo, whiteM);
    const eyeWR = new THREE.Mesh(eyeWGeo, whiteM);
    eyeWL.scale.set(1, 1.22, 0.64);
    eyeWR.scale.set(1, 1.22, 0.64);
    eyeWL.position.set(-0.38, 0.08, 0.82);
    eyeWR.position.set( 0.38, 0.08, 0.82);
    eyeWL.renderOrder = 0;
    eyeWR.renderOrder = 0;
    this.headGroup.add(eyeWL, eyeWR);

    // ── IRIS + PUPIL — CircleGeometry with canvas map, tracks mouse ──────────
    // irisLGroup / irisRGroup are the tracking pivots that move with the cursor
    this.irisLGroup = new THREE.Group();
    this.irisRGroup = new THREE.Group();
    this.irisLGroup.position.set(-0.38, 0.08, 0.86);
    this.irisRGroup.position.set( 0.38, 0.08, 0.86);

    const neutralTx    = this.makeIrisTexture('neutral');
    const irisCircGeo  = new THREE.CircleGeometry(0.26, 32);
    // eyeLMesh / eyeRMesh are the canvas circles — referenced for texture swaps
    this.eyeLMesh = new THREE.Mesh(irisCircGeo,
      new THREE.MeshBasicMaterial({ map: neutralTx, depthWrite: false, depthTest: false }));
    this.eyeRMesh = new THREE.Mesh(irisCircGeo,
      new THREE.MeshBasicMaterial({ map: neutralTx, depthWrite: false, depthTest: false }));
    this.eyeLMesh.renderOrder = 2;
    this.eyeRMesh.renderOrder = 2;
    // Scale Y to match the elliptical eye-white shape
    this.eyeLMesh.scale.set(1, 1.22, 1);
    this.eyeRMesh.scale.set(1, 1.22, 1);
    this.irisLGroup.add(this.eyeLMesh);
    this.irisRGroup.add(this.eyeRMesh);
    this.headGroup.add(this.irisLGroup, this.irisRGroup);

    // ── BLINK OVERLAYS — CircleGeometry + opacity (no scale trick = no depth bugs)
    const blinkCircGeo = new THREE.CircleGeometry(0.34, 28);
    const blinkMatL = new THREE.MeshBasicMaterial({ color: 0xF4934A, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    const blinkMatR = new THREE.MeshBasicMaterial({ color: 0xF4934A, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
    this.blinkLMesh = new THREE.Mesh(blinkCircGeo, blinkMatL);
    this.blinkRMesh = new THREE.Mesh(blinkCircGeo, blinkMatR);
    this.blinkLMesh.scale.set(1, 1.22, 1);
    this.blinkRMesh.scale.set(1, 1.22, 1);
    this.blinkLMesh.position.set(-0.38, 0.08, 0.87);
    this.blinkRMesh.position.set( 0.38, 0.08, 0.87);
    this.blinkLMesh.renderOrder = 10;
    this.blinkRMesh.renderOrder = 10;
    this.headGroup.add(this.blinkLMesh, this.blinkRMesh);

    // ── NOSE ──────────────────────────────────────────────────────────────────
    const noseMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), noseM);
    noseMesh.scale.set(1.55, 0.72, 0.72);
    noseMesh.position.set(0, -0.30, 0.96);
    this.headGroup.add(noseMesh);

    // ── MOUTH — QuadraticBezier smile tube ───────────────────────────────────
    const smileCurve = new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(-0.20, -0.44, 0.94),
      new THREE.Vector3( 0,    -0.58, 0.97),
      new THREE.Vector3( 0.20, -0.44, 0.94),
    );
    this.mouthMesh = new THREE.Mesh(
      new THREE.TubeGeometry(smileCurve, 12, 0.028, 6, false),
      new THREE.MeshStandardMaterial({ color: 0xFF8FAB, roughness: 0.65 })
    );
    this.headGroup.add(this.mouthMesh);

    // ── WHISKERS — thin tubes for visibility ─────────────────────────────────
    this.whiskerLGroup = new THREE.Group();
    this.whiskerRGroup = new THREE.Group();
    const wMat  = new THREE.MeshStandardMaterial({ color: 0xD06020, roughness: 0.9, transparent: true, opacity: 0.58 });
    const wDefs: [number, number][] = [[0.06, 0.04], [-0.10, 0.01], [-0.26, -0.05]];
    for (const [dy, dz] of wDefs) {
      const lc = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(-0.92, dy, dz));
      const rc = new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3( 0.92, dy, dz));
      this.whiskerLGroup.add(new THREE.Mesh(new THREE.TubeGeometry(lc, 2, 0.017, 4, false), wMat));
      this.whiskerRGroup.add(new THREE.Mesh(new THREE.TubeGeometry(rc, 2, 0.017, 4, false), wMat));
    }
    this.whiskerLGroup.position.set(-0.22, -0.30, 0.90);
    this.whiskerRGroup.position.set( 0.22, -0.30, 0.90);
    this.headGroup.add(this.whiskerLGroup, this.whiskerRGroup);

    this.koriRoot.add(this.headGroup);
    this.koriRoot.position.set(0, 0.08, 0);
  }

  private animate(): void {
    this.animId = requestAnimationFrame(() => this.animate());
    const t = performance.now() * 0.001;

    // ── Float with squash/stretch ────────────────────────────────────────────
    const floatSin = Math.sin(t * 2.24);
    const floatVel = Math.cos(t * 2.24) * 2.24;
    // stretch up on rise, squash on descent
    const floatStretch = 1 + floatVel * 0.018;
    this.koriRoot.position.y = 0.08 + floatSin * 0.09;
    this.koriRoot.scale.y = floatStretch * this.squashY;
    this.koriRoot.scale.z = 1;

    // ── Tail sway + whisker breathe ───────────────────────────────────────────
    this.tailGroup.rotation.z = Math.sin(t * 2.55) * 0.16;
    const wSway = Math.sin(t * 1.7) * 0.035;
    this.whiskerLGroup.rotation.y =  wSway;
    this.whiskerRGroup.rotation.y = -wSway;

    // ── Ear spring physics ────────────────────────────────────────────────────
    const stiff = 0.20, damp = 0.66;
    const earLTarget = this.isRunning ? 0.48 : this.isThinking ? 0.18 : 0.28;
    const earRTarget = this.isRunning ? -0.48 : this.isThinking ? -0.18 : -0.28;
    this.earLVel = (this.earLVel + (earLTarget - this.earLRot) * stiff) * damp;
    this.earRVel = (this.earRVel + (earRTarget - this.earRRot) * stiff) * damp;
    this.earLRot += this.earLVel;
    this.earRRot += this.earRVel;
    this.earLGroup.rotation.z = this.earLRot;
    this.earRGroup.rotation.z = this.earRRot;

    // ── Run bob ───────────────────────────────────────────────────────────────
    if (this.isRunning) {
      this.koriRoot.rotation.z  = Math.sin(t * 15) * 0.06;
      this.armLGroup.rotation.x = Math.sin(t * 15) *  0.58;
      this.armRGroup.rotation.x = Math.sin(t * 15) * -0.58;
    } else {
      this.koriRoot.rotation.z = 0;
      if (!this.currentAnim) {
        this.armLGroup.rotation.x = 0;
        this.armRGroup.rotation.x = 0;
      }
    }

    // ── Facing ────────────────────────────────────────────────────────────────
    this.koriRoot.scale.x = this.facingRight ? 1 : -1;

    // ── Eye tracking ─────────────────────────────────────────────────────────
    const mx = this.mouseWorld.x * 0.06;
    const my = this.mouseWorld.y * 0.06;
    this.irisLGroup.position.x = THREE.MathUtils.lerp(this.irisLGroup.position.x, -0.38 + mx, 0.10);
    this.irisLGroup.position.y = THREE.MathUtils.lerp(this.irisLGroup.position.y,  0.08 + my, 0.10);
    this.irisRGroup.position.x = THREE.MathUtils.lerp(this.irisRGroup.position.x,  0.38 + mx, 0.10);
    this.irisRGroup.position.y = THREE.MathUtils.lerp(this.irisRGroup.position.y,  0.08 + my, 0.10);

    // ── Auto blink ~every 5s, 120ms shut — opacity on CircleGeometry overlay ──
    const blinkPhase = (t % 5.4) / 5.4;
    const blinkOpen  = blinkPhase < 0.96 ? 0 : Math.sin((blinkPhase - 0.96) / 0.04 * Math.PI);
    const thinkLid   = this.currentExpr === 'think' ? 0.52 : 0;
    const bOpacity   = Math.min(1, blinkOpen + thinkLid);
    (this.blinkLMesh.material as THREE.MeshBasicMaterial).opacity = bOpacity;
    (this.blinkRMesh.material as THREE.MeshBasicMaterial).opacity = bOpacity;

    // ── Expression triggers ───────────────────────────────────────────────────
    if (this.isThinking || this.currentAnim === 'think') {
      this.setExpression('think');
    } else if (this.isStreaming || this.currentAnim === 'speak') {
      this.setExpression('happy');
    } else if (this.currentAnim === 'lick' || this.currentAnim === 'purr' || this.currentAnim === 'wave') {
      this.setExpression('happy');
    } else if (!this.currentAnim) {
      this.setExpression('neutral');
    }

    this.playAnim(t);
    this.renderer.render(this.scene, this.camera);
  }

  private playAnim(t: number): void {
    if (!this.currentAnim) return;
    const elapsed = t - this.animStart;

    switch (this.currentAnim) {
      case 'thinking': {
        // gentle tail lash + rapid eye flicker handled in animate() via thinkLid
        this.tailGroup.rotation.z = Math.sin(t * 5.8) * 0.30;
        break;
      }
      case 'lick': {
        const s = Math.sin(Math.min(elapsed * 3.6, Math.PI));
        this.armLGroup.rotation.x = s * 2.1;
        // squash on face-reach
        this.squashY = 1 - s * 0.06;
        if (elapsed > 2.4) this.clearAnim();
        break;
      }
      case 'point': {
        const s = elapsed < 0.32 ? elapsed / 0.32 : (elapsed > 2.7 ? Math.max(0, 1 - (elapsed - 2.7) / 0.3) : 1);
        this.armRGroup.rotation.x = -s * 2.2;
        if (elapsed > 3.0) this.clearAnim();
        break;
      }
      case 'wave': {
        const raise = Math.min(elapsed / 0.36, 1);
        const wave  = elapsed > 0.36 ? Math.sin((elapsed - 0.36) * 22) * 0.30 : 0;
        this.armRGroup.rotation.x = -(raise * 2.06 + wave);
        // lean slightly toward raised arm
        this.koriRoot.rotation.z = raise * 0.06;
        if (elapsed > 2.1) this.clearAnim();
        break;
      }
      case 'bop': {
        const env = Math.max(0, 1 - elapsed / 2.0);
        this.headGroup.rotation.z = Math.sin(elapsed * 3.2) * 0.24 * env;
        this.headGroup.rotation.y = Math.sin(elapsed * 1.6) * 0.12 * env;
        if (elapsed > 2.0) this.clearAnim();
        break;
      }
      case 'purr': {
        const v = Math.sin(elapsed * 44) * 0.024;
        this.koriRoot.position.x = v;
        // micro squash on vibration
        this.squashY = 1 - Math.abs(v) * 0.4;
        if (elapsed > 3.0) { this.koriRoot.position.x = 0; this.clearAnim(); }
        break;
      }
      case 'ear-twitch': {
        const tw = Math.sin(elapsed * 30) * Math.max(0, 1 - elapsed / 1.2);
        this.earRRot = -0.28 + tw * 0.45;
        this.earRGroup.rotation.z = this.earRRot;
        if (elapsed > 1.2) { this.earRRot = -0.28; this.clearAnim(); }
        break;
      }
      case 'swipe': {
        const sw = Math.sin(Math.min(elapsed * 5.8, Math.PI * 2)) * 1.35;
        this.armLGroup.rotation.x = sw;
        this.armLGroup.rotation.z = sw * 0.45;
        // lean forward on swipe
        this.koriRoot.rotation.z = sw * -0.04;
        if (elapsed > 1.1) { this.armLGroup.rotation.z = 0; this.clearAnim(); }
        break;
      }
      case 'stretch': {
        const s = Math.sin(Math.min(elapsed / 2.2, 1) * Math.PI);
        this.squashY = 1 + s * 0.14;
        if (elapsed > 2.2) this.clearAnim();
        break;
      }
      case 'tail-chase': {
        this.koriRoot.rotation.y = Math.sin(elapsed * 6.8) * 0.38;
        this.koriRoot.rotation.z = Math.sin(elapsed * 6.8 + 1) * 0.06;
        if (elapsed > 1.9) { this.koriRoot.rotation.y = 0; this.clearAnim(); }
        break;
      }
      case 'draw': {
        const stroke = Math.sin(elapsed * 11.5) * 0.95 + 0.20;
        this.armLGroup.rotation.x = stroke;
        this.armLGroup.rotation.z = Math.sin(elapsed * 11.5 + 1) * 0.32;
        // tilt head while drawing
        this.headGroup.rotation.z = Math.sin(elapsed * 0.8) * 0.10;
        if (elapsed > 2.8) { this.armLGroup.rotation.z = 0; this.headGroup.rotation.z = 0; this.clearAnim(); }
        break;
      }
      case 'think': {
        const rise = Math.min(elapsed / 0.55, 1);
        // Chin-rest pose — arm raised, head tilted, gentle sway
        this.armRGroup.rotation.x = -rise * 1.62;
        this.headGroup.rotation.z =  rise * 0.12 + Math.sin(elapsed * 1.8) * 0.018;
        // Hold pose while waiting for AI response; clear only when done thinking
        if (elapsed > 3.2 && !this.isThinking) this.clearAnim();
        break;
      }
      case 'speak': {
        // Subtle head bob while tokens are streaming in
        this.headGroup.rotation.z = Math.sin(elapsed * 9.0) * 0.032;
        this.headGroup.rotation.x = Math.sin(elapsed * 7.5 + 1.0) * 0.016;
        this.koriRoot.rotation.z  = Math.sin(elapsed * 4.5) * 0.018;
        if (!this.isStreaming && elapsed > 0.3) {
          this.headGroup.rotation.set(0, 0, 0);
          this.koriRoot.rotation.z = 0;
          this.clearAnim();
        }
        break;
      }
    }
  }

  private clearAnim(): void {
    this.currentAnim = '';
    this.squashY     = 1;
    this.armLGroup.rotation.set(0, 0, 0);
    this.armRGroup.rotation.set(0, 0, 0);
    this.headGroup.rotation.set(0, 0, 0);
    this.koriRoot.rotation.set(0, 0, 0);
    this.earRRot = -0.28;
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animId);
    this.renderer?.dispose();
    clearTimeout(this.wanderTimer as any);
    clearTimeout(this.dismissTimer as any);
    clearTimeout(this.runTimer as any);
    clearTimeout(this.idleAnimTimer as any);
    clearTimeout(this.factTimer as any);
    clearTimeout(this.modelPromptTimer as any);
    clearTimeout(this.recordingTimer as any);
    clearTimeout(this.thoughtBubbleTimer as any);
    this.tfSub?.unsubscribe();
    this.settingsSub?.unsubscribe();
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
    this.downloadLabel     = isChat ? 'Loading my model first, I need it to understand you' : 'Loading Whisper, psst i need it to listen to you';

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
    if (this.isDragging) { this.applyDrag(e.clientX, e.clientY); return; }
    this.trackEyes(e.clientX, e.clientY);
  }

  private trackEyes(mx: number, my: number): void {
    const headX = this.posX + 45;
    const headY = window.innerHeight - this.posY - 60;
    const dx    = mx - headX;
    const dy    = my - headY;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    const factor = Math.min(dist, 260) / 260;
    const nx = dist > 8 ? dx / dist : 0;
    const ny = dist > 8 ? dy / dist : 0;
    this.mouseWorld.x = (nx * factor * 2) * (this.facingRight ? 1 : -1);
    this.mouseWorld.y = -(ny * factor * 1.5);
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
    const willMove = Math.abs(newX - this.posX) > 8 || Math.abs(newY - this.posY) > 8;

    this.facingRight  = newX >= this.posX;
    this.posX         = newX;
    this.posY         = newY;
    this.currentAnim  = '';

    if (willMove) {
      this.isRunning = true;
      clearTimeout(this.runTimer as any);
      // fallback: stop run if transitionend never fires
      this.runTimer = setTimeout(() => { this.isRunning = false; }, 3400);
    }

    if (Math.random() < 0.65 && !this.bubbleText) {
      const p = this.idlePhrases[Math.floor(Math.random() * this.idlePhrases.length)];
      setTimeout(() => { if (!this.isChatOpen) this.showIdle(p, 4500); }, 900);
    }
  }

  @HostListener('transitionend', ['$event'])
  onTransitionEnd(e: TransitionEvent): void {
    if (this.isRunning && (e.propertyName === 'left' || e.propertyName === 'bottom')) {
      this.isRunning = false;
      clearTimeout(this.runTimer as any);
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
    this.currentAnim = anim;
    this.animStart   = performance.now() * 0.001;
  }

  // ── Model download prompt ─────────────────────────────────────────────────────
  private showModelConfirm(hw: 'webgpu' | 'cpu'): void {
    const greeting = this.koriGreeting ||
      "Hi! I'm Kori 🐾 — Emmanuel's AI assistant cat. I live right here in his portfolio, nice to meet you!";
    this.showIdle(greeting, 4200);

    setTimeout(() => {
      this.modelPromptMsg = hw === 'webgpu'
        ? "Oh! I can feel WebGPU sparking inside me ⚡ To really think for myself I need to fetch my little brain first (~270MB). Shall I?"
        : "Hmm, no GPU today... I can still think right here in your browser, but I need to fetch my brain first (~270MB). Want me to? 🧠";
      this.showModelPrompt = true;
      clearTimeout(this.modelPromptTimer as any);
      this.modelPromptTimer = setTimeout(() => {
        this.zone.run(() => {
          this.showModelPrompt = false;
          if (this.facts.length) this.showFact();
        });
      }, 15000);
    }, 4800);
  }

  private dismissModelPrompt(): void {
    clearTimeout(this.modelPromptTimer as any);
    this.showModelPrompt = false;
  }

  onProceedDownload(e: Event): void {
    e.stopPropagation();
    this.dismissModelPrompt();
    const model = this.settings.tfModel || DEFAULT_SETTINGS.tfModel;
    this.agentService.preload(model);
  }

  // ── Fact bubble ───────────────────────────────────────────────────────────────
  private scheduleFactBubble(): void {
    const delay = 4500 + Math.random() * 1500;
    this.zone.runOutsideAngular(() => {
      this.factTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isChatOpen && !this.isSettingsOpen && !this.isThinking && !this.isDragging && this.facts.length) {
            this.showFact();
          }
          this.scheduleFactBubble();
        });
      }, delay);
    });
  }

  // ── Thought bubble (profile photo) ──────────────────────────────────────────
  private scheduleThoughtBubble(): void {
    const delay = 22000 + Math.random() * 18000;
    this.zone.runOutsideAngular(() => {
      this.thoughtBubbleTimer = setTimeout(() => {
        this.zone.run(() => {
          if (!this.isChatOpen && !this.isThinking && !this.isStreaming && !this.isDragging) {
            const idx = Math.floor(Math.random() * this.thoughtImages.length);
            this.thoughtBubbleImage   = this.thoughtImages[idx];
            this.thoughtBubbleVisible = true;
            setTimeout(() => { this.thoughtBubbleVisible = false; }, 5500);
          }
          this.scheduleThoughtBubble();
        });
      }, delay);
    });
  }

  private showFact(): void {
    let idx: number;
    do { idx = Math.floor(Math.random() * this.facts.length); }
    while (idx === this.lastFactIndex && this.facts.length > 1);
    this.lastFactIndex = idx;

    this.isShowingFact = true;
    this.currentAnim   = 'point';
    this.animStart     = performance.now() * 0.001;
    this.bubbleText    = this.facts[idx];

    clearTimeout(this.dismissTimer as any);
    this.dismissTimer = setTimeout(() => {
      this.isShowingFact = false;
      this.currentAnim   = '';
      if (!this.isChatOpen && !this.isSettingsOpen) this.bubbleText = '';
    }, 6000);
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
    if (this.showModelPrompt) { this.dismissModelPrompt(); return; }
    this.isChatOpen = !this.isChatOpen;
    if (this.isChatOpen && !this.bubbleText)
      this.bubbleText = this.koriGreeting || "What would you like to know? 😺";
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

  // ── Image generation helpers ──────────────────────────────────────────────────
  private isImageRequest(msg: string): boolean {
    const l = msg.toLowerCase();
    return /\b(draw|paint|sketch|illustrate)\b/.test(l) ||
      /(generate|create|make|show)\s+(me\s+)?(an?\s+)?(image|picture|photo|cartoon|illustration)/.test(l) ||
      /(image|picture)\s+of\b/.test(l);
  }

  private extractImagePrompt(msg: string): string {
    const prefixes = [
      'draw me a ', 'draw me an ', 'draw me ', 'draw a ', 'draw an ', 'draw ',
      'paint me a ', 'paint me ', 'paint a ', 'paint ',
      'sketch me a ', 'sketch a ', 'sketch ',
      'illustrate a ', 'illustrate ',
      'generate an image of ', 'generate image of ', 'generate a picture of ',
      'create an image of ', 'create image of ', 'create a picture of ',
      'make an image of ', 'make image of ', 'make a picture of ',
      'show me a picture of ', 'show me an image of ',
      'picture of ', 'image of ',
    ];
    const l = msg.toLowerCase();
    for (const p of prefixes) {
      if (l.startsWith(p)) return msg.slice(p.length).trim();
    }
    return msg.trim();
  }

  clearGeneratedImage(e?: Event): void {
    e?.stopPropagation();
    this.generatedImageUrl = '';
  }

  // ── Chat ──────────────────────────────────────────────────────────────────────
  /** Suggestion-chip click: stuff the prompt and send straight away. Marks the
   *  conversation as started so the suggestion strip hides on next render. */
  pickSuggestion(s: string): void {
    if (this.isThinking || this.isStreaming) return;
    this.inputMessage = s;
    this.hasSentOnce  = true;
    void this.sendMessage();
  }

  /** True until the visitor sends their first message. Drives whether the
   *  suggestion chips are visible in the chat bubble. */
  hasSentOnce = false;

  async sendMessage(): Promise<void> {
    const msg = this.inputMessage.trim();
    if (!msg || this.isThinking) return;
    this.hasSentOnce = true;
    this.inputMessage      = '';
    this.isThinking        = true;
    this.isStreaming       = false;
    this.bubbleText        = '';
    this.generatedImageUrl = '';

    if (this.isImageRequest(msg)) {
      this.currentAnim = 'draw';
      this.animStart   = performance.now() * 0.001;
      this.bubbleText  = "On it! Let me paint that for you 🎨";
      try {
        const prompt = this.extractImagePrompt(msg);
        const url    = await this.agentService.generateImage(prompt);
        this.zone.run(() => {
          this.isThinking        = false;
          this.currentAnim       = 'wave';
          this.animStart         = performance.now() * 0.001;
          this.generatedImageUrl = url;
          this.bubbleText        = "Here you go! 🎨";
        });
      } catch {
        this.zone.run(() => {
          this.isThinking = false;
          this.currentAnim = '';
          this.bubbleText = "Couldn't generate the image — try again? 😿";
        });
      }
      return;
    }

    this.currentAnim  = 'think';   // chin-rest thinking pose while waiting for first token
    this.animStart    = performance.now() * 0.001;
    try {
      const resp = await this.agentService.chat(msg, (text) => {
        this.zone.run(() => {
          if (this.isThinking) {
            // First token arrived — drop thinking pose, start speak animation
            this.isThinking  = false;
            this.isStreaming  = true;
            this.currentAnim = 'speak';
            this.animStart   = performance.now() * 0.001;
          }
          this.bubbleText = text;
        });
      });
      this.zone.run(() => {
        this.isThinking  = false;
        this.isStreaming  = false;
        this.bubbleText  = resp;
        this.currentAnim = '';
      });
    } catch {
      this.isThinking  = false;
      this.isStreaming  = false;
      this.currentAnim = '';
      this.bubbleText  = "Hmm, something went wrong. Try again? 😿";
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
    if (this.settings.provider === 'openai')      return this.settings.openaiKey;
    if (this.settings.provider === 'claude')      return this.settings.claudeKey;
    if (this.settings.provider === 'openrouter')  return this.settings.openrouterKey;
    return '';
  }
  set currentApiKey(v: string) {
    if (this.settings.provider === 'openai')           this.settings.openaiKey      = v;
    else if (this.settings.provider === 'claude')      this.settings.claudeKey      = v;
    else if (this.settings.provider === 'openrouter')  this.settings.openrouterKey  = v;
  }

  get currentModel(): string {
    if (this.settings.provider === 'openai')       return this.settings.openaiModel;
    if (this.settings.provider === 'claude')       return this.settings.claudeModel;
    if (this.settings.provider === 'openrouter')   return this.settings.openrouterModel;
    if (this.settings.provider === 'transformers') return this.settings.tfModel;
    return this.settings.ollamaModel;
  }
  set currentModel(v: string) {
    if (this.settings.provider === 'openai')            this.settings.openaiModel      = v;
    else if (this.settings.provider === 'claude')       this.settings.claudeModel      = v;
    else if (this.settings.provider === 'openrouter')   this.settings.openrouterModel  = v;
    else if (this.settings.provider === 'transformers') this.settings.tfModel          = v;
    else                                                this.settings.ollamaModel      = v;
  }

  get modelPlaceholder(): string {
    if (this.settings.provider === 'openai')       return 'gpt-4o-mini';
    if (this.settings.provider === 'claude')       return 'claude-haiku-4-5-20251001';
    if (this.settings.provider === 'openrouter')   return 'openai/gpt-4o-mini';
    if (this.settings.provider === 'transformers') return 'onnx-community/gemma-3-270m-it';
    return 'qwen2.5:1.5b';
  }

  get bubbleVisible(): boolean {
    return !!(this.bubbleText || this.isChatOpen || this.isThinking || this.isSettingsOpen || this.showDownloadModal || this.showModelPrompt);
  }

  get showFetchHint(): boolean {
    return !!(
      this.bubbleText &&
      !this.isThinking &&
      !this.isChatOpen &&
      !this.showModelPrompt &&
      !this.showDownloadModal &&
      !this.isSettingsOpen &&
      this.settings.provider === 'transformers' &&
      !this.agentService.chatModelReady
    );
  }

  get bubbleAlign(): string {
    const mid = this.posX + 45;
    const w   = window.innerWidth || 800;
    if (mid < 140)     return 'align-left';
    if (mid > w - 140) return 'align-right';
    return 'align-center';
  }
}
