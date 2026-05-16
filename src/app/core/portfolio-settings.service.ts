import { Injectable, OnDestroy } from '@angular/core';
import { Firestore, doc, onSnapshot, setDoc } from '@angular/fire/firestore';
import { BehaviorSubject } from 'rxjs';

export interface PortfolioSettings {
  availableForWork : boolean;
  contactOpen      : boolean;
  maintenanceMode  : boolean;
  featuredMessage  : string;
  koriGreeting     : string;
  autoOn           : boolean;
}

const DEFAULTS: PortfolioSettings = {
  availableForWork : true,
  contactOpen      : true,
  maintenanceMode  : false,
  featuredMessage  : '',
  koriGreeting     : '',
  autoOn           : false,
};

@Injectable({ providedIn: 'root' })
export class PortfolioSettingsService implements OnDestroy {

  private readonly _settings$ = new BehaviorSubject<PortfolioSettings>(DEFAULTS);
  readonly settings$ = this._settings$.asObservable();

  private unsub?: () => void;
  private autoOnFired = false;

  constructor(private firestore: Firestore) {
    this.connect();
  }

  private connect(): void {
    const ref = doc(this.firestore, 'portfolio', 'settings');
    this.unsub = onSnapshot(
      ref,
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data() as Record<string, unknown>;
        const settings: PortfolioSettings = {
          availableForWork : d['available_for_work']  !== false,
          contactOpen      : d['contact_open']         !== false,
          maintenanceMode  : d['maintenance_mode']     === true,
          featuredMessage  : (d['featured_message'] as string) ?? '',
          koriGreeting     : (d['kori_greeting']    as string) ?? '',
          autoOn           : d['auto_on']             === true,
        };
        this._settings$.next(settings);

        // On first snapshot, if auto_on is enabled mark the owner as available
        if (!this.autoOnFired && settings.autoOn) {
          this.autoOnFired = true;
          setDoc(ref, { available_for_work: true }, { merge: true });
        }
      },
      () => { /* keep defaults on network error */ }
    );
  }

  /** Current snapshot (synchronous read). */
  get snapshot(): PortfolioSettings { return this._settings$.value; }

  ngOnDestroy(): void { this.unsub?.(); }
}
