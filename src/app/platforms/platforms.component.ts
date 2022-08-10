import { Component, OnInit } from '@angular/core';
declare var platforms: any;

@Component({
  selector: 'app-platforms',
  templateUrl: './platforms.component.html',
  styleUrls: ['./platforms.component.scss']
})
export class PlatformsComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    new platforms();

  }

}
