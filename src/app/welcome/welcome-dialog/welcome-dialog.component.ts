import { Component, OnInit, Input } from '@angular/core';
declare var welcome_text: any;
@Component({
    selector: 'app-welcome-dialog',
    templateUrl: './welcome-dialog.component.html',
    styleUrls: [ './welcome-dialog.css', './welcome-dialog.responsivity.css' ]
})

export class WelcomeDialogComponent implements OnInit {

    constructor() {}

    ngOnInit() {
       // new welcome_text();
    }

}
