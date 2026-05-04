import { Component, OnInit, AfterViewInit, ElementRef, QueryList, ViewChildren } from '@angular/core';

export interface Stat {
  icon: string;
  value: number;
  suffix: string;
  label: string;
}

@Component({
  standalone: false,
  selector: 'app-counters',
  templateUrl: './counters.component.html',
  styleUrls: ['./counters.component.scss']
})
export class CountersComponent implements OnInit, AfterViewInit {

  @ViewChildren('countEl') countEls!: QueryList<ElementRef<HTMLSpanElement>>;

  stats: Stat[] = [];

  constructor() {}

  ngOnInit(): void {
    const yrs   = this.calcAge('2019-01-26');
    const hrYrs = this.calcAge('2020-01-26');
    this.stats = [
      { icon: 'code',         value: hrYrs * 365 * 5 * 10,  suffix: '+',    label: 'Hours of Coding'        },
      { icon: 'done_outline', value: yrs * 3,                suffix: '+',    label: 'Projects Delivered'     },
      { icon: 'computer',     value: Math.round(yrs * 1.5),  suffix: '+',    label: 'Languages & Frameworks' },
      { icon: 'schedule',     value: yrs,                    suffix: ' yrs', label: 'Years Experience'       },
    ];
  }

  ngAfterViewInit(): void {
    const host = document.querySelector('app-counters');
    if (!host) return;
    const io = new IntersectionObserver(entries => {
      if (!entries[0].isIntersecting) return;
      io.disconnect();
      this.countEls.forEach((el, i) =>
        setTimeout(() => this.animateNum(el.nativeElement, this.stats[i].value, 2000), i * 220)
      );
    }, { threshold: 0.25 });
    io.observe(host);
  }

  private animateNum(el: HTMLSpanElement, target: number, dur: number) {
    const t0 = performance.now();
    const run = (now: number) => {
      const p = Math.min((now - t0) / dur, 1);
      const e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(e * target).toLocaleString();
      if (p < 1) requestAnimationFrame(run);
    };
    requestAnimationFrame(run);
  }

  private calcAge(ds: string): number {
    return Math.abs(new Date(Date.now() - new Date(ds).getTime()).getFullYear() - 1970);
  }
}
