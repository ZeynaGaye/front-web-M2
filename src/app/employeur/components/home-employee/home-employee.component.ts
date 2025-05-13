import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ServiceSalon } from '../../../models/service-salon';
import { SalonService } from '../../../shared/services/salons/salons.service';
import { Router, RouterLinkActive, RouterModule } from '@angular/router';
import { SalonComponent } from '../salon/salon.component';
import { OffreEmploisComponent } from '../offre-emplois/offre-emplois.component';
import { HeaderService } from '../../../shared/services/header/header.service';
import { MesServicesComponent } from '../mes-services/mes-services.component';
import { MesSalonsComponent } from "../mes-salons/mes-salons.component";
import { OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';


@Component({
  standalone: true,
  selector: 'app-home-employee',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterModule,
    SalonComponent,
    OffreEmploisComponent,
    MesSalonsComponent,
    RouterLinkActive
    
],
  templateUrl: './home-employee.component.html',
  styleUrl: './home-employee.component.scss'
})
export class HomeEmployeeComponent implements OnInit {
  sidebarOpen = false;
  showCreationForm= false;
  showOffreEmploiForm = false;
  showSalonsList: boolean = false;
   public headerService = inject(HeaderService);
   showServicesList = false;
   offreCount = 0;
   @Output() closeModalEvent = new EventEmitter<void>();
  
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }
  
  services: ServiceSalon[] = [];
  loading = false;
  error: string | null = null;

  constructor(private salonService: SalonService,
    private offreEmploisService: OffreEmploisService,
    private router: Router
  ) { } 

  ngOnInit(): void {
    this.loadServices();
    this.loadOffresCount();
  }
  navigateToOffresManager() {
    this.router.navigate(['/employeur/offresManager']);
  }
  loadServices(): void {
    this.loading = true;
    this.salonService.getEmployeurServices() // Changé ici
      .subscribe({
        next: (data) => {
          this.services = data;
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Erreur lors du chargement des services';
          this.loading = false;
          console.error(err);
        }
      });
  }
  get username() {
    return this.headerService.username();
  }
  // addService(): void {
  //   // Implémenter la logique pour ajouter un service
  // }
  
  // editService(service: ServiceSalon): void {
  //   // Implémenter la logique pour modifier un service
  // }
  
  // deleteService(serviceId: number): void {
  //   // Implémenter la logique pour supprimer un service


  //   // this.salonService.deleteService(serviceId).subscribe({
  //   //   next: () => {
  //   //     this.loadServices(); // Recharger la liste des services après suppression
  //   //   },
  //   //   error: (err: any) => {
  //   //     console.error('Erreur lors de la suppression du service', err);
  //   //   }
  //   // });
  // }

  openSalonsList() {
    this.showSalonsList = true;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showServicesList = false;
  }
  
  closeSalonsList() {
    this.showSalonsList = false;
  }

  openCreationForm() {
    this.showCreationForm = true;
  }

  // Masquer le formulaire de création de salon
  closeCreationForm() {
    this.showCreationForm = false;
  }

  
  openOffreEmploiForm() {
    this.showOffreEmploiForm = true;
  }

  closeOffreEmploiForm() {
    this.showOffreEmploiForm = false;
    this.loadOffresCount();
  }

  loadOffresCount() {
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres) => {
        this.offreCount = offres.length;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des offres:', error);
      }
    });
  }
  
  // openServicesList() {
  //   this.showServicesList = true;
  //   console.log('Opening services list');
  // }

  // closeServicesList() {
  //   this.showServicesList = false;
  // }
}