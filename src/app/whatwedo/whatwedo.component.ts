import { Component, HostListener, OnInit } from '@angular/core';
declare var what_we_do: any;
@Component({
  standalone: false,
  selector: 'app-whatwedo',
  templateUrl: './whatwedo.component.html',
  styleUrls: ['./whatwedo.component.scss']
})
export class WhatwedoComponent implements OnInit {

  public getScreenWidth: any;
  public getScreenHeight: any;

  constructor() { }

  ngOnInit(): void {
    // tslint:disable-next-line:no-unused-expression
    new what_we_do();
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
  }

  @HostListener('window:resize', ['$event'])
  onWindowResize(_event?: Event) {
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
  }

}
