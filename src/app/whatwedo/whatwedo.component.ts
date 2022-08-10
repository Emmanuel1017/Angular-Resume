import { Component, HostListener, OnInit } from '@angular/core';
declare var what_we_do: any;
@Component({
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
  onWindowResize() {
    this.getScreenWidth = window.innerWidth;
    this.getScreenHeight = window.innerHeight;
  }

}
