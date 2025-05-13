import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { ProFreeComponent } from "../pro-free/pro-free.component";
import { JobOfferComponent } from "../job-offer/job-offer.component";
import { RouterModule, RouterOutlet,} from '@angular/router';
import { ClientSectionComponent } from '../client-section/client-section.component';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [CommonModule,RouterModule, ProFreeComponent, JobOfferComponent,ClientSectionComponent,],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent {

}
