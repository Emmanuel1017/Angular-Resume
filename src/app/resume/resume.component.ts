import { Component, OnInit, HostListener } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { debounce } from '../core/utils';
import { CanonicalService } from './canonical.service';
import * as moment from 'moment';
@Component({
  selector: 'app-resume',
  templateUrl: './resume.component.html',
  styleUrls: ['./resume.component.css', './resume.component.responsivity.css']
})
export class ResumeComponent implements OnInit {

  title = 'Emmanuel k Korir';

  isSticky: boolean = false;
  activeSection: string;

  pageYOffset: number = 0;
  pageXOffset: number;

  myDate ;

  constructor(  private titleService: Title,
                private metaService: Meta,
                private canonicalService: CanonicalService) {

    this.checkResize();

  }

  @HostListener('window:scroll')
  @debounce()
  checkScroll() {
    this.pageYOffset = window.pageYOffset;
    this.isSticky = pageYOffset >= 250;
  }

  @HostListener('window:resize')
  @debounce(25)
  checkResize() {
    this.pageXOffset = window.innerWidth;
  }

  ngOnInit(): void {
    this.myDate = moment().format('YYYY-MM-DD');
    this.titleService.setTitle(this.title);
    this.canonicalService.setCanonicalURL();
    this.metaService.addTags([
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
      { name: 'og:url', content: 'emmanuel.cariboudevs.com' },
      { name: 'msapplication-TileColor', content: '#da532c' },
      { name: 'og:description', content: 'Emmanuel Korir' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1"' }
      ]);

    this.checkResize();
    }

  @debounce(150)
  onViewport(isOnViewPort: any, element?: string) {
    this.activeSection = element;
  }
}
