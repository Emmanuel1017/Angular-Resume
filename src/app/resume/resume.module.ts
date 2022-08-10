import { NgModule } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ResumeComponent } from '../resume/resume.component';
import { HeaderComponent } from '../header/header.component';
import { AboutComponent } from '../about/about.component';
import { ContactComponent } from '../contact/contact.component';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { WelcomeModule } from '../welcome/welcome.module';
import { ExperienceModule } from '../experience/experience.module';
import { CoreModule } from '../core/core.module';
import { PostsModule } from '../posts/posts.molule';
import { ContactService } from '../contact/contact.service';
import { PlatformsComponent } from '../platforms/platforms.component';
import { FooterComponent } from '../footer/footer.component';
import { NotifierModule } from 'angular-notifier';
import { WhatwedoComponent } from '../whatwedo/whatwedo.component';
import { CountersComponent } from '../counters/counters.component';
import {MatIconModule} from '@angular/material/icon';
import { ResponsiveModule } from 'ngx-responsive';


const config = {
  breakPoints: {
      xs: {max: 600},
      sm: {min: 601, max: 959},
      md: {min: 960, max: 1279},
      lg: {min: 1280, max: 1919},
      xl: {min: 1920}
  },
  debounceTime: 100
};

@NgModule({
  imports: [
    ReactiveFormsModule,
    CommonModule,
    CoreModule,
    FontAwesomeModule,
    WelcomeModule ,
    ExperienceModule,
    PostsModule,
    NotifierModule,
    MatIconModule,
    ResponsiveModule.forRoot(config)
  ],
  declarations: [
    ResumeComponent,
    HeaderComponent,
    AboutComponent,
    ContactComponent,
    FooterComponent,
    PlatformsComponent,
    CountersComponent,
    WhatwedoComponent
  ],
  exports: [ ResumeComponent ],
  providers: [ ContactService ]
})

export class ResumeModule { }
