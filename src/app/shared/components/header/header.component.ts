import { Component, OnInit, OnDestroy, AfterViewInit, inject, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HeaderService } from '../../services/header/header.service';
import { FormsModule } from '@angular/forms';
import { RoleRedirectService } from '../../../core/services/auth/role-redirect.service';
import { SalonService } from '../../services/salons/salons.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactComponent } from '../contact/contact.component';
import { SalonDetailsComponent } from '../salon-details/salon-details.component';
import { AuthentComponent } from '../../../shared/components/authent/authent.component';
import { RegisterComponent } from '../../../shared/components/register/register.component';
import { AuthUIService } from '../../services/authUI/auth-ui.service';
import { AuthService } from '../../../core/servces/auth.service';
import { forkJoin, Subject, of, catchError } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FreelanceDetailsComponent } from '../../../freelance/components/freelance-details/freelance-details.component';
import { ReservationService } from '../../services/reservation/reservation.service';
import {MatChip} from '@angular/material/chips';
import { MatIcon } from '@angular/material/icon';
import { HairstyleGeneratorService, HairstyleResponse } from '../../../gemini/HairstyleGeneratorService';
import { FreelanceService } from '../../../freelance/services/freelance.service';

// ===============================================
// INTERFACES POUR LES NOUVELLES FONCTIONNALITÉS
// ===============================================

interface ServiceStats {
  [serviceName: string]: {
    salon: number;
    freelance: number;
    total: number;
  };
}
interface SearchResponse {
  freelances?: any[]; // Ou un tableau de votre interface Freelance
  total: number;
  searchType: 'EXACT' | 'RELAXED_CRITERIA' | 'GEOLOCATED_FALLBACK' | 'KEYWORD_FALLBACK';
  appliedGeolocation: boolean;
  criteria: any; // Les critères de recherche appliqués par le backend
  matchReason?: string;
  searchLevel?: string;
  isPopularFallback?: boolean;
  relaxedCriteria?: string[]; // Liste des critères qui ont été assouplis
  hasExactMatches?: boolean;
  meta?: any; // Pour d'autres métadonnées
  error?: string; // En cas d'erreur
}
interface EnhancedProviderData {
  id: number;
  nom: string;
  prenom?: string;  //  Prénom pour les freelances
  imageUrl?: string;
  adresse: string;
  ville?: string;  //  Ville
  rating: number;
  reviewCount: number;
  services: string[];
  specialite?: string;  //  Spécialité principale
  competences?: string;  //  Compétences
  priceRange?: string;
  type?: 'salon' | 'freelance';
  experience?: number;
  anneesExperience?: number;  //  Années d'expérience
  availability?: string;
  description?: string;
  telephone?: string;
  email?: string;
  website?: string;
  horaires?: any;
  profession?: string;
  distanceKm?: number; // Distance ajoutée pour les freelances
  formattedNote?: string; // Note formatée pour l'affichage
  prixRange?: string; // Gamme de prix pour les freelances
  isNearby?: boolean;
  isWellRated?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
  deplacementInclus?: boolean;
}

interface PhotosResponse {
  photos: any[];
  total: number;
  salonId: number;
}

interface ServiceStatsResponse {
  [serviceName: string]: {
    salon: number;
    freelance: number;
    total: number;
  };
}

interface SearchResponse {
  providers: any[];
  total: number;
  searchMode: string;
  providerType: string;
}

interface FlexibleSearchCriteria {
  searchTerm?: string;
  location?: {
    coordinates?: string;
    textLocation?: string;
    hasLocation: boolean;
  };
  budget?: {
    maxBudget: number;
    hasBudget: boolean;
  };
  schedule?: {
    date?: string;
    time?: string;
    hasSchedule: boolean;
  };
  photo?: {
    hasPhoto: boolean;
    photoFile?: File;
  };
  providerType: 'salon' | 'freelance' | 'both';
  searchMode: 'location' | 'photo' | 'text';
  activeCriteria: string[];
}

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule,
    RegisterComponent,
    AuthentComponent,
    // AuthentComponent,
    // RegisterComponent,
    // MatChip,
    // MatIcon,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
[x: string]: any;


  private cdr = inject(ChangeDetectorRef);
  public headerService = inject(HeaderService);
  private roleRedirectService = inject(RoleRedirectService);
  private snackBar = inject(MatSnackBar);
  isFreelancePage: boolean = false;
  private dialog = inject(MatDialog);
  private router = inject(Router);
  showLoginModal: boolean = false;
  showRegisterModal: boolean = false;
  filteredSalons: EnhancedProviderData[] = [];
  selectedService: string | null = null;
  isLoading = false;
  Math = Math;
  public user: any;
 searchResponse: SearchResponse | undefined;
  //  Métadonnées de recherche intelligente
  searchMetadata: {
    matchReason?: string;
    searchLevel?: string;
    isPopularFallback?: boolean;
    relaxedCriteria?: string[];
    hasExactMatches?: boolean;
    searchType?: string;
    total?: number;
  } | null = null;
  isMobileMenuOpen = false;
  isServicesDropdownOpen = false;
  salons: any[] = [];
  searchTerm: string = '';
  isBrowser: boolean;
  private authService = inject(AuthService);
  private authUIService: AuthUIService;
  isProfileMenuOpen = false;
  showAdvancedSearch: boolean = false;
  uploadedPhoto: File | null = null;
  uploadedPhotoPreview: string | null = null;
  budgetRange: number = 2000;
  selectedDate: string = '';
  selectedTime: string = '';
  userLocation: string | null = null;
  locationInput: string = '';
  minDate: string = '';

  clientName = '';
  nextAppointment: any = null;
  upcomingReservations: any[] = [];
  allClientReservations: any[] = [];
  clientSuggestions: any[] = [];

  //  Propriétés pour le carrousel de suggestions
  currentSuggestionIndex = 0;
  suggestionCardsVisible = 3; // Nombre de cartes visibles à la fois
  suggestionCardWidth = 320; // Largeur d'une carte en px
  searchFromSuggestion = false; //  Pour éviter que les suggestions disparaissent lors d'un clic

  // Compteurs pour badges
  upcomingCount = 0;
  toRateCount = 0;

  // État UI
  welcomeBannerDismissed = false;
  widgetMinimized = true; // Commencer minimisé
  showQuickActions = true;
  loadingClientData = false;
  // ===============================================
  // PROPRIÉTÉS POUR L'INTÉGRATION FREELANCES
  // ===============================================

  selectedProviderType: 'salon' | 'freelance' | 'both' = 'salon';
  searchMode: 'location' | 'photo' | 'text' = 'location';
  viewMode: 'grid' | 'list' = 'grid';

  //  Propriété unifiée pour les résultats de recherche
  allProviders: any[] = [];

  //  Propriétés pour l'infinite scroll
  displayedProviders: any[] = [];
  allResultsCache: any[] = []; // Cache de tous les résultats
  currentPage: number = 0;
  itemsPerPage: number = 8; // Initial load
  itemsPerLoad: number = 6; // Subsequent loads
  isLoadingMore: boolean = false;
  hasMoreResults: boolean = true;
  totalResultsCount: number = 0;

  serviceStats: ServiceStats = {};
  public isLoggedIn: boolean = false;
  public isClient: boolean = false;
  public isEmployeur: boolean = false;
  public isFreelance: boolean = false;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
  experienceMin?: number;
  typeIntervention?: 'DOMICILE' | 'SALON' | 'STUDIO_PRIVE' | 'MIXTE';
  deplacementInclus?: boolean;
  isAnalyzingPhoto = false;
  detectedHairstyles: string[] = [];
  photoAnalysisError: string | null = null;

  // ===============================================
  // FAVORIS
  // ===============================================
  private likedProviderIds: Set<string> = new Set();
  // ===============================================
  // PROPRIÉTÉS POUR LA RECHERCHE FLEXIBLE
  // ===============================================

  private flexibleCriteria: any = {};
  private activeCriteriaCount: number = 0;

  // Subject pour gérer la destruction du composant
  private destroy$ = new Subject<void>();
  public isPageLoading = true;

  constructor(
    private salonService: SalonService,
    private reservationService: ReservationService,
    private freelanceService: FreelanceService,
    @Inject(PLATFORM_ID) private platformId: Object,
    private hairstyleService: HairstyleGeneratorService,

    authUIService: AuthUIService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.authUIService = authUIService;

  }







 ngOnInit(): void {

  //  Adapter le nombre de cartes selon la taille d'écran
  this.updateCarouselConfig();
  this.loadFavorites();

  this.authService.currentUser$
    .pipe(takeUntil(this.destroy$))
    .subscribe(user => {
      this.user = user;
      this.isLoggedIn = !!user;
      this.isClient = user && user.role === 'CLIENT';
      this.isFreelance = user && user.role === 'FREELANCE';
      this.isEmployeur = user && user.role === 'EMPLOYEUR';
       this.checkAuthAndLoadClientData();
       this.loadWelcomeBannerState();

      //      //      //      //      //
      this.updateBodyClasses();
      this.cdr.detectChanges();
    });

  if (this.isBrowser) {
    this.setupModalSubscriptions();
  }

  // Initialisation des dates
  const today = new Date();
  this.minDate = today.toISOString().split('T')[0];
  this.selectedDate = this.minDate;

  const hours = today.getHours();
  const minutes = today.getMinutes() > 30 ? '00' : '30';
  const nextHour = minutes === '00' ? (hours + 1) % 24 : hours;
  this.selectedTime = `${nextHour.toString().padStart(2, '0')}:${minutes}`;

  // Restaurer les paramètres de recherche
  if (this.isBrowser) {
    this.tryRestoreSearchParams();
    // this.loadServiceStats(); // Désactivé - statistiques non utilisées
  }

  // Suivre la navigation
  if (this.isBrowser) {
    this.router.events
      .pipe(takeUntil(this.destroy$))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          if (this.isMobileMenuOpen) {
            this.toggleMobileMenu();
          }
          this.isFreelancePage = event.url.includes('freelance-dashboard');
          this.updateBodyClasses();
        }
      });
  }

  // Délai de sécurité pour éviter l'ouverture automatique
  setTimeout(() => {
    this.isPageLoading = false;
    this.cdr.detectChanges();
  }, 500);

  // Initialiser la recherche flexible après un délai
  if (this.isBrowser) {
    setTimeout(() => {
      this.initializeFlexibleSearch();
    }, 1000);
  }
}

  // Configuration sécurisée des souscriptions aux modals
  private setupModalSubscriptions(): void {
    // Souscription au modal de connexion avec protection
    this.authUIService.showLoginModal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {

        // Protection contre l'ouverture automatique pendant le chargement
        if (this.isPageLoading) {
          return;
        }


        if (shouldShow === true && !this.showLoginModal) {
          this.showLoginModal = true;
          this.showRegisterModal = false;
          this.cdr.detectChanges();
        } else if (shouldShow === false && this.showLoginModal) {
          this.showLoginModal = false;
          this.cdr.detectChanges();
        } else {
        }
      });

    // Souscription au modal d'inscription avec protection
    this.authUIService.showRegisterModal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {

        // Protection contre l'ouverture automatique pendant le chargement
        if (this.isPageLoading) {
          return;
        }

        if (shouldShow === true && !this.showRegisterModal) {
          this.showRegisterModal = true;
          this.showLoginModal = false;
          this.cdr.detectChanges();
        } else if (shouldShow === false && this.showRegisterModal) {
          this.showRegisterModal = false;
          this.cdr.detectChanges();
        }
      });
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    import('motion').then(({ animate }) => {
      const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

      const anim = (sel: string, kf: Record<string, any>, opts: Record<string, any>) => {
        document.querySelectorAll<HTMLElement>(sel).forEach(el => animate(el as any, kf, opts));
      };

      if (prefersReducedMotion) return;

      // ── Côté gauche ───────────────────────────────────────────────────────
      anim('.header-title',        { opacity: [0, 1], transform: ['translateY(28px)', 'translateY(0px)'] }, { duration: 0.75, ease: EASE });
      anim('.header-title2',       { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.65, delay: 0.15, ease: EASE });
      anim('.provider-toggle',     { opacity: [0, 1], transform: ['translateY(14px)', 'translateY(0px)'] }, { duration: 0.60, delay: 0.28, ease: EASE });
      anim('.enhanced-search-bar', { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.65, delay: 0.42, ease: EASE });
      anim('.dual-service-nav',    { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] }, { duration: 0.60, delay: 0.55, ease: EASE });

      document.querySelectorAll<HTMLElement>('.service-btn').forEach((btn, i) => {
        animate(btn as any,
          { opacity: [0, 1], transform: ['translateY(22px) scale(0.94)', 'translateY(0px) scale(1)'] },
          { duration: 0.50, delay: 0.70 + i * 0.07, ease: EASE }
        );
      });

      // ── Côté droit — image + miniatures ──────────────────────────────────
      anim('.hero-image', { opacity: [0, 1], transform: ['translateX(36px)', 'translateX(0px)'] }, { duration: 0.85, delay: 0.10, ease: EASE });

      document.querySelectorAll<HTMLElement>('.floating-thumb').forEach((thumb, i) => {
        animate(thumb as any,
          { opacity: [0, 1], transform: ['translateX(24px) scale(0.9)', 'translateX(0px) scale(1)'] },
          { duration: 0.55, delay: 0.55 + i * 0.15, ease: EASE }
        );
      });

      anim('.hero-text', { opacity: [0, 1], transform: ['translateY(22px)', 'translateY(0px)'] }, { duration: 0.60, delay: 0.70, ease: EASE });

      // ── Boucles flottantes continues ──────────────────────────────────────
      setTimeout(() => {
        document.querySelectorAll<HTMLElement>('.floating-thumb').forEach((thumb, i) => {
          animate(thumb as any,
            { transform: ['translateY(0px)', 'translateY(-6px)', 'translateY(0px)'] },
            { duration: 3.2 + i * 0.7, repeat: Infinity, ease: 'easeInOut', delay: i * 0.5 }
          );
        });

        const quote = document.querySelector<HTMLElement>('.hero-text');
        if (quote) {
          animate(quote as any,
            { transform: ['translateY(0px)', 'translateY(-8px)', 'translateY(0px)'] },
            { duration: 4.2, repeat: Infinity, ease: 'easeInOut' }
          );
        }
      }, 1500);
    }).catch(() => {});
  }

  // Nettoyage des souscriptions
  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===============================================
  //  MÉTHODES CORRIGÉES - ROUTAGE INTELLIGENT
  // ===============================================

  /**
   *  NOUVELLE MÉTHODE : Routage intelligent selon le type
   */
  openDetailDialog(provider: EnhancedProviderData): void {

    if (!this.isBrowser) return;

    if (!provider || !provider.id) {
      console.error('Provider invalide:', provider);
      return;
    }

    //  ROUTAGE INTELLIGENT SELON LE TYPE
    if (provider.type === 'freelance') {
      this.openFreelanceDetailDialog(provider.id);
    } else {
      this.openSalonDetailDialog(provider.id);
    }
  }

  /**
   *  MÉTHODE CORRIGÉE : Modal freelance
   */
  openFreelanceDetailDialog(freelanceId: number): void {

    if (!this.isBrowser) return;

    if (!freelanceId) {
      console.error('ID freelance invalide:', freelanceId);
      return;
    }

    try {

      const dialogRef = this.dialog.open(FreelanceDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { freelanceId: freelanceId },
        panelClass: 'freelance-detail-dialog-container',
        autoFocus: false,
        hasBackdrop: true,
        disableClose: true, // Empêche la fermeture par clic sur le backdrop ou ESC
        backdropClass: 'transparent-backdrop'
      });

      dialogRef.afterClosed().subscribe(result => {
      });
    } catch (error) {
      console.error('Erreur ouverture dialogue freelance:', error);
      this.snackBar.open('Impossible d\'ouvrir les détails du freelance', 'OK', {
        duration: 5000
      });
    }
  }

  /**
   * MÉTHODE CORRIGÉE : Modal salon
   */
  openSalonDetailDialog(salonId: number): void {

    if (!this.isBrowser) {
      return;
    }

    if (!salonId) {
      console.error('ID de salon invalide:', salonId);
      return;
    }

    try {

      const dialogRef = this.dialog.open(SalonDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { salonId: salonId },
        panelClass: 'salon-detail-dialog-container',
        autoFocus: false,
        disableClose: true, // Empêche la fermeture par clic sur le backdrop ou ESC
      });


      dialogRef.afterOpened().subscribe(() => {
      });

      dialogRef.afterClosed().subscribe(result => {
      });
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du dialogue salon:', error);

      const errorMessage = error instanceof Error ? error.message : 'Inconnue';
      this.snackBar.open('Impossible d\'ouvrir les détails du salon. Erreur: ' + errorMessage, 'OK', {
        duration: 5000
      });
    }
  }

  // ===============================================
  //  MÉTHODES FREELANCES AMÉLIORÉES
  // ===============================================

  /**
   *  NOUVELLE MÉTHODE : Vérifier si on affiche les critères freelances
   */
  showFreelanceCriteria(): boolean {
    return this.selectedProviderType === 'freelance' || this.selectedProviderType === 'both';
  }

  /**
   *  NOUVELLE MÉTHODE : Vérifier si on a des critères freelances actifs
   */
  hasFreelanceCriteria(): boolean {
    return !!(this.disponibleWeekend || this.disponibleSoir || this.experienceMin || this.deplacementInclus);
  }

  /**
   *  NOUVELLE MÉTHODE : Obtenir la liste des critères freelances actifs
   */
  getActiveFreelanceCriteria(): string[] {
    const criteria: string[] = [];

    if (this.disponibleWeekend) criteria.push('weekend');
    if (this.disponibleSoir) criteria.push('soirée');
    if (this.experienceMin) criteria.push(`${this.experienceMin}+ ans exp`);
    if (this.deplacementInclus) criteria.push('déplacement inclus');

    return criteria;
  }

  /**
   *  NOUVELLE MÉTHODE : Effacer spécifiquement les critères freelances
   */
  clearOnlyFreelanceCriteria(): void {
    this.disponibleWeekend = undefined;
    this.disponibleSoir = undefined;
    this.experienceMin = undefined;
    this.typeIntervention = undefined;
    this.deplacementInclus = undefined;

    this.snackBar.open('Critères freelances effacés', '', { duration: 2000 });

    // Relancer la recherche si on a toujours des termes
    if (this.searchTerm?.trim()) {
      setTimeout(() => {
        this.searchSalonsAdvanced();
      }, 500);
    }
  }

  /**
   *  NOUVELLE MÉTHODE : Message contextuel selon le type
   */
  getContextualMessage(count: number, type: string): string {
    const typeLabel = type === 'salon' ? 'salon(s)' :
                      type === 'freelance' ? 'freelance(s)' :
                      'professionnel(s)';

    let message = `${count} ${typeLabel} trouvé(s)`;

    if (type === 'freelance' && this.hasFreelanceCriteria()) {
      const criteria = this.getActiveFreelanceCriteria();
      message += ` avec critères: ${criteria.join(', ')}`;
    }

    return message;
  }

  // ===============================================
  // MÉTHODES POUR L'INTÉGRATION FREELANCES (CONSERVÉES ET AMÉLIORÉES)
  // ===============================================

  /**
   * Sélectionner le type de professionnel (salon, freelance, ou les deux)
   */
  selectProviderType(type: 'salon' | 'freelance' | 'both'): void {
    this.selectedProviderType = type;

    // Notification discrète du changement
    this.snackBar.open(
      `Recherche configurée pour : ${this.getProviderTypeLabel()}`,
      '',
      {
        duration: 2000,
        horizontalPosition: 'center',
        verticalPosition: 'bottom',
        panelClass: ['subtle-snackbar']
      }
    );

    // Si un service est déjà sélectionné, relancer la recherche
    if (this.selectedService) {
      this.filterSalonsByService(this.selectedService);
    }

    // Mettre à jour les statistiques affichées
    this.updateServiceCounters();

  }

  /**
   * Définir le mode de recherche (localisation, photo, texte libre)
   */
  setSearchMode(mode: 'location' | 'photo' | 'text'): void {
    this.searchMode = mode;

    // Nettoyer la photo si on passe à un autre mode
    if (mode !== 'photo' && this.uploadedPhoto) {
      this.removePhoto();
    }

  }

  /**
   *  MÉTHODE MISE À JOUR: Charger les statistiques unifiées
   */
  private loadServiceStats(): void {

    this.salonService.getFreelanceStatistics().subscribe({

      next: (stats: ServiceStats) => {
        this.serviceStats = stats;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error(' Erreur statistiques unifiées:', error);
        // Utiliser des données par défaut en cas d'erreur
        this.serviceStats = {
          'Coiffure': { salon: 15, freelance: 8, total: 23 },
          'Pedicure, Manucure': { salon: 8, freelance: 12, total: 20 },
          'Barber': { salon: 12, freelance: 5, total: 17 },
          'Maquillage': { salon: 5, freelance: 14, total: 19 },
          'Soins de la peau': { salon: 7, freelance: 3, total: 10 }
        };
        this.cdr.detectChanges();
      }
    });
  }

  /**
   * Mettre à jour les compteurs de services affichés
   */
  private updateServiceCounters(): void {
    this.cdr.detectChanges();
  }

  /**
   * Retourner le nombre de professionnels pour un service donné
   */
  getServiceCount(service: string): string {
    const stats = this.serviceStats[service];
    if (!stats) return '0';

    let count: number;
    let label: string;

    switch (this.selectedProviderType) {
      case 'salon':
        count = stats.salon || 0;
        label = count === 1 ? 'salon' : 'salons';
        break;
      case 'freelance':
        count = stats.freelance || 0;
        label = count === 1 ? 'freelance' : 'freelances';
        break;
      case 'both':
        count = stats.total || 0;
        label = 'pros';
        break;
    }

    return `${count} ${label}`;
  }

  /**
   * Retourner la classe CSS pour l'indicateur de type de professionnel
   */
  getProviderIndicatorClass(service: string): string {
    const stats = this.serviceStats[service];
    if (!stats) return 'both';

    if (this.selectedProviderType === 'salon') return 'salon';
    if (this.selectedProviderType === 'freelance') return 'freelance';
    return 'both';
  }

  /**
   * Retourner le nombre total de professionnels disponibles
   */
  private getTotalProvidersCount(): number {
    let total = 0;
    Object.values(this.serviceStats).forEach((stats: any) => {
      if (this.selectedProviderType === 'salon') {
        total += stats.salon || 0;
      } else if (this.selectedProviderType === 'freelance') {
        total += stats.freelance || 0;
      } else {
        total += stats.total || 0;
      }
    });
    return total;
  }

  /**
   * Retourner le label du type de professionnel sélectionné
   */
  getProviderTypeLabel(): string {
    switch (this.selectedProviderType) {
      case 'salon': return 'Salons';
      case 'freelance': return 'Freelances';
      case 'both': return 'Professionnels';
    }
  }

  /**
   * Retourner le type alternatif pour les suggestions
   */
  getAlternativeProviderType(): string {
    switch (this.selectedProviderType) {
      case 'salon': return 'Freelances';
      case 'freelance': return 'Salons';
      case 'both': return 'Tous';
    }
  }

  /**
   * Retourner le texte des statistiques de service
   */
  getServiceStatsText(): string {
    const total = this.getTotalProvidersCount();
    return `${total} professionnels disponibles dans votre région`;
  }

  /**
   * Définir le mode d'affichage (grille ou liste)
   */
  setViewMode(mode: 'grid' | 'list'): void {
    this.viewMode = mode;
  }

  /**
   * Retourner l'icône appropriée pour le type de professionnel
   */
  getProviderIcon(type?: string): string {
    switch (type) {
      case 'freelance': return 'fa-user-tie';
      case 'salon': return 'fa-store';
      default: return 'fa-store';
    }
  }

  /**
   * Retourner le label approprié pour le type de professionnel
   */
  getProviderLabel(type?: string): string {
    switch (type) {
      case 'freelance': return 'Freelance';
      case 'salon': return 'Salon';
      default: return 'Salon';
    }
  }

  // ===============================================
  //  MÉTHODES DE ROUTAGE INTELLIGENT AMÉLIORÉES
  // ===============================================

  /**
   *  MÉTHODE MISE À JOUR: Filtrer par service avec routage automatique
   */
  filterSalonsByService(service: string): void {

    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    if (this.selectedService === service) {
      this.selectedService = null;
      this.filteredSalons = [];
      return;
    }

    this.isLoading = true;
    this.selectedService = service;
    this.resetPagination();

    //  RECHERCHE RAPIDE: toujours combinée (salons + freelances)
    const ville = this.locationInput || null;
    this.salonService.getSalonsByService(service, 'both', ville, 'both').subscribe({
      next: (results) => {
        this.filteredSalons = this.processSalonData(results);

        //  Initialiser la pagination avec infinite scroll
        this.allProviders = this.filteredSalons;
        this.initializePaginatedResults(this.filteredSalons);
        this.isLoading = false;

        // Message contextuel pour recherche combinée
        const message = this.getContextualMessage(results.length, 'both');
        this.snackBar.open(message, '', { duration: 3000 });
      },
      error: (error) => {
        console.error(` Erreur recherche ${service} (RECHERCHE COMBINÉE):`, error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   *  MÉTHODE MISE À JOUR: Recherche avancée avec support freelances
   */
  /**
   * Méthode pour recherche manuelle (réinitialise le flag suggestion)
   */
  performManualSearch(): void {
    this.searchFromSuggestion = false; //  Réinitialiser le flag
    this.searchSalonsAdvanced();
  }

  searchSalonsAdvanced(): void {

    if (!this.isBrowser) return;

    // Vérifier qu'on a au moins un critère
    if (!this.hasValidSearchCriteria()) {
      this.snackBar.open('Veuillez entrer au moins un critère de recherche', 'OK', {
        duration: 3000
      });
      return;
    }

    //  VALIDATION STRICTE - Empêcher le mélange géolocalisation/ville
    if (!this.validateLocationLogic()) {
      return;
    }

    this.isLoading = true;

    //  ROUTAGE SELON LE TYPE ET LES CRITÈRES
    if (this.selectedProviderType === 'salon') {
      this.performSalonSearch();
    } else if (this.selectedProviderType === 'freelance') {
      this.performFreelanceSearch();
    } else {
      // both - recherche combinée
      this.performCombinedSearch();
    }
  }

  /**
   *  NORMALISATION RECHERCHE FLOUE
   */
  private normalizeSearchTerm(term: string): string {
    if (!term) return '';

    // 1. Nettoyer et normaliser
    let normalized = term.toLowerCase().trim();

    // 2. Supprimer les accents
    normalized = normalized.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // 3. Synonymes courants pour les services de beauté
    const synonyms: {[key: string]: string} = {
      'coiff': 'coiffure',
      'coiffeur': 'coiffure',
      'coiffeuse': 'coiffure',
      'cheveux': 'coiffure',
      'coupe': 'coiffure',

      'maquillage': 'maquillage',
      'makeup': 'maquillage',
      'make-up': 'maquillage',
      'maquilage': 'maquillage', // faute courante

      'pedicure': 'pedicure',
      'pédicure': 'pedicure',
      'manucure': 'manucure',
      'ongles': 'manucure',

      'barber': 'barber',
      'barbier': 'barber',
      'rasage': 'barber',

      'massage': 'massage',
      'soin': 'soins',
      'soins': 'soins',
      'spa': 'soins'
    };

    // 4. Appliquer les synonymes
    for (const [key, value] of Object.entries(synonyms)) {
      if (normalized.includes(key)) {
        normalized = value;
        break;
      }
    }

    return normalized;
  }

  /**
   *  RECHERCHE SALON (votre logique existante)
   */
  private performSalonSearch(): void {

    //  LOGIQUE MÉTIER CORRIGÉE - Séparer géolocalisation et ville
    const searchData: any = {
      term: this.searchTerm,
      budget: this.budgetRange > 2000 ? this.budgetRange : undefined,
      datetime: this.selectedDate && this.selectedTime ?
                `${this.selectedDate}T${this.selectedTime}:00` : undefined,
      providerType: 'salon'
    };

    //  VILLE STRICTE : Si une ville est spécifiée, recherche stricte
    if (this.locationInput?.trim() && !this.locationInput.includes(',')) {
      searchData.ville = this.locationInput.trim();
      searchData.searchType = 'CITY_STRICT';
    }
    //  GÉOLOCALISATION : Si coordonnées GPS ET pas de ville
    else if (this.userLocation && !this.locationInput?.trim()) {
      searchData.location = this.userLocation;
      searchData.searchType = 'GEOLOCATION';
    }

    // Utiliser votre méthode existante
    this.salonService.searchSalons(searchData).subscribe({
      next: (response: any) => {

        // Stocker les infos de match
        this.searchResponse = response;

        // Vérifier le format de la réponse
        const rawResults = Array.isArray(response) ? response : (response?.results || []);

        // Transformer les résultats salon pour avoir la bonne structure
        const results = rawResults.map((item: any) => {
          if (item.salon) {
            // Structure: {salon: {...}, distance: ..., rating: ...}
            const transformed = {
              ...item.salon,
              distanceKm: item.distance, // Utiliser distanceKm pour le template
              formattedDistance: item.formattedDistance,
              score: item.score,
              matchReason: item.matchReason,
              type: 'salon',
              // Transformer les services pour l'affichage
              services: item.salon.serviceNoms || item.salon.services || []
            };


            return transformed;
          }
          return item;
        });

        this.handleSearchSuccess(results, 'salon');
      },
      error: (error) => this.handleSearchError(error)
    });
  }

  /**
   *  RECHERCHE FREELANCE avec critères spécialisés - NOUVEAUX ENDPOINTS
   */
  /**
 *  RECHERCHE FREELANCE UNIFIÉE - TOUS CRITÈRES ENSEMBLE
 */
private performFreelanceSearch(): void {

  if (!this.searchTerm || !this.searchTerm.trim()) {
    this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
    this.isLoading = false;
    return;
  }

  //  CONSTRUIRE TOUS LES CRITÈRES ENSEMBLE
  const criteres = this.construireTousLesCriteres();


  //  ROUTAGE INTELLIGENT : /nearby si géolocalisé, sinon /search
  const observable = (criteres.searchType === 'GEOLOCATION' && criteres.lat && criteres.lng)
    ? this.salonService.searchFreelancesNearby(criteres.service, criteres.lat, criteres.lng)
    : this.salonService.searchFreelances(criteres);


  observable.subscribe({
    next: (response) => {

      const freelances = response.freelances || response.data || response || [];
      const total = response.total || freelances.length;


      //  Stocker les métadonnées de recherche intelligente
      this.searchMetadata = {
        matchReason: response.matchReason,
        searchLevel: response.searchLevel,
        isPopularFallback: response.isPopularFallback,
        relaxedCriteria: response.relaxedCriteria,
        hasExactMatches: response.hasExactMatches,
        searchType: response.searchType,
        total: response.total
      };

      // Forcer le type freelance
      const freelancesWithType = freelances.map((item: any) => ({
        ...item,
        type: 'freelance'
      }));

      this.handleSearchSuccess(freelancesWithType, 'freelance');

      //  Le message sera maintenant affiché au-dessus des résultats
      // Plus besoin de SnackBar, utilisé dans le template

      // Afficher le résumé intelligent
      this.afficherResumePertinence(criteres, total, response);
    },
    error: (error) => {
      console.error(' Erreur recherche:', error);
      this.handleSearchError(error);
    }
  });
}

/**
 *  CONSTRUIRE TOUS LES CRITÈRES (sans séparation de modes)
 */
private construireTousLesCriteres(): any {
  const coords = this.extractCoordinates();

  const criteres: any = {
    // OBLIGATOIRE
    service: this.searchTerm.trim()
  };

  //  LOGIQUE MÉTIER CORRIGÉE : SÉPARER GÉOLOCALISATION ET VILLE

  // 1⃣ VILLE STRICTE : Si l'utilisateur a tapé une ville, on recherche UNIQUEMENT dans cette ville
  if (this.locationInput?.trim() && !this.locationInput.includes(',')) {
    criteres.ville = this.locationInput.trim();
    criteres.searchType = 'CITY_STRICT'; // Marquer pour recherche stricte par ville
  }

  // 2⃣ GÉOLOCALISATION : Si coordonnées GPS disponibles ET pas de ville spécifiée
  else if (coords?.lat && coords?.lng && !this.locationInput?.trim()) {
    criteres.lat = coords.lat;
    criteres.lng = coords.lng;
    criteres.searchType = 'GEOLOCATION'; // Marquer pour recherche par proximité
  }

  // 3⃣ CRITÈRES FLEXIBLES (peuvent être élargis si pas de résultats)
  if (this.budgetRange > 2000) {
    criteres.maxPrice = this.budgetRange;
  }

  if (this.selectedDate) {
    criteres.date = this.selectedDate;
  }

  if (this.selectedTime) {
    criteres.time = this.selectedTime;
  }

  if (this.disponibleWeekend) {
    criteres.weekend = true;
  }

  if (this.disponibleSoir) {
    criteres.soir = true;
  }

  if (this.typeIntervention === 'DOMICILE') {
    criteres.domicile = true;
  }

  if (this.deplacementInclus) {
    criteres.deplacementInclus = true;
  }

  return criteres;
}

/**
 *  COMPTER LES CRITÈRES ACTIFS - LOGIQUE CORRIGÉE
 */
private compterCriteresActifs(criteres: any): number {
  let count = 0;

  if (criteres.service) count++; // Service obligatoire

  //  LOCALISATION : Soit ville stricte, soit géolocalisation (mutuellement exclusifs)
  if (criteres.ville && criteres.searchType === 'CITY_STRICT') count++; // Ville stricte
  if (criteres.lat && criteres.lng && criteres.searchType === 'GEOLOCATION') count++; // Géolocalisation

  //  CRITÈRES FLEXIBLES
  if (criteres.maxPrice) count++;
  if (criteres.date) count++;
  if (criteres.weekend) count++;
  if (criteres.soir) count++;
  if (criteres.domicile) count++;
  if (criteres.deplacementInclus) count++;

  return count;
}

/**
 *  AFFICHER RÉSUMÉ DE PERTINENCE
 */
private afficherResumePertinence(criteres: any, total: number, response: any): void {
  const nombreCriteres = this.compterCriteresActifs(criteres);
  const criteresTexte = this.construireCriteresTexte(criteres);

  // Message principal
  let message = `${total} freelance(s) trouvé(s)`;

  if (nombreCriteres > 1) {
    message += ` avec ${nombreCriteres} critères`;
  }

  // Type de tri appliqué
  let triInfo = '';
  if (criteres.lat && criteres.lng) {
    triInfo = ' • Triés par pertinence + proximité';
  } else {
    triInfo = ' • Triés par pertinence + note';
  }


  // Notification utilisateur
  const snackBarMessage = message + triInfo;
  this.snackBar.open(snackBarMessage, '', {
    duration: 4000,
    panelClass: ['success-snackbar']
  });
}

/**
 *  CONSTRUIRE TEXTE DES CRITÈRES POUR AFFICHAGE - LOGIQUE CORRIGÉE
 */
private construireCriteresTexte(criteres: any): string[] {
  const textes: string[] = [];

  //  LOCALISATION : Affichage selon le type de recherche
  if (criteres.ville && criteres.searchType === 'CITY_STRICT') {
    textes.push(` ${criteres.ville} (strict)`);
  } else if (criteres.lat && criteres.lng && criteres.searchType === 'GEOLOCATION') {
    textes.push(' Géolocalisé (proximité)');
  }
  if (criteres.maxPrice) textes.push(` ≤${criteres.maxPrice} CFA`);
  if (criteres.weekend) textes.push(' Weekend');
  if (criteres.soir) textes.push(' Soirée');
  if (criteres.domicile) textes.push(' Domicile');
  if (criteres.deplacementInclus) textes.push(' Déplacement');
  if (criteres.date) textes.push(` ${criteres.date}`);

  return textes;
}
  /**
   *  RECHERCHE COMBINÉE (salon + freelance)
   */
  private performCombinedSearch(): void {

    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
      this.isLoading = false;
      return;
    }

    //  CORRECTION: Faire les deux recherches séparément avec ville
    const serviceTerm = this.searchTerm.trim();
    const ville = this.locationInput || null;


    //  CORRECTION: Utiliser les vraies méthodes de recherche avec critères
    const salonParams = {
      term: serviceTerm,
      ville: ville ?? undefined,
      budget: this.budgetRange > 2000 ? this.budgetRange : undefined,
      date: this.selectedDate || undefined,
      heure: this.selectedTime || undefined,
      providerType: 'salon'
    };

    const freelanceParams = {
      service: serviceTerm,
      ville: ville ?? undefined,
      maxPrice: this.budgetRange > 2000 ? this.budgetRange : undefined,
      date: this.selectedDate || undefined,
      time: this.selectedTime || undefined,
      weekend: this.disponibleWeekend || false,
      soir: this.disponibleSoir || false,
      searchType: ville ? 'CITY_STRICT' : undefined
    };

    // Rechercher les salons avec les critères complets
    this.salonService.searchSalons(salonParams).subscribe({
      next: (salonResults) => {

        // Ensuite rechercher les freelances avec le bon endpoint
        const coords = this.extractCoordinates();
        const freelanceObservable = (coords?.lat && coords?.lng && !this.locationInput?.trim())
          ? this.salonService.searchFreelancesNearby(serviceTerm, coords.lat, coords.lng)
          : this.salonService.searchFreelances(freelanceParams);


        freelanceObservable.subscribe({
          next: (freelanceResponse) => {

            // Extraire les freelances de la réponse
            const freelanceResults = Array.isArray(freelanceResponse) ? freelanceResponse :
                                   (freelanceResponse?.freelances || []);


            // Combiner les résultats avec types corrects
            const salonArray = Array.isArray(salonResults) ? salonResults.map((s: any) => ({...s, type: 'salon'})) : [];
            const freelanceArray = Array.isArray(freelanceResults) ? freelanceResults.map((f: any) => ({...f, type: 'freelance'})) : [];
            const combinedResults = [...salonArray, ...freelanceArray];

            this.handleSearchSuccess(combinedResults, 'both');
          },
          error: (error) => {
            console.error(' Erreur recherche freelances:', error);
            // Si freelances échouent, utiliser seulement les salons
            const salonArray = Array.isArray(salonResults) ? salonResults : [];
            this.handleSearchSuccess(salonArray, 'both');
          }
        });
      },
      error: (error) => {
        console.error(' Erreur recherche salons:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   *  AFFICHER RÉSUMÉ DE RECHERCHE FREELANCE
   */
  private showFreelanceSearchSummary(response: any, searchCriteria: any): void {
    if (!response.criteria) return;

    const criteria = response.criteria;
    const appliedCriteria: string[] = [];

    if (criteria.service) {
      appliedCriteria.push(`Service: ${criteria.service}`);
    }
    if (criteria.ville && criteria.ville !== 'non spécifié') {
      appliedCriteria.push(`Ville: ${criteria.ville}`);
    }
    if (criteria.maxPrice) {
      appliedCriteria.push(`Budget: ≤${criteria.maxPrice} CFA`);
    }
    if (criteria.hasLocation) {
      appliedCriteria.push('Géolocalisé');
    }
    if (searchCriteria.weekend) {
      appliedCriteria.push('Disponible weekend');
    }
    if (searchCriteria.soir) {
      appliedCriteria.push('Disponible soirée');
    }
    if (searchCriteria.deplacementInclus) {
      appliedCriteria.push('Déplacement inclus');
    }

    if (appliedCriteria.length > 0) {
      const message = `Recherche: ${appliedCriteria.join(' • ')}`;

      // Afficher un résumé discret après les résultats
      setTimeout(() => {
        this.snackBar.open(message, '', {
          duration: 4000,
          panelClass: ['info-snackbar']
        });
      }, 1000);
    }
  }

  /**
   *  GESTION SUCCÈS RECHERCHE
   */
  private handleSearchSuccess(results: any[], searchType: string): void {

    //  DÉDUPLICATION IMMÉDIATE par ID
    const originalCount = results.length;
    const uniqueResults = results.filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
    );

    if (originalCount !== uniqueResults.length) {
      console.warn(` DOUBLONS SUPPRIMÉS: ${originalCount - uniqueResults.length} doublons détectés`);
      const duplicateIds = results.map(r => r.id).filter((id, i, arr) => arr.indexOf(id) !== i);
      console.warn(` IDs dupliqués supprimés:`, [...new Set(duplicateIds)]);
    }

    this.filteredSalons = this.processSalonData(uniqueResults);

    //  Initialiser la pagination avec infinite scroll
    this.allProviders = this.filteredSalons;
    this.initializePaginatedResults(this.filteredSalons);
    this.isLoading = false;

    // Générer un titre contextuel
    const typeLabel = searchType === 'salon' ? 'Salons' :
                     searchType === 'freelance' ? 'Freelances' :
                     'Professionnels';

    if (this.searchTerm) {
      this.selectedService = `${typeLabel} - ${this.searchTerm}`;
    }

    // Message de succès contextuel
    const message = this.generateSuccessMessage(results.length, searchType);
    this.snackBar.open(message, '', { duration: 3000, panelClass: ['success-snackbar'] });

    this.saveSearchParams();
  }

  /**
   *  VALIDATION LOGIQUE MÉTIER - Géolocalisation vs Ville
   */
  private validateLocationLogic(): boolean {
    // Cas problématique : Les deux sont présents
    if (this.userLocation && this.locationInput?.trim()) {
      this.snackBar.open(
        ' Recherche par ville = résultats UNIQUEMENT dans cette ville.  Géolocalisation = résultats par proximité partout. Choisissez un seul mode.',
        'OK',
        {
          duration: 6000,
          panelClass: ['warning-snackbar']
        }
      );
      return false;
    }

    // Validation du format ville (pas de coordonnées)
    if (this.locationInput?.trim() && this.locationInput.includes(',')) {
      const parts = this.locationInput.split(',');
      const hasCoords = parts.length === 2 &&
                       !isNaN(parseFloat(parts[0])) &&
                       !isNaN(parseFloat(parts[1]));

      if (hasCoords) {
        this.snackBar.open(
          'Pour une recherche par coordonnées, utilisez la géolocalisation.',
          'OK',
          {
            duration: 4000,
            panelClass: ['info-snackbar']
          }
        );
        return false;
      }
    }

    return true;
  }

  /**
   *  GESTION ERREUR RECHERCHE
   */
  private handleSearchError(error: any): void {
    console.error(' Erreur recherche:', error);

    this.isLoading = false;
    this.filteredSalons = [];

    const errorMessage = error.error?.message || error.message || 'Erreur de recherche';
    this.snackBar.open(errorMessage, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   *  VÉRIFIER CRITÈRES DE RECHERCHE VALIDES
   */
  private hasValidSearchCriteria(): boolean {
    return !!(
      this.searchTerm?.trim() ||
      this.userLocation ||
      this.locationInput?.trim() ||
      (this.budgetRange && this.budgetRange > 2000) ||
      this.selectedDate ||
      this.disponibleWeekend ||
      this.disponibleSoir ||
      this.experienceMin
    );
  }

  /**
   *  EXTRAIRE COORDONNÉES
   */
  private extractCoordinates(): { lat: number; lng: number } | null {
    // Priorité 1: userLocation (format "lat,lng")
    if (this.userLocation && this.userLocation.includes(',')) {
      try {
        const [lat, lng] = this.userLocation.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      } catch (e) {
        console.error('Erreur extraction coordonnées userLocation:', e);
      }
    }

    // Priorité 2: locationInput si c'est des coordonnées
    if (this.locationInput && this.locationInput.includes(',')) {
      try {
        const [lat, lng] = this.locationInput.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return { lat, lng };
        }
      } catch (e) {
        console.error('Erreur extraction coordonnées locationInput:', e);
      }
    }

    return null;
  }

  /**
   *  GÉNÉRER MESSAGE DE SUCCÈS
   */
  private generateSuccessMessage(count: number, searchType: string): string {
    const critères = [];

    if (this.disponibleWeekend) critères.push('weekend');
    if (this.disponibleSoir) critères.push('soirée');
    if (this.experienceMin) critères.push(`${this.experienceMin}+ ans exp`);
    if (this.budgetRange > 2000) critères.push(`≤${this.budgetRange} CFA`);

    let message = `${count} résultat(s) trouvé(s)`;

    if (searchType === 'freelance' && critères.length > 0) {
      message += ` avec critères: ${critères.join(', ')}`;
    }

    return message;
  }

  // ===============================================
  //  MÉTHODES SPÉCIALISÉES FREELANCES MISES À JOUR
  // ===============================================

  /**
   *  RECHERCHE FREELANCES AVEC CRITÈRES - MISE À JOUR
   */
  searchFreelancesWithCriteria(params: {
    query: string;
    userLat?: number;
    userLng?: number;
    disponibleWeekend?: boolean;
    disponibleSoir?: boolean;
  }): void {

    if (!params.query?.trim()) {
      this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
      return;
    }

    const searchCriteria = {
      service: params.query.trim(),
      lat: params.userLat,
      lng: params.userLng,
      weekend: params.disponibleWeekend,
      soir: params.disponibleSoir
    };

    this.isLoading = true;

    //  UTILISER LA NOUVELLE MÉTHODE UNIFIÉE
    this.salonService.searchFreelances(searchCriteria).subscribe({
      next: (response) => {

        const freelances = response.freelances || [];
        const total = response.total || 0;


        // Adapter le traitement selon le format attendu par handleSearchSuccess
        this.handleSearchSuccess(freelances, 'freelance');

        //  Afficher le message explicatif du backend
        if (response.matchReason) {
          this.snackBar.open(response.matchReason, 'OK', {
            duration: 5000,
            panelClass: response.isPopularFallback ? ['info-snackbar'] : ['success-snackbar']
          });
        }

        // Message contextuel amélioré
        if (response.criteria) {
          this.showFreelanceSearchSummary(response, searchCriteria);
        }
      },
      error: (error) => {
        console.error(' Erreur searchFreelancesWithCriteria:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   *  RECHERCHE FREELANCES WEEKEND - MISE À JOUR
   */
  searchFreelancesWithWeekendAvailability(): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez entrer un service recherché', 'OK', { duration: 3000 });
      return;
    }

    // Forcer les critères weekend
    this.disponibleWeekend = true;
    this.selectedProviderType = 'freelance';

    // Utiliser la méthode mise à jour
    this.isLoading = true;
    this.performFreelanceSearch();
  }

  /**
   *  RECHERCHE FREELANCES EXPÉRIMENTÉS - MISE À JOUR
   */
  searchExperiencedFreelances(minYears: number = 3): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez entrer un service recherché', 'OK', { duration: 3000 });
      return;
    }

    // Note: Le backend n'a pas encore le critère d'expérience minimum
    // On peut l'ajouter plus tard dans les endpoints
    this.experienceMin = minYears;
    this.selectedProviderType = 'freelance';

    // Utiliser la méthode mise à jour
    this.isLoading = true;
    this.performFreelanceSearch();

    // Notification temporaire
    this.snackBar.open(`Recherche freelances avec ${minYears}+ ans d'expérience`, '', {
      duration: 2000,
      panelClass: ['info-snackbar']
    });
  }

  /**
   *  TOGGLE RAPIDE WEEKEND - MISE À JOUR
   */
  toggleWeekendAvailability(): void {
    this.disponibleWeekend = !this.disponibleWeekend;

    const status = this.disponibleWeekend ? 'activé' : 'désactivé';
    this.snackBar.open(`Filtre weekend ${status}`, '', { duration: 1500 });

    // Relancer la recherche automatiquement si critères suffisants
    if (this.selectedProviderType === 'freelance' && this.searchTerm?.trim()) {
      this.isLoading = true;
      setTimeout(() => {
        this.performFreelanceSearch(); // Utilise la nouvelle méthode
      }, 500);
    }
  }

  /**
   *  TOGGLE RAPIDE SOIRÉE - MISE À JOUR
   */
  toggleEveningAvailability(): void {
    this.disponibleSoir = !this.disponibleSoir;

    const status = this.disponibleSoir ? 'activé' : 'désactivé';
    this.snackBar.open(`Filtre soirée ${status}`, '', { duration: 1500 });

    // Relancer la recherche automatiquement si critères suffisants
    if (this.selectedProviderType === 'freelance' && this.searchTerm?.trim()) {
      this.isLoading = true;
      setTimeout(() => {
        this.performFreelanceSearch(); // Utilise la nouvelle méthode
      }, 500);
    }
  }

  /**
   *  EFFACER CRITÈRES FREELANCES (ALIAS pour compatibilité)
   */
  clearFreelanceCriteria(): void {
    this.clearOnlyFreelanceCriteria();
  }

  /**
   *  NOUVELLE MÉTHODE - Recherche freelance par ville rapide
   */
  searchFreelancesByCity(ville: string): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez entrer un service recherché', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    //  UTILISER LE NOUVEAU ENDPOINT CITY
    this.salonService.searchFreelancesByCity(
      this.searchTerm.trim(),
      ville,
      this.budgetRange > 2000 ? this.budgetRange : undefined
    ).subscribe({
      next: (response) => {

        const freelances = response.freelances || [];
        const total = response.total || 0;


        this.handleSearchSuccess(freelances, 'freelance');

        //  Afficher le message explicatif du backend
        if (response.matchReason) {
          this.snackBar.open(response.matchReason, 'OK', {
            duration: 5000,
            panelClass: response.isPopularFallback ? ['info-snackbar'] : ['success-snackbar']
          });
        }

        // Message spécifique ville
        this.snackBar.open(`${total} freelances trouvés à ${ville}`, '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error(' Erreur recherche par ville:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   *  NOUVELLE MÉTHODE - Recherche freelance à proximité
   */
  searchNearbyFreelances(): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez entrer un service recherché', 'OK', { duration: 3000 });
      return;
    }

    const coords = this.extractCoordinates();
    if (!coords) {
      this.snackBar.open('Position requise pour cette recherche', 'OK', { duration: 3000 });
      return;
    }

    this.isLoading = true;

    //  UTILISER LE NOUVEAU ENDPOINT NEARBY
    this.salonService.searchFreelancesNearby(this.searchTerm.trim(), coords.lat, coords.lng).subscribe({
      next: (response) => {

        const freelances = response.freelances || [];
        const total = response.total || 0;


        this.handleSearchSuccess(freelances, 'freelance');

        //  Afficher le message explicatif du backend
        if (response.matchReason) {
          this.snackBar.open(response.matchReason, 'OK', {
            duration: 5000,
            panelClass: response.isPopularFallback ? ['info-snackbar'] : ['success-snackbar']
          });
        }

        // Message spécifique géolocalisation
        this.snackBar.open(`${total} freelances trouvés dans votre zone`, '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error(' Erreur recherche proximité:', error);
        this.handleSearchError(error);
      }
    });
  }

  // // ===============================================
  // //  MÉTHODES DE TEST RAPIDE
  // // ===============================================

  // /**
  //  *  TEST RECHERCHE FREELANCE
  //  */
  // testFreelanceSearch(): void {
  //
  //   // Test rapide avec critères freelance
  //   this.searchTerm = 'Coiffure';
  //   this.selectedProviderType = 'freelance';
  //   this.disponibleWeekend = true;

  //   this.performFreelanceSearch();
  // }

  // /**
  //  *  TEST RECHERCHE COMBINÉE
  //  */
  // testCombinedSearch(): void {
  //
  //   // Test rapide recherche combinée
  //   this.searchTerm = 'Maquillage';
  //   this.selectedProviderType = 'both';

  //   this.performCombinedSearch();
  // }

  // /**
  //  *  TEST NOUVEAUX ENDPOINTS
  //  */
  // testNewFreelanceEndpoints(): void {
  //
  //   // Test 1: Recherche simple
  //   this.searchTerm = 'Coiffure';
  //   this.selectedProviderType = 'freelance';
  //   this.isLoading = true;
  //   this.performFreelanceSearch();

  //   // Test 2: Recherche avec critères (après 3 secondes)
  //   setTimeout(() => {
  //  //     this.disponibleWeekend = true;
  //     this.disponibleSoir = true;
  //     this.budgetRange = 25000;
  //     this.performFreelanceSearch();
  //   }, 3000);

  //   // Test 3: Recherche géolocalisée (après 6 secondes)
  //   setTimeout(() => {
  //  //     this.userLocation = '14.7167, -17.4677'; // Dakar
  //     this.searchNearbyFreelances();
  //   }, 6000);
  // }

  // ===============================================
  // MÉTHODES RECHERCHE FLEXIBLE (CONSERVÉES ET AMÉLIORÉES)
  // ===============================================

  /**
   *  MÉTHODE AMÉLIORÉE - Recherche flexible avec interface existante
   */
  private buildFlexibleCriteriaFromUI(): FlexibleSearchCriteria {
    const criteria: FlexibleSearchCriteria = {
      searchMode: this.searchMode,
      providerType: this.selectedProviderType,
      activeCriteria: []
    };

    // Critère 1: Terme de recherche
    if (this.searchTerm?.trim()) {
      criteria.searchTerm = this.searchTerm.trim();
      criteria.activeCriteria.push('searchTerm');
    }

    // Critère 2: Localisation
    if (this.userLocation || this.locationInput?.trim()) {
      criteria.location = {
        coordinates: this.userLocation || undefined,
        textLocation: this.locationInput?.trim() || undefined,
        hasLocation: true
      };
      criteria.activeCriteria.push('location');
    }

    // Critère 3: Budget (si différent de la valeur par défaut)
    if (this.budgetRange && this.budgetRange !== 2000) {
      criteria.budget = {
        maxBudget: this.budgetRange,
        hasBudget: true
      };
      criteria.activeCriteria.push('budget');
    }

    // Critère 4: Planning
    if (this.selectedDate || this.selectedTime) {
      criteria.schedule = {
        date: this.selectedDate || undefined,
        time: this.selectedTime || undefined,
        hasSchedule: true
      };
      criteria.activeCriteria.push('schedule');
    }

    // Critère 5: Photo (mode photo)
    if (this.searchMode === 'photo' && this.uploadedPhoto) {
      criteria.photo = {
        hasPhoto: true,
        photoFile: this.uploadedPhoto
      };
      criteria.activeCriteria.push('photo');
    }

    // Critère 6: Type de professionnel spécifique
    if (this.selectedProviderType !== 'salon') {
      criteria.activeCriteria.push('providerType');
    }

    //  CRITÈRES FREELANCES
    if (this.disponibleWeekend) {
      criteria.activeCriteria.push('disponibleWeekend');
    }
    if (this.disponibleSoir) {
      criteria.activeCriteria.push('disponibleSoir');
    }
    if (this.experienceMin) {
      criteria.activeCriteria.push('experienceMin');
    }
    if (this.deplacementInclus) {
      criteria.activeCriteria.push('deplacementInclus');
    }

    // Compter les critères actifs
    this.activeCriteriaCount = criteria.activeCriteria.length;

    return criteria;
  }

  private hasValidCriteria(criteria: FlexibleSearchCriteria): boolean {
    return criteria.activeCriteria && criteria.activeCriteria.length > 0;
  }

  private performFlexibleSearchCall(criteria: FlexibleSearchCriteria): void {
    // Préparer les données pour l'API selon le mode
    if (criteria.photo?.hasPhoto) {
      this.handleFlexiblePhotoSearch(criteria);
    } else {
      this.handleFlexibleNormalSearch(criteria);
    }
  }

  private handleFlexiblePhotoSearch(criteria: FlexibleSearchCriteria): void {
    const formData = new FormData();
    formData.append('photo', criteria.photo!.photoFile!);
    formData.append('searchMode', 'flexible_photo');
    formData.append('providerType', criteria.providerType);

    // Ajouter les autres critères s'ils existent
    if (criteria.location?.hasLocation) {
      if (criteria.location.coordinates) {
        formData.append('location', criteria.location.coordinates);
      }
      if (criteria.location.textLocation) {
        formData.append('locationText', criteria.location.textLocation);
      }
    }

    if (criteria.budget?.hasBudget) {
      formData.append('maxBudget', criteria.budget.maxBudget.toString());
    }

    if (criteria.schedule?.hasSchedule) {
      if (criteria.schedule.date) formData.append('date', criteria.schedule.date);
      if (criteria.schedule.time) formData.append('time', criteria.schedule.time);
    }

    // Ajouter le nombre de critères pour l'API
    formData.append('criteriaCount', this.activeCriteriaCount.toString());

    this.salonService.searchSalonsWithPhoto(formData).subscribe({
      next: (data) => this.handleFlexibleSearchSuccess(data, criteria),
      error: (error) => this.handleFlexibleSearchError(error, criteria)
    });
  }

  private handleFlexibleNormalSearch(criteria: FlexibleSearchCriteria): void {
    const searchPayload: any = {
      searchMode: 'flexible_normal',
      providerType: criteria.providerType,
      criteriaCount: this.activeCriteriaCount
    };

    // Ajouter conditionnellement chaque critère
    if (criteria.searchTerm) {
      searchPayload.term = criteria.searchTerm;
    }

    if (criteria.location?.hasLocation) {
      if (criteria.location.coordinates) {
        searchPayload.location = criteria.location.coordinates;
      }
      if (criteria.location.textLocation) {
        searchPayload.locationText = criteria.location.textLocation;
      }
    }

    if (criteria.budget?.hasBudget) {
      searchPayload.maxBudget = criteria.budget.maxBudget;
    }

    if (criteria.schedule?.hasSchedule) {
      if (criteria.schedule.date && criteria.schedule.time) {
        searchPayload.datetime = `${criteria.schedule.date}T${criteria.schedule.time}:00`;
      } else if (criteria.schedule.date) {
        searchPayload.date = criteria.schedule.date;
      }
    }


    this.salonService.searchSalons(searchPayload).subscribe({
      next: (data) => this.handleFlexibleSearchSuccess(data, criteria),
      error: (error) => this.handleFlexibleSearchError(error, criteria)
    });
  }

  private handleFlexibleSearchSuccess(data: any[], criteria: FlexibleSearchCriteria): void {

    this.filteredSalons = this.processSalonData(data);
    this.isLoading = false;

    // Générer un titre contextuel selon les critères utilisés
    this.selectedService = this.generateContextualTitle(criteria);

    // Afficher un résumé des critères utilisés
    this.showCriteriaUsedSummary(criteria);

    // Proposer des améliorations si peu de résultats
    if (this.filteredSalons.length < 3) {
      this.suggestSearchImprovements(criteria);
    }

    this.saveSearchParams();
    this.saveFlexibleSearchState();
  }

  private handleFlexibleSearchError(error: any, criteria: FlexibleSearchCriteria): void {
    console.error(' Erreur recherche flexible:', error);
    this.isLoading = false;
    this.filteredSalons = [];

    // Message d'erreur contextuel
    const criteriaUsed = criteria.activeCriteria.length;
    let errorMessage = `Erreur lors de la recherche avec ${criteriaUsed} critère(s)`;

    if (error.message) {
      errorMessage += `: ${error.message}`;
    }

    this.snackBar.open(errorMessage, 'Réessayer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    }).onAction().subscribe(() => {
      // Réessayer avec moins de critères
      this.retryWithFewerCriteria(criteria);
    });
  }

  private generateContextualTitle(criteria: FlexibleSearchCriteria): string {
    const parts: string[] = [];

    // Base: type de professionnel
    parts.push(this.getProviderTypeLabel());

    // Ajouter le service si recherche textuelle
    if (criteria.searchTerm) {
      parts.push(`"${criteria.searchTerm}"`);
    }

    // Ajouter la localisation
    if (criteria.location?.hasLocation) {
      if (criteria.location.textLocation) {
        parts.push(`à ${criteria.location.textLocation}`);
      } else {
        parts.push('près de vous');
      }
    }

    // Ajouter le budget
    if (criteria.budget?.hasBudget) {
      parts.push(`max ${criteria.budget.maxBudget} CFA`);
    }

    // Ajouter la date
    if (criteria.schedule?.hasSchedule && criteria.schedule.date) {
      const date = new Date(criteria.schedule.date);
      parts.push(`le ${date.toLocaleDateString('fr-FR')}`);
    }

    return parts.join(' • ');
  }

  private showCriteriaUsedSummary(criteria: FlexibleSearchCriteria): void {
    const count = criteria.activeCriteria.length;
    let message = '';

    if (count === 1) {
      message = 'Recherche avec 1 critère';
    } else if (count > 1) {
      message = `Recherche combinée avec ${count} critères`;
    }

    if (message && this.filteredSalons.length > 0) {
      this.snackBar.open(message, '', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });
    }
  }

  private suggestSearchImprovements(criteria: FlexibleSearchCriteria): void {
    const suggestions: string[] = [];

    // Suggérer d'élargir le budget
    if (criteria.budget?.hasBudget && criteria.budget.maxBudget < 20000) {
      suggestions.push('Augmenter le budget');
    }

    // Suggérer d'élargir la zone
    if (criteria.location?.hasLocation) {
      suggestions.push('Élargir la zone de recherche');
    }

    // Suggérer d'inclure d'autres types
    if (criteria.providerType !== 'both') {
      suggestions.push(`Inclure les ${this.getAlternativeProviderType()}`);
    }

    // Suggérer d'être flexible sur la date
    if (criteria.schedule?.hasSchedule) {
      suggestions.push('Être flexible sur la date/heure');
    }

    if (suggestions.length > 0) {
      const message = `Peu de résultats. Suggestions: ${suggestions.join(', ')}`;
      this.snackBar.open(message, 'Élargir', {
        duration: 8000,
        panelClass: ['warning-snackbar']
      }).onAction().subscribe(() => {
        this.expandSearchCriteria(criteria);
      });
    }
  }

  private expandSearchCriteria(criteria: FlexibleSearchCriteria): void {
    let expanded = false;

    // Élargir le budget
    if (criteria.budget?.hasBudget && criteria.budget.maxBudget < 50000) {
      this.budgetRange = Math.min(criteria.budget.maxBudget * 1.5, 100000);
      expanded = true;
    }

    // Inclure tous les types de professionnels
    if (criteria.providerType !== 'both') {
      this.selectProviderType('both');
      expanded = true;
    }

    if (expanded) {
      // Relancer la recherche avec les critères élargis
      setTimeout(() => {
        this.searchSalonsAdvanced();
      }, 500);

      this.snackBar.open('Recherche élargie automatiquement', '', {
        duration: 2000,
        panelClass: ['info-snackbar']
      });
    }
  }

  private retryWithFewerCriteria(criteria: FlexibleSearchCriteria): void {
    //  LOGIQUE MÉTIER CORRIGÉE - Élargissement selon les priorités

    // 1⃣ D'abord essayer d'élargir les critères temporels (date/heure)
    if (criteria.schedule?.hasSchedule) {
      this.selectedDate = '';
      this.selectedTime = '';
    }
    // 2⃣ Ensuite le budget
    else if (criteria.budget?.hasBudget) {
      this.budgetRange = 2000; // Remettre par défaut
    }
    // 3⃣ JAMAIS SUPPRIMER LA VILLE - Elle reste toujours active si spécifiée
    // On pourrait élargir d'autres critères freelances si nécessaire
    else {
      this.snackBar.open(
        'Aucun résultat même après élargissement. La ville spécifiée est maintenue.',
        'OK',
        { duration: 4000, panelClass: ['warning-snackbar'] }
      );
      return;
    }

    // Relancer la recherche avec les nouveaux critères
    this.searchSalonsAdvanced();
  }

  // ===============================================
  // MÉTHODES AMÉLIORÉES POUR L'UI EXISTANTE
  // ===============================================

  getSearchPlaceholder(): string {
    const criteriaCount = this.getActiveCriteriaCount();
    const providerText = this.selectedProviderType === 'salon' ? 'salon' :
                        this.selectedProviderType === 'freelance' ? 'freelance' : 'professionnel';

    if (criteriaCount > 0) {
      return `Recherche flexible avec ${criteriaCount} critère(s) déjà défini(s)...`;
    }

    switch (this.searchMode) {
      case 'photo':
        return `Téléchargez une photo pour trouver un ${providerText} similaire...`;
      case 'text':
        return `Recherche libre (nom, spécialité, quartier...)`;
      case 'location':
      default:
        return `Rechercher un ${providerText} près de chez vous...`;
    }
  }

  getResultsTitle(): string {
    if (this.activeCriteriaCount > 1) {
      return `Recherche combinée (${this.activeCriteriaCount} critères)`;
    } else if (this.selectedService) {
      return `${this.getProviderTypeLabel()} - ${this.selectedService}`;
    } else {
      return `${this.getProviderTypeLabel()}`;
    }
  }

  toggleAdvancedSearch(): void {
    this.showAdvancedSearch = !this.showAdvancedSearch;

    if (this.showAdvancedSearch) {
      // Compter les critères déjà définis
      const criteria = this.buildFlexibleCriteriaFromUI();
      this.activeCriteriaCount = criteria.activeCriteria.length;

      if (this.activeCriteriaCount > 0) {
        this.snackBar.open(`${this.activeCriteriaCount} critère(s) déjà défini(s)`, '', {
          duration: 2000,
          panelClass: ['info-snackbar']
        });
      }
    }
  }

  getSearchIndicatorText(): string {
    const count = this.getTotalProvidersCount();
    const providerText = this.getProviderTypeLabel().toLowerCase();

    return `Recherche parmi <strong> ${providerText}</strong> disponibles.
            ${this.selectedProviderType !== 'both' ?
              `Cliquez sur "${this.getAlternativeProviderType()}" pour voir les autres options.` : ''}`;
  }

  // ===============================================
  // MÉTHODES UTILITAIRES POUR L'UI EXISTANTE
  // ===============================================

  getActiveCriteriaCount(): number {
    const criteria = this.buildFlexibleCriteriaFromUI();
    return criteria.activeCriteria.length;
  }

  getCriteriaIndicator(): string {
    const count = this.getActiveCriteriaCount();
    if (count === 0) return '';
    if (count === 1) return '●';
    if (count <= 3) return '●●';
    return '●●●';
  }

  isCriteriaActive(criteriaType: string): boolean {
    const criteria = this.buildFlexibleCriteriaFromUI();
    return criteria.activeCriteria.includes(criteriaType);
  }

  clearAdvancedCriteria(): void {
    // Réinitialiser tous les critères
    this.budgetRange = 2000;
    this.selectedDate = this.minDate;
    this.selectedTime = '';
    this.userLocation = null;
    this.locationInput = '';
    this.uploadedPhoto = null;
    this.uploadedPhotoPreview = null;
    this.searchTerm = '';

    //  EFFACER CRITÈRES FREELANCES
    this.clearFreelanceCriteria();

    // Réinitialiser les compteurs internes
    this.flexibleCriteria = {};
    this.activeCriteriaCount = 0;

    // Notification
    this.snackBar.open('Tous les critères ont été effacés', '', {
      duration: 2000,
      panelClass: ['info-snackbar']
    });

    // Fermer le panneau
    this.showAdvancedSearch = false;

    // Effacer les résultats si ils existent
    if (this.filteredSalons.length > 0) {
      this.filteredSalons = [];
      this.selectedService = null;
    }
  }

  expandSearch(): void {
    const originalCriteria = this.buildFlexibleCriteriaFromUI();
    let expandedCriteria = false;

    // Élargir le type de professionnel
    if (this.selectedProviderType !== 'both') {
      this.selectProviderType('both');
      expandedCriteria = true;
    }

    // Élargir le budget
    if (this.budgetRange < 50000) {
      this.budgetRange = Math.min(this.budgetRange * 1.5, 100000);
      expandedCriteria = true;
    }

    // Réinitialiser la date si trop restrictive
    if (this.selectedDate && this.selectedTime) {
      this.selectedTime = ''; // Garder la date mais être flexible sur l'heure
      expandedCriteria = true;
    }

    if (expandedCriteria) {
      this.snackBar.open('Recherche élargie automatiquement', 'Rechercher', {
        duration: 4000,
        panelClass: ['success-snackbar']
      }).onAction().subscribe(() => {
        this.searchSalonsAdvanced();
      });
    } else {
      this.snackBar.open('Aucune expansion possible pour ces critères', '', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
    }
  }

  saveFlexibleSearchState(): void {
    if (this.isBrowser) {
      const state = {
        criteria: this.buildFlexibleCriteriaFromUI(),
        timestamp: Date.now(),
        results: this.filteredSalons.length,
        selectedService: this.selectedService
      };

      localStorage.setItem('beautyHubFlexibleSearch', JSON.stringify(state));
    }
  }

  restoreFlexibleSearchState(): boolean {
    if (!this.isBrowser) return false;

    const savedState = localStorage.getItem('beautyHubFlexibleSearch');
    if (!savedState) return false;

    try {
      const state = JSON.parse(savedState);

      // Vérifier que la sauvegarde n'est pas trop ancienne (2 heures)
      if (Date.now() - state.timestamp > 2 * 60 * 60 * 1000) {
        return false;
      }

      // Restaurer les critères
      const criteria = state.criteria;

      if (criteria.searchTerm) {
        this.searchTerm = criteria.searchTerm;
      }

      if (criteria.location?.hasLocation) {
        this.userLocation = criteria.location.coordinates || null;
        this.locationInput = criteria.location.textLocation || '';
      }

      if (criteria.budget?.hasBudget) {
        this.budgetRange = criteria.budget.maxBudget;
      }

      if (criteria.schedule?.hasSchedule) {
        this.selectedDate = criteria.schedule.date || '';
        this.selectedTime = criteria.schedule.time || '';
      }

      this.selectedProviderType = criteria.providerType || 'salon';

      return true;
    } catch (e) {
      console.error('Erreur lors de la restauration de l\'état:', e);
      return false;
    }
  }

  private initializeFlexibleSearch(): void {
    // Essayer de restaurer l'état précédent
    const restored = this.restoreFlexibleSearchState();

    if (restored) {
      this.snackBar.open('État de recherche précédent restauré', 'Utiliser', {
        duration: 4000,
        panelClass: ['info-snackbar']
      }).onAction().subscribe(() => {
        this.searchSalonsAdvanced();
      });
    }
  }

  // ===============================================
  // MÉTHODES DE RECHERCHE MISES À JOUR
  // ===============================================

  searchSalons(): void {
    if (!this.isBrowser || !this.searchTerm.trim()) return;
    this.searchSalonsAdvanced();
  }

  // ===============================================
  //  MÉTHODES DE TRAITEMENT DES DONNÉES AMÉLIORÉES
  // ===============================================

  private processSalonData(data: any[]): EnhancedProviderData[] {

    //  PROTECTION: S'assurer que data est un tableau
    if (!Array.isArray(data)) {
      console.warn(' processSalonData: data n\'est pas un tableau:', data);
      return [];
    }

    //  CORRECTION: Extraire les salons/freelances de la structure wrapper
    const extractedData = data.map(item => {
      // Si l'item a une propriété salon/freelance, l'extraire
      if (item.salon) {
        return { ...item.salon, rating: item.rating, distance: item.distance, type: 'salon' };
      }
      if (item.freelance) {
        return { ...item.freelance, rating: item.rating, distance: item.distance, type: 'freelance' };
      }
      // Sinon utiliser l'item directement
      return item;
    });


    //  Déduplication par ID pour éviter les doublons
    const uniqueData = extractedData.filter((item, index, self) =>
      index === self.findIndex(t => t.id === item.id)
    );

    if (uniqueData.length !== data.length) {
    }

    return uniqueData.map((item, index) => {

      // Gestion améliorée des images avec toutes les variantes possibles
      let imageUrl = this.getValidImageUrl(item);

      // Traitement complet des services
      const services = this.parseServices(item);

      const processedProvider: EnhancedProviderData = {
        id: item.id,
        nom: item.nom || item.name || `Provider ${item.id}`,
        prenom: item.prenom || item.firstName || item.first_name,  //  Prénom
        imageUrl: imageUrl,
        adresse: item.adresse || item.address || 'Adresse non disponible',
        ville: item.ville || item.city || item.location,  //  Ville
        rating: this.parseRating(item.rating || item.note || item.noteMoyenne || item.evaluation),
        reviewCount: this.parseReviewCount(item.reviewCount || item.nombreAvis || item.nbAvis || item.reviews || item.totalAvis),
        services: services,
        specialite: item.specialite || item.specialty || item.profession || services[0],  //  Spécialité
        competences: item.competences || item.skills || item.competencies,  //  Compétences
        priceRange: item.priceRange || item.gammeDePrice || item.prixMoyens || 'Prix non défini',
        type: item.type || this.determineProviderType(item),
        experience: item.experience || item.anneesExperience,
        anneesExperience: item.anneesExperience || item.experience || item.yearsOfExperience,  //  Années d'expérience
        availability: item.availability || item.disponibilite || this.formatAvailability(item),
        description: item.description || item.bio || item.presentation,
        telephone: item.telephone || item.phone,
        email: item.email,
        website: item.website || item.siteWeb,
        horaires: item.horaires || item.openingHours,
        profession: item.profession || item.job || item.metier,  //  Profession
        //  PROPRIÉTÉS SPÉCIFIQUES FREELANCES
        disponibleWeekend: item.disponibleWeekend || item.aUnServiceDisponibleWeekend,
        disponibleSoir: item.disponibleSoir || item.aUnServiceDisponibleSoir,
        deplacementInclus: item.deplacementInclus || item.proposeDeplacementInclus,
        //  DISTANCE GÉOLOCALISÉE
        distanceKm: item.distanceKm || item.distance || item.calculatedDistance
      };

      return processedProvider;
    });
  }

  /**
   *  NOUVELLE MÉTHODE : Déterminer automatiquement le type de provider
   */
  private determineProviderType(item: any): 'salon' | 'freelance' {
    // Indicateurs salon
    if (item.horaires || item.openingHours || item.nombreEmployes) {
      return 'salon';
    }

    // Indicateurs freelance
    if (item.anneesExperience || item.aUnServiceDisponibleWeekend || item.competences) {
      return 'freelance';
    }

    // Par défaut selon la structure des données
    return item.services ? 'freelance' : 'salon';
  }

  /**
   *  NOUVELLE MÉTHODE : Formatage de la disponibilité
   */
  private formatAvailability(item: any): string {
    const parts: string[] = [];

    if (item.aUnServiceDisponibleWeekend || item.disponibleWeekend) {
      parts.push('Weekend');
    }
    if (item.aUnServiceDisponibleSoir || item.disponibleSoir) {
      parts.push('Soirée');
    }

    return parts.length > 0 ? parts.join(' • ') : 'Horaires standards';
  }

  /**
   *  MÉTHODE AMÉLIORÉE : Récupération d'URL d'image selon le type
   */
  private getValidImageUrl(item: any): string {

    // Ordre de priorité pour les champs d'image
    const imageFields = [
      'imageUrl',
      'photoProfilUrl',
      'photoProfil',
      'photo',
      'image',
      'picture',
      'avatar',
      'url'
    ];

    for (const field of imageFields) {
      const imageValue = item[field];
      if (imageValue && typeof imageValue === 'string' && imageValue.trim()) {
        let processedUrl = this.processImageUrl(imageValue.trim());
        return processedUrl;
      }
    }

    // Vérifier dans les objets imbriqués si ils existent
    if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      const firstPhoto = item.photos[0];
      if (firstPhoto && firstPhoto.url) {
        const processedUrl = this.processImageUrl(firstPhoto.url);
        return processedUrl;
      }
    }

    //  IMAGE PAR DÉFAUT SELON LE TYPE
    const providerType = item.type || this.determineProviderType(item);
    const defaultImage = providerType === 'freelance'
      ? 'assets/images/freelance-default.jpg'
      : 'assets/images/salon-default.jpg';

    return defaultImage;
  }

  /**
   *  Méthode publique pour l'accès depuis le template
   */
  public getImageUrl = (imageUrl: string | undefined): string => {
    if (!imageUrl) {
      return 'assets/images/freelance-default.jpg';
    }
    return this.processImageUrl(imageUrl);
  }

  private processImageUrl(imageUrl: string): string {

    // Si c'est déjà une URL complète, la retourner
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }

    // Si c'est un chemin relatif commençant par /uploads
    if (imageUrl.startsWith('/uploads/')) {
      const fullUrl = `http://localhost:8081${imageUrl}`;
      return fullUrl;
    }

    // Si c'est juste un nom de fichier, construire l'URL complète
    if (!imageUrl.startsWith('/') && !imageUrl.includes('/')) {
      const fullUrl = `http://localhost:8081/uploads/${imageUrl}`;
      return fullUrl;
    }

    // Si c'est un chemin assets, le retourner tel quel
    if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('assets/')) {
      return imageUrl;
    }

    // Si c'est un chemin qui commence par /api, construire l'URL complète
    if (imageUrl.startsWith('/api/')) {
      const fullUrl = `http://localhost:8081${imageUrl}`;
      return fullUrl;
    }

    // Par défaut, essayer de construire l'URL
    const fallbackUrl = `http://localhost:8081/uploads/${imageUrl}`;
    return fallbackUrl;
  }

  private parseServices(item: any): string[] {

    let services: string[] = [];

    // Essayer différents champs de services
    if (Array.isArray(item.services)) {
      services = item.services;
    } else if (typeof item.services === 'string' && item.services.trim()) {
      services = item.services.split(',').map((s: string) => s.trim());
    } else if (item.serviceOfferts && typeof item.serviceOfferts === 'string') {
      services = item.serviceOfferts.split(',').map((s: string) => s.trim());
    } else if (item.servicesOfferts && typeof item.servicesOfferts === 'string') {
      services = item.servicesOfferts.split(',').map((s: string) => s.trim());
    } else if (Array.isArray(item.serviceNoms)) {
      services = item.serviceNoms;
    } else if (item.serviceNoms && typeof item.serviceNoms === 'string') {
      services = item.serviceNoms.split(',').map((s: string) => s.trim());
    }

    // Nettoyer et filtrer les services
    const cleanedServices = services
      .filter(service => service && typeof service === 'string' && service.trim())
      .map(service => service.trim())
      .slice(0, 5); // Limiter à 5 services max pour l'affichage

    return cleanedServices;
  }

  private parseRating(rating: any): number {
    if (rating === null || rating === undefined) return 0;

    const numRating = typeof rating === 'number' ? rating : parseFloat(rating);
    if (isNaN(numRating)) return 0;

    // Assurer que le rating est entre 0 et 5
    return Math.max(0, Math.min(5, numRating));
  }

  private parseReviewCount(reviewCount: any): number {
    if (reviewCount === null || reviewCount === undefined) return 0;

    const numReviews = typeof reviewCount === 'number' ? reviewCount : parseInt(reviewCount);
    if (isNaN(numReviews)) return 0;

    return Math.max(0, numReviews);
  }

  // ===============================================
  // MÉTHODES FAVORIS
  // ===============================================

  private loadFavorites(): void {
    if (!this.isBrowser) return;
    try {
      const saved = localStorage.getItem('beautyHubFavorites');
      if (saved) {
        this.likedProviderIds = new Set(JSON.parse(saved));
      }
    } catch (e) {}
  }

  private saveFavorites(): void {
    if (!this.isBrowser) return;
    localStorage.setItem('beautyHubFavorites', JSON.stringify([...this.likedProviderIds]));
  }

  toggleFavorite = (provider: EnhancedProviderData, event: Event): void => {
    event.stopPropagation();

    if (!this.isLoggedIn || !this.user) {
      this.snackBar.open('Connectez-vous pour gérer vos favoris', 'Se connecter', { duration: 4000 })
        .onAction().subscribe(() => this.login());
      return;
    }

    const key = `${provider.type}-${provider.id}`;
    if (this.likedProviderIds.has(key)) {
      this.likedProviderIds.delete(key);
      this.snackBar.open('Retiré des favoris', '', { duration: 2000 });
    } else {
      this.likedProviderIds.add(key);
      this.snackBar.open('Ajouté aux favoris', '', { duration: 2000 });
    }
    this.likedProviderIds = new Set(this.likedProviderIds);
    this.saveFavorites();
    this.cdr.detectChanges();
  }

  isFavorite = (provider: EnhancedProviderData): boolean => {
    return this.likedProviderIds.has(`${provider.type}-${provider.id}`);
  }

  /**
   *  MÉTHODE AMÉLIORÉE : Gestionnaires d'erreur d'image pour les deux types
   */
  onImageError(event: any, provider: EnhancedProviderData): void {
    console.warn(` Erreur chargement image pour ${provider.type} ${provider.nom}:`, event.target.src);

    // Éviter les boucles infinies
    if (event.target.dataset.retryCount) {
      const retryCount = parseInt(event.target.dataset.retryCount);
      if (retryCount >= 3) {
        //        // this.createImagePlaceholder(event.target, provider);
        return;
      }
      event.target.dataset.retryCount = (retryCount + 1).toString();
    } else {
      event.target.dataset.retryCount = '1';
    }

    //  IMAGES DE FALLBACK SELON LE TYPE
    const fallbackImages = provider.type === 'freelance'
      ? [
          'assets/images/freelance-default.jpg',
          'assets/images/freelance-placeholder.jpg',
          'assets/images/avatar-placeholder.png'
        ]
      : [
          'assets/images/salon-default.jpg',
          'assets/images/salon-placeholder.jpg',
          'assets/images/store-placeholder.jpg'
        ];

    const currentRetry = parseInt(event.target.dataset.retryCount) - 1;
    if (currentRetry < fallbackImages.length) {
      event.target.src = fallbackImages[currentRetry];
    } else {
      this.createImagePlaceholder(event.target, provider);
    }
  }

  onImageLoad(event: any, provider: EnhancedProviderData): void {
    event.target.style.opacity = '1';
    event.target.classList.add('loaded');

    // Supprimer le compteur de retry
    delete event.target.dataset.retryCount;
  }

  private createImagePlaceholder(imgElement: HTMLImageElement, provider: EnhancedProviderData): void {
    const container = imgElement.parentElement;
    if (!container) return;

    // Vérifier si un placeholder existe déjà
    if (container.querySelector('.image-placeholder')) return;

    // Masquer l'image défaillante
    imgElement.style.display = 'none';

    // Créer le placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder';

    //  COULEURS SELON LE TYPE
    const gradients = {
      salon: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      freelance: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      default: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    };

    const gradient = gradients[provider.type as keyof typeof gradients] || gradients.default;

    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      background: ${gradient};
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      position: absolute;
      top: 0;
      left: 0;
      border-radius: inherit;
    `;

    // Extraire les initiales
    const initials = this.getInitials(provider.nom);
    placeholder.textContent = initials;

    // Ajouter une icône selon le type
    const icon = document.createElement('i');
    icon.className = provider.type === 'freelance' ? 'fas fa-user-tie' : 'fas fa-store';
    icon.style.cssText = `
      position: absolute;
      bottom: 8px;
      right: 8px;
      font-size: 16px;
      opacity: 0.7;
    `;
    placeholder.appendChild(icon);

    // Positionner le container et ajouter le placeholder
    container.style.position = 'relative';
    container.appendChild(placeholder);
  }

  private getInitials(nom: string): string {
    if (!nom || typeof nom !== 'string') return 'XX';

    return nom
      .split(' ')
      .map(word => word.trim()[0])
      .filter(initial => initial)
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'XX';
  }

  // ===============================================
  // MÉTHODES UTILITAIRES EXISTANTES (CONSERVÉES)
  // ===============================================

  handlePhotoUpload(event: any): void {
  const file = event.target.files[0];
  if (file && file.type.match(/image\/*/) && file.size < 5000000) {
    this.uploadedPhoto = file;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      this.uploadedPhotoPreview = e.target.result;
    };
    reader.readAsDataURL(file);

    //  NOUVEAU : Lancer l'analyse automatique de la coiffure
    this.analyzeHairstyleFromPhoto(file);
  } else {
    this.snackBar.open('Veuillez sélectionner une image valide (max 5MB)', 'Fermer', {
      duration: 3000
    });
  }
}
/**
 *  NOUVELLE MÉTHODE : Analyser la coiffure depuis une photo
 */
private analyzeHairstyleFromPhoto(photoFile: File): void {

  // Réinitialiser l'état
  this.isAnalyzingPhoto = true;
  this.detectedHairstyles = [];
  this.photoAnalysisError = null;

  // Notification à l'utilisateur
  this.snackBar.open('Analyse IA en cours...', '', {
    duration: 2000,
    panelClass: ['info-snackbar']
  });

  // Appel du service
  this.hairstyleService.generateHairstyles(photoFile).subscribe({
    next: (response: HairstyleResponse) => {

      if (response.success && response.hairstyleNames.length > 0) {
        this.detectedHairstyles = response.hairstyleNames;

        //  RECHERCHE AUTOMATIQUE - Pas de bouton intermédiaire
        this.searchProfessionalsFromDetectedHairstyles();

      } else {
        // Aucune coiffure détectée
        this.isAnalyzingPhoto = false;
        this.photoAnalysisError = 'Aucune coiffure détectée dans cette image';
        this.snackBar.open('Aucune coiffure détectée. Essayez une autre photo.', 'OK', {
          duration: 4000,
          panelClass: ['warning-snackbar']
        });
      }
    },

    error: (error: Error) => {
      console.error(' Erreur analyse coiffure:', error);

      this.isAnalyzingPhoto = false;
      this.photoAnalysisError = error.message;

      this.snackBar.open(
        'Erreur lors de l\'analyse. Réessayez ou utilisez la recherche textuelle.',
        'OK',
        {
          duration: 5000,
          panelClass: ['error-snackbar']
        }
      );
    }
  });
}
/**
 *  NOUVELLE MÉTHODE : Rechercher des professionnels basé sur les coiffures détectées
 */
private searchProfessionalsFromDetectedHairstyles(): void {
  if (this.detectedHairstyles.length === 0) return;


  //  NOUVEAU: Extraire tous les noms de coiffures propres
  const cleanHairstyleNames = this.detectedHairstyles.map(raw => this.extractHairstyleName(raw));

  // Mettre à jour l'interface avec le premier nom
  this.searchTerm = cleanHairstyleNames[0];
  this.searchMode = 'photo';

  //  NOUVELLE LOGIQUE: Recherche multi-services selon le type sélectionné
  this.performMultiServiceSearch(cleanHairstyleNames);

  //  Arrêter l'indicateur de chargement maintenant
  this.isAnalyzingPhoto = false;

  // Message informatif avec tous les noms
  const servicesList = cleanHairstyleNames.slice(0, 3).join(', ');
  const moreText = cleanHairstyleNames.length > 3 ? ` +${cleanHairstyleNames.length - 3} autres` : '';

  this.snackBar.open(
    `Recherche pour: ${servicesList}${moreText}`,
    '',
    {
      duration: 4000,
      panelClass: ['info-snackbar']
    }
  );
}
/**
 *  NOUVELLE MÉTHODE: Recherche multi-services selon le type sélectionné
 */
private performMultiServiceSearch(hairstyleNames: string[]): void {

  this.isLoading = true;

  if (this.selectedProviderType === 'salon') {
    this.searchSalonsForMultipleServices(hairstyleNames);
  } else if (this.selectedProviderType === 'freelance') {
    this.searchFreelancesForMultipleServices(hairstyleNames);
  } else {
    // 'both' - recherche combinée
    this.searchBothForMultipleServices(hairstyleNames);
  }
}

/**
 * Recherche salons pour plusieurs services - 5 recherches parallèles
 */
private searchSalonsForMultipleServices(services: string[]): void {

  // Créer 5 observables pour les 5 services
  const searchObservables = services.map((service, index) => {

    const searchParams = {
      term: service,
      ville: this.locationInput || undefined,
      budget: this.budgetRange > 2000 ? this.budgetRange : undefined,
      datetime: this.selectedDate && this.selectedTime ? `${this.selectedDate}T${this.selectedTime}:00` : undefined,
      providerType: 'salon'
      // Pas d'additionalServices car chaque recherche est indépendante
    };

    return this.salonService.searchSalons(searchParams).pipe(
      catchError((error: any) => {
        console.error(`Erreur recherche salon "${service}":`, error);
        return of({ salons: [], total: 0, error: true });
      })
    );
  });

  // Exécuter toutes les recherches en parallèle

  forkJoin(searchObservables).subscribe({
    next: (responses) => {

      // Fusionner tous les résultats
      let allSalons: any[] = [];
      let totalResults = 0;

      responses.forEach((response: any, index) => {
        const serviceName = services[index];
        const salons = response.salons || response.results || response.data || response || [];

        if (Array.isArray(salons) && salons.length > 0) {

          // Ajouter une indication de quel service a trouvé ce salon
          const salonsWithMetadata = salons.map((salon: any) => ({
            ...salon,
            type: 'salon',
            foundByService: serviceName,
            searchIndex: index
          }));

          allSalons = allSalons.concat(salonsWithMetadata);
          totalResults += salons.length;
        } else {
        }
      });

      // Supprimer les doublons basés sur l'ID
      const uniqueSalons = allSalons.filter((salon, index, array) => {
        return array.findIndex(s => s.id === salon.id) === index;
      });


      // Trier par score/pertinence si disponible
      uniqueSalons.sort((a, b) => {
        const scoreA = a.score || a.averageRating || 0;
        const scoreB = b.score || b.averageRating || 0;
        return scoreB - scoreA;
      });

      this.filteredSalons = this.processSalonData(uniqueSalons);

      //  Initialiser la pagination avec infinite scroll
      this.allProviders = this.filteredSalons;
      this.initializePaginatedResults(this.filteredSalons);
      this.isLoading = false;
      this.selectedService = `Salons - ${services.slice(0, 2).join(', ')}${services.length > 2 ? '...' : ''} (${uniqueSalons.length} trouvés)`;
    },
    error: (error) => {
      console.error('Erreur lors des recherches parallèles salons:', error);
      this.handleSearchError(error);
    }
  });
}

/**
 * Recherche freelances pour plusieurs services - 5 recherches parallèles
 */
private searchFreelancesForMultipleServices(services: string[]): void {

  // Créer 5 observables pour les 5 services
  const searchObservables = services.map((service, index) => {

    const criteres = this.construireTousLesCriteres();
    criteres.service = service;
    // Pas d'additionalServices car chaque recherche est indépendante

    const observable = (criteres.searchType === 'GEOLOCATION' && criteres.lat && criteres.lng)
      ? this.salonService.searchFreelancesNearby(criteres.service, criteres.lat, criteres.lng)
      : this.salonService.searchFreelances(criteres);

    return observable.pipe(
      catchError((error: any) => {
        console.error(`Erreur recherche "${service}":`, error);
        return of({ freelances: [], total: 0, error: true });
      })
    );
  });

  // Exécuter toutes les recherches en parallèle

  forkJoin(searchObservables).subscribe({
    next: (responses) => {

      // Fusionner tous les résultats
      let allFreelances: any[] = [];
      let totalResults = 0;

      responses.forEach((response: any, index) => {
        const serviceName = services[index];
        const freelances = response.freelances || response.data || response || [];

        if (Array.isArray(freelances) && freelances.length > 0) {

          // Ajouter une indication de quel service a trouvé ce freelance
          const freelancesWithMetadata = freelances.map((freelance: any) => ({
            ...freelance,
            type: 'freelance',
            foundByService: serviceName,
            searchIndex: index
          }));

          allFreelances = allFreelances.concat(freelancesWithMetadata);
          totalResults += freelances.length;
        } else {
        }
      });

      // Supprimer les doublons basés sur l'ID
      const uniqueFreelances = allFreelances.filter((freelance, index, array) => {
        return array.findIndex(f => f.id === freelance.id) === index;
      });


      // Trier par score/pertinence si disponible
      uniqueFreelances.sort((a, b) => {
        const scoreA = a.score || a.averageRating || 0;
        const scoreB = b.score || b.averageRating || 0;
        return scoreB - scoreA;
      });

      this.handleSearchSuccess(uniqueFreelances, 'freelance');
      this.selectedService = `Freelances - ${services.slice(0, 2).join(', ')}${services.length > 2 ? '...' : ''} (${uniqueFreelances.length} trouvés)`;
    },
    error: (error) => {
      console.error('Erreur lors des recherches parallèles:', error);
      this.handleSearchError(error);
    }
  });
}

/**
 *  Recherche combinée pour plusieurs services
 */
private searchBothForMultipleServices(services: string[]): void {

  // Faire les deux recherches en parallèle
  const mainService = services[0];

  // Paramètres salons
  const salonParams = {
    term: mainService,
    ville: this.locationInput || undefined,
    budget: this.budgetRange > 2000 ? this.budgetRange : undefined,
    datetime: this.selectedDate && this.selectedTime ? `${this.selectedDate}T${this.selectedTime}:00` : undefined,
    providerType: 'salon',
    additionalServices: services.slice(1)
  };

  // Paramètres freelances
  const criteres = this.construireTousLesCriteres();
  criteres.service = mainService;
  criteres.additionalServices = services.slice(1);

  this.salonService.searchSalons(salonParams).subscribe({
    next: (salonResponse) => {

      // Extraire les salons selon le format de réponse
      const salonResults = Array.isArray(salonResponse) ? salonResponse : ((salonResponse as any)?.salons || (salonResponse as any)?.results || []);

      // Recherche freelances
      const coords = this.extractCoordinates();
      const freelanceObservable = (coords?.lat && coords?.lng && !this.locationInput?.trim())
        ? this.salonService.searchFreelancesNearby(mainService, coords.lat, coords.lng)
        : this.salonService.searchFreelances(criteres);

      freelanceObservable.subscribe({
        next: (freelanceResponse) => {
          const freelanceResults = Array.isArray(freelanceResponse) ? freelanceResponse : (freelanceResponse?.freelances || []);

          // Combiner avec types corrects
          const salonArray = Array.isArray(salonResults) ? salonResults.map((s: any) => ({...s, type: 'salon'})) : [];
          const freelanceArray = Array.isArray(freelanceResults) ? freelanceResults.map((f: any) => ({...f, type: 'freelance'})) : [];
          const combinedResults = [...salonArray, ...freelanceArray];

          this.handleSearchSuccess(combinedResults, 'both');
          this.selectedService = `Tous - ${services.slice(0, 2).join(', ')}${services.length > 2 ? '...' : ''}`;
        },
        error: (error) => {
          console.error(' Erreur freelances multi-services:', error);
          const salonArray = Array.isArray(salonResults) ? salonResults.map((s: any) => ({...s, type: 'salon'})) : [];
          this.handleSearchSuccess(salonArray, 'both');
        }
      });
    },
    error: (error) => {
      console.error(' Erreur salons multi-services:', error);
      this.handleSearchError(error);
    }
  });
}

/**
 *
 *  Extraire le nom propre de la coiffure depuis la description IA
 */
private extractHairstyleName(fullDescription: string): string {
  if (!fullDescription) return '';

  // Pattern pour extraire le nom entre ** ou au début
  const patterns = [
    /\*\*(.*?)\*\*/,  // Entre **nom**
    /^([^(]+)/,       // Jusqu'à la première parenthèse
    /^([^/]+)/        // Jusqu'au premier slash
  ];

  for (const pattern of patterns) {
    const match = fullDescription.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  // Fallback: prendre les premiers mots
  const words = fullDescription.split(' ');
  return words.slice(0, 3).join(' ').replace(/[*()]/g, '').trim();
}

/**
 *  Réessayer l'analyse photo
 */
retryPhotoAnalysis(): void {
  if (this.uploadedPhoto) {
    this.photoAnalysisError = null;
    this.analyzeHairstyleFromPhoto(this.uploadedPhoto);
  }
}
 removePhoto(event?: Event): void {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Nettoyer tout
  this.uploadedPhoto = null;
  this.uploadedPhotoPreview = null;
  this.detectedHairstyles = [];
  this.photoAnalysisError = null;
  this.isAnalyzingPhoto = false;
}


  clearLocation(): void {
    this.userLocation = null;
    this.locationInput = '';
  }

  saveSearchParams(): void {
    if (this.isBrowser) {
      const searchParams = {
        term: this.searchTerm,
        service: this.selectedService,
        budget: this.budgetRange,
        date: this.selectedDate,
        time: this.selectedTime,
        location: this.userLocation || this.locationInput,
        providerType: this.selectedProviderType,
        searchMode: this.searchMode,
        //  SAUVEGARDER CRITÈRES FREELANCES
        disponibleWeekend: this.disponibleWeekend,
        disponibleSoir: this.disponibleSoir,
        experienceMin: this.experienceMin,
        typeIntervention: this.typeIntervention,
        deplacementInclus: this.deplacementInclus
      };
      localStorage.setItem('beautyHubSearchParams', JSON.stringify(searchParams));
    }
  }

  tryRestoreSearchParams(): void {
    const savedParams = localStorage.getItem('beautyHubSearchParams');
    if (savedParams) {
      try {
        const params = JSON.parse(savedParams);
        this.searchTerm = params.term || '';
        this.selectedService = params.service;
        this.budgetRange = params.budget || 2000;
        this.selectedDate = params.date || this.minDate;
        this.selectedTime = params.time || this.selectedTime;
        this.selectedProviderType = params.providerType || 'salon';
        this.searchMode = params.searchMode || 'location';

        //  RESTAURER CRITÈRES FREELANCES
        this.disponibleWeekend = params.disponibleWeekend;
        this.disponibleSoir = params.disponibleSoir;
        this.experienceMin = params.experienceMin;
        this.typeIntervention = params.typeIntervention;
        this.deplacementInclus = params.deplacementInclus;

        if (params.location) {
          this.userLocation = params.location;
        }
      } catch (e) {
        console.error('Erreur lors de la restauration des paramètres de recherche', e);
      }
    }
  }

  logout(): void {
    if (!this.isBrowser) return;

    this.authService.logout().subscribe({
      next: () => {
        this.snackBar.open('Vous êtes déconnecté avec succès', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.cdr.detectChanges();
      }
    });
  }

  async redirectUser() {
    await this.roleRedirectService.redirectBasedOnRoles();
  }

  openContactModal() {
    if (!this.isBrowser) return;

    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    this.dialog.open(ContactComponent, {
      width: '400px',
      height: '500px',
      disableClose: false,
    });
  }

  getStarArray(rating: number): any[] {
    if (!rating || isNaN(rating)) return [];
    const stars = Math.min(Math.floor(rating), 5);
    return new Array(stars);
  }

  hasHalfStar(rating: number): boolean {
    if (!rating || isNaN(rating)) return false;
    return rating % 1 >= 0.5 && Math.floor(rating) < 5;
  }

  // Méthodes modales corrigées - Utilisent le service AuthUIService
  openLoginModal() {
    if (!this.isBrowser) return;

    //    //
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    // Utiliser le service au lieu de modifier directement
    this.authUIService.triggerLoginModal();
  }

  closeLoginModal() {
    this.authUIService.closeModals();
  }

  openRegisterModal() {
    if (!this.isBrowser) return;


    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    // Utiliser le service au lieu de modifier directement
    this.authUIService.triggerRegisterModal();
  }

  closeRegisterModal() {
    this.authUIService.closeModals();
  }

  login(): void {
    if (!this.isBrowser) return;


    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    this.openLoginModal();
  }

  switchToRegister(): void {
    this.authUIService.switchToRegister();
  }

  switchToLogin(): void {
    this.authUIService.switchToLogin();
  }

  readonly scrollToOffres = (): void => {
    if (!this.isBrowser) return;
    const scrollToSection = () => {
      const section = document.getElementById('offres-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (this.router.url === '/' || this.router.url === '/accueil') {
      scrollToSection();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scrollToSection, 300));
    }
  };

  navigateToFreelancePage(): void {
    if (!this.isBrowser) return;

    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }

    const scrollToSection = () => {
      const section = document.getElementById('pro-section');
      if (section) {
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    if (this.router.url === '/' || this.router.url === '/accueil') {
      scrollToSection();
    } else {
      this.router.navigate(['/']).then(() => {
        setTimeout(scrollToSection, 300);
      });
    }
  }

  navigateToHiring(): void {
    if (!this.isBrowser) return;
    if (this.isMobileMenuOpen) this.toggleMobileMenu();
    const scrollToSection = () => {
      const section = document.getElementById('hiring-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (this.router.url === '/' || this.router.url === '/accueil') {
      scrollToSection();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scrollToSection, 300));
    }
  }

  navigateToSalonRegistration(): void {
    if (!this.isBrowser) return;
    if (this.isMobileMenuOpen) this.toggleMobileMenu();
    const scrollToSection = () => {
      const section = document.getElementById('salon-section');
      if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };
    if (this.router.url === '/' || this.router.url === '/accueil') {
      scrollToSection();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scrollToSection, 300));
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;

    if (this.isBrowser) {
      document.body.classList.toggle('menu-open', this.isMobileMenuOpen);

      if (this.isMobileMenuOpen) {
        const overlay = document.createElement('div');
        overlay.className = 'menu-overlay';
        overlay.addEventListener('click', () => this.toggleMobileMenu());
        document.body.appendChild(overlay);

        setTimeout(() => {
          overlay.classList.add('active');
        }, 10);
      } else {
        const overlay = document.querySelector('.menu-overlay');
        if (overlay) {
          overlay.classList.remove('active');
          setTimeout(() => {
            overlay.remove();
          }, 300);
        }
      }
    }
  }

  toggleServicesDropdown(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isServicesDropdownOpen = !this.isServicesDropdownOpen;

    if (this.isServicesDropdownOpen) {
      this.isProfileMenuOpen = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const servicesDropdown = document.querySelector('.dropdown');
    const profileDropdown = document.querySelector('.user-dropdown');

    if (servicesDropdown && !servicesDropdown.contains(event.target as Node)) {
      this.isServicesDropdownOpen = false;
    }

    if (profileDropdown && !profileDropdown.contains(event.target as Node)) {
      this.isProfileMenuOpen = false;
    }
  }

  toggleProfileMenu(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isProfileMenuOpen = !this.isProfileMenuOpen;

    if (this.isProfileMenuOpen) {
      this.isServicesDropdownOpen = false;
    }
  }

  closeAllMenus(): void {
    this.isServicesDropdownOpen = false;
    this.isProfileMenuOpen = false;

    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
  }

  @HostListener('window:scroll')
  onWindowScroll() {
    this.isServicesDropdownOpen = false;
    this.isProfileMenuOpen = false;
  }

  private updateBodyClasses(): void {
    if (!this.isBrowser) return;

    document.body.classList.remove('client-mode', 'employeur-mode', 'freelance-mode', 'visitor-mode');

    if (this.isLoggedIn) {
      if (this.isClient) {
        document.body.classList.add('client-mode');
      } else if (this.isEmployeur) {
        document.body.classList.add('employeur-mode');
      } else if (this.isFreelance) {
        document.body.classList.add('freelance-mode');
      }
    } else {
      document.body.classList.add('visitor-mode');
    }
  }

  /**
   *  MÉTHODE MISE À JOUR - getUserLocation avec recherche automatique
   */
  getUserLocation(): void {
    if (this.isBrowser && navigator.geolocation) {
      this.isLoading = true;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          this.userLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
          this.isLoading = false;

          // Notification de succès
          this.snackBar.open('Position détectée avec succès', '', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });

          //  LANCER RECHERCHE AUTOMATIQUE FREELANCE SI APPLICABLE
          if (this.selectedProviderType === 'freelance' && this.searchTerm?.trim()) {
            setTimeout(() => {
              this.searchNearbyFreelances();
            }, 1000);
          } else if (this.getActiveCriteriaCount() > 1) {
            setTimeout(() => {
              this.searchSalonsAdvanced();
            }, 500);
          }
        },
        (error) => {
          this.isLoading = false;
          let message = 'Impossible d\'obtenir votre position';

          switch(error.code) {
            case error.PERMISSION_DENIED:
              message += ': permission refusée';
              break;
            case error.POSITION_UNAVAILABLE:
              message += ': position indisponible';
              break;
            case error.TIMEOUT:
              message += ': délai expiré';
              break;
          }

          this.snackBar.open(message, 'Saisir manuellement', {
            duration: 4000,
            panelClass: ['error-snackbar']
          }).onAction().subscribe(() => {
            this.showAdvancedSearch = true;
            // Focus sur le champ de saisie de localisation
            setTimeout(() => {
              const locationInput = document.querySelector('input[placeholder*="Quartier"]') as HTMLInputElement;
              if (locationInput) {
                locationInput.focus();
              }
            }, 100);
          });
        }
      );
    }
  }

  // ===============================================
  //  MÉTHODES ADDITIONNELLES POUR LES NOUVEAUX ENDPOINTS
  // ===============================================

  /**
   *  BOUTON RECHERCHE RAPIDE PAR VILLE
   */
  quickCitySearch(ville: string): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez d\'abord entrer un service', 'OK', { duration: 3000 });
      return;
    }

    this.locationInput = ville;

    if (this.selectedProviderType === 'freelance') {
      this.searchFreelancesByCity(ville);
    } else {
      this.searchSalonsAdvanced();
    }
  }

  /**
   *  BOUTON RECHERCHE GÉOLOCALISÉE RAPIDE
   */
  quickLocationSearch(): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez d\'abord entrer un service', 'OK', { duration: 3000 });
      return;
    }

    if (!this.userLocation) {
      this.getUserLocation();
      return;
    }

    if (this.selectedProviderType === 'freelance') {
      this.searchNearbyFreelances();
    } else {
      this.searchSalonsAdvanced();
    }
  }

  /**
   *  RECHERCHE AVEC CRITÈRES PRÉDÉFINIS
   */
  searchWithPresets(preset: 'weekend' | 'evening' | 'nearby' | 'budget'): void {

    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez d\'abord entrer un service', 'OK', { duration: 3000 });
      return;
    }

    // Réinitialiser les critères
    this.disponibleWeekend = false;
    this.disponibleSoir = false;
    this.budgetRange = 2000;

    // Appliquer le preset
    switch (preset) {
      case 'weekend':
        this.disponibleWeekend = true;
        this.selectedProviderType = 'freelance';
        break;
      case 'evening':
        this.disponibleSoir = true;
        this.selectedProviderType = 'freelance';
        break;
      case 'nearby':
        if (!this.userLocation) {
          this.getUserLocation();
          return;
        }
        break;
      case 'budget':
        this.budgetRange = 15000; // Budget économique
        break;
    }

    // Lancer la recherche
    this.searchSalonsAdvanced();
  }

  /**
   *  SUGGESTIONS INTELLIGENTES
   */
  getSuggestions(): string[] {
    const suggestions: string[] = [];

    if (this.selectedProviderType === 'freelance') {
      suggestions.push('Disponible weekend', 'Disponible soirée', 'Déplacement inclus');
    } else if (this.selectedProviderType === 'salon') {
      suggestions.push('Proche de vous', 'Ouvert tard', 'Parking disponible');
    } else {
      suggestions.push('Tous les professionnels', 'Meilleur prix', 'Disponible maintenant');
    }

    return suggestions;
  }

  /**
   *  APPLIQUER SUGGESTION
   */
  applySuggestion(suggestion: string): void {

    switch (suggestion) {
      case 'Disponible weekend':
        this.disponibleWeekend = true;
        this.selectedProviderType = 'freelance';
        break;
      case 'Disponible soirée':
        this.disponibleSoir = true;
        this.selectedProviderType = 'freelance';
        break;
      case 'Déplacement inclus':
        this.deplacementInclus = true;
        this.selectedProviderType = 'freelance';
        break;
      case 'Proche de vous':
        this.quickLocationSearch();
        return;
      case 'Tous les professionnels':
        this.selectedProviderType = 'both';
        break;
      case 'Meilleur prix':
        this.budgetRange = 15000;
        break;
    }

    // Lancer la recherche si on a un terme
    if (this.searchTerm?.trim()) {
      this.searchSalonsAdvanced();
    }
  }

  /**
   *  HISTORIQUE DES RECHERCHES
   */
  getSearchHistory(): string[] {
    if (!this.isBrowser) return [];

    const history = localStorage.getItem('beautyHubSearchHistory');
    return history ? JSON.parse(history) : [];
  }

  /**
   *  AJOUTER À L'HISTORIQUE
   */
  addToSearchHistory(term: string): void {
    if (!this.isBrowser || !term?.trim()) return;

    const history = this.getSearchHistory();
    const cleanTerm = term.trim();

    // Supprimer le terme s'il existe déjà
    const filteredHistory = history.filter(item => item !== cleanTerm);

    // Ajouter au début
    filteredHistory.unshift(cleanTerm);

    // Limiter à 10 éléments
    const limitedHistory = filteredHistory.slice(0, 10);

    localStorage.setItem('beautyHubSearchHistory', JSON.stringify(limitedHistory));
  }

  /**
   *  EFFACER L'HISTORIQUE
   */
  clearSearchHistory(): void {
    if (this.isBrowser) {
      localStorage.removeItem('beautyHubSearchHistory');
      this.snackBar.open('Historique effacé', '', { duration: 1500 });
    }
  }

  /**
   *  RECHERCHE DEPUIS L'HISTORIQUE
   */
  searchFromHistory(term: string): void {

    this.searchTerm = term;
    this.searchSalonsAdvanced();
  }

  /**
   *  STATISTIQUES DE RECHERCHE
   */
  getSearchStats(): any {
    const stats = {
      totalProviders: this.getTotalProvidersCount(),
      salonCount: this.getServiceCount('salon'),
      freelanceCount: this.getServiceCount('freelance'),
      currentType: this.selectedProviderType,
      activeCriteria: this.getActiveCriteriaCount(),
      lastSearch: this.selectedService
    };

    return stats;
  }

  /**
   *  MÉTHODE HELPER POUR DÉVELOPPEMENT
   */
  private isInDevelopmentMode(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   *  DEBUG ENDPOINT CALLS
   */
  debugEndpointCalls(): void {
    if (!this.isInDevelopmentMode()) return;

  }

  /**
   *  RESET COMPLET
   */
  resetAll(): void {

    // Réinitialiser toutes les propriétés
    this.searchTerm = '';
    this.selectedService = null;
    this.filteredSalons = [];
    this.selectedProviderType = 'salon';
    this.searchMode = 'location';
    this.viewMode = 'grid';
    this.budgetRange = 2000;
    this.selectedDate = this.minDate;
    this.selectedTime = '';
    this.userLocation = null;
    this.locationInput = '';
    this.uploadedPhoto = null;
    this.uploadedPhotoPreview = null;
    this.showAdvancedSearch = false;

    // Réinitialiser critères freelances
    this.disponibleWeekend = undefined;
    this.disponibleSoir = undefined;
    this.experienceMin = undefined;
    this.typeIntervention = undefined;
    this.deplacementInclus = undefined;

    // Réinitialiser les compteurs
    this.flexibleCriteria = {};
    this.activeCriteriaCount = 0;
    this.isLoading = false;

    // Effacer le localStorage
    if (this.isBrowser) {
      localStorage.removeItem('beautyHubSearchParams');
      localStorage.removeItem('beautyHubFlexibleSearch');
    }

    // Notification
    this.snackBar.open('Interface réinitialisée', '', {
      duration: 2000,
      panelClass: ['info-snackbar']
    });

    // Forcer la détection des changements
    this.cdr.detectChanges();
  }

  // Méthode helper pour détecter la page
  private isOnSalonRegistrationPage(): boolean {
    return this.router.url.includes('salon-registration');
  }

  // ===============================================
  //  MÉTHODES FINALES POUR LA COMPATIBILITÉ
  // ===============================================

  /**
   *  MÉTHODE WRAPPER POUR COMPATIBILITÉ TOTALE
   */
  performSearch(): void {


    // Ajouter à l'historique si c'est une recherche textuelle
    if (this.searchTerm?.trim()) {
      this.addToSearchHistory(this.searchTerm.trim());
    }

    // Lancer la recherche avancée
    this.searchSalonsAdvanced();
  }

  /**
   *  MÉTHODE POUR NAVIGATION EXTERNE
   */
  navigateToExternalService(url: string): void {
    if (this.isBrowser) {
      window.open(url, '_blank');
    }
  }

  /**
   *  PARTAGER LES RÉSULTATS
   */
  shareResults(): void {
    if (!this.isBrowser) return;

    const shareData = {
      title: 'BeautyHub - Résultats de recherche',
      text: `${this.filteredSalons.length} ${this.getProviderTypeLabel().toLowerCase()} trouvés`,
      url: window.location.href

    };

    if (navigator.share) {
      navigator.share(shareData);
    } else {
      // Fallback - copier dans le presse-papiers
      navigator.clipboard.writeText(window.location.href).then(() => {
        this.snackBar.open('Lien copié dans le presse-papiers', '', { duration: 2000 });
      });
    }
  }



  //pour la estion du client  pour laccueil//
    checkAuthAndLoadClientData(): void {


    if (this.isLoggedIn && this.isClient) {
      this.loadClientEnrichments();
    }
  }

  /**
   *  Charger enrichissements client
   */
  loadClientEnrichments(): void {
    this.loadingClientData = true;

    // Charger TOUTES les données pour des suggestions réelles
    const clientData$ = forkJoin({
      upcoming: this.reservationService.getClientUpcomingReservations(),
      history: this.reservationService.getClientReservationHistory(), //  Historique complet
      allReservations: this.reservationService.getClientReservations(), //  Toutes les réservations
      toRate: this.reservationService.getReservationsToRate(),
      favorites: this.reservationService.getClientFavoriteProviders()
    });

    clientData$.subscribe({
      next: (data: {
        upcoming: any[];
        history: any[];
        allReservations: any[];
        toRate: { total: number; };
        favorites: any[];
      }) => {

        // RDV à venir
        this.upcomingReservations = data.upcoming.slice(0, 5);
        this.nextAppointment = data.upcoming.length > 0 ? data.upcoming[0] : null;
        this.upcomingCount = data.upcoming.length;

        // Avis à donner
        this.toRateCount = data.toRate.total || 0;

        //  Stocker TOUTES les réservations pour l'analyse des préférences
        this.allClientReservations = [...(data.allReservations || []), ...(data.history || [])];


        //  Générer suggestions RÉELLES basées sur l'historique complet
        this.generateClientSuggestions(data.favorites);

        //  Enrichir les suggestions avec les vrais avis
        this.enrichSuggestionsWithRealReviews();

        //  Trouver de vrais prestataires pour les suggestions génériques
        this.findRealProvidersForGenericSuggestions();

        this.loadingClientData = false;

        // Afficher rappel si RDV bientôt
        this.checkUpcomingReminder();
      },
      error: (error: any) => {
        console.error(' Erreur chargement données client:', error);
        this.loadingClientData = false;

        // En cas d'erreur, générer suggestions minimales
        this.generateClientSuggestions([]);
      }
    });
  }

/**
   *  Générer suggestions basées sur favoris/historique
   */
  generateClientSuggestions(favorites: any[]): void {
    this.clientSuggestions = [];

    // 1. Analyser l'historique pour identifier les préférences
    const preferences = this.analyzeClientPreferences();

    // 2. Suggestions basées sur les favoris avec données RÉELLES
    const favoriteSuggestions = favorites.slice(0, 2).map(fav => {
      // Calculer le nombre RÉEL de visites chez ce prestataire
      const prestataireId = fav.salonId || fav.freelanceId;
      const visitsCount = this.allClientReservations.filter(r =>
        (r.salonId === prestataireId && fav.salonId) ||
        (r.freelanceId === prestataireId && fav.freelanceId)
      ).length;

      // Service le plus réservé chez ce prestataire
      const servicesWithProvider = this.allClientReservations
        .filter(r => (r.salonId === prestataireId && fav.salonId) || (r.freelanceId === prestataireId && fav.freelanceId))
        .map(r => r.serviceName || r.serviceNom)
        .filter(s => s);

      const preferredServiceWithProvider = servicesWithProvider.length > 0 ?
        servicesWithProvider[0] :
        preferences.preferredServices[0] || 'Vos services habituels';

      return {
        id: `fav-${fav.id}`,
        name: fav.prestataire,
        service: preferredServiceWithProvider,
        type: fav.type || 'SALON',
        rating: fav.rating ? Math.round(fav.rating * 10) / 10 : 4.5,
        reviewCount: fav.reviewCount || 25,
        image: fav.image || null,
        reason: visitsCount > 0 ? `${visitsCount} visite${visitsCount > 1 ? 's' : ''} chez eux` : 'Dans vos favoris',
        providerId: prestataireId,
        providerType: fav.type?.toLowerCase() || 'salon',
        //  CORRECTION: Ajouter la localisation du favori
        searchLocation: fav.ville || fav.adresse || preferences.preferredLocation
      };
    });

    this.clientSuggestions.push(...favoriteSuggestions);

    // 3. Suggestions basées sur les services les plus réservés
    if (preferences.preferredServices.length > 0) {
      preferences.preferredServices.slice(0, 2).forEach((service: string, index: number) => {
        if (this.clientSuggestions.length < 4) {
          this.clientSuggestions.push({
            id: `service-${index}`,
            name: `Nouveau ${preferences.preferredProviderType === 'salon' ? 'salon' : 'freelance'}`,
            service: service,
            type: preferences.preferredProviderType?.toUpperCase() || 'SALON',
            rating: 0, //  Sera mis à jour avec de vrais avis
            reviewCount: 0, //  Sera mis à jour avec de vrais avis
            image: null,
            reason: `Service que vous aimez (${preferences.serviceStats[service] || 1}x réservé)`,
            needsRealProvider: true, //  Marquer pour recherche de vrais prestataires
            //  CORRECTION: Ajouter la localisation préférée aux suggestions de service
            searchLocation: preferences.preferredLocation
          });
        }
      });
    }

    // 4. Suggestion basée sur la localisation préférée
    if (preferences.preferredLocation && this.clientSuggestions.length < 4) {
      this.clientSuggestions.push({
        id: 'location-based',
        name: `Prestataires près de ${preferences.preferredLocation}`,
        service: preferences.preferredServices[0] || 'Tous services',
        type: 'MIXED',
        rating: 0, //  Sera mis à jour avec de vrais prestataires
        reviewCount: 0, //  Sera mis à jour avec de vrais prestataires
        image: null,
        reason: 'Proche de vos lieux habituels',
        needsLocationSearch: true, //  Marquer pour recherche géolocalisée
        searchLocation: preferences.preferredLocation
      });
    }

    // 5. Suggestion temporelle (si client réserve souvent le weekend/soir)
    if (preferences.preferredTime && this.clientSuggestions.length < 4) {
      const timeLabel = preferences.preferredTime === 'weekend' ? 'weekend' : 'soirée';
      this.clientSuggestions.push({
        id: 'time-based',
        name: `Disponibles en ${timeLabel}`,
        service: preferences.preferredServices[0] || 'Vos services préférés',
        type: preferences.preferredProviderType?.toUpperCase() || 'MIXED',
        rating: 4.2,
        reviewCount: 18,
        image: null,
        reason: `Adapté à vos créneaux préférés (${timeLabel})`,
        //  CORRECTION: Ajouter la localisation aux suggestions temporelles
        searchLocation: preferences.preferredLocation
      });
    }

    // 6. Si pas assez de suggestions, ajouter recommandations génériques intelligentes
    while (this.clientSuggestions.length < 3) {
      const genericSuggestions = [
        {
          name: 'Nouveaux talents',
          service: 'Découvrez de nouveaux prestataires',
          reason: 'Recommandé pour vous'
        },
        {
          name: 'Offres spéciales',
          service: 'Promotions en cours',
          reason: 'Économisez sur vos services préférés'
        },
        {
          name: 'Tendances',
          service: 'Services populaires ce mois-ci',
          reason: 'Ce que d\'autres clients aiment'
        }
      ];

      const suggestion = genericSuggestions[this.clientSuggestions.length - favorites.length] || genericSuggestions[0];

      this.clientSuggestions.push({
        id: `generic-${this.clientSuggestions.length}`,
        name: suggestion.name,
        service: suggestion.service,
        type: 'MIXED',
        rating: 4.3,
        reviewCount: 15,
        image: null,
        reason: suggestion.reason
      });
    }

  }

  /**
   *  Analyser les préférences du client basées sur l'historique
   */
  private analyzeClientPreferences(): any {
    const preferences = {
      preferredServices: [] as string[],
      serviceStats: {} as { [key: string]: number },
      preferredProviderType: null as string | null,
      preferredLocation: null as string | null,
      preferredTime: null as string | null,
      avgBudget: 0,
      reservationCount: 0
    };

    //  Utiliser TOUTES les réservations pour l'analyse (historique complet)
    if (!this.allClientReservations || this.allClientReservations.length === 0) {
      return preferences;
    }

    // Analyser l'historique COMPLET des réservations
    const allReservations = [...this.allClientReservations];


    preferences.reservationCount = allReservations.length;

    // 1. Analyser les services préférés
    allReservations.forEach(reservation => {
      const serviceName = reservation.serviceName || reservation.serviceNom || 'Service';
      preferences.serviceStats[serviceName] = (preferences.serviceStats[serviceName] || 0) + 1;
    });

    // Trier par fréquence
    preferences.preferredServices = Object.entries(preferences.serviceStats)
      .sort(([,a], [,b]) => b - a)
      .map(([service]) => service)
      .slice(0, 3);

    // 2. Type de prestataire préféré
    const salonCount = allReservations.filter(r => r.salonId).length;
    const freelanceCount = allReservations.filter(r => r.freelanceId).length;

    if (salonCount > freelanceCount) {
      preferences.preferredProviderType = 'salon';
    } else if (freelanceCount > salonCount) {
      preferences.preferredProviderType = 'freelance';
    } else {
      preferences.preferredProviderType = 'mixed';
    }

    // 3. Localisation préférée (analyse des adresses)
    const locations = allReservations
      .map(r => r.salonAdresse || r.freelanceAdresse)
      .filter(addr => addr)
      .map(addr => {
        // Améliorer l'extraction de ville/quartier
        const parts = addr.split(',').map((p: string) => p.trim());

        // Priorité : chercher les villes principales du Sénégal
        const mainCities = ['Dakar', 'Thiès', 'Mbour', 'Saint-Louis', 'Kaolack', 'Ziguinchor', 'Diourbel', 'Louga', 'Fatick'];
        const foundCity = parts.find((part: string) =>
          mainCities.some(city => part.toLowerCase().includes(city.toLowerCase()))
        );

        if (foundCity) {
          // Nettoyer pour garder juste le nom de la ville
          const cityMatch = mainCities.find(city =>
            foundCity.toLowerCase().includes(city.toLowerCase())
          );
          return cityMatch || foundCity;
        }

        // Fallback : dernière partie ou première partie
        return parts[parts.length - 1] || parts[0] || addr;
      });

    if (locations.length > 0) {
      const locationCounts = locations.reduce((acc, loc) => {
        acc[loc] = (acc[loc] || 0) + 1;
        return acc;
      }, {} as { [key: string]: number });


      //  NOUVELLE LOGIQUE - Prioriser localisation actuelle/récente
      preferences.preferredLocation = this.getBestLocationForSuggestions(allReservations, locationCounts);

    }

    // 4. Préférences temporelles (weekend/soirée)
    const weekendReservations = allReservations.filter(r => {
      const date = new Date(r.datePrestation);
      const day = date.getDay();
      return day === 0 || day === 6; // Dimanche ou Samedi
    });

    const eveningReservations = allReservations.filter(r => {
      const date = new Date(r.datePrestation);
      const hour = date.getHours();
      return hour >= 18; // Après 18h
    });

    if (weekendReservations.length > allReservations.length * 0.4) {
      preferences.preferredTime = 'weekend';
    } else if (eveningReservations.length > allReservations.length * 0.4) {
      preferences.preferredTime = 'evening';
    }

    // 5. Budget moyen
    const budgets = allReservations
      .map(r => r.prixTotal || r.servicePrix || 0)
      .filter(price => price > 0);

    if (budgets.length > 0) {
      preferences.avgBudget = budgets.reduce((sum, price) => sum + price, 0) / budgets.length;
    }

    return preferences;
  }

  /**
   *  Enrichir les suggestions avec les vrais avis des prestataires
   */
  private enrichSuggestionsWithRealReviews(): void {

    // Pour chaque suggestion avec un prestataire spécifique
    this.clientSuggestions.forEach((suggestion, index) => {
      if (suggestion.providerId && suggestion.providerType) {
        // Charger les vrais avis selon le type de prestataire
        const reviewsObservable = suggestion.providerType === 'salon'
          ? this.reservationService.getAvisBySalon(suggestion.providerId)
          : this.reservationService.getAvisByFreelance(suggestion.providerId);

        reviewsObservable.subscribe({
          next: (response: any) => {
            if (response && response.avis && Array.isArray(response.avis)) {
              // Calculer la vraie note moyenne
              const avis = response.avis;
              const totalNotes = avis.reduce((sum: number, avis: any) => sum + (avis.note || 0), 0);
              const moyenneNote = avis.length > 0 ? totalNotes / avis.length : 0;

              // Mettre à jour la suggestion avec les vrais avis
              this.clientSuggestions[index] = {
                ...suggestion,
                rating: Math.round(moyenneNote * 10) / 10, //  Vraie note arrondie à 1 décimale
                reviewCount: avis.length //  Vrai nombre d'avis
              };

            } else {
              // Pas d'avis trouvés
              this.clientSuggestions[index] = {
                ...suggestion,
                rating: 0,
                reviewCount: 0
              };
            }

            //  Récupérer aussi la photo de profil du prestataire
            this.loadProviderProfileImage(suggestion, index);
          },
          error: (error: any) => {
            console.warn(` Erreur lors de la récupération des avis pour ${suggestion.name}:`, error);
            // Garder les valeurs par défaut en cas d'erreur
          }
        });
      }
    });
  }

  /**
   *  Charger la photo de profil d'un prestataire
   */
  private loadProviderProfileImage(suggestion: any, index: number): void {
    if (suggestion.providerId && suggestion.providerType) {
      const imageObservable = suggestion.providerType === 'salon'
        ? this.salonService.getSalonById(suggestion.providerId)
        : this.freelanceService.getFreelanceById(suggestion.providerId);

      imageObservable.subscribe({
        next: (provider: any) => {
          if (provider) {
            const profileImage = provider.photoProfil || provider.profileImage || null;

            this.clientSuggestions[index] = {
              ...this.clientSuggestions[index],
              image: profileImage
            };

          }
        },
        error: (error: any) => {
          console.warn(` Erreur lors du chargement de la photo pour ${suggestion.name}:`, error);
        }
      });
    }
  }

  /**
   *  Trouver de vrais prestataires pour les suggestions génériques
   */
  private findRealProvidersForGenericSuggestions(): void {

    this.clientSuggestions.forEach((suggestion, index) => {
      if (suggestion.needsRealProvider || suggestion.needsLocationSearch) {
        //  NOUVELLE LOGIQUE - Recherche intelligente avec fallback
        this.findBestProviderForSuggestion(suggestion, index);
      }
    });
  }

  /**
   *  Nouvelle méthode - Trouver le meilleur prestataire avec logique de fallback
   */
  private findBestProviderForSuggestion(suggestion: any, index: number): void {
    const service = suggestion.service;
    const preferredType = suggestion.type?.toLowerCase();


    // Étape 1: Recherche avec localisation spécifique (si applicable)
    let searchParams: any = {
      term: service,
      providerType: 'both', // Chercher dans salon ET freelance
      limit: 10 // Plus de résultats pour pouvoir filtrer intelligemment
    };

    // Ajouter la localisation si c'est une suggestion de proximité
    if (suggestion.needsLocationSearch && suggestion.searchLocation) {
      searchParams.ville = suggestion.searchLocation;
      searchParams.searchType = 'CITY_STRICT';
    }

    this.salonService.searchSalons(searchParams).subscribe({
      next: (response: any) => {

        // Adapter à la structure de réponse réelle
        let providers: any[] = [];

        // Traiter les salons s'ils existent
        if (response.salons && Array.isArray(response.salons)) {
          const salons = response.salons.map((salon: any) => ({
            ...salon,
            type: 'salon',
            services: salon.serviceNoms || salon.services || []
          }));
          providers = providers.concat(salons);
        }

        // Traiter les freelances s'ils existent
        if (response.freelances && Array.isArray(response.freelances)) {
          const freelances = response.freelances.map((freelance: any) => ({
            ...freelance,
            type: 'freelance',
            services: freelance.services || []
          }));
          providers = providers.concat(freelances);
        }


        const bestProvider = this.selectBestProvider(providers, service, preferredType, suggestion.searchLocation);

        if (bestProvider) {
          this.updateSuggestionWithProvider(suggestion, index, bestProvider);
        } else if (suggestion.needsLocationSearch) {
          // Étape 2: Fallback - Élargir la zone de recherche
          this.fallbackSearchForLocationSuggestion(suggestion, index, service, preferredType);
        } else {
          // Garder la suggestion générique
          this.keepGenericSuggestion(suggestion, index);
        }
      },
      error: (error: any) => {
        console.warn(` Erreur recherche pour ${service}:`, error);
        this.keepGenericSuggestion(suggestion, index);
      }
    });
  }

  /**
   *  Sélectionner le meilleur prestataire selon des critères intelligents
   */
  private selectBestProvider(providers: any[], service: string, preferredType: string, targetLocation?: string): any {
    if (!providers || providers.length === 0) return null;


    // Filtres par priorité
    let candidates = providers;

    // 1. Filtre par service (priorité absolue)
    const providersWithService = candidates.filter(p =>
      this.providerOffersService(p, service)
    );

    if (providersWithService.length > 0) {
      candidates = providersWithService;
    } else {
      console.warn(` Aucun prestataire ne propose "${service}" spécifiquement`);
    }

    // 2. Filtre par type préféré (salon prioritaire généralement)
    if (preferredType && preferredType !== 'mixed') {
      const preferredTypeProviders = candidates.filter(p =>
        p.type?.toLowerCase() === preferredType
      );
      if (preferredTypeProviders.length > 0) {
        candidates = preferredTypeProviders;
      }
    }

    // 3. Si on a une localisation cible, privilégier la proximité
    if (targetLocation) {
      const nearbyProviders = candidates.filter(p =>
        this.isProviderNearLocation(p, targetLocation)
      );
      if (nearbyProviders.length > 0) {
        candidates = nearbyProviders;
      }
    }

    // 4. Sélection finale par qualité (note + nombre d'avis)
    const bestProvider = candidates.sort((a, b) => {
      const scoreA = this.calculateProviderScore(a);
      const scoreB = this.calculateProviderScore(b);
      return scoreB - scoreA;
    })[0];

    if (bestProvider) {
    }

    return bestProvider;
  }

  /**
   *  Vérifier si un prestataire propose un service spécifique
   */
  private providerOffersService(provider: any, service: string): boolean {
    if (!provider || !service) return false;

    const serviceToCheck = service.toLowerCase().trim();

    // Récupérer les services selon la structure (salon ou freelance)
    const rawServices = provider.serviceNoms || provider.services || [];
    const providerServices = rawServices.map((s: string) => s.toLowerCase().trim());

    // Recherche exacte ou partielle
    return providerServices.some((s: string) =>
      s.includes(serviceToCheck) || serviceToCheck.includes(s)
    );
  }

  /**
   *  Vérifier si un prestataire est proche d'une localisation
   */
  private isProviderNearLocation(provider: any, targetLocation: string): boolean {
    if (!provider || !targetLocation) return true; // Si pas d'info, ne pas filtrer

    const providerLocation = (provider.adresse || provider.ville || '').toLowerCase().trim();
    const target = targetLocation.toLowerCase().trim();


    // Correspondance exacte ou inclusion
    if (providerLocation.includes(target) || target.includes(providerLocation)) {
      return true;
    }

    // Vérifier les zones géographiquement proches
    const nearbyZones = this.getNearbyZones(target);
    const isNearby = nearbyZones.some(zone =>
      providerLocation.includes(zone.toLowerCase()) ||
      zone.toLowerCase().includes(providerLocation)
    );

    if (isNearby) {
      return true;
    }

    return false;
  }

  /**
   *  Obtenir les zones géographiquement proches d'une localisation
   */
  private getNearbyZones(location: string): string[] {
    const proximityMap: { [key: string]: string[] } = {
      'rufisque centre': ['rufisque', 'bargny', 'diamniadio'],
      'rufisque': ['rufisque centre', 'bargny', 'diamniadio'],
      'zac mbao': ['keur massar', 'malika', 'yeumbeul'],
      'keur massar': ['zac mbao', 'malika', 'yeumbeul'],
      'dakar': ['plateau', 'medina', 'fann', 'mermoz'],
      'plateau': ['dakar', 'medina'],
      'foire': ['dakar', 'hann'],
      'pikine': ['guediawaye', 'thiaroye'],
      'guediawaye': ['pikine', 'parcelles assainies']
    };

    return proximityMap[location.toLowerCase()] || [];
  }

  /**
   *  Calculer un score de qualité pour un prestataire
   */
  private calculateProviderScore(provider: any): number {
    const rating = provider.rating || provider.note || 0;
    const reviewCount = provider.reviewCount || provider.nombreAvis || 0;

    // Score pondéré : note * log(nombre d'avis + 1)
    return rating * Math.log(reviewCount + 1);
  }

  /**
   *  Fallback pour suggestions géolocalisées sans résultats
   */
  private fallbackSearchForLocationSuggestion(suggestion: any, index: number, service: string, preferredType: string): void {
    // Rechercher dans les zones historiques du client
    const fallbackLocations = this.getFallbackLocations(suggestion.searchLocation);


    const fallbackParams = {
      term: service,
      providerType: 'both',
      limit: 5,
      ville: fallbackLocations[0], // Commencer par la première zone de fallback
      searchType: 'CITY_STRICT'
    };

    this.salonService.searchSalons(fallbackParams).subscribe({
      next: (response: any) => {
        // Même traitement que pour la recherche principale
        let providers: any[] = [];

        if (response.salons && Array.isArray(response.salons)) {
          const salons = response.salons.map((salon: any) => ({
            ...salon,
            type: 'salon',
            services: salon.serviceNoms || salon.services || []
          }));
          providers = providers.concat(salons);
        }

        if (response.freelances && Array.isArray(response.freelances)) {
          const freelances = response.freelances.map((freelance: any) => ({
            ...freelance,
            type: 'freelance',
            services: freelance.services || []
          }));
          providers = providers.concat(freelances);
        }

        const bestProvider = this.selectBestProvider(providers, service, preferredType);

        if (bestProvider) {
          this.updateSuggestionWithProvider(suggestion, index, bestProvider, true);
        } else {
          this.keepGenericSuggestion(suggestion, index);
        }
      },
      error: () => this.keepGenericSuggestion(suggestion, index)
    });
  }

  /**
   *  Obtenir les localisations de fallback basées sur l'historique du client
   */
  private getFallbackLocations(originalLocation: string): string[] {
    // Logique de fallback géographique intelligent
    const locationHierarchy: { [key: string]: string[] } = {
      'rufisque centre': ['rufisque', 'Dakar', 'pikine'],
      'zac mbao': ['keur massar', 'pikine', 'Dakar'],
      'keur massar': ['zac mbao', 'pikine', 'Dakar'],
      'foire': ['Dakar', 'plateau', 'medina'],
      'pikine': ['keur massar', 'Dakar'],
    };

    const fallbacks = locationHierarchy[originalLocation?.toLowerCase()] || ['Dakar'];
    return fallbacks;
  }

  /**
   *  Mettre à jour la suggestion avec le prestataire trouvé
   */
  private updateSuggestionWithProvider(suggestion: any, index: number, provider: any, isFallback: boolean = false): void {
    const locationText = isFallback ?
      `Zone élargie (${provider.ville || provider.adresse || ''})` :
      suggestion.searchLocation || '';

    this.clientSuggestions[index] = {
      ...suggestion,
      name: provider.nom || provider.name,
      providerId: provider.id,
      providerType: provider.type || 'salon',
      rating: Math.round((provider.rating || provider.note || 0) * 10) / 10,
      reviewCount: provider.reviewCount || provider.nombreAvis || 0,
      image: provider.imageUrl || provider.image,
      reason: suggestion.needsLocationSearch ?
        `${locationText}${provider.distanceKm ? ` (${provider.distanceKm}km)` : ''}` :
        suggestion.reason,
      needsRealProvider: false,
      needsLocationSearch: false
    };

  }

  /**
   *  Garder la suggestion générique si aucun prestataire trouvé
   */
  private keepGenericSuggestion(suggestion: any, index: number): void {
    this.clientSuggestions[index] = {
      ...suggestion,
      rating: 0,
      reviewCount: 0,
      needsRealProvider: false,
      needsLocationSearch: false
    };
  }

 /**
   *  Réservation rapide depuis suggestion
   */
  quickBookSuggestion(suggestion: any): void {

    //  Marquer que la recherche provient d'une suggestion
    this.searchFromSuggestion = true;

    // Si c'est un prestataire favori spécifique
    if (suggestion.providerId && suggestion.providerType) {
      this.openSpecificProviderBooking(suggestion);
      return;
    }

    // Si c'est une suggestion de service spécifique
    if (suggestion.type !== 'MIXED') {
      this.selectedProviderType = suggestion.type.toLowerCase();
      this.searchTerm = suggestion.service;

      //  CORRECTION: Appliquer la localisation MÊME pour les suggestions spécifiques
      if (suggestion.searchLocation) {
        this.locationInput = suggestion.searchLocation;
        this.userLocation = null; // Forcer l'utilisation du texte de localisation
      }

      // Faire défiler vers la section de recherche
      setTimeout(() => {
        const searchElement = document.querySelector('.enhanced-search-bar');
        if (searchElement) {
          searchElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

      this.searchSalonsAdvanced();
    } else {
      // Suggestion mixte - ouvrir recherche géolocalisée
      this.selectedProviderType = 'both';

      if (suggestion.service && suggestion.service !== 'Tous services') {
        this.searchTerm = suggestion.service;
      }

      //  CORRECTION: Utiliser la localisation de la suggestion pour la recherche
      if (suggestion.searchLocation) {

        // Définir la localisation pour la recherche
        this.locationInput = suggestion.searchLocation;

        // Effacer la géolocalisation pour forcer l'utilisation du texte de localisation
        this.userLocation = null;

      }

      // Faire défiler vers la recherche
      setTimeout(() => {
        const searchElement = document.querySelector('.enhanced-search-bar');
        if (searchElement) {
          searchElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);

      this.searchSalonsAdvanced();
    }
  }

  /**
   *  Ouvrir réservation avec un prestataire spécifique
   */
  private openSpecificProviderBooking(suggestion: any): void {

    //  CORRECTION: Appliquer la localisation du favori si disponible
    if (suggestion.searchLocation) {
      this.locationInput = suggestion.searchLocation;
      this.userLocation = null; // Forcer l'utilisation du texte de localisation
    }

    // Simuler un clic sur le prestataire pour ouvrir ses détails
    const providerData: EnhancedProviderData = {
      id: suggestion.providerId,
      nom: suggestion.name,
      adresse: suggestion.address || 'Adresse à confirmer',
      type: suggestion.providerType as 'salon' | 'freelance',
      rating: suggestion.rating,
      reviewCount: suggestion.reviewCount,
      services: [suggestion.service]
    };

    // Ouvrir le dialog de détails directement
    this.openDetailDialog(providerData);
  }

    /**
   *  Voir détails réservation
   */
  viewReservationDetails(reservation: any): void {

    // Option 1: Navigation vers détail
    // this.router.navigate(['/reservation', reservation.id]);

    // Option 2: Ouvrir votre modal existant avec les données
    // this.openDetailDialog(reservation);
  }

  /**
   *  Nouvelle réservation rapide
   */
  quickNewReservation(): void {
    // Faire défiler vers la recherche ou ouvrir modal
    const searchElement = document.querySelector('.enhanced-search-bar');
    if (searchElement) {
      searchElement.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // ==========================================
  //  GESTION UI
  // ==========================================

  /**
   *  Fermer bandeau bienvenue
   */
  dismissWelcomeBanner(): void {
    this.welcomeBannerDismissed = true;
    // Sauvegarder uniquement si localStorage est disponible
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('welcomeBannerDismissed', 'true');
    }
  }

  /**
   *  Charger état bandeau
   */
  loadWelcomeBannerState(): void {
    // Vérifier si localStorage est disponible (éviter erreur SSR)
    if (typeof window !== 'undefined' && window.localStorage) {
      const dismissed = localStorage.getItem('welcomeBannerDismissed');
      this.welcomeBannerDismissed = dismissed === 'true';
    } else {
      this.welcomeBannerDismissed = false; // Valeur par défaut côté serveur
    }
  }

  /**
   *  Toggle widget RDV
   */
  toggleWidget(): void {
    this.widgetMinimized = !this.widgetMinimized;
  }

  /**
   *  Vérifier rappel RDV proche
   */
  checkUpcomingReminder(): void {
    if (this.nextAppointment) {
      const appointmentDate = new Date(this.nextAppointment.datePrestation);
      const now = new Date();
      const hoursUntil = (appointmentDate.getTime() - now.getTime()) / (1000 * 60 * 60);

      // Si RDV dans moins de 6h, suggérer de voir le dashboard
      if (hoursUntil > 0 && hoursUntil <= 6) {
        setTimeout(() => {
          this.showUpcomingReminder();
        }, 5000); // Après 5s
      }
    }
  }

  /**
   *  Afficher rappel RDV
   */
  showUpcomingReminder(): void {
    if (!this.nextAppointment) return;

    // Utiliser votre système de notification existant ou console.log

    // Si vous avez un service de notification :
    // this.notificationService.show(`RDV ${this.nextAppointment.serviceNom} bientôt !`, 'Voir détails');
  }

  // ==========================================
  //  UTILITAIRES
  // ==========================================

  /**
   *  Formater date (ajout simple)
   */
  formatDate(date: string | Date): string {
    try {
      const d = new Date(date);
      return d.toLocaleDateString('fr-FR', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
    } catch (error) {
      return 'Date invalide';
    }
  }

  /**
   *  Formater heure (ajout simple)
   */
  formatTime(date: string | Date): string {
    try {
      const d = new Date(date);
      return d.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Heure invalide';
    }
  }

  // ===============================================
  //  MÉTHODES CARROUSEL SUGGESTIONS
  // ===============================================

  /**
   *  Calculer la transformation du carrousel
   */
  getCarouselTransform(): number {
    const cardWidth = 320; // 300px + 20px gap
    return -(this.currentSuggestionIndex * cardWidth);
  }

  /**
   *  Obtenir l'index maximum pour la navigation
   */
  getMaxIndex(): number {
    return Math.max(0, this.clientSuggestions.length - this.suggestionCardsVisible);
  }

  /**
   *  Obtenir l'index de la slide courante
   */
  getCurrentSlideIndex(): number {
    return Math.floor(this.currentSuggestionIndex / this.suggestionCardsVisible);
  }

  /**
   *  Faire défiler les suggestions
   */
  scrollSuggestions(direction: 'prev' | 'next'): void {
    if (!this.clientSuggestions || this.clientSuggestions.length <= this.suggestionCardsVisible) {
      return;
    }

    if (direction === 'next') {
      if (this.currentSuggestionIndex < this.clientSuggestions.length - this.suggestionCardsVisible) {
        this.currentSuggestionIndex++;
      }
    } else {
      if (this.currentSuggestionIndex > 0) {
        this.currentSuggestionIndex--;
      }
    }
  }

  /**
   *  Obtenir les points indicateurs du carrousel
   */
  getCarouselDots(): any[] {
    if (!this.clientSuggestions || this.clientSuggestions.length <= this.suggestionCardsVisible) {
      return [];
    }

    const dotsCount = Math.ceil(this.clientSuggestions.length / this.suggestionCardsVisible);
    return new Array(dotsCount);
  }

  /**
   *  Aller à une slide spécifique
   */
  goToSuggestionSlide(slideIndex: number): void {
    if (!this.clientSuggestions || this.clientSuggestions.length <= this.suggestionCardsVisible) {
      return;
    }

    this.currentSuggestionIndex = slideIndex * this.suggestionCardsVisible;

    // S'assurer qu'on ne dépasse pas les limites
    const maxIndex = this.clientSuggestions.length - this.suggestionCardsVisible;
    if (this.currentSuggestionIndex > maxIndex) {
      this.currentSuggestionIndex = maxIndex;
    }
  }

  /**
   *  Adapter la configuration du carrousel selon la taille d'écran
   */
  updateCarouselConfig(): void {
    if (!this.isBrowser) return;

    const screenWidth = window.innerWidth;

    if (screenWidth <= 480) {
      this.suggestionCardsVisible = 1;
      this.suggestionCardWidth = 260; // 240px + 20px gap
    } else if (screenWidth <= 768) {
      this.suggestionCardsVisible = 1;
      this.suggestionCardWidth = 280; // 260px + 20px gap
    } else if (screenWidth <= 1024) {
      this.suggestionCardsVisible = 2;
      this.suggestionCardWidth = 300; // 280px + 20px gap
    } else {
      this.suggestionCardsVisible = 3;
      this.suggestionCardWidth = 320; // 300px + 20px gap
    }

    // Réajuster l'index si nécessaire
    if (this.currentSuggestionIndex > this.getMaxIndex()) {
      this.currentSuggestionIndex = this.getMaxIndex();
    }
  }

  /**
   *  Listener pour les changements de taille d'écran
   */
  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    this.updateCarouselConfig();
  }

  //  HostListener pour l'infinite scroll
  @HostListener('window:scroll', ['$event'])
  onScrollForInfinite(event: any) {
    if (this.hasMoreResults && !this.isLoadingMore && this.selectedService) {
      const scrollPosition = window.pageYOffset + window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;

      // Déclencher le chargement à 200px avant la fin
      if (scrollPosition >= documentHeight - 200) {
        this.loadMoreResults();
      }
    }
  }

  // ===============================================
  //  MÉTHODES INFINITE SCROLL OPTIMISÉ
  // ===============================================

  /**
   *  Méthode principale pour charger plus de résultats
   */
  loadMoreResults(): void {
    if (this.isLoadingMore || !this.hasMoreResults) return;

    this.isLoadingMore = true;

    // Simuler un délai de chargement pour l'UX
    setTimeout(() => {
      const startIndex = this.currentPage * this.itemsPerLoad + this.itemsPerPage;
      const endIndex = startIndex + this.itemsPerLoad;

      const nextBatch = this.allResultsCache.slice(startIndex, endIndex);

      if (nextBatch.length > 0) {
        this.displayedProviders = [...this.displayedProviders, ...nextBatch];
        this.currentPage++;
      }

      // Vérifier s'il reste des résultats
      this.hasMoreResults = endIndex < this.allResultsCache.length;
      this.isLoadingMore = false;

    }, 300); // Délai UX pour montrer le loading
  }

  /**
   *  Initialiser les résultats avec pagination
   */
  initializePaginatedResults(allResults: any[]): void {
    this.allResultsCache = [...allResults];
    this.totalResultsCount = allResults.length;
    this.currentPage = 0;
    this.hasMoreResults = allResults.length > this.itemsPerPage;

    // Afficher les premiers résultats
    this.displayedProviders = allResults.slice(0, this.itemsPerPage);

  }

  /**
   *  Obtenir le texte de progression
   */
  getProgressText(): string {
    if (this.totalResultsCount === 0) return '';

    const displayed = this.displayedProviders.length;
    const total = this.totalResultsCount;

    if (displayed >= total) {
      return `Tous les ${total} résultats affichés`;
    }

    return `${displayed} sur ${total}+ résultats`;
  }

  /**
   *  Réinitialiser la pagination
   */
  resetPagination(): void {
    this.displayedProviders = [];
    this.allResultsCache = [];
    this.currentPage = 0;
    this.hasMoreResults = true;
    this.totalResultsCount = 0;
    this.isLoadingMore = false;
  }

  /**
   *  Retourner en haut de page
   */
  scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  // ===============================================
  //  MÉTHODES GÉOLOCALISATION INTELLIGENTE
  // ===============================================

  /**
   *  Déterminer la meilleure localisation pour les suggestions
   */
  private getBestLocationForSuggestions(allReservations: any[], locationCounts: { [key: string]: number }): string | null {
    // 1. Priorité 1: Géolocalisation actuelle (si disponible et récente)
    if (this.userLocation && this.isLocationRecent()) {
      return this.extractLocationFromGeolocation(this.userLocation);
    }

    // 2. Priorité 2: Localisation des 3 dernières réservations
    if (allReservations && allReservations.length > 0) {
      const recentReservations = allReservations
        .sort((a, b) => new Date(b.datePrestation || b.dateReservation).getTime() -
                       new Date(a.datePrestation || a.dateReservation).getTime())
        .slice(0, 3);

      // Analyser les locations des réservations récentes
      const recentLocationCounts: { [key: string]: number } = {};
      recentReservations.forEach(reservation => {
        const location = this.extractLocationFromReservation(reservation);
        if (location) {
          recentLocationCounts[location] = (recentLocationCounts[location] || 0) + 1;
        }
      });

      if (Object.keys(recentLocationCounts).length > 0) {
        const mostRecentLocation = Object.entries(recentLocationCounts)
          .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];

        return mostRecentLocation;
      }
    }

    // 3. Priorité 3: Localisation historique la plus fréquente (ancienne logique)
    if (locationCounts && Object.keys(locationCounts).length > 0) {
      const historicalLocation = Object.entries(locationCounts)
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]?.[0];

      return historicalLocation;
    }

    return null;
  }

  /**
   *  Vérifier si la géolocalisation est récente (moins de 1h)
   */
  private isLocationRecent(): boolean {
    // Cette logique peut être étendue pour vérifier l'âge de la géolocalisation
    return true; // Pour l'instant, on considère toujours comme récent
  }

  /**
   *  Extraire la localisation lisible depuis la géolocalisation
   */
  private extractLocationFromGeolocation(geoLocation: string): string {
    // Si c'est déjà une ville lisible, la retourner
    if (geoLocation && !geoLocation.includes(',') && !geoLocation.includes('°')) {
      return geoLocation;
    }

    // Pour l'instant, retourner une valeur par défaut
    // Cette méthode peut être enrichie pour utiliser une API de géocodage inverse
    return 'Dakar'; // Valeur par défaut
  }

  /**
   *  Extraire la localisation depuis une réservation
   */
  private extractLocationFromReservation(reservation: any): string | null {
    // Essayer différents champs de localisation
    const possibleFields = [
      reservation.salonAdresse,
      reservation.freelanceAdresse,
      reservation.adresse,
      reservation.ville,
      reservation.localisation
    ];

    for (const field of possibleFields) {
      if (field && typeof field === 'string') {
        // Extraire le nom de la ville/quartier
        const cleanLocation = this.cleanLocationString(field);
        if (cleanLocation) {
          return cleanLocation;
        }
      }
    }

    return null;
  }

  /**
   *  Nettoyer et extraire le nom de localisation pertinent
   */
  private cleanLocationString(location: string): string | null {
    if (!location) return null;

    // Normaliser la casse
    location = location.trim();

    //  Localisations courantes au Sénégal - reconnaissance directe
    const senegalLocations = [
      'Zac mbao', 'zac mbao', 'sipres Zac mbao',
      'rufisque centre', 'Rufisque centre', 'rufisque',
      'keur massar', 'Keur massar', 'Keur Massar',
      'foire', 'Foire', 'foire de dakar',
      'Dakar', 'dakar', 'Dakar centre',
      'plateau', 'Plateau', 'dakar plateau',
      'parcelles', 'parcelles assainies',
      'guediawaye', 'Guediawaye',
      'pikine', 'Pikine',
      'thiaroye', 'Thiaroye',
      'medina', 'Médina',
      'colobane', 'Colobane',
      'grand yoff', 'Grand Yoff',
      'patte doie', 'Patte d\'oie'
    ];

    // Chercher une correspondance directe (insensible à la casse)
    for (const knownLocation of senegalLocations) {
      if (location.toLowerCase().includes(knownLocation.toLowerCase())) {
        return knownLocation;
      }
    }

    // Si pas de correspondance directe, essayer les patterns génériques
    const locationPatterns = [
      // Modèles pour adresses sénégalaises
      /(?:.*,\s*)?([A-Za-zÀ-ÿ\s]+?)(?:\s*,.*)?$/,
      /(?:.*\s+)([A-Za-zÀ-ÿ\s]{3,})(?:\s+\d|$)/,
      /^([A-Za-zÀ-ÿ\s]+)/
    ];

    for (const pattern of locationPatterns) {
      const match = location.match(pattern);
      if (match && match[1]) {
        const extracted = match[1].trim();
        if (extracted.length >= 3) {
          return extracted;
        }
      }
    }

    return location.length >= 3 ? location : null;
  }
}
