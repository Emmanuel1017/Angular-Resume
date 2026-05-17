import { Component, OnInit, Input, ViewChild, ElementRef, Renderer2, Inject, LOCALE_ID, AfterViewInit } from '@angular/core';
import { faBars, faShareAlt, faCloudDownloadAlt,  IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { NgNavigatorShareService } from 'ng-navigator-share';
declare var headerjs: any;
@Component({
  standalone: false,
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss', './header.component.responsivity.scss']
})

export class HeaderComponent implements OnInit, AfterViewInit {

  /**
   * True when this page is being rendered inside the Flutter portfolio-admin
   * WebView. Detected via the custom UA marker set by PortfolioScreen, plus the
   * JS-injected flag for late checks. Used to hide the "Get the App" CTA — no
   * point promoting the app to someone who's already inside it.
   */
  readonly isFlutterApp: boolean =
    typeof navigator !== 'undefined' &&
    (/PortfolioAdminFlutter/i.test(navigator.userAgent) ||
     (typeof window !== 'undefined' && (window as any).__FLUTTER_APP__ === true));

  private _activeSection: any;
  private _pageXOffset: any;
  private ngNavigatorShareService: NgNavigatorShareService;

  hasMenuToggled: boolean;
  faBars: IconDefinition;
  faShareAlt: IconDefinition;
  faCloudDownloadAlt: IconDefinition;

  @ViewChild('nav') nav: ElementRef;
  @ViewChild('shareBtn') shareBtn: ElementRef;

  constructor(
    @Inject(LOCALE_ID) public locale: string,
    private renderer: Renderer2,
    ngNavigatorShareService: NgNavigatorShareService
  ) {
    this.ngNavigatorShareService = ngNavigatorShareService;
  }

  // use getter setter to define the properties
  get activeSection(): any {
    return this._activeSection;
  }

  get pageXOffset(): any {
    return this._pageXOffset;
  }

  @Input()
  set pageXOffset(value: any) {
    this._pageXOffset = value;
    this.onDetectScreenSize();
  }

  // tslint:disable-next-line:adjacent-overload-signatures
  @Input()
  set activeSection(value: any) {
    this._activeSection = value;
    this.updateNavigation();
  }

  ngAfterViewInit() {
      // Share button available only for browsers that do support it.
      if (this.ngNavigatorShareService.canShare()) {
        this.shareBtn.nativeElement.style.display = 'block';
      }
  }

  ngOnInit(): void {
    this.faBars = faBars;
    this.faShareAlt = faShareAlt;
    this.faCloudDownloadAlt = faCloudDownloadAlt;
    new headerjs();
  }

  private updateNavigation() {

    if (this._activeSection && this.renderer) {

      // Remove any selected anchor
      const activePreviousElem = this.nav.nativeElement.querySelector('a.active');

      if (activePreviousElem) {
        this.renderer.removeClass(activePreviousElem, 'active');
      }

      const targetElem = this.nav.nativeElement.querySelector(`a[href^='#${this._activeSection}']`);
      if (targetElem) {
        this.renderer.addClass(targetElem, 'active');
      }
    }
  }

  /*
   * For media types such as tablets and mobile devices, the nav-bar navigation should be
   * collapsed by default.
  */
  private onDetectScreenSize() {
    this.hasMenuToggled = this.pageXOffset > 1024;
  }

  onToggleBar() {
    this.hasMenuToggled = !this.hasMenuToggled;
  }

  resetMenu() {
    this.hasMenuToggled = this.pageXOffset > 1024;
  }

  async share() {
    try {
      await this.ngNavigatorShareService.share({
        title: 'Caribou Developers',
        // tslint:disable-next-line:max-line-length
        text: 'Welcome to Caribou developers where we develop and Maintain high quality android, Ios ,Windows and wep applications using the latest and best practices!',
        url: 'https://cariboudevs.com/'
      });
    } catch (error) {
      console.log('You app is not shared, reason: ', error);
    }
  }
}
