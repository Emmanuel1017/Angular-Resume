import { Component, OnInit } from '@angular/core';
declare var counters: any;
@Component({
  selector: 'app-counters',
  templateUrl: './counters.component.html',
  styleUrls: ['./counters.component.scss']
})
export class CountersComponent implements OnInit {


  yearsExperience: number;
  HoursCoding: number;

  constructor() { }

  ngOnInit(): void {
    this.yearsExperience = this.calcAge('2019-1-26'); // Sets here, your date birthday
    this.HoursCoding = this.calcAge('2020-1-26');
    new counters();
  }

  private calcAge(dateString: string) {
    const startday: Date = new Date(dateString);
    const ageDifMs: number = Date.now() - startday.getTime();
    const ageDate: Date = new Date(ageDifMs); // miliseconds from epoch
    return Math.abs(ageDate.getFullYear() - 1970);
  }

  private calcCodingTime(dateString: string) {
    const startday: Date = new Date(dateString);
    const ageDifMs: number = Date.now() - startday.getTime();
    const codeDate: Date = new Date(ageDifMs); // miliseconds from epoch
    const  Noofyears: number = Math.abs(codeDate.getFullYear() - 1970);
    return Noofyears * 365 * 5 * 10;

  }
}
