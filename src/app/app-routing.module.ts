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

      // Once the above is enabled, the fragment link will only work on the
      // first click. This is because, by default, the Router ignores requests
      // to navigate to the SAME URL that is currently rendered. Unfortunately,
      // the fragment scrolling is powered by Navigation Events. As such, we
      // have to tell the Router to re-trigger the Navigation Events even if we
      // are navigating to the same URL.
      onSameUrlNavigation: 'reload'
    }
  )],
  exports: [ RouterModule ]
})

export class AppRoutingModule { }
