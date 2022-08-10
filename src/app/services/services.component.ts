import { Component, OnInit } from '@angular/core';
declare var services: any;
@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss']
})
export class ServicesComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
    new services();
  }

}
