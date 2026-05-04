import { Component, OnInit } from '@angular/core';
import { DataService } from '../core/data.service';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import { IPost } from './posts-interfaces';
import { faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons';
import { AbstractSwipeSection } from '../core/shared/abstract.swipe.section';
import { environment } from 'src/environments/environment';

@Component({
  standalone: false,
  selector: 'app-posts',
  templateUrl: './posts.component.html',
  styleUrls: ['./posts.component.scss', './posts.component.responsivity.scss']
})
export class PostsComponent extends AbstractSwipeSection implements OnInit {

  currentPage: number = 1;
  resultsPerPage: number;
  posts: IPost[] = [];
  author: string = environment.author;

  faChevronLeft: IconDefinition;
  faChevronRight: IconDefinition;

  constructor(private dataService: DataService) {
    super();
}

  ngOnInit(): void {
    this.faChevronLeft = faChevronLeft;
    this.faChevronRight = faChevronRight;

    // Fetch the Posts from the Data Service
    this.dataService.getPosts()
      .subscribe((posts: IPost[]) => {
        this.posts = posts;
        this.posts.forEach(post => {
          post['thumbnail'] = post.thumbnail.replace('base_url',environment.baseUrl)
          //console.log(post)
        });
      });
  }

  public onClickPrevious(): void {
    this.currentPage--;
  }

  public onClickNext() {
    this.currentPage++;
  }

  public updateNavigation(resultsPerPage: number) {
    this.resultsPerPage = resultsPerPage;
  }

  public goToPage(page: number): void {
    this.currentPage = page;
  }

  public disablePreviousNavigation(): boolean {
    return this.currentPage === 1;
  }

  public disableNextNavigation(): boolean {
    return this.currentPage === this.totalPages;
  }

  get totalPages(): number {
    return Math.ceil((this.posts?.length || 0) / (this.resultsPerPage || 1));
  }

  get pageNumbers(): (number | '...')[] {
    const total = this.totalPages;
    const cur   = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | '...')[] = [1];
    if (cur > 3)             pages.push('...');
    for (let p = Math.max(2, cur - 1); p <= Math.min(total - 1, cur + 1); p++) {
      pages.push(p);
    }
    if (cur < total - 2)     pages.push('...');
    pages.push(total);
    return pages;
  }
}
