import {
  Component, Input, Output, EventEmitter,
  OnChanges, SimpleChanges, ViewChild,
  ElementRef, HostListener
} from '@angular/core';
import { IPost, IPostI18n } from '../posts-interfaces';

@Component({
  standalone: false,
  selector: 'app-post-reader',
  templateUrl: './post-reader.component.html',
  styleUrls: ['./post-reader.component.scss']
})
export class PostReaderComponent implements OnChanges {

  @Input()  post: IPost | null = null;
  @Output() closed = new EventEmitter<void>();

  @ViewChild('scrollPane') scrollPane!: ElementRef<HTMLElement>;

  progress = 0;
  readingTime = 0;
  visible = false;

  get i18n(): IPostI18n | null {
    return this.post?.internationalizations?.find(i => i.language === 'en') ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) {
      if (this.post) {
        this.progress = 0;
        const words = (this.i18n?.content ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        this.readingTime = Math.max(1, Math.round(words / 220));
        // trigger animation next tick
        setTimeout(() => { this.visible = true; }, 10);
        document.body.style.overflow = 'hidden';
      } else {
        this.visible = false;
        document.body.style.overflow = '';
      }
    }
  }

  onScroll(event: Event): void {
    const el = event.target as HTMLElement;
    const max = el.scrollHeight - el.clientHeight;
    this.progress = max > 0 ? (el.scrollTop / max) * 100 : 0;
  }

  close(): void {
    this.visible = false;
    document.body.style.overflow = '';
    setTimeout(() => this.closed.emit(), 280);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.post) this.close();
  }
}
