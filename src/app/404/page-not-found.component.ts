import { Component, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import * as moment from 'moment';
import { CanonicalService } from '../resume/canonical.service';

declare var page_not_found_game: any;
@Component({
    selector: 'app-page-not-found',
    templateUrl: './page-not-found.html',
    styleUrls: ['./page-not-found.component.scss', './page-not-found.component.responsivity.scss']
})

export class PageNotFoundComponent implements OnInit {

  title = 'Page not Found';
  myDate ;

    constructor(    private titleService: Title,
                    private metaTagService: Meta,
                    private canonicalService: CanonicalService) {}

    ngOnInit(): void {
           // tslint:disable-next-line:no-unused-expression
    new page_not_found_game();

    this.myDate = moment().format('YYYY-MM-DD');
    this.titleService.setTitle(this.title);

    this.titleService.setTitle(this.title);
  }


    }
