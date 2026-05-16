import { Component, OnInit, AfterViewInit, OnDestroy, HostListener, ElementRef, ViewChild } from '@angular/core';
import { DataService } from '../core/data.service';
import { IAbout } from './about-interfaces';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import { fas  } from '@fortawesome/free-solid-svg-icons';
import { fab  } from '@fortawesome/free-brands-svg-icons';
import { Subscription } from 'rxjs';
import { PortfolioSettingsService } from '../core/portfolio-settings.service';

interface StatItem  { value: string; label: string; icon: string; }
interface TimelineItem { year: string; role: string; company: string; current?: boolean; }

@Component({
  standalone: false,
  selector: 'app-about',
  templateUrl: './about.component.html',
  styleUrls: ['./about.component.scss', './about.component.responsivity.scss']
})
export class AboutComponent implements OnInit, AfterViewInit, OnDestroy {

  name     = 'Korir Emmanuel';
  yearsOld = 0;
  subscription!: Subscription;
  aboutData!: IAbout;

  // 3-D name letters
  nameLetters1 = 'KORIR'.split('');
  nameLetters2 = 'EMMANUEL'.split('');

  // normalised mouse (-1 … 1)
  mx = 0;
  my = 0;

  readonly stats: StatItem[] = [
    { value: '7+',  label: 'Years Building',  icon: '⚡' },
    { value: '6',   label: 'Companies',        icon: '🏢' },
    { value: '15+', label: 'Technologies',     icon: '🔧' },
    { value: '3',   label: 'Domains',          icon: '🌍' },
  ];

  readonly skillGroups = [
    { name: 'Backend',  color: '#5a8c3e', skills: ['Elixir', 'Phoenix', 'Laravel', 'Go', 'Python', 'Spring Boot', '.NET'] },
    { name: 'Frontend', color: '#2d4070', skills: ['Angular', 'Vue', 'React', 'TypeScript', 'Nuxt', 'LiveView', 'Blade'] },
    { name: 'AI & ML',  color: '#c05c1a', skills: ['TensorFlow', 'PyTorch', 'LangChain', 'RAG', 'HuggingFace', 'LangGraph', 'Agents'] },
    { name: 'DevOps',   color: '#6b4fa0', skills: ['Docker', 'Kubernetes', 'NGINX', 'CI/CD', 'Observability', 'IaC'] },
    { name: 'Data',     color: '#1a7a8c', skills: ['PostgreSQL', 'MySQL', 'MariaDB', 'Firebase', 'ChromaDB', 'FAISS'] },
    { name: 'Security', color: '#8c1a3e', skills: ['Zero Trust', 'GDPR', 'HIPAA', 'PIPEDA', 'PII Protection', 'Vault'] },
  ];

  activeGroup  = 0;
  private cycleTimer = 0;
  private cyclePaused = false;

  readonly timeline: TimelineItem[] = [
    { year: '2025 – now', role: 'Senior Software Engineer',         company: 'Value Chain Factory',  current: true },
    { year: '2024 – now', role: 'Full-Stack Engineer · AI Compliance', company: 'Selstan, Waterloo USA', current: true },
    { year: '2024',       role: 'ML Engineer',                      company: 'Dunia Tech, Nairobi' },
    { year: '2022 – 2025',role: 'Full-Stack Developer · Healthcare', company: 'MTRH' },
    { year: '2021 – 2022',role: 'Back-End Developer',               company: 'ROAM Tech' },
    { year: '2020 – 2021',role: 'Full-Stack Developer',             company: 'Caribou Developers' },
  ];

  expandedTimeline  = -1;
  statsVisible      = false;
  availableForWork  = true;  // default true; overridden by Remote Config

  @ViewChild('statsEl') statsEl!: ElementRef;
  private io!: IntersectionObserver;

  private settingsSub!: import('rxjs').Subscription;

  constructor(
    private dataService: DataService,
    private library: FaIconLibrary,
    private host: ElementRef,
    private portfolioSettings: PortfolioSettingsService
  ) { library.addIconPacks(fas, fab); }

  ngOnInit(): void {
    this.yearsOld     = this.calcAge('1995-12-26');
    this.subscription = this.dataService.getAbout()
      .subscribe((about: IAbout) => this.aboutData = about);
    this.scheduleCycle();
    this.settingsSub = this.portfolioSettings.settings$.subscribe(s => {
      this.availableForWork = s.availableForWork;
    });
  }

  ngAfterViewInit(): void {
    this.io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { this.statsVisible = true; this.io.disconnect(); }
    }, { threshold: 0.25 });
    if (this.statsEl) this.io.observe(this.statsEl.nativeElement);
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.settingsSub?.unsubscribe();
    this.io?.disconnect();
    clearTimeout(this.cycleTimer);
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(e: MouseEvent) {
    const r  = (this.host.nativeElement as HTMLElement).getBoundingClientRect();
    this.mx  = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    this.my  = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  }

  @HostListener('mouseleave')
  onMouseLeave() { this.mx = 0; this.my = 0; }

  letterStyle(i: number, total: number): { [key: string]: string } {
    const pos = total > 1 ? (i / (total - 1) - 0.5) * 2 : 0;
    const rx  = this.my * -10;
    const ry  = (this.mx + pos * 0.25) * 14;
    const tz  = Math.abs(this.mx * pos) * 18;
    return {
      transform:  `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateZ(${tz.toFixed(2)}px)`,
      transition: 'transform 0.12s ease-out',
    };
  }

  selectGroup(i: number) {
    this.activeGroup  = i;
    this.cyclePaused  = true;
    clearTimeout(this.cycleTimer);
    // resume auto-cycle after 8 s of inactivity
    this.cycleTimer = window.setTimeout(() => {
      this.cyclePaused = false;
      this.scheduleCycle();
    }, 8000);
  }

  private scheduleCycle() {
    this.cycleTimer = window.setTimeout(() => {
      if (!this.cyclePaused) {
        this.activeGroup = (this.activeGroup + 1) % this.skillGroups.length;
      }
      this.scheduleCycle();
    }, 2800);
  }

  toggleTimeline(i: number) {
    this.expandedTimeline = this.expandedTimeline === i ? -1 : i;
  }

  private calcAge(d: string) {
    return Math.abs(new Date(Date.now() - new Date(d).getTime()).getFullYear() - 1970);
  }
}
