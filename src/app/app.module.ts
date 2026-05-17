import { BrowserModule } from '@angular/platform-browser';
import { NgModule} from '@angular/core';
import { registerLocaleData } from '@angular/common';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { ResumeModule } from './resume/resume.module';
import { PageNotFoundRoutingModule } from './404/page-not-found-routing.module';
import { PageNotFoundModule } from './404/page-not-found.module';
import { CoreModule } from './core/core.module';

import localeEn from '@angular/common/locales/en';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore } from '@angular/fire/firestore';
import { provideAnalytics, getAnalytics } from '@angular/fire/analytics';
import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config';
import { environment } from '../environments/environment';

import { HammerModule, HammerGestureConfig, HAMMER_GESTURE_CONFIG } from '@angular/platform-browser';
import * as Hammer from 'hammerjs';

import { NotifierModule } from 'angular-notifier';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';


export class MyHammerConfig extends HammerGestureConfig {
    // Restrict Hammer's swipe recognizer to the horizontal axis only.
    // DIRECTION_ALL was capturing vertical pans too, which prevented native
    // momentum scroll over any section that bound (swipe) — most visibly the
    // "Latest Posts" stage on mobile, where dragging vertically got eaten by
    // Hammer instead of scrolling the page.
    overrides = {
        swipe: { direction: Hammer.DIRECTION_HORIZONTAL },
        pan:   { direction: Hammer.DIRECTION_HORIZONTAL },
    } as any;
}

registerLocaleData(localeEn, 'en');

@NgModule({
  imports: [
    BrowserModule,
    AppRoutingModule,
    CoreModule,
    ResumeModule,
    PageNotFoundModule,
    PageNotFoundRoutingModule,
    HammerModule,
    NotifierModule,
    BrowserAnimationsModule
  ],
  declarations: [ AppComponent ],
  bootstrap: [ AppComponent ],
  providers: [
    {
      provide: HAMMER_GESTURE_CONFIG,
      useClass: MyHammerConfig
    },
    provideFirebaseApp(() => initializeApp(environment.firebaseConfig)),
    provideFirestore(() => getFirestore()),
    provideAnalytics(() => getAnalytics()),
    provideRemoteConfig(() => {
      const rc = getRemoteConfig();
      rc.settings.minimumFetchIntervalMillis = 3600000; // cache 1 hour
      rc.defaultConfig = { openrouter_api_key: '', available_for_work: 'true' };
      return rc;
    }),
  ]
})

export class AppModule {}
