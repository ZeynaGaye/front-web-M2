import { Routes } from '@angular/router';
import { FreelanceDashbordComponent } from './freelance/components/freelance-dashbord/freelance-dashbord.component';
import { ClientDashboardComponent } from './client/components/client-dashboard/client-dashboard.component';
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
import { JobOfferComponent } from './shared/components/job-offer/job-offer.component';
import { SalonRegistrationComponent } from './shared/components/salon-registration/salon-registration.component';



export const routes: Routes = [
 
  { 
    path: '', 
    component: AccueilComponent, 
    pathMatch: 'full' 
  },
  
 
  { 
    path: 'accueil', 
    component: AccueilComponent 
  },
 
  { 
    path: 'contacts', 
    component: ContactComponent 
  },
  { 
    path: 'salon-registration', 
    component: SalonRegistrationComponent 
  },
  { 
    path: 'job-offer', 
    component: JobOfferComponent 
  },
  

  { 
    path: 'salon', 
    component: SalonComponent 
  },
  { 
    path: 'salon/:id', 
    component: SalonDetailsComponent 
  },
  
  //  ROUTES FREELANCE
  { 
    path: 'freelance-dashboard', 
    component: FreelanceDashbordComponent 
  },
  { 
    path: 'portfolio', 
    component: PortfolioComponent 
  },
  { 
    path: 'opportunites-emploi', 
    component: OpportunitesEmploiComponent 
  },
  
  //  ROUTES EMPLOYEUR
  { 
    path: 'candidatures', 
    component: CandidaturesComponent 
  },
  { 
    path: 'dashboard', 
    component: DashboardComponent 
  },
  { 
    path: 'offres-manager', 
    component: OffresManagerComponent 
  },
  
  //  ROUTES PROTÉGÉES (avec guard)
  {
    path: 'home-freelance',
    component: HomeFreelanceComponent,
    canActivate: [authGuard],
    data: { roles: ['FREELANCE'] },
  },
  {
    path: 'client-dashboard',
    component: ClientDashboardComponent,
    canActivate: [authGuard],
    data: { roles: ['CLIENT'] },
  },
  {
    path: 'home-employee',
    component: HomeEmployeeComponent,
    canActivate: [authGuard],
    data: { roles: ['EMPLOYEUR'] },
  },
  
  //  ROUTE WILDCARD (IMPORTANTE - toujours en dernier)
  { 
    path: '**', 
    redirectTo: '/', 
    pathMatch: 'full' 
  }
];
