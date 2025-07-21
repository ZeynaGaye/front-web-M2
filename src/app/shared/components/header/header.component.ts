import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
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
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { FreelanceDetailsComponent } from '../../../freelance/components/freelance-details/freelance-details.component';

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

interface EnhancedProviderData {
  id: number;
  nom: string;
  imageUrl?: string;
  adresse: string;
  rating: number;
  reviewCount: number;
  services: string[];
  priceRange?: string;
  type?: 'salon' | 'freelance';
  experience?: number;
  availability?: string;
  description?: string;
  telephone?: string;
  email?: string;
  website?: string;
  horaires?: any;
  // ✅ PROPRIÉTÉS SPÉCIFIQUES FREELANCES
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
  deplacementInclus?: boolean;
  anneesExperience?: number;
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
    AuthentComponent, 
    RegisterComponent,
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit, OnDestroy {
[x: string]: any;
  
  // ===============================================
  // PROPRIÉTÉS EXISTANTES (CONSERVÉES)
  // ===============================================
  
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

  // ===============================================
  // PROPRIÉTÉS POUR L'INTÉGRATION FREELANCES
  // ===============================================
  
  selectedProviderType: 'salon' | 'freelance' | 'both' = 'salon';
  searchMode: 'location' | 'photo' | 'text' = 'location';
  viewMode: 'grid' | 'list' = 'grid';
  serviceStats: ServiceStats = {};

  // ✅ NOUVELLES PROPRIÉTÉS SPÉCIFIQUES AUX FREELANCES
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
  experienceMin?: number;
  typeIntervention?: 'DOMICILE' | 'SALON' | 'STUDIO_PRIVE' | 'MIXTE';
  deplacementInclus?: boolean;

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
    @Inject(PLATFORM_ID) private platformId: Object,
    authUIService: AuthUIService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.authUIService = authUIService;
    
    console.log('🎯 HeaderComponent constructor - Support Salon + Freelance activé avec nouveaux endpoints');
  }

  // ===============================================
  // GETTERS EXISTANTS (CONSERVÉS)
  // ===============================================

  get isLoggedIn() {
    return this.authService.isAuthenticated();
  }

  get username() {
    return this.authService.getCurrentUser;
  }

  get isClient() {
    return this.headerService.isClient();
  }

  get isEmployeur() {
    return this.headerService.isEmployeur();
  }

  get isFreelance() {
    return this.headerService.isFreelance();
  }

  // ===============================================
  // CYCLE DE VIE DU COMPOSANT
  // ===============================================

  ngOnInit(): void {
    console.log('🚀 HeaderComponent ngOnInit started - Mode unifié Salon + Freelance avec nouveaux endpoints');
    
    // Vérification du statut d'authentification SANS déclencher de modal
    this.headerService.checkAuthStatus().then(() => {
      this.updateBodyClasses();
      this.cdr.detectChanges();
    });
    
    // Souscriptions contrôlées pour les modals avec protection
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
    
    // Restaurer les paramètres de recherche et charger les statistiques
    if (this.isBrowser) {
      this.tryRestoreSearchParams();
      this.loadServiceStats();
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
      console.log('✅ HeaderComponent page loading completed');
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
        console.log('Login modal subscription triggered:', shouldShow, 'isPageLoading:', this.isPageLoading);
        
        // Protection contre l'ouverture automatique pendant le chargement
        if (this.isPageLoading) {
          console.log('Ignoring modal trigger during page loading');
          return;
        }

        if (shouldShow === true && !this.showLoginModal) {
          console.log('Opening login modal');
          this.showLoginModal = true;
          this.showRegisterModal = false;
          this.cdr.detectChanges();
        } else if (shouldShow === false && this.showLoginModal) {
          console.log('Closing login modal');
          this.showLoginModal = false;
          this.cdr.detectChanges();
        }
      });

    // Souscription au modal d'inscription avec protection
    this.authUIService.showRegisterModal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {
        console.log('Register modal subscription triggered:', shouldShow, 'isPageLoading:', this.isPageLoading);
        
        // Protection contre l'ouverture automatique pendant le chargement
        if (this.isPageLoading) {
          console.log('Ignoring modal trigger during page loading');
          return;
        }

        if (shouldShow === true && !this.showRegisterModal) {
          console.log('Opening register modal');
          this.showRegisterModal = true;
          this.showLoginModal = false;
          this.cdr.detectChanges();
        } else if (shouldShow === false && this.showRegisterModal) {
          console.log('Closing register modal');
          this.showRegisterModal = false;
          this.cdr.detectChanges();
        }
      });
  }

  // Nettoyage des souscriptions
  ngOnDestroy(): void {
    console.log('HeaderComponent ngOnDestroy');
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ===============================================
  // ✅ MÉTHODES CORRIGÉES - ROUTAGE INTELLIGENT
  // ===============================================

  /**
   * ✅ NOUVELLE MÉTHODE : Routage intelligent selon le type
   */
  openDetailDialog(provider: EnhancedProviderData): void {
    console.log('🎯 openDetailDialog appelée avec provider:', provider);
    
    if (!this.isBrowser) return;
    
    if (!provider || !provider.id) {
      console.error('Provider invalide:', provider);
      return;
    }

    // ✅ ROUTAGE INTELLIGENT SELON LE TYPE
    if (provider.type === 'freelance') {
      this.openFreelanceDetailDialog(provider.id);
    } else {
      this.openSalonDetailDialog(provider.id);
    }
  }

  /**
   * ✅ MÉTHODE CORRIGÉE : Modal freelance
   */
  openFreelanceDetailDialog(freelanceId: number): void {
    console.log('👤 openFreelanceDetailDialog appelée avec ID:', freelanceId);
    
    if (!this.isBrowser) return;
    
    if (!freelanceId) {
      console.error('ID freelance invalide:', freelanceId);
      return;
    }

    try {
      console.log('Ouverture dialogue freelance ID:', freelanceId);
      
      const dialogRef = this.dialog.open(FreelanceDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { freelanceId: freelanceId },
        panelClass: 'freelance-detail-dialog-container',
        autoFocus: false,
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Dialogue freelance fermé:', result);
      });
    } catch (error) {
      console.error('Erreur ouverture dialogue freelance:', error);
      this.snackBar.open('Impossible d\'ouvrir les détails du freelance', 'OK', {
        duration: 5000
      });
    }
  }

  /**
   * ✅ MÉTHODE CORRIGÉE : Modal salon
   */
  openSalonDetailDialog(salonId: number): void {
    console.log('🏪 openSalonDetailDialog appelée avec ID:', salonId);
    
    if (!this.isBrowser) {
      console.log('Non-browser environment, returning');
      return;
    }
    
    if (!salonId) {
      console.error('ID de salon invalide:', salonId);
      return;
    }
    
    try {
      console.log('Tentative d\'ouverture du dialogue pour le salon ID:', salonId);
      
      const dialogRef = this.dialog.open(SalonDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { salonId: salonId },
        panelClass: 'salon-detail-dialog-container',
        autoFocus: false,
      });
      
      console.log('Dialogue salon ouvert avec succès');
      
      dialogRef.afterOpened().subscribe(() => {
        console.log('Événement afterOpened déclenché');
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Dialogue salon fermé avec résultat:', result);
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
  // ✅ MÉTHODES FREELANCES AMÉLIORÉES
  // ===============================================

  /**
   * ✅ NOUVELLE MÉTHODE : Vérifier si on affiche les critères freelances
   */
  showFreelanceCriteria(): boolean {
    return this.selectedProviderType === 'freelance' || this.selectedProviderType === 'both';
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Vérifier si on a des critères freelances actifs
   */
  hasFreelanceCriteria(): boolean {
    return !!(this.disponibleWeekend || this.disponibleSoir || this.experienceMin || this.deplacementInclus);
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Obtenir la liste des critères freelances actifs
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
   * ✅ NOUVELLE MÉTHODE : Effacer spécifiquement les critères freelances
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
   * ✅ NOUVELLE MÉTHODE : Message contextuel selon le type
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
    
    console.log(`🎯 Type de professionnel sélectionné: ${type}`);
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
    
    console.log(`Mode de recherche changé: ${mode}`);
  }

  /**
   * ✅ MÉTHODE MISE À JOUR: Charger les statistiques unifiées
   */
  private loadServiceStats(): void {
    console.log('📊 Chargement statistiques unifiées salon + freelance');
    
    this.salonService.getFreelanceStatistics().subscribe({

      next: (stats: ServiceStats) => {
        console.log('📊 Statistiques unifiées reçues:', stats);
        this.serviceStats = stats;
        this.cdr.detectChanges();
      },
      error: (error: any) => {
        console.error('❌ Erreur statistiques unifiées:', error);
        // Utiliser des données par défaut en cas d'erreur
        this.serviceStats = {
          'Coiffure': { salon: 15, freelance: 8, total: 23 },
          'Pedicure,Manucure': { salon: 8, freelance: 12, total: 20 },
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
  // ✅ MÉTHODES DE ROUTAGE INTELLIGENT AMÉLIORÉES
  // ===============================================

  /**
   * ✅ MÉTHODE MISE À JOUR: Filtrer par service avec routage automatique
   */
  filterSalonsByService(service: string): void {
    console.log(`🎯 filterSalonsByService - Service: ${service}, Type: ${this.selectedProviderType}`);
    
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
    
    // ✅ ROUTAGE AUTOMATIQUE SELON LE TYPE
    this.salonService.getSalonsByService(service, this.selectedProviderType).subscribe({
      next: (results) => {
        console.log(`✅ ${results.length} résultats pour ${service} (${this.selectedProviderType})`);
        this.filteredSalons = this.processSalonData(results);
        this.isLoading = false;
        
        // Message contextuel selon le type
        const message = this.getContextualMessage(results.length, this.selectedProviderType);
        this.snackBar.open(message, '', { duration: 3000 });
      },
      error: (error) => {
        console.error(`❌ Erreur recherche ${service} (${this.selectedProviderType}):`, error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   * ✅ MÉTHODE MISE À JOUR: Recherche avancée avec support freelances
   */
  searchSalonsAdvanced(): void {
    console.log('🔍 Recherche avancée avec support freelances et nouveaux endpoints');
    
    if (!this.isBrowser) return;
    
    // Vérifier qu'on a au moins un critère
    if (!this.hasValidSearchCriteria()) {
      this.snackBar.open('Veuillez entrer au moins un critère de recherche', 'OK', { 
        duration: 3000 
      });
      return;
    }

    this.isLoading = true;
    
    // ✅ ROUTAGE SELON LE TYPE ET LES CRITÈRES
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
   * ✅ RECHERCHE SALON (votre logique existante)
   */
  private performSalonSearch(): void {
    console.log('🏪 Recherche salon avec critères existants');
    
    const searchData = {
      term: this.searchTerm,
      location: this.userLocation || this.locationInput,
      budget: this.budgetRange > 2000 ? this.budgetRange : undefined,
      datetime: this.selectedDate && this.selectedTime ? 
                `${this.selectedDate}T${this.selectedTime}:00` : undefined,
      providerType: 'salon'
    };
    
    // Utiliser votre méthode existante
    this.salonService.searchSalons(searchData).subscribe({
      next: (results) => this.handleSearchSuccess(results, 'salon'),
      error: (error) => this.handleSearchError(error)
    });
  }

  /**
   * ✅ RECHERCHE FREELANCE avec critères spécialisés - NOUVEAUX ENDPOINTS
   */
  /**
 * 🎯 RECHERCHE FREELANCE UNIFIÉE - TOUS CRITÈRES ENSEMBLE
 */
private performFreelanceSearch(): void {
  console.log('🎯 Recherche freelance unifiée avec scoring intelligent');
  
  if (!this.searchTerm || !this.searchTerm.trim()) {
    this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
    this.isLoading = false;
    return;
  }
  
  // ✅ CONSTRUIRE TOUS LES CRITÈRES ENSEMBLE
  const criteres = this.construireTousLesCriteres();
  
  console.log('📊 Critères envoyés au backend:', criteres);
  console.log('🎯 Nombre de critères actifs:', this.compterCriteresActifs(criteres));
  
  // ✅ UNE SEULE MÉTHODE POUR TOUS LES CAS
  this.salonService.searchFreelances(criteres).subscribe({
    next: (response) => {
      console.log('✅ Réponse backend:', response);
      
      const freelances = response.freelances || response.data || response || [];
      const total = response.total || freelances.length;
      
      console.log(`🏆 ${total} freelances trouvés avec scoring intelligent`);
      
      // Forcer le type freelance
      const freelancesWithType = freelances.map((item: any) => ({
        ...item,
        type: 'freelance'
      }));
      
      this.handleSearchSuccess(freelancesWithType, 'freelance');
      
      // Afficher le résumé intelligent
      this.afficherResumePertinence(criteres, total, response);
    },
    error: (error) => {
      console.error('❌ Erreur recherche:', error);
      this.handleSearchError(error);
    }
  });
}

/**
 * 🏗️ CONSTRUIRE TOUS LES CRITÈRES (sans séparation de modes)
 */
private construireTousLesCriteres(): any {
  const coords = this.extractCoordinates();
  
  const criteres: any = {
    // OBLIGATOIRE
    service: this.searchTerm.trim()
  };
  
  // OPTIONNELS - Tous pris en compte ensemble
  if (this.locationInput?.trim()) {
    criteres.ville = this.locationInput.trim();
  }
  
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
  
  // Géolocalisation
  if (coords?.lat && coords?.lng) {
    criteres.lat = coords.lat;
    criteres.lng = coords.lng;
  }
  
  return criteres;
}

/**
 * 📊 COMPTER LES CRITÈRES ACTIFS
 */
private compterCriteresActifs(criteres: any): number {
  let count = 0;
  
  if (criteres.service) count++; // Service obligatoire
  if (criteres.ville) count++;
  if (criteres.maxPrice) count++;
  if (criteres.date) count++;
  if (criteres.weekend) count++;
  if (criteres.soir) count++;
  if (criteres.domicile) count++;
  if (criteres.deplacementInclus) count++;
  if (criteres.lat && criteres.lng) count++; // Géolocalisation = 1 critère
  
  return count;
}

/**
 * 🎯 AFFICHER RÉSUMÉ DE PERTINENCE
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
  
  console.log('📊 Résumé recherche:', message + triInfo);
  console.log('🎯 Critères:', criteresTexte);
  
  // Notification utilisateur
  const snackBarMessage = message + triInfo;
  this.snackBar.open(snackBarMessage, '', {
    duration: 4000,
    panelClass: ['success-snackbar']
  });
}

/**
 * 📝 CONSTRUIRE TEXTE DES CRITÈRES POUR AFFICHAGE
 */
private construireCriteresTexte(criteres: any): string[] {
  const textes: string[] = [];
  
  if (criteres.ville) textes.push(`📍 ${criteres.ville}`);
  if (criteres.lat && criteres.lng) textes.push('📍 Géolocalisé');
  if (criteres.maxPrice) textes.push(`💰 ≤${criteres.maxPrice} CFA`);
  if (criteres.weekend) textes.push('📅 Weekend');
  if (criteres.soir) textes.push('🌙 Soirée');
  if (criteres.domicile) textes.push('🏠 Domicile');
  if (criteres.deplacementInclus) textes.push('🚗 Déplacement');
  if (criteres.date) textes.push(`📅 ${criteres.date}`);
  
  return textes;
}
  /**
   * ✅ RECHERCHE COMBINÉE (salon + freelance)
   */
  private performCombinedSearch(): void {
    console.log('🔄 Recherche combinée salon + freelance');
    
    if (!this.searchTerm || !this.searchTerm.trim()) {
      this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
      this.isLoading = false;
      return;
    }
    
    // Utiliser la méthode combinée du service
    this.salonService.getSalonsByService(this.searchTerm.trim(), 'both').subscribe({
      next: (results) => {
        console.log('🔄 Résultats combinés reçus:', results);
        this.handleSearchSuccess(results, 'both');
      },
      error: (error) => {
        console.error('❌ Erreur recherche combinée:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   * ✅ AFFICHER RÉSUMÉ DE RECHERCHE FREELANCE
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
      console.log('📊 Résumé recherche:', message);
      
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
   * ✅ GESTION SUCCÈS RECHERCHE
   */
  private handleSearchSuccess(results: any[], searchType: string): void {
    console.log(`✅ Succès recherche ${searchType}:`, results);
    
    this.filteredSalons = this.processSalonData(results);
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
   * ✅ GESTION ERREUR RECHERCHE
   */
  private handleSearchError(error: any): void {
    console.error('❌ Erreur recherche:', error);
    
    this.isLoading = false;
    this.filteredSalons = [];
    
    const errorMessage = error.error?.message || error.message || 'Erreur de recherche';
    this.snackBar.open(errorMessage, 'Fermer', { 
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * ✅ VÉRIFIER CRITÈRES DE RECHERCHE VALIDES
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
   * ✅ EXTRAIRE COORDONNÉES
   */
  private extractCoordinates(): { lat: number; lng: number } | null {
    // Priorité 1: userLocation (format "lat,lng")
    if (this.userLocation && this.userLocation.includes(',')) {
      try {
        const [lat, lng] = this.userLocation.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          console.log('✅ Coordonnées extraites de userLocation:', { lat, lng });
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
          console.log('✅ Coordonnées extraites de locationInput:', { lat, lng });
          return { lat, lng };
        }
      } catch (e) {
        console.error('Erreur extraction coordonnées locationInput:', e);
      }
    }
    
    console.log('❌ Aucune coordonnée valide trouvée');
    return null;
  }

  /**
   * ✅ GÉNÉRER MESSAGE DE SUCCÈS
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
  // ✅ MÉTHODES SPÉCIALISÉES FREELANCES MISES À JOUR
  // ===============================================

  /**
   * ✅ RECHERCHE FREELANCES AVEC CRITÈRES - MISE À JOUR
   */
  searchFreelancesWithCriteria(params: {
    query: string;
    userLat?: number;
    userLng?: number;
    disponibleWeekend?: boolean;
    disponibleSoir?: boolean;
  }): void {
    console.log('🔄 searchFreelancesWithCriteria - Utilisation nouveaux endpoints');
    
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
    
    // ✅ UTILISER LA NOUVELLE MÉTHODE UNIFIÉE
    this.salonService.searchFreelances(searchCriteria).subscribe({
      next: (response) => {
        console.log('👤 Réponse searchFreelancesWithCriteria:', response);
        
        const freelances = response.freelances || [];
        const total = response.total || 0;
        
        console.log(`✅ ${total} freelances trouvés`);
        
        // Adapter le traitement selon le format attendu par handleSearchSuccess
        this.handleSearchSuccess(freelances, 'freelance');
        
        // Message contextuel amélioré
        if (response.criteria) {
          this.showFreelanceSearchSummary(response, searchCriteria);
        }
      },
      error: (error) => {
        console.error('❌ Erreur searchFreelancesWithCriteria:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   * 👤 RECHERCHE FREELANCES WEEKEND - MISE À JOUR
   */
  searchFreelancesWithWeekendAvailability(): void {
    console.log('👤 Recherche freelances disponibles weekend - nouveaux endpoints');
    
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
   * 👤 RECHERCHE FREELANCES EXPÉRIMENTÉS - MISE À JOUR
   */
  searchExperiencedFreelances(minYears: number = 3): void {
    console.log(`👤 Recherche freelances ${minYears}+ ans expérience - nouveaux endpoints`);
    
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
   * 👤 TOGGLE RAPIDE WEEKEND - MISE À JOUR
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
   * 👤 TOGGLE RAPIDE SOIRÉE - MISE À JOUR
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
   * 👤 EFFACER CRITÈRES FREELANCES (ALIAS pour compatibilité)
   */
  clearFreelanceCriteria(): void {
    this.clearOnlyFreelanceCriteria();
  }

  /**
   * ✅ NOUVELLE MÉTHODE - Recherche freelance par ville rapide
   */
  searchFreelancesByCity(ville: string): void {
    console.log(`🏙️ Recherche freelance par ville: ${ville}`);
    
    if (!this.searchTerm?.trim()) {
      this.snackBar.open('Veuillez entrer un service recherché', 'OK', { duration: 3000 });
      return;
    }
    
    this.isLoading = true;
    
    // ✅ UTILISER LE NOUVEAU ENDPOINT CITY
    this.salonService.searchFreelancesByCity(
      this.searchTerm.trim(),
      ville,
      this.budgetRange > 2000 ? this.budgetRange : undefined
    ).subscribe({
      next: (response) => {
        console.log('🏙️ Réponse recherche par ville:', response);
        
        const freelances = response.freelances || [];
        const total = response.total || 0;
        
        console.log(`✅ ${total} freelances trouvés à ${ville}`);
        
        this.handleSearchSuccess(freelances, 'freelance');
        
        // Message spécifique ville
        this.snackBar.open(`${total} freelances trouvés à ${ville}`, '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('❌ Erreur recherche par ville:', error);
        this.handleSearchError(error);
      }
    });
  }

  /**
   * ✅ NOUVELLE MÉTHODE - Recherche freelance à proximité
   */
  searchNearbyFreelances(): void {
    console.log('📍 Recherche freelances à proximité');
    
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
    
    // ✅ UTILISER LE NOUVEAU ENDPOINT NEARBY
    this.salonService.searchFreelancesNearby(this.searchTerm.trim(), coords.lat, coords.lng).subscribe({
      next: (response) => {
        console.log('📍 Réponse recherche proximité:', response);
        
        const freelances = response.freelances || [];
        const total = response.total || 0;
        
        console.log(`✅ ${total} freelances trouvés à proximité`);
        
        this.handleSearchSuccess(freelances, 'freelance');
        
        // Message spécifique géolocalisation
        this.snackBar.open(`${total} freelances trouvés dans votre zone`, '', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      },
      error: (error) => {
        console.error('❌ Erreur recherche proximité:', error);
        this.handleSearchError(error);
      }
    });
  }

  // ===============================================
  // ✅ MÉTHODES DE TEST RAPIDE
  // ===============================================

  /**
   * 🧪 TEST RECHERCHE FREELANCE
   */
  testFreelanceSearch(): void {
    console.log('🧪 Test recherche freelance');
    
    // Test rapide avec critères freelance
    this.searchTerm = 'Coiffure';
    this.selectedProviderType = 'freelance';
    this.disponibleWeekend = true;
    
    this.performFreelanceSearch();
  }

  /**
   * 🧪 TEST RECHERCHE COMBINÉE
   */
  testCombinedSearch(): void {
    console.log('🧪 Test recherche combinée');
    
    // Test rapide recherche combinée
    this.searchTerm = 'Maquillage';
    this.selectedProviderType = 'both';
    
    this.performCombinedSearch();
  }

  /**
   * 🧪 TEST NOUVEAUX ENDPOINTS
   */
  testNewFreelanceEndpoints(): void {
    console.log('🧪 Test nouveaux endpoints freelance');
    
    // Test 1: Recherche simple
    this.searchTerm = 'Coiffure';
    this.selectedProviderType = 'freelance';
    this.isLoading = true;
    this.performFreelanceSearch();
    
    // Test 2: Recherche avec critères (après 3 secondes)
    setTimeout(() => {
      console.log('🧪 Test avec critères avancés');
      this.disponibleWeekend = true;
      this.disponibleSoir = true;
      this.budgetRange = 25000;
      this.performFreelanceSearch();
    }, 3000);
    
    // Test 3: Recherche géolocalisée (après 6 secondes)
    setTimeout(() => {
      console.log('🧪 Test géolocalisé');
      this.userLocation = '14.7167, -17.4677'; // Dakar
      this.searchNearbyFreelances();
    }, 6000);
  }

  // ===============================================
  // MÉTHODES RECHERCHE FLEXIBLE (CONSERVÉES ET AMÉLIORÉES)
  // ===============================================

  /**
   * ✅ MÉTHODE AMÉLIORÉE - Recherche flexible avec interface existante
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

    // ✅ CRITÈRES FREELANCES
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
    
    console.log('📋 Payload de recherche flexible:', searchPayload);
    
    this.salonService.searchSalons(searchPayload).subscribe({
      next: (data) => this.handleFlexibleSearchSuccess(data, criteria),
      error: (error) => this.handleFlexibleSearchError(error, criteria)
    });
  }

  private handleFlexibleSearchSuccess(data: any[], criteria: FlexibleSearchCriteria): void {
    console.log('✅ Résultats de recherche flexible:', data);
    
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
    console.error('❌ Erreur recherche flexible:', error);
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
    // Supprimer le critère le moins important
    if (criteria.schedule?.hasSchedule) {
      this.selectedDate = '';
      this.selectedTime = '';
    } else if (criteria.budget?.hasBudget) {
      this.budgetRange = 2000; // Remettre par défaut
    } else if (criteria.location?.textLocation) {
      this.locationInput = '';
    }
    
    // Relancer
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
    
    return `Recherche parmi <strong>${count} ${providerText}</strong> disponibles. 
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
    
    // ✅ EFFACER CRITÈRES FREELANCES
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
  // ✅ MÉTHODES DE TRAITEMENT DES DONNÉES AMÉLIORÉES
  // ===============================================

  private processSalonData(data: any[]): EnhancedProviderData[] {
    console.log('🔄 processSalonData - données reçues:', data);
    
    return data.map((item, index) => {
      console.log(`📊 Traitement provider ${index + 1}:`, item);
      
      // Gestion améliorée des images avec toutes les variantes possibles
      let imageUrl = this.getValidImageUrl(item);
      console.log(`🖼️ Image URL finale pour ${item.nom || item.name}: ${imageUrl}`);
      
      // Traitement complet des services
      const services = this.parseServices(item);
      console.log(`🛎️ Services pour ${item.nom || item.name}:`, services);
      
      const processedProvider: EnhancedProviderData = {
        id: item.id,
        nom: item.nom || item.name || `Provider ${item.id}`,
        imageUrl: imageUrl,
        adresse: item.adresse || item.address || 'Adresse non disponible',
        rating: this.parseRating(item.rating || item.note || item.noteMoyenne || item.evaluation),
        reviewCount: this.parseReviewCount(item.reviewCount || item.nombreAvis || item.nbAvis),
        services: services,
        priceRange: item.priceRange || item.gammeDePrice || item.prixMoyens || 'Prix non défini',
        type: item.type || this.determineProviderType(item),
        experience: item.experience || item.anneesExperience,
        availability: item.availability || item.disponibilite || this.formatAvailability(item),
        description: item.description || item.bio || item.presentation,
        telephone: item.telephone,
        email: item.email,
        website: item.website || item.siteWeb,
        horaires: item.horaires || item.openingHours,
        // ✅ PROPRIÉTÉS SPÉCIFIQUES FREELANCES
        disponibleWeekend: item.disponibleWeekend || item.aUnServiceDisponibleWeekend,
        disponibleSoir: item.disponibleSoir || item.aUnServiceDisponibleSoir,
        deplacementInclus: item.deplacementInclus || item.proposeDeplacementInclus,
        anneesExperience: item.anneesExperience || item.experience
      };
      
      console.log(`✅ Provider traité:`, processedProvider);
      return processedProvider;
    });
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Déterminer automatiquement le type de provider
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
   * ✅ NOUVELLE MÉTHODE : Formatage de la disponibilité
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
   * ✅ MÉTHODE AMÉLIORÉE : Récupération d'URL d'image selon le type
   */
  private getValidImageUrl(item: any): string {
    console.log('🔍 getValidImageUrl pour item:', {
      id: item.id,
      nom: item.nom || item.name,
      type: item.type,
      imageUrl: item.imageUrl,
      photo: item.photo,
      photoProfil: item.photoProfil,
      photoProfilUrl: item.photoProfilUrl,
      image: item.image,
      avatar: item.avatar,
      picture: item.picture,
      url: item.url
    });

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
        console.log(`✅ Image trouvée dans champ '${field}': ${processedUrl}`);
        return processedUrl;
      }
    }

    // Vérifier dans les objets imbriqués si ils existent
    if (item.photos && Array.isArray(item.photos) && item.photos.length > 0) {
      const firstPhoto = item.photos[0];
      if (firstPhoto && firstPhoto.url) {
        const processedUrl = this.processImageUrl(firstPhoto.url);
        console.log(`✅ Image trouvée dans photos[0]: ${processedUrl}`);
        return processedUrl;
      }
    }

    // ✅ IMAGE PAR DÉFAUT SELON LE TYPE
    const providerType = item.type || this.determineProviderType(item);
    const defaultImage = providerType === 'freelance' 
      ? 'assets/images/freelance-default.jpg'
      : 'assets/images/salon-default.jpg';
      
    console.log(`⚠️ Aucune image trouvée, utilisation par défaut: ${defaultImage}`);
    return defaultImage;
  }

  private processImageUrl(imageUrl: string): string {
    console.log('🔧 processImageUrl input:', imageUrl);
    
    // Si c'est déjà une URL complète, la retourner
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      console.log('✅ URL complète détectée');
      return imageUrl;
    }
    
    // Si c'est un chemin relatif commençant par /uploads
    if (imageUrl.startsWith('/uploads/')) {
      const fullUrl = `http://localhost:8081${imageUrl}`;
      console.log('✅ Chemin /uploads/ détecté, construction:', fullUrl);
      return fullUrl;
    }
    
    // Si c'est juste un nom de fichier, construire l'URL complète
    if (!imageUrl.startsWith('/') && !imageUrl.includes('/')) {
      const fullUrl = `http://localhost:8081/uploads/${imageUrl}`;
      console.log('✅ Nom de fichier détecté, construction:', fullUrl);
      return fullUrl;
    }
    
    // Si c'est un chemin assets, le retourner tel quel
    if (imageUrl.startsWith('/assets/') || imageUrl.startsWith('assets/')) {
      console.log('✅ Chemin assets détecté');
      return imageUrl;
    }
    
    // Si c'est un chemin qui commence par /api, construire l'URL complète
    if (imageUrl.startsWith('/api/')) {
      const fullUrl = `http://localhost:8081${imageUrl}`;
      console.log('✅ Chemin /api/ détecté, construction:', fullUrl);
      return fullUrl;
    }
    
    // Par défaut, essayer de construire l'URL
    const fallbackUrl = `http://localhost:8081/uploads/${imageUrl}`;
    console.log('⚠️ Format non reconnu, tentative fallback:', fallbackUrl);
    return fallbackUrl;
  }

  private parseServices(item: any): string[] {
    console.log('🛎️ parseServices pour item:', {
      services: item.services,
      serviceOfferts: item.serviceOfferts,
      servicesOfferts: item.servicesOfferts,
      serviceNoms: item.serviceNoms
    });
    
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
      .filter(service => service && service.trim())
      .map(service => service.trim())
      .slice(0, 5); // Limiter à 5 services max pour l'affichage
      
    console.log('✅ Services nettoyés:', cleanedServices);
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

  /**
   * ✅ MÉTHODE AMÉLIORÉE : Gestionnaires d'erreur d'image pour les deux types
   */
  onImageError(event: any, provider: EnhancedProviderData): void {
    console.warn(`❌ Erreur chargement image pour ${provider.type} ${provider.nom}:`, event.target.src);
    
    // Éviter les boucles infinies
    if (event.target.dataset.retryCount) {
      const retryCount = parseInt(event.target.dataset.retryCount);
      if (retryCount >= 3) {
        console.log('🛑 Nombre max de tentatives atteint, création placeholder');
        this.createImagePlaceholder(event.target, provider);
        return;
      }
      event.target.dataset.retryCount = (retryCount + 1).toString();
    } else {
      event.target.dataset.retryCount = '1';
    }
    
    // ✅ IMAGES DE FALLBACK SELON LE TYPE
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
      console.log(`🔄 Tentative ${currentRetry + 1} avec: ${fallbackImages[currentRetry]}`);
      event.target.src = fallbackImages[currentRetry];
    } else {
      this.createImagePlaceholder(event.target, provider);
    }
  }

  onImageLoad(event: any, provider: EnhancedProviderData): void {
    console.log(`✅ Image chargée avec succès pour ${provider.nom}`);
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
    
    // ✅ COULEURS SELON LE TYPE
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
    } else {
      this.snackBar.open('Veuillez sélectionner une image valide (max 5MB)', 'Fermer', {
        duration: 3000
      });
    }
  }

  removePhoto(event?: Event): void {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.uploadedPhoto = null;
    this.uploadedPhotoPreview = null;
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
        // ✅ SAUVEGARDER CRITÈRES FREELANCES
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
        
        // ✅ RESTAURER CRITÈRES FREELANCES
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
    
    console.log('openLoginModal called - using AuthUIService');
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    // Utiliser le service au lieu de modifier directement
    this.authUIService.triggerLoginModal();
  }

  closeLoginModal() {
    console.log('closeLoginModal called - using AuthUIService');
    this.authUIService.closeModals();
  }

  openRegisterModal() {
    if (!this.isBrowser) return;
    
    console.log('openRegisterModal called - using AuthUIService');
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    // Utiliser le service au lieu de modifier directement
    this.authUIService.triggerRegisterModal();
  }

  closeRegisterModal() {
    console.log('closeRegisterModal called - using AuthUIService');
    this.authUIService.closeModals();
  }

  login(): void {
    if (!this.isBrowser) return;
    
    console.log('login method called');
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    this.openLoginModal();
  }

  switchToRegister(): void {
    console.log('switchToRegister called');
    this.authUIService.switchToRegister();
  }

  switchToLogin(): void {
    console.log('switchToLogin called');
    this.authUIService.switchToLogin();
  }

  navigateToFreelancePage(): void {
    if (!this.isBrowser) return;
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    this.snackBar.open('', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['subtle-snackbar']
    });
    
    document.body.classList.add('page-transition');
    
    setTimeout(() => {
      this.router.navigate(['/freelance-dashboard']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          document.body.classList.remove('page-transition');
        }, 500);
      });
    }, 100);
  }

  navigateToHiring(): void {
    if (!this.isBrowser) return;
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    this.snackBar.open('', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['subtle-snackbar']
    });
    
    document.body.classList.add('page-transition');
    
    setTimeout(() => {
      this.router.navigate(['/job-offer']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          document.body.classList.remove('page-transition');
        }, 500);
      });
    }, 100);
  }

  navigateToSalonRegistration(): void {
    if (!this.isBrowser) return;
    
    if (this.isMobileMenuOpen) {
      this.toggleMobileMenu();
    }
    
    this.snackBar.open('', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['subtle-snackbar']
    });
    
    document.body.classList.add('page-transition');
    
    setTimeout(() => {
      this.router.navigate(['/salon-registration']).then(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        setTimeout(() => {
          document.body.classList.remove('page-transition');
        }, 500);
      });
    }, 100);
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
   * ✅ MÉTHODE MISE À JOUR - getUserLocation avec recherche automatique
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
          
          // ✅ LANCER RECHERCHE AUTOMATIQUE FREELANCE SI APPLICABLE
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
  // ✅ MÉTHODES ADDITIONNELLES POUR LES NOUVEAUX ENDPOINTS
  // ===============================================

  /**
   * ✅ BOUTON RECHERCHE RAPIDE PAR VILLE
   */
  quickCitySearch(ville: string): void {
    console.log(`🏙️ Recherche rapide par ville: ${ville}`);
    
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
   * ✅ BOUTON RECHERCHE GÉOLOCALISÉE RAPIDE
   */
  quickLocationSearch(): void {
    console.log('📍 Recherche géolocalisée rapide');
    
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
   * ✅ RECHERCHE AVEC CRITÈRES PRÉDÉFINIS
   */
  searchWithPresets(preset: 'weekend' | 'evening' | 'nearby' | 'budget'): void {
    console.log(`🎯 Recherche avec preset: ${preset}`);
    
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
   * ✅ SUGGESTIONS INTELLIGENTES
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
   * ✅ APPLIQUER SUGGESTION
   */
  applySuggestion(suggestion: string): void {
    console.log(`💡 Application suggestion: ${suggestion}`);
    
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
   * ✅ HISTORIQUE DES RECHERCHES
   */
  getSearchHistory(): string[] {
    if (!this.isBrowser) return [];
    
    const history = localStorage.getItem('beautyHubSearchHistory');
    return history ? JSON.parse(history) : [];
  }

  /**
   * ✅ AJOUTER À L'HISTORIQUE
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
   * ✅ EFFACER L'HISTORIQUE
   */
  clearSearchHistory(): void {
    if (this.isBrowser) {
      localStorage.removeItem('beautyHubSearchHistory');
      this.snackBar.open('Historique effacé', '', { duration: 1500 });
    }
  }

  /**
   * ✅ RECHERCHE DEPUIS L'HISTORIQUE
   */
  searchFromHistory(term: string): void {
    console.log(`📜 Recherche depuis historique: ${term}`);
    
    this.searchTerm = term;
    this.searchSalonsAdvanced();
  }

  /**
   * ✅ STATISTIQUES DE RECHERCHE
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
   * ✅ MÉTHODE HELPER POUR DÉVELOPPEMENT
   */
  private isInDevelopmentMode(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }

  /**
   * ✅ DEBUG ENDPOINT CALLS
   */
  debugEndpointCalls(): void {
    if (!this.isInDevelopmentMode()) return;
    
    console.log('🔍 Debug des appels d\'endpoints');
    console.log('État actuel:', {
      searchTerm: this.searchTerm,
      providerType: this.selectedProviderType,
      location: this.userLocation,
      ville: this.locationInput,
      criteres: {
        weekend: this.disponibleWeekend,
        soir: this.disponibleSoir,
        budget: this.budgetRange,
        deplacement: this.deplacementInclus
      }
    });
  }

  /**
   * ✅ RESET COMPLET
   */
  resetAll(): void {
    console.log('🔄 Reset complet du composant');
    
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
  // ✅ MÉTHODES FINALES POUR LA COMPATIBILITÉ
  // ===============================================

  /**
   * ✅ MÉTHODE WRAPPER POUR COMPATIBILITÉ TOTALE
   */
  performSearch(): void {
    console.log('🔍 performSearch - Méthode wrapper générale');
    
    // Ajouter à l'historique si c'est une recherche textuelle
    if (this.searchTerm?.trim()) {
      this.addToSearchHistory(this.searchTerm.trim());
    }
    
    // Lancer la recherche avancée
    this.searchSalonsAdvanced();
  }

  /**
   * ✅ MÉTHODE POUR NAVIGATION EXTERNE
   */
  navigateToExternalService(url: string): void {
    if (this.isBrowser) {
      window.open(url, '_blank');
    }
  }

  /**
   * ✅ PARTAGER LES RÉSULTATS
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

  /**
   * ✅ MÉTHODE FINALE DE NETTOYAGE
   */
  // ngOnDestroy(): void {
  //   console.log('🧹 HeaderComponent ngOnDestroy - Nettoyage complet');
    
  //   // Nettoyage des souscriptions
  //   this.destroy$.next();
  //   this.destroy$.complete();
    
  //   // Nettoyage du DOM
  //   if (this.isBrowser) {
  //     const overlay = document.querySelector('.menu-overlay');
  //     if (overlay) {
  //       overlay.remove();
  //     }
      
  //     document.body.classList.remove('menu-open', 'client-mode', 'employeur-mode', 'freelance-mode', 'visitor-mode');
  //   }
  // }
}