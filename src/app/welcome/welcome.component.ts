import { Component, OnInit } from '@angular/core';

@Component({
  standalone: false,
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.css', './welcome-component.responsivity.css']
})

export class WelcomeComponent implements OnInit {

  constructor() {}

  ngOnInit(): void {
  }

}
