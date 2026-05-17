import { Component } from '@angular/core';

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
export class ScreenshotsComponent {
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

  setActive(i: number): void {
    if (i < 0 || i >= this.shots.length || i === this.activeIndex) return;
    this.activeIndex = i;
  }

  next(): void { this.setActive((this.activeIndex + 1) % this.shots.length); }
  prev(): void { this.setActive((this.activeIndex - 1 + this.shots.length) % this.shots.length); }
}
