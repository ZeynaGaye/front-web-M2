import { Component, Inject, OnInit, PLATFORM_ID, Optional } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { MatSnackBar } from '@angular/material/snack-bar';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { AuthService } from '../../../core/servces/auth.service';
//  Assurez-vous que l'interface Freelance est correctement mise à jour pour correspondre au DTO Java
import { FreelanceService } from '../../services/freelance.service';
import { BookingDialogComponent } from '../../../shared/components/booking-dialog/booking-dialog.component';
import { PortfolioComponent } from '../portfolio/portfolio.component';
import { Freelance, PortfolioItem } from '../../../models/PortfolioItem'; // Assurez-vous que cette interface Freelance est correcte et à jour
import { ServiceFreelanceResponseDto, ServiceFreelanceService } from '../../ServiceFreelance/service-freelance.service';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';

@Component({
  selector: 'app-freelance-details',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatTabsModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule, // Make sure this is the correct import for spinner
    MatTooltipModule,
    MatCardModule,
    MatBadgeModule,
    MatDividerModule,
    PortfolioComponent
  ],
  templateUrl: './freelance-details.component.html',
  styleUrls: ['./freelance-details.component.scss'],
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
    // Animations pour le portfolio et les services sont OK
    trigger('portfolioAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
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
export class FreelanceDetailsComponent implements OnInit {
[x: string]: any;
  freelance: Freelance | null = null;
  services: ServiceFreelanceResponseDto[] = [];
  isLoadingServices: boolean = false;

  errorMessage: string | null = null;
  activeTab: string = 'presentation';
  isLoggedIn = false;
  isBrowser: boolean;
  freelanceId: number = 0;
  recentAvis: any[] = [];
  isLoadingAvis = false;

  constructor(
    @Optional() public dialogRef: MatDialogRef<FreelanceDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { freelanceId: number } | null,
    private freelanceService: FreelanceService,
    private serviceFreelanceService: ServiceFreelanceService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object,
    private router: Router,
    private reservationService: ReservationService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.freelanceId = data?.freelanceId || 0;
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.isLoggedIn = this.authService.isAuthenticated();
    } else {
      this.isLoggedIn = false;
    }

    if (this.freelanceId > 0) {
      this.loadFreelanceDetails();
      this.loadFreelanceServices();
      this.loadFreelanceAvis();
    } else {
      this.errorMessage = 'ID de freelance invalide';
    }
  }

  loadFreelanceDetails(): void {


    this.freelanceService.getFreelanceById(this.freelanceId).subscribe({
      next: (freelance: Freelance) => {

        this.freelance = freelance;
        if (freelance) {

          // Mettre à jour les noms de propriétés pour correspondre au DTO Java si nécessaire
          // Ex: this.freelance.note = freelance.rating;
          // Ex: this.freelance.nombreAvis = freelance.reviews;
        } else {
          this.errorMessage = 'Freelance non trouvé';
        }
      },
      error: (error: { message: any; }) => {
        console.error(' Erreur lors du chargement du freelance:', error);
        this.errorMessage = `Impossible de charger les détails du freelance: ${error.message || 'Erreur inconnue'}`;
      }
    });
  }

  loadFreelanceServices(): void {
    if (this.freelanceId === 0) {
      this.services = [];
      return;
    }

    this.isLoadingServices = true;


    this.serviceFreelanceService.getServicesByFreelance(this.freelanceId)
      .subscribe({
        next: (services: ServiceFreelanceResponseDto[]) => {

          this.services = services;
          this.isLoadingServices = false;
        },
        error: (error) => {
          console.error(' Erreur lors du chargement des services:', error);
          this.isLoadingServices = false;
          this.snackBar.open('Erreur lors du chargement des services.', 'Fermer', { duration: 3000 });
        }
      });
  }

  loadFreelanceAvis(): void {

    this.isLoadingAvis = true;

    this.reservationService.getAvisByFreelance(this.freelanceId).subscribe({
      next: (avis) => {

        
        if (!avis) {
          console.warn(' La réponse avis est undefined ou null');
          this.recentAvis = [];
        } else if (!Array.isArray(avis)) {
          console.warn(' La réponse avis n\'est pas un tableau:', avis);
          this.recentAvis = [];
        } else {
          // Trier les avis par date de création (plus récents en premier)
          this.recentAvis = avis.sort((a, b) => {
            const dateA = new Date(a.dateCreation || a.dateAvis);
            const dateB = new Date(b.dateCreation || b.dateAvis);
            return dateB.getTime() - dateA.getTime();
          });
        }

        this.isLoadingAvis = false;

      },
      error: (error) => {
        console.error(' Erreur lors du chargement des avis:', error);
        this.recentAvis = [];
        this.isLoadingAvis = false;
      }
    });
  }

  // Ces méthodes sont probablement gérées par PortfolioComponent.
  // Si le PortfolioComponent est autonome et prend juste l'ID, vous pouvez les supprimer de ce fichier.
  // private processPortfolio(portfolio: any[]): PortfolioItem[] { /* ... */ }
  // private processImageUrl(imageUrl: string): string { /* ... */ }
  // onImageError(event: any): void { /* ... */ }
  // onImageLoad(event: any): void { /* ... */ }

  //  Nouveau : gestionnaire d'erreur pour l'image de profil
  onProfileImageError(event: Event): void {
    (event.target as HTMLImageElement).src = 'assets/images/freelance-avatar.jpg';
  }

  closeDialog(): void {
    if (this.dialogRef && this.isBrowser) {
      this.dialogRef.close();
    }
  }

  //  Mettre à jour pour utiliser freelance.rating et freelance.reviews du DTO Java
  getStarArray(rating: number | undefined | null): any[] {
    const fullStars = Math.floor(rating || 0);
    return new Array(fullStars);
  }

  //  Mettre à jour pour utiliser freelance.rating du DTO Java
  hasHalfStar(rating: number | undefined | null): boolean {
    return ((rating || 0) % 1) >= 0.5;
  }

  setActiveTab(tab: string): void {

    this.activeTab = tab;
    
    // Charger les avis si nécessaire
    if (tab === 'reviews' && this.recentAvis.length === 0 && !this.isLoadingAvis) {

      this.loadFreelanceAvis();
    }
  }

  bookService(service: ServiceFreelanceResponseDto): void {
    if (!this.isBrowser) return;

    if (!this.isLoggedIn) {
      if (this.dialogRef) {
        this.dialogRef.close();
      }
      this.authService.triggerLoginModal();
      this.snackBar.open('Veuillez vous connecter pour réserver un service', 'Fermer', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    const dialogRef = this.dialog.open(BookingDialogComponent, {
      width: '550px',
      maxWidth: '90vw',
      height: 'auto',
      maxHeight: '90vh',
      position: {
        top: '5vh'
      },
      panelClass: ['booking-dialog-panel'],
      disableClose: true,
      autoFocus: false,
      restoreFocus: false,
      data: {
        service: service,
        freelance: this.freelance,
        type: 'freelance'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        this.snackBar.open('Votre réservation a été confirmée !', 'Voir mes réservations', {
          duration: 5000,
          panelClass: ['success-snackbar']
        }).onAction().subscribe(() => {
          this.closeDialog();
          this.router.navigate(['/mes-reservations']);
        });
      }
    });
  }

  contactFreelance(): void {
    if (!this.isBrowser) return;

    if (!this.isLoggedIn) {
      this.authService.triggerLoginModal();
      this.snackBar.open('Veuillez vous connecter pour contacter ce freelance', 'Fermer', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.router.navigate(['/messages', 'new'], {
      queryParams: { to: this.freelanceId, type: 'freelance' }
    });
  }

  // Ces méthodes de statut semblent être liées à un champ 'statut' qui n'est pas dans FreelanceDTO
  // Considérez si elles sont toujours nécessaires ou comment le statut est déterminé.
  getStatusClass(statut: string): string {
    switch (statut) {
      case 'disponible': return 'status-available';
      case 'occupe': return 'status-busy';
      case 'hors-ligne': return 'status-offline';
      default: return 'status-unknown';
    }
  }

  getStatusText(statut: string): string {
    switch (statut) {
      case 'disponible': return 'Disponible';
      case 'occupe': return 'Occupé(e)';
      case 'hors-ligne': return 'Hors ligne';
      default: return 'Statut inconnu';
    }
  }

  // La méthode formatExperience est toujours là mais le champ `experiences` dans le DTO Java est un String.
  // Il faudra peut-être l'adapter si `experiences` est un texte libre et non un nombre d'années.
  formatExperience(experience: number | string | undefined | null): string {
    if (typeof experience === 'number') {
        if (experience === 0) return 'Débutant';
        if (experience === 1) return '1 an d\'expérience';
        return `${experience} ans d'expérience`;
    }
    // Si 'experiences' est une chaîne de texte libre, affichez-la directement.
    if (typeof experience === 'string' && experience.trim().length > 0) {
        return experience;
    }
    return 'Non spécifié';
  }


  // Le formatage de la plage de prix pourrait être utilisé si freelance avait tarifMoyenMin/Max
  // freelance.dto n'a pas ces champs. Le service les a (prixMin/Max)
  formatPriceRange(min: number | undefined | null, max: number | undefined | null): string {
    if (!min && !max) return 'Prix sur demande';
    if (!max) return `À partir de ${this.formatPrice(min || 0)}`;
    if (!min) return `Jusqu'à ${this.formatPrice(max || 0)}`;
    return `${this.formatPrice(min)} - ${this.formatPrice(max)}`;
  }

  formatPrice(price: number | undefined | null): string {
    return this.serviceFreelanceService.formatPrice(price || 0);
  }

  formatDuration(minutes: number | undefined | null): string {
    return this.serviceFreelanceService.formatDuration(minutes || 0);
  }

  /**
   *  Formater note en étoiles
   */
  formatStars(rating: number): string {
    return this.reservationService.formatRatingStars(rating);
  }

  /**
   *  Obtenir le temps relatif
   */
  getRelativeTime(date: string | Date): string {
    return this.reservationService.getTempsDepuisCreation(date);
  }

  /**
   *  Calculer la note moyenne du freelance
   */
  getAverageRating(): number {
    if (!this.recentAvis || this.recentAvis.length === 0) {
      return 0;
    }
    
    const total = this.recentAvis.reduce((sum, avis) => sum + (avis.note || 0), 0);
    return Math.round((total / this.recentAvis.length) * 10) / 10; // Arrondi à 1 décimale
  }

  /**
   *  Obtenir le nombre total d'avis
   */
  getTotalReviews(): number {
    return this.recentAvis ? this.recentAvis.length : 0;
  }
}