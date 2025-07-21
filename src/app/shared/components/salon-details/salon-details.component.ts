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
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
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
  salonId: number = 0;

  constructor(
    @Optional() public dialogRef: MatDialogRef<SalonDetailsComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) public data: { salonId: number } | null,
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private authService: AuthService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    @Inject(PLATFORM_ID) private platformId: Object,
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
    console.log('🏢 Chargement des détails du salon avec ID:', this.salonId);
    
    this.salonService.getSalonById(this.salonId).subscribe({
      next: (salon) => {
        console.log('✅ Salon récupéré:', salon);
        
        this.salon = salon;
        
        if (salon) {
          this.loadSalonServices();
          this.loadSalonPhotos();
        } else {
          this.errorMessage = 'Salon non trouvé';
        }
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du salon:', error);
        this.errorMessage = `Impossible de charger les détails du salon: ${error.message || 'Erreur inconnue'}`;
      }
    });
  }

  loadSalonServices(): void {
    console.log('🛎️ Chargement des services pour le salon ID:', this.salonId);
    this.isLoadingServices = true;
    
    this.serviceSalonService.getServicesBySalon(this.salonId).subscribe({
      next: (services) => {
        console.log('✅ Services récupérés:', services);
        
        if (!services) {
          console.warn('⚠️ La réponse services est undefined ou null');
          this.services = [];
        } else if (!Array.isArray(services)) {
          console.warn('⚠️ La réponse n\'est pas un tableau:', services);
          this.services = [];
        } else {
          this.services = services;
        }
        
        this.isLoadingServices = false;
        console.log(`📊 Nombre de services chargés: ${this.services.length}`);
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des services:', error);
        this.services = [];
        this.isLoadingServices = false;
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE - Chargement des photos
  // Dans salon-details.component.ts
loadSalonPhotos(): void {
  console.log('📸 Début chargement photos pour salon ID:', this.salonId);
  this.isLoadingPhotos = true;
  
  // ✅ Cast explicite pour éviter l'erreur TypeScript
  (this.salonService.getSalonPhotos(this.salonId) as Observable<any>).subscribe({
    next: (response: any) => {
      console.log('📥 Réponse photos brute:', response);
      
      // ✅ Gérer les différents formats de réponse
      let photos: any[] = [];
      
      // Vérifier si response est un objet avec photos
      if (response && typeof response === 'object' && !Array.isArray(response) && 'photos' in response) {
        photos = Array.isArray(response.photos) ? response.photos : [];
        console.log(`✅ Format objet détecté: ${photos.length} photos`);
      } 
      // Vérifier si response est directement un tableau
      else if (Array.isArray(response)) {
        photos = response;
        console.log(`✅ Format tableau détecté: ${photos.length} photos`);
      } 
      // Fallback
      else {
        console.warn('⚠️ Format de réponse photos non reconnu:', response);
        photos = [];
      }
      
      // ✅ Traitement et validation des photos
      this.photos = this.processPhotos(photos);
      this.isLoadingPhotos = false;
      
      console.log(`📊 Photos finales chargées: ${this.photos.length}`);
    },
    error: (error) => {
      console.error('❌ Erreur lors du chargement des photos:', error);
      this.photos = [];
      this.isLoadingPhotos = false;
    }
  });
}
  // ✅ NOUVELLE MÉTHODE - Traitement des photos avec URLs
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

  // ✅ MÉTHODE DE TRAITEMENT D'URL D'IMAGE
  private processImageUrl(imageUrl: string): string {
    if (!imageUrl) return 'assets/images/salon-placeholder.jpg';
    
    console.log('🔧 Traitement URL image:', imageUrl);
    
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

  // ✅ GESTIONNAIRE D'ERREUR D'IMAGE
  onImageError(event: any, photo: any): void {
    console.warn('❌ Erreur chargement image:', event.target.src);
    
    // Essayer l'URL originale si on utilisait l'URL traitée
    if (event.target.src === photo.processedUrl && photo.url !== photo.processedUrl) {
      console.log('🔄 Tentative avec URL originale');
      event.target.src = photo.url;
      return;
    }
    
    // Essayer des fallbacks
    const fallbacks = [
      'assets/images/salon-placeholder.jpg',
      'assets/images/default-salon.jpg',
      'assets/images/no-image.jpg'
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

  // ✅ CALLBACK SUCCÈS IMAGE
  onImageLoad(event: any, photo: any): void {
    console.log('✅ Image chargée avec succès:', photo.processedUrl);
    event.target.style.opacity = '1';
    event.target.classList.add('loaded');
  }

  // ✅ CRÉER PLACEHOLDER POUR IMAGE
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
    placeholder.textContent = '📷';
    
    container.style.position = 'relative';
    container.appendChild(placeholder);
  }

  // ✅ MÉTHODE DE DEBUG
  debugPhotos(): void {
    console.log('🔍 DEBUG Photos:');
    console.log('- Salon ID:', this.salonId);
    console.log('- Photos loading:', this.isLoadingPhotos);
    console.log('- Photos array:', this.photos);
    console.log('- Photos count:', this.photos.length);
    
    // Test des URLs
    this.photos.forEach((photo, index) => {
      console.log(`Test photo ${index + 1}:`, photo.processedUrl);
      const img = new Image();
      img.onload = () => console.log(`✅ Photo ${index + 1} accessible`);
      img.onerror = () => console.error(`❌ Photo ${index + 1} inaccessible`);
      img.src = photo.processedUrl;
    });
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES

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
    return horaires || 'Horaires non disponibles';
  }

  setActiveTab(tab: string): void {
    console.log(`🔄 Changement d'onglet: ${this.activeTab} → ${tab}`);
    this.activeTab = tab;
    
    // Charger les données spécifiques à l'onglet si nécessaire
    if (tab === 'photos' && this.photos.length === 0 && !this.isLoadingPhotos) {
      console.log('📸 Rechargement des photos pour l\'onglet');
      this.loadSalonPhotos();
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

    const dialogRef = this.dialog.open(BookingDialogComponent, {
      width: '500px',
      data: {
        service: service,
        salon: this.salon
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
}