import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { ResumeComponent } from './resume/resume.component';
import { PageNotFoundComponent } from './404/page-not-found.component';
import { GamesComponent } from './games/games.component';
// Any URL apart from the root domain is going to be rendered as 'page-not-found'.
const routes: Routes = [

  { path: 'games',  component: GamesComponent },
  { path: '', component: ResumeComponent},
  { path: '404', component: PageNotFoundComponent },
  { path: '**',  component: PageNotFoundComponent },

];

@NgModule({
  imports: [ RouterModule.forRoot(
    routes,
    {
      // In order to get anchor / fragment scrolling to work at all, we need to
      // enable it on the router.
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'disabled',
      onSameUrlNavigation: 'ignore'
    }
  )],
  exports: [ RouterModule ]
})

export class AppRoutingModule { }
