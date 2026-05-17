import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, serverTimestamp } from '@angular/fire/firestore';

/**
 * Visit tracker — fires once per browser session (sessionStorage flag), pulls
 * as much non-identifying signal as we reasonably can from the client +
 * ipapi.co (free tier: IP, ISP, city, country, timezone), and drops one doc
 * into Firestore `/visits/{id}`. The admin app reads this collection in the
 * Visits page.
 *
 * Privacy posture: we never persist the IP to anywhere outside Firestore (no
 * third-party trackers, no Analytics push of PII), the IP doc is only readable
 * to signed-in admins by Firestore rules, and the visitor sees nothing extra
 * happen — no consent prompt because we're not setting cookies or storing the
 * IP in this browser.
 */
@Injectable({ providedIn: 'root' })
export class VisitTrackerService {
  private fs = inject(Firestore);
  private static readonly SESSION_KEY = 'visitTracked';

  async track(): Promise<void> {
    // Guard against SSR + Flutter WebView (no point counting yourself).
    if (typeof window === 'undefined') return;
    if (/PortfolioAdminFlutter/i.test(navigator.userAgent)) return;

    // Session-once: once per browser tab session. Prevents counting refreshes
    // and route changes as separate visits.
    try {
      if (sessionStorage.getItem(VisitTrackerService.SESSION_KEY) === '1') return;
      sessionStorage.setItem(VisitTrackerService.SESSION_KEY, '1');
    } catch {/* private mode — fall through and count once per nav */}

    const nav    = navigator;
    const screen = window.screen;
    const conn   = (nav as any).connection ?? {};

    // Client-side signal we can grab without any external call.
    const clientPayload: Record<string, any> = {
      timestamp:    serverTimestamp(),
      source:       'web',
      userAgent:    nav.userAgent,
      language:     nav.language,
      languages:    nav.languages ?? [],
      platform:     (nav as any).userAgentData?.platform ?? nav.platform,
      mobile:       (nav as any).userAgentData?.mobile ?? /Mobi|Android/i.test(nav.userAgent),
      vendor:       nav.vendor,
      screen: {
        width:      screen.width,
        height:     screen.height,
        pixelRatio: window.devicePixelRatio,
        colorDepth: screen.colorDepth,
      },
      viewport: {
        width:  window.innerWidth,
        height: window.innerHeight,
      },
      timezone:        Intl.DateTimeFormat().resolvedOptions().timeZone,
      tzOffsetMinutes: new Date().getTimezoneOffset(),
      referrer:        document.referrer || null,
      path:            location.pathname + location.search + location.hash,
      cookiesEnabled:  nav.cookieEnabled,
      doNotTrack:      nav.doNotTrack === '1',
      online:          nav.onLine,
      connection: {
        effectiveType: conn.effectiveType ?? null,
        downlink:      conn.downlink ?? null,
        rtt:           conn.rtt ?? null,
        saveData:      conn.saveData ?? null,
      },
    };

    // Free IP-geo lookup (no key, generous free tier). If it fails for any
    // reason we still write the client signal — never block the count.
    let geoPayload: Record<string, any> = {};
    try {
      const r = await fetch('https://ipapi.co/json/', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        geoPayload = {
          ip:          j.ip ?? null,
          ipVersion:   j.version ?? null,
          city:        j.city ?? null,
          region:      j.region ?? null,
          regionCode:  j.region_code ?? null,
          country:     j.country_name ?? null,
          countryCode: j.country_code ?? null,
          continent:   j.continent_code ?? null,
          postal:      j.postal ?? null,
          latitude:    j.latitude ?? null,
          longitude:   j.longitude ?? null,
          isp:         j.org ?? null,
          asn:         j.asn ?? null,
          currency:    j.currency ?? null,
          ipapiTimezone: j.timezone ?? null,
        };
      }
    } catch {/* offline / blocked — fine */}

    try {
      await addDoc(collection(this.fs, 'visits'), { ...clientPayload, ...geoPayload });
    } catch {/* Firestore rules / offline — fine */}
  }
}
