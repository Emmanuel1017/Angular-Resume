import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AgentComponent } from './agent.component';

@NgModule({
  imports: [ CommonModule, FormsModule ],
  declarations: [ AgentComponent ],
  exports: [ AgentComponent ]
})
export class AgentModule {}
