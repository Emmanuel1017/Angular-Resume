import { Component, ElementRef, OnInit } from '@angular/core';

/**
 * Sticky top banner promoting the Android companion app.
 *
 * Behaviour:
 *  - Hidden entirely inside the Flutter WebView (we don't promote the app to
 *    someone who's already inside it).
 *  - Dismissible — sets `localStorage.promoDismissed` so it stays hidden for
 *    that user. Resets if the stored value gets cleared / on incognito.
 *  - Tapping the CTA smooth-scrolls to the screenshots section (#app).
 *  - Slides in after a 600 ms delay so it doesn't fight the page's own load
 *    animation, which would feel cluttered.
 */
@Component({
  standalone: false,
  selector: 'app-promo-banner',
  templateUrl: './promo-banner.component.html',
  styleUrls: ['./promo-banner.component.scss'],
})
export class PromoBannerComponent implements OnInit {
  visible = false;

  constructor(private host: ElementRef<HTMLElement>) {}

  readonly isFlutterApp: boolean =
    typeof navigator !== 'undefined' &&
    (/PortfolioAdminFlutter/i.test(navigator.userAgent) ||
     (typeof window !== 'undefined' && (window as any).__FLUTTER_APP__ === true));

  private static readonly STORAGE_KEY = 'promoBannerDismissed';

  ngOnInit(): void {
    if (this.isFlutterApp) return;
    try {
      if (localStorage.getItem(PromoBannerComponent.STORAGE_KEY) === '1') return;
    } catch {/* private mode / SSR — fall through and show */}

    // Small delay → banner slides in after the hero's own animation, so the
    // attention shift reads as deliberate rather than competing.
    setTimeout(() => {
      this.visible = true;
      this.setOffset(true);
    }, 600);
  }

  /**
   * Publish the banner's height to a CSS custom property on the root so the
   * floating header can shift down out of the way. Header uses
   *   top: calc(14px + var(--promo-banner-height, 0px))
   * with a transition so the shift animates smoothly alongside the slide-in.
   */
  private setOffset(show: boolean): void {
    try {
      if (!show) {
        document.documentElement.style.setProperty('--promo-banner-height', '0px');
        return;
      }
      // Read the actual rendered height so mobile (smaller pill) and desktop
      // both get correct spacing. Wait one frame so layout has applied.
      requestAnimationFrame(() => {
        const inner = this.host.nativeElement.querySelector('.pb-inner') as HTMLElement | null;
        const h = inner ? Math.ceil(inner.getBoundingClientRect().height) + 14 /* top+bottom margin */ : 64;
        document.documentElement.style.setProperty('--promo-banner-height', h + 'px');
      });
    } catch {/* SSR */}
  }

  scrollToApp(event: Event): void {
    event.preventDefault();
    const el = document.getElementById('app');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.visible = false;
    this.setOffset(false);
    try { localStorage.setItem(PromoBannerComponent.STORAGE_KEY, '1'); } catch {}
  }
}
