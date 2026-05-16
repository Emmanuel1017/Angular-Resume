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
  private savedScrollY = 0;

  get i18n(): IPostI18n | null {
    return this.post?.internationalizations?.find(i => i.language === 'en') ?? null;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['post']) {
      if (this.post) {
        this.progress = 0;
        // Reset reader scroll to top for the new article
        if (this.scrollPane?.nativeElement) {
          this.scrollPane.nativeElement.scrollTop = 0;
        }
        const words = (this.i18n?.content ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
        this.readingTime = Math.max(1, Math.round(words / 220));
        // Lock body scroll without jumping: save position, pin body with fixed+offset
        this.savedScrollY = window.scrollY;
        document.body.style.overflow   = 'hidden';
        document.body.style.position   = 'fixed';
        document.body.style.top        = `-${this.savedScrollY}px`;
        document.body.style.width      = '100%';
        setTimeout(() => { this.visible = true; }, 10);
      } else {
        this.visible = false;
        // Restore body scroll and jump back to exact position
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top      = '';
        document.body.style.width    = '';
        window.scrollTo({ top: this.savedScrollY, behavior: 'instant' as ScrollBehavior });
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
    document.body.style.position = '';
    document.body.style.top      = '';
    document.body.style.width    = '';
    window.scrollTo({ top: this.savedScrollY, behavior: 'instant' as ScrollBehavior });
    setTimeout(() => this.closed.emit(), 280);
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.post) this.close();
  }
}
