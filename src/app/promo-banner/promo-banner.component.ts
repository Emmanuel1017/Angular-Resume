import { Component, OnInit } from '@angular/core';

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
    setTimeout(() => (this.visible = true), 600);
  }

  scrollToApp(event: Event): void {
    event.preventDefault();
    const el = document.getElementById('app');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  dismiss(event: Event): void {
    event.stopPropagation();
    this.visible = false;
    try { localStorage.setItem(PromoBannerComponent.STORAGE_KEY, '1'); } catch {}
  }
}
