
import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { ServiceSalon } from '../../../models/service-salon';

import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MatCardActions, MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { SalonService } from '../../services/salon.service';
import { MatDialog } from '@angular/material/dialog';
import { ServiceSalonService } from '../../services/service-salon.service';
import { AddServiceDialogComponent } from '../add-service-dialog/add-service-dialog.component';


@Component({
  selector: 'app-mes-services',
  imports: [CommonModule,MatCardActions,NgFor,NgIf,MatButtonModule,MatCardModule,
    MatIconModule,MatProgressSpinnerModule],

  templateUrl: './mes-services.component.html',
  styleUrl: './mes-services.component.scss'
})
export class MesServicesComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();
  services: ServiceSalon[] = [];
  loading = false;
  error: string | null = null;
  salonId: number | null = null;

  constructor(
    private serviceSalonService: ServiceSalonService,
    private salonService: SalonService,
    private dialog: MatDialog
  ) { }

  ngOnInit(): void {
    this.loadSalonId();
  }

  loadSalonId(): void {
    this.salonId = this.salonService.getCurrentSalonId();
  
    if (this.salonId) {
      this.loadServices();
    } else {
      this.error = "Aucun salon sélectionné. Veuillez d'abord créer ou sélectionner un salon.";
      this.services = []; // Vide, mais on affiche quand même
    }
  }
  

  loadServices(): void {
    if (!this.salonId) return;
    
    this.loading = true;
    this.serviceSalonService.getServicesBySalon(this.salonId)
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

  openAddServiceDialog(): void {
    if (!this.salonId) return;

    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '500px',
      data: { salonId: this.salonId }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.salonId) {
        this.serviceSalonService.createService(this.salonId, result)
          .subscribe({
            next: () => this.loadServices(),
            error: (err) => {
              console.error(err);
              this.error = 'Erreur lors de la création du service';
            }
          });
      }
    });
  }

  editService(service: ServiceSalon): void {
    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '500px',
      data: { service }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && service.id) {
        this.serviceSalonService.updateService(service.id, result)
          .subscribe({
            next: () => this.loadServices(),
            error: (err) => {
              console.error(err);
              this.error = 'Erreur lors de la modification du service';
            }
          });
      }
    });
  }

  deleteService(serviceId: number): void {
    if (confirm('Êtes-vous sûr de vouloir supprimer ce service ?')) {
      this.serviceSalonService.deleteService(serviceId)
        .subscribe({
          next: () => this.loadServices(),
          error: (err) => {
            console.error(err);
            this.error = 'Erreur lors de la suppression du service';
          }
        });
    }
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }
}