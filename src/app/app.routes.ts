import { Routes } from '@angular/router';
import { FreelanceDashbordComponent } from './freelance/components/freelance-dashbord/freelance-dashbord.component';
import { AccueilComponent } from './shared/components/accueil/accueil.component';
import { ContactComponent } from './shared/components/contact/contact.component';
import { HomeEmployeeComponent } from './employeur/components/home-employee/home-employee.component';

import { HomeFreelanceComponent } from './freelance/components/home-freelance/home-freelance.component';
import { authGuard } from './core/guards/auth.guard';
import { SalonComponent } from './employeur/components/salon/salon.component';
import { CandidaturesComponent } from './employeur/components/candidatures/candidatures.component';
import { DashboardComponent } from './employeur/components/dashboard/dashboard.component';
import { OffresManagerComponent } from './employeur/components/offres-manager/offres-manager.component';
import { SalonDetailsComponent } from './shared/components/salon-details/salon-details.component';
import { OpportunitesEmploiComponent } from './freelance/components/opportunites-emploi/opportunites-emploi.component';
import { PortfolioComponent } from './freelance/components/portfolio/portfolio.component';

export const routes: Routes = [
  { path: '', redirectTo: '/accueil', pathMatch: 'full' },
  { path: 'accueil', component: AccueilComponent },
  { path: 'contacts', component: ContactComponent },
  {path:'salon',component:SalonComponent},
  { path: 'freelance-dashboard', component: FreelanceDashbordComponent },
  {path: 'employeur/candidatures', component: CandidaturesComponent,},
  {path: 'employeur/dashboard', component: DashboardComponent,},
  {path: 'employeur/offresManager',    component: OffresManagerComponent, },
  {path: 'freelance/portfolio',component: PortfolioComponent},
  {path:'shared/salonDetails/:id',component:SalonDetailsComponent},
  {path:'freelance/opportunites-emploi',component:OpportunitesEmploiComponent},


  {
    path: 'home-freelance',
    component: HomeFreelanceComponent,
    canActivate: [authGuard],
    data: { roles: ['FREELANCE'] },
  },


  {
    path: 'home-employee',
    component: HomeEmployeeComponent,
    
    canActivate: [authGuard],
    data: { roles: ['EMPLOYEUR'] },
  },
  { path: 'home', redirectTo: '/accueil' }, // Ajout d'une redirection vers 'accueil' pour les utilisateurs non spécifiés
];
