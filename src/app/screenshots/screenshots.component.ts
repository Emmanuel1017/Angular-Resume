import { Component, OnDestroy, OnInit } from '@angular/core';

interface AppShot {
  file: string;
  title: string;
  caption: string;
}

@Component({
  standalone: false,
  selector: 'app-screenshots',
  templateUrl: './screenshots.component.html',
  styleUrls: ['./screenshots.component.scss'],
})
export class ScreenshotsComponent implements OnInit, OnDestroy {
  /**
   * Native portfolio-admin app screenshots. Files live in
   * src/assets/screenshots-app/ and are served from GitHub Pages — no extra
   * hosting needed. Add a new entry here when you drop a fresh capture.
   */
  shots: AppShot[] = [
    { file: '01-welcome.png',         title: 'Welcome',         caption: 'Sign in as admin or browse as a guest' },
    { file: '02-portfolio.png',       title: 'Portfolio',       caption: 'Full-screen Angular site, native chrome' },
    { file: '03-showcase.png',        title: 'About',           caption: 'Stack, years, domains — the full picture' },
    { file: '04-projects.png',        title: "Things I've Built", caption: 'Project carousel with Code & Live links' },
    { file: '05-kori.png',            title: 'Kori',            caption: 'Native chat — no WebView overhead' },
    { file: '06-kori-settings.png',   title: 'Kori Settings',   caption: 'OpenRouter via Firebase Remote Config' },
    { file: '07-profile.png',         title: 'Profile',         caption: 'Availability toggle, stack, contacts' },
    { file: '08-experience.png',      title: 'Experience',      caption: 'Timeline + education + certs' },
    { file: '09-admin.png',           title: 'Admin Console',   caption: 'Live site controls & broadcasts' },
    { file: '10-messages.png',        title: 'Messages',        caption: 'Real-time inbox with unread badges' },
    { file: '11-message-detail.png',  title: 'Message Detail',  caption: 'Copy email or mark unread on tap' },
    { file: '12-send-message.png',    title: 'Send a Message',  caption: 'Guest contact form, themed' },
  ];

  activeIndex = 0;
  trackBy = (_: number, s: AppShot) => s.file;

  /** Auto-advance timer. Paused while the user interacts (hover/tap on a dot
   *  or arrow). Resumes after a short cool-down so it doesn't fight intent. */
  private autoTimer: ReturnType<typeof setInterval> | null = null;
  private readonly autoIntervalMs = 3200;
  private readonly resumeAfterMs  = 6000;

  ngOnInit(): void {
    this.startAuto();
  }

  ngOnDestroy(): void {
    this.stopAuto();
  }

  setActive(i: number, userInitiated = false): void {
    if (i < 0 || i >= this.shots.length || i === this.activeIndex) return;
    this.activeIndex = i;
    if (userInitiated) this.bumpAuto();
  }

  next(userInitiated = false): void {
    this.setActive((this.activeIndex + 1) % this.shots.length, userInitiated);
  }
  prev(userInitiated = false): void {
    this.setActive((this.activeIndex - 1 + this.shots.length) % this.shots.length, userInitiated);
  }

  /** Pause + restart on user interaction so auto doesn't fight a click. */
  bumpAuto(): void {
    this.stopAuto();
    setTimeout(() => this.startAuto(), this.resumeAfterMs);
  }

  private startAuto(): void {
    this.stopAuto();
    this.autoTimer = setInterval(() => this.next(), this.autoIntervalMs);
  }

  private stopAuto(): void {
    if (this.autoTimer != null) { clearInterval(this.autoTimer); this.autoTimer = null; }
  }
}
