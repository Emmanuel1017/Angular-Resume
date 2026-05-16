import { Component, OnInit, OnDestroy, ElementRef, ViewChild, HostListener } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-welcome-dp',
  templateUrl: './welcome-dp.html',
  styleUrls: ['./welcome-dp.scss', './welcome-dp.responsivity.scss']
})
export class WelcomeDpComponent implements OnInit, OnDestroy {

  @ViewChild('tiltEl') tiltEl!: ElementRef<HTMLDivElement>;

  readonly images = [
    'assets/template/me_code.png',
    'assets/template/me_cyber.png',
    'assets/template/me_cyber_2.png',
    'assets/template/me_tricycle.png',
  ];

  activeIdx     = 0;
  prevIdx       = -1;
  transitioning = false;

  private hovering     = false;
  private paused       = false;
  private raf          = 0;
  private advanceTimer = 0;
  private curRx = 0;
  private curRy = 0;
  private tgtRx = 0;
  private tgtRy = 0;

  constructor(private host: ElementRef) {}

  ngOnInit() {
    this.loop();
    this.scheduleAdvance();
  }

  ngOnDestroy() {
    cancelAnimationFrame(this.raf);
    clearTimeout(this.advanceTimer);
  }

  onMouseMove(e: MouseEvent) {
    this.hovering = true;
    this.paused   = true;
    const r  = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    const cx = r.left + r.width  / 2;
    const cy = r.top  + r.height / 2;
    this.tgtRy =  ((e.clientX - cx) / (r.width  / 2)) * 22;
    this.tgtRx = -((e.clientY - cy) / (r.height / 2)) * 22;
  }

  onMouseLeave() {
    this.hovering = false;
    this.paused   = false;
    this.applyScrollTarget();
  }

  @HostListener('window:scroll')
  onScroll() {
    if (!this.hovering) this.applyScrollTarget();
  }

  advance(dir = 1) {
    if (this.transitioning) return;
    this.transitioning = true;
    this.prevIdx   = this.activeIdx;
    this.activeIdx = (this.activeIdx + dir + this.images.length) % this.images.length;
    setTimeout(() => { this.transitioning = false; this.prevIdx = -1; }, 950);
  }

  jumpTo(i: number) {
    if (this.transitioning || i === this.activeIdx) return;
    this.transitioning = true;
    this.prevIdx   = this.activeIdx;
    this.activeIdx = i;
    setTimeout(() => { this.transitioning = false; this.prevIdx = -1; }, 950);
  }

  private scheduleAdvance() {
    this.advanceTimer = window.setTimeout(() => {
      if (!this.paused) this.advance();
      this.scheduleAdvance();
    }, 5000);
  }

  private applyScrollTarget() {
    const p = Math.min(window.scrollY / 700, 1);
    this.tgtRx = Math.sin(p * Math.PI) * -12;
    this.tgtRy = p * 16;
  }

  private loop() {
    this.raf = requestAnimationFrame(() => {
      this.curRx += (this.tgtRx - this.curRx) * 0.07;
      this.curRy += (this.tgtRy - this.curRy) * 0.07;
      if (this.tiltEl) {
        this.tiltEl.nativeElement.style.transform =
          `rotateX(${this.curRx.toFixed(2)}deg) rotateY(${this.curRy.toFixed(2)}deg)`;
      }
      this.loop();
    });
  }
}
