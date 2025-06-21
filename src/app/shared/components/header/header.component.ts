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

  // Interfaces pour les nouvelles fonctionnalités
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
    // NOUVELLES PROPRIÉTÉS POUR L'INTÉGRATION FREELANCES
    // ===============================================
    
    selectedProviderType: 'salon' | 'freelance' | 'both' = 'salon';
    searchMode: 'location' | 'photo' | 'text' = 'location';
    viewMode: 'grid' | 'list' = 'grid';
    serviceStats: ServiceStats = {};

    // ✅ AJOUT : Subject pour gérer la destruction du composant
    private destroy$ = new Subject<void>();
    public isPageLoading = true;

    constructor(
      private salonService: SalonService,
      @Inject(PLATFORM_ID) private platformId: Object,
      authUIService: AuthUIService
    ) {
      this.isBrowser = isPlatformBrowser(platformId);
      this.authUIService = authUIService;
      
      // ✅ SUPPRIMÉ : Plus de souscription automatique ici
      console.log('HeaderComponent constructor - no automatic modal triggers');
    }

    // ✅ Méthode helper pour détecter la page
    private isOnSalonRegistrationPage(): boolean {
      return this.router.url.includes('salon-registration');
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
      console.log('HeaderComponent ngOnInit started');
      
      // ✅ Vérification du statut d'authentification SANS déclencher de modal
      this.headerService.checkAuthStatus().then(() => {
        this.updateBodyClasses();
        this.cdr.detectChanges();
      });
      
      // ✅ Souscriptions contrôlées pour les modals avec protection
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

      // ✅ Délai de sécurité pour éviter l'ouverture automatique
      setTimeout(() => {
        this.isPageLoading = false;
        this.cdr.detectChanges();
        console.log('HeaderComponent page loading completed');
      }, 500);
    }

    // ✅ NOUVELLE MÉTHODE : Configuration sécurisée des souscriptions aux modals
    private setupModalSubscriptions(): void {
      // Souscription au modal de connexion avec protection
      this.authUIService.showLoginModal$
        .pipe(takeUntil(this.destroy$))
        .subscribe(shouldShow => {
          console.log('Login modal subscription triggered:', shouldShow, 'isPageLoading:', this.isPageLoading);
          
          // ✅ Protection contre l'ouverture automatique pendant le chargement
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
          
          // ✅ Protection contre l'ouverture automatique pendant le chargement
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

    // ✅ NOUVELLE MÉTHODE : Nettoyage des souscriptions
    ngOnDestroy(): void {
      console.log('HeaderComponent ngOnDestroy');
      this.destroy$.next();
      this.destroy$.complete();
    }

    // ===============================================
    // NOUVELLES MÉTHODES POUR L'INTÉGRATION FREELANCES
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
      
      console.log(`Type de professionnel sélectionné: ${type}`);
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
     * Retourner le placeholder approprié selon le mode et le type sélectionné
     */
    getSearchPlaceholder(): string {
      const providerText = this.selectedProviderType === 'salon' ? 'salon' :
                          this.selectedProviderType === 'freelance' ? 'freelance' : 'professionnel';
      
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

    /**
     * Retourner le texte d'indication de recherche
     */
    getSearchIndicatorText(): string {
      const count = this.getTotalProvidersCount();
      const providerText = this.getProviderTypeLabel().toLowerCase();
      
      return `Recherche parmi <strong>${count} ${providerText}</strong> disponibles. 
              ${this.selectedProviderType !== 'both' ? 
                `Cliquez sur "${this.getAlternativeProviderType()}" pour voir les autres options.` : ''}`;
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
     * Charger les statistiques de services depuis l'API
     */
    private loadServiceStats(): void {
      this.salonService.getServiceStatistics().subscribe({
        next: (stats) => {
          this.serviceStats = stats;
          console.log('Statistiques chargées:', stats);
        },
        error: (error) => {
          console.error('Erreur lors du chargement des statistiques:', error);
          // Utiliser des données par défaut en cas d'erreur
          this.serviceStats = {
            'Coiffure': { salon: 42, freelance: 28, total: 70 },
            'Pedicure,Manucure': { salon: 18, freelance: 35, total: 53 },
            'Barber': { salon: 25, freelance: 15, total: 40 },
            'Maquillage': { salon: 12, freelance: 22, total: 34 },
            'Soins de la peau': { salon: 31, freelance: 8, total: 39 }
          };
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
     * Retourner le texte des statistiques de service
     */
    getServiceStatsText(): string {
      const total = this.getTotalProvidersCount();
      return `${total} professionnels disponibles dans votre région`;
    }

    /**
     * Retourner le titre des résultats selon le contexte
     */
    getResultsTitle(): string {
      const providerType = this.getProviderTypeLabel();
      return `${providerType} - ${this.selectedService}`;
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

    /**
     * Élargir la recherche en incluant plus d'options
     */
    expandSearch(): void {
      this.selectProviderType('both');
      this.budgetRange = Math.min(this.budgetRange * 1.5, 100000);
      
      if (this.selectedService) {
        this.filterSalonsByService(this.selectedService);
      }

      this.snackBar.open('Recherche élargie avec plus d\'options', 'OK', {
        duration: 3000,
        panelClass: ['info-snackbar']
      });
    }

    // ===============================================
    // MÉTHODES DE RECHERCHE MISES À JOUR
    // ===============================================

    /**
     * Méthode améliorée pour filtrer les salons par service
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

      this.selectedService = service;
      this.isLoading = true;
      
      console.log(`Recherche de service: ${service} pour ${this.selectedProviderType}`);

      this.salonService.getSalonsByService(service, this.selectedProviderType).subscribe({
        next: (data) => {
          console.log('Résultats récupérés:', data);
          this.filteredSalons = this.processSalonData(data);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement des salons', error);
          this.isLoading = false;
          this.filteredSalons = [];
          
          let errorMessage = 'Erreur lors de la recherche de professionnels';
          if (error.message) {
            errorMessage += `: ${error.message}`;
          }
          
          this.snackBar.open(errorMessage, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
    }

    /**
     * Méthode de recherche avancée mise à jour
     */
    searchSalonsAdvanced(): void {
      console.log('🔍 searchSalonsAdvanced démarré');
      
      if (!this.isBrowser) return;
      
      if (!this.searchTerm || typeof this.searchTerm !== 'string') {
        console.error('❌ searchTerm invalide:', typeof this.searchTerm, this.searchTerm);
        this.snackBar.open('Erreur: terme de recherche invalide', 'OK', { duration: 3000 });
        return;
      }
      
      const trimmedTerm = this.searchTerm.trim();
      if (!trimmedTerm) {
        this.snackBar.open('Veuillez entrer un terme de recherche', 'OK', { duration: 3000 });
        return;
      }

      // Créer l'objet de recherche avec le type de professionnel
      const searchData: any = {
        term: trimmedTerm,
        providerType: this.selectedProviderType,
        searchMode: this.searchMode
      };
      
      if (typeof this.budgetRange === 'number' && this.budgetRange > 0) {
        searchData.budget = this.budgetRange;
      }
      
      if (typeof this.selectedDate === 'string' && typeof this.selectedTime === 'string' && 
          this.selectedDate && this.selectedTime) {
        searchData.datetime = `${this.selectedDate}T${this.selectedTime}:00`;
      }
      
      if (typeof this.userLocation === 'string' && this.userLocation) {
        searchData.location = this.userLocation;
      } else if (typeof this.locationInput === 'string' && this.locationInput) {
        searchData.locationText = this.locationInput;
      }
      
      console.log('📋 searchData final:', JSON.stringify(searchData, null, 2));
      
      this.isLoading = true;
      
      if (this.uploadedPhoto && this.searchMode === 'photo') {
        this.handlePhotoSearch(searchData);
      } else {
        this.handleNormalSearch(searchData);
      }
    }

    /**
     * Méthode pour la recherche avec photo
     */
    private handlePhotoSearch(searchData: any): void {
      const formData = new FormData();
      formData.append('photo', this.uploadedPhoto!);
      
      Object.keys(searchData).forEach(key => {
        const value = searchData[key];
        if (value !== null && value !== undefined) {
          formData.append(key, String(value));
        }
      });
      
      this.salonService.searchSalonsWithPhoto(formData).subscribe({
        next: (data: any[]) => {
          this.handleSearchSuccess(data);
        },
        error: (error: any) => {
          this.handleSearchError(error);
        }
      });
    }

    /**
     * Méthode pour la recherche normale
     */
    private handleNormalSearch(searchData: any): void {
      this.salonService.searchSalons(searchData).subscribe({
        next: (data: any[]) => {
          this.handleSearchSuccess(data);
        },
        error: (error: any) => {
          this.handleSearchError(error);
        }
      });
    }

    /**
     * Méthode pour gérer le succès de la recherche
     */
    private handleSearchSuccess(data: any[]): void {
      console.log('✅ Résultats reçus:', data);
      this.filteredSalons = this.processSalonData(data);
      this.isLoading = false;
      this.selectedService = this.searchTerm;
      this.saveSearchParams();
    }

    /**
     * Helper pour gérer les erreurs de recherche
     */
    private handleSearchError(error: any): void {
      console.error('Erreur lors de la recherche', error);
      this.isLoading = false;
      this.filteredSalons = [];
      
      let errorMessage = 'Erreur lors de la recherche de professionnels';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }
      
      this.snackBar.open(errorMessage, 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }

    /**
     * Recherche simple qui délègue à la recherche avancée
     */
    searchSalons(): void {
      if (!this.isBrowser || !this.searchTerm.trim()) return;
      this.searchSalonsAdvanced();
    }

    // ===============================================
    // MÉTHODES DE TRAITEMENT DES DONNÉES
    // ===============================================

    /**
     * Méthode pour traiter les données reçues de l'API (améliorée)
     */
    private processSalonData(data: any[]): EnhancedProviderData[] {
      return data.map((item) => {
        return {
          id: item.id,
          nom: item.nom || item.name,
          imageUrl: item.imageUrl || item.photo || item.photoProfil || '/assets/images/salon.jpg',
          adresse: item.adresse || item.address,
          rating: item.rating || item.note || item.evaluation || 0,
          reviewCount: item.reviewCount || item.nombreAvis || item.nbAvis || 0,
          services: Array.isArray(item.services)
            ? item.services
            : item.serviceOfferts
            ? item.serviceOfferts.split(',').map((s: string) => s.trim())
            : item.servicesOfferts || [],
          priceRange: item.priceRange || item.gammeDePrice || item.prixMoyens || 'CFA',
          type: item.type || item.typeProvider || 'salon',
          experience: item.experience || item.anneesExperience,
          availability: item.availability || item.disponibilite,
          description: item.description || item.bio || item.presentation,
          telephone: item.telephone,
          email: item.email,
          website: item.website || item.siteWeb,
          horaires: item.horaires || item.openingHours
        };
      });
    }

    // ===============================================
    // MÉTHODES UTILITAIRES EXISTANTES (CONSERVÉES)
    // ===============================================

    toggleAdvancedSearch(): void {
      this.showAdvancedSearch = !this.showAdvancedSearch;
    }

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
          searchMode: this.searchMode
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

    openSalonDetailDialog(salonId: number): void {
      console.log('Méthode openSalonDetailDialog appelée avec ID:', salonId);
      
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
        
        console.log('Dialogue ouvert avec succès');
        
        dialogRef.afterOpened().subscribe(() => {
          console.log('Événement afterOpened déclenché');
        });
        
        dialogRef.afterClosed().subscribe(result => {
          console.log('Dialogue fermé avec résultat:', result);
        });
      } catch (error) {
        console.error('Erreur lors de l\'ouverture du dialogue:', error);
        
        const errorMessage = error instanceof Error ? error.message : 'Inconnue';
        this.snackBar.open('Impossible d\'ouvrir les détails du salon. Erreur: ' + errorMessage, 'OK', {
          duration: 5000
        });
      }
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

    // ✅ MÉTHODES MODALES CORRIGÉES - Utilisent le service AuthUIService
    openLoginModal() {
      if (!this.isBrowser) return;
      
      console.log('openLoginModal called - using AuthUIService');
      
      if (this.isMobileMenuOpen) {
        this.toggleMobileMenu();
      }
      
      // ✅ Utiliser le service au lieu de modifier directement
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
      
      // ✅ Utiliser le service au lieu de modifier directement
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

    getUserLocation(): void {
      if (this.isBrowser && navigator.geolocation) {
        this.isLoading = true;
        
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            
            this.userLocation = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
            this.isLoading = false;
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
            
            this.snackBar.open(message, 'Fermer', {
              duration: 4000
            });
          }
        );
      }
    }
  }