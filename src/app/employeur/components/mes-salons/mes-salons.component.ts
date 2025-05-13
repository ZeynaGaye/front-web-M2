import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SalonService } from '../../services/salon.service';
import { ServiceSalonService } from '../../services/service-salon.service';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoDataDialogComponent } from '../no-data-dialog/no-data-dialog.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-mes-salons',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSpinner,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
    MatTooltipModule
  ],
  templateUrl: './mes-salons.component.html',
  styleUrl: './mes-salons.component.scss',
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandAnimation', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('300ms ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, height: '*', overflow: 'hidden' }),
        animate('300ms ease-in', style({ opacity: 0, height: '0px' }))
      ])
    ]),
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(10px)' }),
        animate('200ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(10px)' }))
      ])
    ]),
    trigger('serviceAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ]),
    trigger('photoAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
  ]
})
export class MesSalonsComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();

  salons: any[] = [];
  expandedSalonId: number | null = null;
  services: { [salonId: number]: any[] } = {};
  isLoading = false;
  errorMessage = '';
  activeTab: { [salonId: number]: string } = {};
   salonId: number = 0;
  constructor(
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSalons();
  }

  loadSalons() {
    this.isLoading = true;
    this.salonService.getMesSalons().subscribe({
      next: (data: any[]) => {
        this.salons = data;
        this.isLoading = false;
        
        // Initialiser les tabs pour chaque salon
        this.salons.forEach(salon => {
          this.activeTab[salon.id] = 'info';
        });
        
        // Afficher le popup si aucun salon n'est disponible
        if (data.length === 0) {
          this.openNoDataDialog({
            title: 'Gérer vos Salons',
            message: 'Vous n\'avez pas encore de salon.',
            buttonText: 'Créer un salon',
            icon: 'add_business'
          });
        }
      },
      error: (error: { message: string }) => {
        this.errorMessage = 'Erreur lors du chargement des salons: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  toggleSalonExpansion(salonId: number) {
    if (this.expandedSalonId === salonId) {
      this.expandedSalonId = null;
    } else {
      this.expandedSalonId = salonId;
      this.loadServices(salonId);
    }
  }

  loadServices(salonId: number) {
    if (!this.services[salonId]) {
      this.isLoading = true;
      this.serviceSalonService.getServicesBySalon(salonId).subscribe({
        next: (data: any[]) => {
          this.services[salonId] = data;
          this.isLoading = false;
          
          // Afficher le popup si aucun service n'est disponible
          if (data.length === 0 && this.activeTab[salonId] === 'services') {
            this.openNoDataDialog({
              title: 'Services du Salon',
              message: 'Ce salon n\'a pas encore de services.',
              buttonText: 'Ajouter un service',
              icon: 'add'
            });
          }
        },
        error: (error: { message: string }) => {
          this.errorMessage = 'Erreur lors du chargement des services: ' + error.message;
          this.isLoading = false;
        }
      });
    }
  }

  openNoDataDialog(data: {title: string, message: string, buttonText: string, icon: string}) {
    const dialogRef = this.dialog.open(NoDataDialogComponent, {
      width: '400px',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (data.buttonText === 'Créer un salon') {
          this.closeModal(); // Rediriger vers la page de création de salon
        } else if (data.buttonText === 'Ajouter un service') {
          this.addService(this.expandedSalonId!);
        }
      }
    });
  }

  setActiveTab(salonId: number, tab: string) {
    this.activeTab[salonId] = tab;
    
    if (tab === 'services') {
      this.loadServices(salonId);
    } else if (tab === 'photos') {
      this.loadSalonPhotos(salonId);
    }
    
    return true; // Pour permettre l'utilisation dans le template avec && operator
  }

  addService(salonId: number) {
    const nouveauService = {
      nom: 'Nouveau service',
      prix: 5000,
      duree: '30min'
    };

    this.serviceSalonService.createService(salonId, nouveauService).subscribe({
      next: (service) => {
        if (!this.services[salonId]) {
          this.services[salonId] = [];
        }
        this.services[salonId].push(service);
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de l\'ajout du service: ' + error.message;
      }
    });
  }

  editService(serviceId: number, salonId: number) {
    // Votre logique d'édition
    const serviceModifie = {
      nom: 'Service modifié',
      prix: 6000,
      duree: '45min'
    };

    this.serviceSalonService.updateService(serviceId, serviceModifie).subscribe({
      next: (updatedService) => {
        const index = this.services[salonId].findIndex(s => s.id === serviceId);
        if (index !== -1) {
          this.services[salonId][index] = updatedService;
        }
      },
      error: (error) => {
        this.errorMessage = 'Erreur lors de la modification du service: ' + error.message;
      }
    });
  }

  deleteService(serviceId: number, salonId: number) {
    if (confirm('Voulez-vous vraiment supprimer ce service ?')) {
      this.serviceSalonService.deleteService(serviceId).subscribe({
        next: () => {
          this.services[salonId] = this.services[salonId].filter(s => s.id !== serviceId);
          // Si tous les services ont été supprimés, afficher le popup
          if (this.services[salonId].length === 0) {
            this.openNoDataDialog({
              title: 'Services du Salon',
              message: 'Ce salon n\'a plus de services.',
              buttonText: 'Ajouter un service',
              icon: 'add'
            });
          }
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression du service: ' + error.message;
        }
      });
    }
  }

  editSalon(salonId: number) {
    // Implémentez la logique pour modifier les informations du salon
    console.log('Modifier le salon avec ID:', salonId);
  }

  closeModal() {
    // Implémentez la logique pour fermer le modal ou rediriger
    console.log('Modal fermé ou redirection effectuée.');
  }


  changeProfilePhoto(salonId: number) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    
    fileInput.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadProfilePhoto(salonId, file);
      }
    });
    
    fileInput.click();
  }
  
  uploadProfilePhoto(salonId: number, file: File) {
    this.isLoading = true;
    
    const formData = new FormData();
    formData.append('file', file);
    
    this.salonService.updateSalonProfilePhoto(salonId, formData).subscribe({
      next: (updatedSalon) => {
        // Mettre à jour le salon dans la liste
        const index = this.salons.findIndex(s => s.id === salonId);
        if (index !== -1) {
          this.salons[index] = updatedSalon;
        }
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = "Erreur lors du téléchargement de la photo: " + error.message;
        this.isLoading = false;
      }
    });
  }


  // Propriété pour stocker les photos de chaque salon
salonPhotos: { [salonId: number]: any[] } = {};

// Charger les photos d'un salon
loadSalonPhotos(salonId: number) {
  if (!this.salonPhotos[salonId]) {
    this.isLoading = true;
    this.salonService.getSalonPhotos(salonId).subscribe({
      next: (photos) => {
        this.salonPhotos[salonId] = photos;
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = "Erreur lors du chargement des photos: " + error.message;
        this.isLoading = false;
      }
    });
  }
}

// Méthode pour ouvrir le sélecteur de fichiers
openFileSelector(salonId: number) {
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'image/*';
  fileInput.multiple = true; // Permet la sélection multiple
  
  fileInput.addEventListener('change', (event) => {
    const files = (event.target as HTMLInputElement).files;
    if (files && files.length > 0) {
      this.uploadSalonPhotos(salonId, files);
    }
  });
  
  fileInput.click();
}

// Méthode pour télécharger plusieurs photos
uploadSalonPhotos(salonId: number, files: FileList) {
  this.isLoading = true;
  
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append('files', files[i]);
  }
  
  this.salonService.uploadSalonPhotos(salonId, formData).subscribe({
    next: (photos) => {
      if (!this.salonPhotos[salonId]) {
        this.salonPhotos[salonId] = [];
      }
      this.salonPhotos[salonId] = [...this.salonPhotos[salonId], ...photos];
      this.isLoading = false;
    },
    error: (error) => {
      this.errorMessage = "Erreur lors du téléchargement des photos: " + error.message;
      this.isLoading = false;
    }
  });
}

// Méthode pour supprimer une photo
deletePhoto(photoId: number, salonId: number) {
  if (confirm('Voulez-vous vraiment supprimer cette photo ?')) {
    this.isLoading = true;
    this.salonService.deleteSalonPhoto(photoId).subscribe({
      next: () => {
        this.salonPhotos[salonId] = this.salonPhotos[salonId].filter(photo => photo.id !== photoId);
        this.isLoading = false;
      },
      error: (error) => {
        this.errorMessage = "Erreur lors de la suppression de la photo: " + error.message;
        this.isLoading = false;
      }
    });
  }
}

// Méthode pour définir une photo comme photo de profil
setAsProfilePhoto(photoUrl: string, salonId: number) {
  this.isLoading = true;
  this.salonService.updateSalonProfilePhotoUrl(salonId, { photoUrl }).subscribe({
    next: (updatedSalon) => {
      // Mettre à jour le salon dans la liste
      const index = this.salons.findIndex(s => s.id === salonId);
      if (index !== -1) {
        this.salons[index] = updatedSalon;
      }
      this.isLoading = false;
    },
    error: (error) => {
      this.errorMessage = "Erreur lors de la mise à jour de la photo de profil: " + error.message;
      this.isLoading = false;
    }
  });
}
}