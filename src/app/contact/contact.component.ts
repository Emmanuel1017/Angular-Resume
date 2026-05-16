import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { PortfolioSettingsService } from '../core/portfolio-settings.service';
import {
    faEnvelope, faPhone, faTimes,
  faMapMarkerAlt, IconDefinition
} from '@fortawesome/free-solid-svg-icons';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { ContactService } from './contact.service';
import { Contact } from '../model/contact.model';
import moment from 'moment';
import { NotifierService } from 'angular-notifier';
declare var contact_js: any;


@Component({
  standalone: false,
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss', './contact.component.responsivity.scss']
})

export class ContactComponent implements OnInit, OnDestroy {

  private readonly notifier: NotifierService;
  name: string;
  email: string;
  phone: string;
  location: string;

  faEnvelope: IconDefinition;
  faPhone: IconDefinition;
  faMapMarkerAlt: IconDefinition;
  faTimes: IconDefinition;

  isLoading: boolean = false;
  hasBeenSubmited: boolean = false;
  feedbackStatus: string;
  now: string;

  contactOpen = true;
  private settingsSub!: Subscription;

  constructor(
    private contactService: ContactService,
    notifierService: NotifierService,
    private portfolioSettings: PortfolioSettingsService
  ) {
    this.notifier = notifierService;
  }

  contactForm: FormGroup = new FormGroup({
    name: new FormControl('', [
      Validators.required,
      Validators.pattern('[A-zÀ-ú ]*')
    ]),
    email: new FormControl('',[
      Validators.required,
      Validators.pattern('^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,4}$')
    ]),
    message: new FormControl('', [
      Validators.required
    ])
  });

  get senderEmail() {
    return this.contactForm.get('email');
  }

  get senderName() {
    return this.contactForm.get('name');
  }

  get senderMessage() {
    return this.contactForm.get('message');
  }

  get options() {
    return this.contactForm.get('options');
  }

  ngOnInit(): void {
    this.name = 'Korir Kipkurui Emmanuel';
    this.email = 'koriremmanuel@rocketmail.com';
    this.phone = '+254745317920';
    this.location = ' Eldoret, Kenya';

    this.faEnvelope = faEnvelope;
    this.faPhone = faPhone;
    this.faMapMarkerAlt = faMapMarkerAlt;
    this.faTimes = faTimes;
    // tslint:disable-next-line:no-unused-expression
     new contact_js();
    this.settingsSub = this.portfolioSettings.settings$.subscribe(s => {
      this.contactOpen = s.contactOpen;
    });
  }

  ngOnDestroy(): void { this.settingsSub?.unsubscribe(); }

  saveContact(contact: Contact) {
    this.contactService.createContact(contact).then(() => {
      this.displayUserInterfaceMessage(true);
    })
    .catch(error => {
      this.displayUserInterfaceMessage(false);
    });
  }

  displayUserInterfaceMessage(hasBeenSuccessfuly: boolean) {
    this.isLoading = false;
    this.hasBeenSubmited = true;
    this.feedbackStatus = hasBeenSuccessfuly ? 'success' : 'error';
    this.contactForm.reset();
  }

  closeFeedbackMessage() {
    this.hasBeenSubmited = false;
    this.feedbackStatus = '';
  }


  onSubmit(contactForm) {
    if (!this.contactOpen) return;
    if (contactForm.valid) {
    this.isLoading = true;
    // tslint:disable-next-line:no-unused-expression
    this.now = moment().format('LLL');
    const contactValues: Contact = {
      name: this.senderName.value,
      email: this.senderEmail.value,
      message: this.senderMessage.value,
      date: this.now
    } as Contact;
    this.saveContact(contactValues);
  } else {
  // tslint:disable-next-line:no-unused-expression
  this.contactForm.markAllAsTouched();
  }
  }
}
