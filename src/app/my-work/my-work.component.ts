import { Component, OnInit, AfterViewInit, OnDestroy, ElementRef } from '@angular/core';

export interface WorkProject {
  title: string;
  description: string;
  image: string;
  tags: string[];
  github?: string;
  live?: string;
}

@Component({
  standalone: false,
  selector: 'app-my-work',
  templateUrl: './my-work.component.html',
  styleUrls: ['./my-work.component.scss']
})
export class MyWorkComponent implements OnInit, AfterViewInit, OnDestroy {

  readonly projects: WorkProject[] = [
    {
      title: 'Angular Resume',
      description: 'Interactive portfolio with a Three.js WebGL AI cat, SSE streaming chat across 5 AI providers, in-browser Whisper voice input, image generation, and a full blog engine.',
      image: 'assets/posts/code.jpg',
      tags: ['Angular', 'Three.js', 'TypeScript', 'AI'],
      github: 'https://github.com/Emmanuel1017/Angular-Resume',
      live: 'https://emmanuel1017.github.io/Angular-Resume/'
    },
    {
      title: 'Android Resume App',
      description: 'Resume/CV application for Android with card-based dashboard, custom animations, and smooth UI interactions built in Java.',
      image: 'assets/posts/android.jpg',
      tags: ['Android', 'Java', 'Material UI', 'Animations'],
      github: 'https://github.com/Emmanuel1017/My_Resume_Android_Application'
    },
    {
      title: 'TikTok API Scraper',
      description: 'Persistent multi-target TikTok downloader supporting users, hashtags, region feeds, auto session refresh, video validation, and remuxing.',
      image: 'assets/posts/data.jpg',
      tags: ['Python', 'Web Scraping', 'Automation', 'FFmpeg'],
      github: 'https://github.com/Emmanuel1017/TikTokApi-Scrapper'
    },
    {
      title: 'Caribou Flutter Plugin',
      description: 'Cross-platform Flutter plugin for mobile app delivery, providing native integration bridges for iOS (Swift) and Android.',
      image: 'assets/posts/android.jpg',
      tags: ['Flutter', 'Swift', 'Dart', 'iOS'],
      github: 'https://github.com/Emmanuel1017/caribou_flutter_plugin'
    },
    {
      title: 'Resume Backend API',
      description: 'RESTful API backend for the resume app written in Laravel PHP, powering data endpoints and contact form handling.',
      image: 'assets/posts/agents.jpg',
      tags: ['Laravel', 'PHP', 'REST API', 'MySQL'],
      github: 'https://github.com/Emmanuel1017/Resume_backend'
    },
    {
      title: 'Snapdragon Thermal Tweak',
      description: 'Unlock the Samsung S7 Qualcomm Snapdragon 820 thermal engine configuration for zero CPU/GPU throttling under sustained load.',
      image: 'assets/posts/hardware.jpg',
      tags: ['Shell', 'Android', 'Linux', 'Hardware'],
      github: 'https://github.com/Emmanuel1017/snapdragon-820-thermal-engine.config'
    }
  ];

  private io!: IntersectionObserver;

  constructor(private el: ElementRef) {}

  ngOnInit(): void {
    this.io = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          this.io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
  }

  ngAfterViewInit(): void {
    const items = this.el.nativeElement.querySelectorAll('.reveal');
    items.forEach((item: Element) => this.io.observe(item));
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
  }

  onCardMove(e: MouseEvent): void {
    const card = e.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();
    const rx = -((e.clientY - rect.top  - rect.height / 2) / (rect.height / 2)) * 11;
    const ry =  ((e.clientX - rect.left - rect.width  / 2) / (rect.width  / 2)) * 11;
    card.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) scale(1.04)`;
    const mx = ((e.clientX - rect.left) / rect.width)  * 100;
    const my = ((e.clientY - rect.top)  / rect.height) * 100;
    const shine = card.querySelector('.card-shine') as HTMLElement;
    if (shine) { shine.style.setProperty('--mx', mx + '%'); shine.style.setProperty('--my', my + '%'); }
  }

  onCardLeave(e: MouseEvent): void {
    const card = e.currentTarget as HTMLElement;
    card.style.transform = '';
  }
}
