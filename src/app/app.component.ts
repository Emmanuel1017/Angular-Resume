import { CanonicalService } from './resume/canonical.service';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import moment from 'moment';
import AOS from 'aos';
import { PortfolioSettingsService } from './core/portfolio-settings.service';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [DatePipe]
})
export class AppComponent implements OnInit, OnDestroy {

  title = 'Korir Emmanuel';
  myDate: any;

  maintenanceMode  = false;
  featuredMessage  = '';

  private settingsSub!: Subscription;

  constructor(
    private titleService: Title,
    private metaTagService: Meta,
    private canonicalService: CanonicalService,
    private portfolioSettings: PortfolioSettingsService
  ) {}

  private scrollY = 0;

  ngOnInit(): void {
    this.myDate = moment().format('YYYY-MM-DD');
    this.titleService.setTitle(this.title);
    this.canonicalService.setCanonicalURL();
    this.metaTagService.addTags([
      // tslint:disable-next-line:max-line-length
      {name: 'keywords', content: 'Caribou Developers,Caribou Devs,Emmanuel K Korir, korir Emmanuel,Emmanuel Bett,Software developer kenya,Emmanuel_Be_Cool,emmanuel_be_cool,Caribou Kenya,Caribou,Emmanuel1017,Software Engineer,Software Engineer Kenya,Emmanuel,Computer Scientist kenya,caribou kenya,Software Company kenya,Web Developer kenya,Android Developer kenya,IOS Developer kenya,Web Developer,Android Developer,IOS Developer,Software Kenya,Eldoret Developer,Nairobi Android Developer,nairobi Web Developer,Nairobi IOS Developer,Nairobi Software Engineer,Nairobi Software Developer,'},
      // tslint:disable-next-line:max-line-length
      {name: 'description', content: 'I am a Bsc Computer science graduate majoring in the field of Software Engineering. I am a mobile ( android , IOS ) developer , Web Developer and .NET . I also do python scripting and analysis.Find out more....'},
      {name: 'robots', content: 'index, follow'},
      { name: 'author', content: 'Emmanuel_be_cool' },
      { name: 'publisher', content: 'Caribou Developers' },
      { name: 'date', content: this.myDate, scheme: 'YYYY-MM-DD' },
      { charset: 'UTF-8' },
      { name: 'og:title', content: 'Caribou Developers' },
      { name: 'og:image', content: './assets/og-image.png' },
      { name: 'og:type', content: 'website' },
      { name: 'og:url', content: 'cariboudevs.com' },
      { name: 'msapplication-TileColor', content: '#da532c' },
      { name: 'og:description', content: '' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1"' }
    ]);

    // AOS — scroll-triggered slide/fade-in animations on tagged elements.
    // `once: true` so sections animate the first time they enter the viewport
    // and stay put afterwards (avoids re-animation on every scroll past).
    AOS.init({
      duration:   650,
      easing:     'ease-out-cubic',
      once:       true,
      offset:     80,
      mirror:     false,
      anchorPlacement: 'top-bottom',
    });
    // Re-run AOS layout once Angular has finished its first round of async
    // renders (posts, my-work cards, etc). Without this, offsets are computed
    // against an empty DOM and the trigger lines end up in the wrong place.
    setTimeout(() => AOS.refreshHard(), 800);
    window.addEventListener('load', () => AOS.refreshHard());

    this.settingsSub = this.portfolioSettings.settings$.subscribe(s => {
      // Save scroll position when going INTO maintenance so we can restore it on exit
      if (s.maintenanceMode && !this.maintenanceMode) {
        this.scrollY = window.scrollY;
      }
      // Restore scroll position when coming OUT of maintenance
      if (!s.maintenanceMode && this.maintenanceMode) {
        requestAnimationFrame(() =>
          window.scrollTo({ top: this.scrollY, behavior: 'instant' })
        );
      }
      this.maintenanceMode = s.maintenanceMode;
      this.featuredMessage = s.featuredMessage;
    });
  }

  ngOnDestroy(): void { this.settingsSub?.unsubscribe(); }
}
