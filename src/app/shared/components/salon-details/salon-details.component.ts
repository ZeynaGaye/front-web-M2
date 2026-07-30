import {Component, Inject, OnInit, PLATFORM_ID, Optional, inject} from '@angular/core';
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
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import {ReservationService} from '../../services/reservation/reservation.service';
interface UploadResponse {
  photos: any[];
  total: number;
  message: string;
}
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
    trigger('photoAnimation', [
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
export class SalonDetailsComponent implements OnInit {
  salon: any;
  services: any[] = [];
  photos: any[] = [];
  isLoadingServices = false;
  isLoadingPhotos = false;
  errorMessage: string | null = null;
  activeTab: string = 'presentation';
  isLoggedIn = false;
  isBrowser: boolean;
  
  // Propriétés pour les disponibilités
  weekDays: any[] = [];
  selectedDate: Date | null = null;
  currentWeekStart: Date = new Date();
  salonId: number = 0;
  recentAvis: any[] = [];
  isLoadingAvis = false;
  constructor(
    @Optional() public dialogRef: MatDialogRef<SalonDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { salonId: number } | null,
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object,
    private reservationService: ReservationService,
    private router: Router
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.salonId = data?.salonId || 0;
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.isLoggedIn = this.authService.isAuthenticated();
    } else {
      this.isLoggedIn = false;
    }

    if (this.salonId > 0) {
      this.loadSalonDetails();
    } else {
      this.errorMessage = 'ID de salon invalide';
    }
  }

  loadSalonDetails(): void {


    this.salonService.getSalonById(this.salonId).subscribe({
      next: (salon) => {
        const rawUrl = salon?.photoProfilUrl || salon?.photoProfil;
        if (rawUrl) {
          salon.photoProfil = this.processImageUrl(rawUrl);
        } else {
          salon.photoProfil = null;
        }

        this.salon = salon;

        if (salon) {
          this.loadSalonServices();
          this.loadSalonPhotos();
          this.initializeAvailability();
          this.loadSalonAvis();
        } else {
          this.errorMessage = 'Salon non trouvé';
        }
      },
      error: (error) => {
        console.error(' Erreur lors du chargement du salon:', error);
        this.errorMessage = `Impossible de charger les détails du salon: ${error.message || 'Erreur inconnue'}`;
      }
    });
  }

  loadSalonServices(): void {

    this.isLoadingServices = true;

    this.serviceSalonService.getServicesBySalon(this.salonId).subscribe({
      next: (services) => {


        if (!services) {
          console.warn(' La réponse services est undefined ou null');
          this.services = [];
        } else if (!Array.isArray(services)) {
          console.warn(' La réponse n\'est pas un tableau:', services);
          this.services = [];
        } else {
          this.services = services;
        }

        this.isLoadingServices = false;

        
        // Debug: Afficher la structure du premier service
        if (this.services.length > 0) {






        }
      },
      error: (error) => {
        console.error(' Erreur lors du chargement des services:', error);
        this.services = [];
        this.isLoadingServices = false;
      }
    });
  }

  //  MÉTHODE CORRIGÉE - Chargement des photos
  // Dans salon-details.component.ts
loadSalonPhotos(): void {

  this.isLoadingPhotos = true;

  //  Cast explicite pour éviter l'erreur TypeScript
  (this.salonService.getSalonPhotos(this.salonId) as Observable<any>).subscribe({
    next: (response: any) => {


      //  Gérer les différents formats de réponse
      let photos: any[] = [];

      // Vérifier si response est un objet avec photos
      if (response && typeof response === 'object' && !Array.isArray(response) && 'photos' in response) {
        photos = Array.isArray(response.photos) ? response.photos : [];

      }
      // Vérifier si response est directement un tableau
      else if (Array.isArray(response)) {
        photos = response;

      }
      // Fallback
      else {
        console.warn(' Format de réponse photos non reconnu:', response);
        photos = [];
      }

      //  Traitement et validation des photos
      this.photos = this.processPhotos(photos);
      this.isLoadingPhotos = false;


    },
    error: (error) => {
      console.error(' Erreur lors du chargement des photos:', error);
      this.photos = [];
      this.isLoadingPhotos = false;
    }
  });
}

  loadSalonAvis(): void {

    this.isLoadingAvis = true;

    this.reservationService.getAvisBySalon(this.salonId).subscribe({
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
            const dateA = new Date(a.dateCreation || a.createdAt);
            const dateB = new Date(b.dateCreation || b.createdAt);
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

  //  NOUVELLE MÉTHODE - Traitement des photos avec URLs
  private processPhotos(photos: any[]): any[] {
    if (!Array.isArray(photos)) return [];

    return photos
      .filter(photo => photo && (photo.url || photo.imageUrl))
      .map(photo => {
        const originalUrl = photo.url || photo.imageUrl || photo.src;

        return {
          ...photo,
          url: originalUrl, // URL originale
          processedUrl: this.processImageUrl(originalUrl), // URL traitée
          alt: `Photo de ${this.salon?.nom || 'salon'}`,
          id: photo.id || Math.random()
        };
      });
  }

  //  MÉTHODE DE TRAITEMENT D'URL D'IMAGE
  private processImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/placeholders/salon-coiffure-1.jpg';



    // Si c'est déjà une URL complète
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Si c'est un chemin relatif /uploads
    if (imageUrl.startsWith('/uploads/')) {
      return `http://localhost:8081${imageUrl}`;
    }

    // Si c'est juste un nom de fichier
    if (!imageUrl.includes('/')) {
      return `http://localhost:8081/uploads/${imageUrl}`;
    }

    // Si c'est un chemin assets
    if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('assets/')) {
      return imageUrl;
    }

    // Fallback
    return `http://localhost:8081/uploads/${imageUrl}`;
  }

  //  GESTIONNAIRE D'ERREUR D'IMAGE
  onImageError(event: any, photo: any): void {
    console.warn(' Erreur chargement image:', event.target.src);

    // Essayer l'URL originale si on utilisait l'URL traitée
    if (event.target.src === photo.processedUrl && photo.url !== photo.processedUrl) {

      event.target.src = photo.url;
      return;
    }

    // Essayer des fallbacks
    const fallbacks = [
      'assets/images/placeholders/salon-coiffure-1.jpg',
      'assets/images/placeholders/salon-manucure.jpg',
      'assets/images/placeholders/salon-coiffeur.jpg'
    ];

    const currentSrc = event.target.src;
    const currentIndex = fallbacks.findIndex(fallback => currentSrc.includes(fallback));

    if (currentIndex < fallbacks.length - 1) {
      event.target.src = fallbacks[currentIndex + 1];
    } else {
      // Créer un placeholder
      this.createImagePlaceholder(event.target);
    }
  }

  //  CALLBACK SUCCÈS IMAGE
  onImageLoad(event: any, photo: any): void {

    event.target.style.opacity = '1';
    event.target.classList.add('loaded');
  }

  //  CRÉER PLACEHOLDER POUR IMAGE
  private createImagePlaceholder(imgElement: HTMLImageElement): void {
    const container = imgElement.parentElement;
    if (!container) return;

    imgElement.style.display = 'none';

    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';
    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 18px;
      font-weight: bold;
    `;
    placeholder.textContent = '';

    container.style.position = 'relative';
    container.appendChild(placeholder);
  }

  //  MÉTHODE DE DEBUG
  debugPhotos(): void {






    // Test des URLs
    this.photos.forEach((photo, index) => {

      const img = new Image();
      img.onload = () =>
      img.onerror = () => console.error(` Photo ${index + 1} inaccessible`);
      img.src = photo.processedUrl;
    });
  }

  //  MÉTHODES EXISTANTES INCHANGÉES

  closeDialog(): void {
    if (this.dialogRef && this.isBrowser) {
      this.dialogRef.close();
    }
  }

  getStarArray(rating: number): any[] {
    const fullStars = Math.floor(rating || 0);
    return new Array(fullStars);
  }

  hasHalfStar(rating: number): boolean {
    return ((rating || 0) % 1) >= 0.5;
  }

  formatHoraires(horaires: string): string {
    // Si les horaires sont fournis, les retourner
    if (horaires && horaires.trim()) {
      return horaires;
    }
    
    // Sinon, afficher des horaires par défaut cohérents avec les disponibilités
    return 'Lun-Sam 9h-18h, Fermé Dimanche';
  }

  setActiveTab(tab: string): void {

    this.activeTab = tab;

    // Charger les données spécifiques à l'onglet si nécessaire
    if (tab === 'photos' && this.photos.length === 0 && !this.isLoadingPhotos) {

      this.loadSalonPhotos();
    }
    
    if (tab === 'reviews' && this.recentAvis.length === 0 && !this.isLoadingAvis) {

      this.loadSalonAvis();
    }
  }

  bookService(service: any): void {
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
        salon: this.salon,
        type: 'salon'
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
   *  Calculer la note moyenne du salon
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

  // ==========================================
  //  MÉTHODES POUR LES DISPONIBILITÉS
  // ==========================================

  /**
   * Générer la semaine courante avec disponibilités
   */
  generateWeekDays(): void {
    this.weekDays = [];
    const startOfWeek = new Date(this.currentWeekStart);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      
      const dayName = this.getDayName(date);
      const slots = this.generateSlotsForDay(date);
      
      this.weekDays.push({
        date: date,
        name: dayName,
        slots: slots
      });
    }
  }

  /**
   * Générer les créneaux pour un jour donné
   */
  generateSlotsForDay(date: Date): any[] {
    const slots = [];
    const dayOfWeek = date.getDay(); // 0 = Dimanche, 1 = Lundi, etc.
    
    // Simulation des horaires d'ouverture (9h-18h)
    const openingHour = 9;
    const closingHour = 18;
    const slotDuration = 30; // 30 minutes par créneau
    
    // Vérifier si le salon est ouvert ce jour
    if (dayOfWeek === 0) { // Fermé le dimanche
      return [];
    }
    
    for (let hour = openingHour; hour < closingHour; hour++) {
      for (let minute = 0; minute < 60; minute += slotDuration) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const isBooked = Math.random() < 0.3; // 30% de chance d'être réservé
        
        slots.push({
          time: time,
          isBooked: isBooked
        });
      }
    }
    
    return slots;
  }

  /**
   * Obtenir le nom du jour en français
   */
  getDayName(date: Date): string {
    const days = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
    return days[date.getDay()];
  }

  /**
   * Navigation - semaine précédente
   */
  previousWeek(): void {
    const newDate = new Date(this.currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    this.currentWeekStart = newDate;
    this.generateWeekDays();
  }

  /**
   * Navigation - semaine suivante
   */
  nextWeek(): void {
    const newDate = new Date(this.currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    this.currentWeekStart = newDate;
    this.generateWeekDays();
  }

  /**
   * Obtenir le titre de la semaine
   */
  getWeekTitle(): string {
    const endOfWeek = new Date(this.currentWeekStart);
    endOfWeek.setDate(this.currentWeekStart.getDate() + 6);
    
    const startMonth = this.currentWeekStart.toLocaleDateString('fr-FR', { month: 'short' });
    const endMonth = endOfWeek.toLocaleDateString('fr-FR', { month: 'short' });
    
    if (startMonth === endMonth) {
      return `${this.currentWeekStart.getDate()}-${endOfWeek.getDate()} ${startMonth} ${this.currentWeekStart.getFullYear()}`;
    } else {
      return `${this.currentWeekStart.getDate()} ${startMonth} - ${endOfWeek.getDate()} ${endMonth} ${this.currentWeekStart.getFullYear()}`;
    }
  }

  /**
   * Vérifier si une date est aujourd'hui
   */
  isToday(date: Date): boolean {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  /**
   * Vérifier si deux dates sont le même jour
   */
  isSameDay(date1: Date, date2: Date): boolean {
    return date1.toDateString() === date2.toDateString();
  }

  /**
   * Sélectionner une date
   */
  selectDate(date: Date): void {
    this.selectedDate = date;
  }

  /**
   * Obtenir les créneaux du jour sélectionné
   */
  getSelectedDaySlots(): any[] {
    if (!this.selectedDate) return [];
    
    const selectedDay = this.weekDays.find(day => 
      this.isSameDay(day.date, this.selectedDate!)
    );
    
    return selectedDay ? selectedDay.slots : [];
  }

  /**
   * Obtenir la durée des créneaux
   */
  getSlotDuration(): number {
    return 30; // minutes
  }

  /**
   * Obtenir la limite de réservation à l'avance
   */
  getAdvanceBookingLimit(): number {
    return 30; // jours
  }

  /**
   * Initialiser les disponibilités
   */
  initializeAvailability(): void {
    // Démarrer la semaine au lundi
    const today = new Date();
    const dayOfWeek = today.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    
    this.currentWeekStart = new Date(today);
    this.currentWeekStart.setDate(today.getDate() + daysToMonday);
    
    this.generateWeekDays();
    
    // Sélectionner aujourd'hui par défaut si c'est dans la semaine courante
    if (dayOfWeek !== 0 && dayOfWeek >= 1 && dayOfWeek <= 6) {
      this.selectedDate = today;
    }
  }
}
