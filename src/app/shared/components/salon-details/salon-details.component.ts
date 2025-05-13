import { Component, Inject, OnInit, PLATFORM_ID, Optional } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { SalonService } from '../../services/salons/salons.service';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { BookingDialogComponent } from '../booking-dialog/booking-dialog.component';
import { ServiceSalonService } from '../../../employeur/services/service-salon.service';
import { AuthService } from '../../../core/servces/auth.service';


@Component({
  selector: 'app-salon-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule,
    MatBadgeModule,
    MatDividerModule
  ],
  templateUrl: './salon-details.component.html',
  styleUrls: ['./salon-details.component.scss'],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ])
    ]),
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateY(20px)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateY(0)', opacity: 1 }))
      ])
    ]),
    trigger('serviceAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class SalonDetailsComponent implements OnInit {
  salon: any;
  services: any[] = [];
  photos: any[] = [];
  isLoadingServices = false;
  isLoadingPhotos = false;
  errorMessage: string | null = null;
  activeTab: string = 'presentation'; // Tab actif par défaut
  isLoggedIn = false;
  isBrowser: boolean;
  salonId: number = 0; // Ajouter cette propriété

  constructor(
    @Optional() public dialogRef: MatDialogRef<SalonDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { salonId: number } | null,
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.salonId = data?.salonId || 0; // Initialiser salonId
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.isLoggedIn = this.authService.isAuthenticated();
    } else {
      this.isLoggedIn = false; // En mode SSR, on considère que l'utilisateur n'est pas connecté
    }
    
    if (this.salonId > 0) {
      this.loadSalonDetails();
    }
  }

  loadSalonDetails(): void {
    if (this.isBrowser) {
      console.log('Chargement des détails du salon avec ID:', this.salonId);
    }
    
    this.salonService.getSalonById(this.salonId).subscribe({
      next: (salon) => {
        if (this.isBrowser) {
          console.log('Salon récupéré:', salon);
        }
        
        this.salon = salon;
        
        if (salon) {
          this.loadSalonServices();
          this.loadSalonPhotos();
        } else {
          this.errorMessage = 'Impossible de charger les détails du salon';
        }
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les détails du salon';
      }
    });
  }

  loadSalonServices(): void {
    this.isLoadingServices = true;
    
    this.serviceSalonService.getServicesBySalon(this.salonId).subscribe({
      next: (services) => {
        this.services = services || [];
        this.isLoadingServices = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les services du salon';
        this.isLoadingServices = false;
      }
    });
  }

  loadSalonPhotos(): void {
    this.isLoadingPhotos = true;
    
    this.salonService.getSalonPhotos(this.salonId).subscribe({
      next: (photos: any[]) => {
        this.photos = photos || [];
        this.isLoadingPhotos = false;
      },
      error: () => {
        this.errorMessage = 'Impossible de charger les photos du salon';
        this.isLoadingPhotos = false;
      }
    });
  }

  closeDialog(): void {
    if (this.dialogRef && this.isBrowser) {
      this.dialogRef.close();
    }
  }

  // Méthode pour le système de notation avec étoiles
  getStarArray(rating: number): any[] {
    const fullStars = Math.floor(rating || 0);
    return new Array(fullStars);
  }
  
  hasHalfStar(rating: number): boolean {
    return ((rating || 0) % 1) >= 0.5;
  }

  // Pour l'affichage des horaires
  formatHoraires(horaires: string): string {
    return horaires || 'Horaires non disponibles';
  }

  // Change l'onglet actif
  setActiveTab(tab: string): void {
    this.activeTab = tab;
  }

  // Ouvrir le dialogue de réservation pour un service spécifique
  bookService(service: any): void {
    // Ne pas exécuter en SSR
    if (!this.isBrowser) {
      return;
    }
    
    if (!this.isLoggedIn) {
      this.snackBar.open('Veuillez vous connecter pour réserver un service', 'Se connecter', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      }).onAction().subscribe(() => {
        // Rediriger vers la page de connexion ou ouvrir un modal de connexion
        this.closeDialog();
      });
      return;
    }

    const dialogRef = this.dialog.open(BookingDialogComponent, {
      width: '500px',
      data: {
        service: service,
        salon: this.salon
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        // La réservation a été confirmée avec succès
        this.snackBar.open('Votre réservation a été confirmée !', 'Voir mes réservations', {
          duration: 5000,
          panelClass: ['success-snackbar']
        }).onAction().subscribe(() => {
          // Rediriger vers la page des réservations
          this.closeDialog();
        });
      }
    });
  }
}