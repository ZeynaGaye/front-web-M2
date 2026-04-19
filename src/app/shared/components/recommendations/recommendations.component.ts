import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject, Inject, PLATFORM_ID, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { HomepageRecommendations, RecommendationData, RecommendationService } from '../../services/recommendation.service';
import { SalonDetailsComponent } from '../salon-details/salon-details.component';
import { FreelanceDetailsComponent } from '../../../freelance/components/freelance-details/freelance-details.component';

@Component({
  selector: 'app-recommendations',
  standalone: true,
  imports: [CommonModule],
  styleUrls: ['./recommendations.component.scss'],
  templateUrl: './recommendations.component.html',
})
export class RecommendationsComponent implements OnInit, OnDestroy {

  // ==================== INPUTS ET OUTPUTS ====================

  @Input() showRecommendations = true;
  @Input() autoLoad = true;
  @Input() headerTitle = 'Découvrez les meilleurs professionnels';
  @Input() headerSubtitle = 'Salons et freelances de qualité près de chez vous';
  @Input() debugMode = false;
  @Input() userLocation: { lat?: number, lon?: number } = {};

  @Output() salonClick = new EventEmitter<RecommendationData>();
  @Output() viewAllSection = new EventEmitter<{ section: string, data: RecommendationData[] }>();
  @Output() favoriteToggle = new EventEmitter<{ salon: RecommendationData, isFavorite: boolean }>();

  // ==================== PROPRIÉTÉS PRIVÉES ====================

  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private favoriteSalons = new Set<number>();
  public isBrowser: boolean;
  public hasLocationPermission = false;

  // ==================== PROPRIÉTÉS PUBLIQUES ====================

  public isLoading = false;
  public homepageData: HomepageRecommendations | null = null;
  public totalRecommendations = 0;
  public popularRecommendations: RecommendationData[] = [];
  public nearbyTotalCount = 0;
  public filteredNearbyRecommendations: RecommendationData[] = [];
  public disponibleNearbyCount = 0;
  public recommendationService = inject(RecommendationService);
  public expandedSections: { [key: string]: boolean } = {
    'populaires': false,
    'proches': false
  };

  public nearbyFilter: 'salons' | 'freelances' | 'disponible' = 'salons';
  public locationDenied = false;
  public locationRequesting = false;

  // ==================== CARTE INTERACTIVE (LEAFLET) ====================
  public activeNearbyId: number | null = null;
  private leafletMap: any = null;
  private leafletMarkers: any[] = [];
  @ViewChild('nearbyMapContainer', { static: false }) nearbyMapContainer!: ElementRef<HTMLDivElement>;

  // ==================== VIEWCHILD POUR CAROUSELS ====================

  @ViewChild('popularCarousel', { static: false }) popularCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('nearbyCarousel', { static: false }) nearbyCarousel!: ElementRef<HTMLDivElement>;
  @ViewChild('availableCarousel', { static: false }) availableCarousel!: ElementRef<HTMLDivElement>;

  // ==================== CONSTRUCTEUR ====================

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ==================== CYCLE DE VIE ====================

  ngOnInit(): void {


    // Écouter l'état du service
    this.recommendationService.recommendationsState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isLoading = state.loading;
        this.homepageData = state.homepage;
        this.totalRecommendations = this.recommendationService.getTotalRecommendations();
        this.popularRecommendations = this.getPopularRecommendations();
        this.nearbyTotalCount = this.getNearbyTotalCount();
        this.filteredNearbyRecommendations = this.getFilteredNearbyRecommendations();
        this.disponibleNearbyCount = this.getDisponibleNearbyCount();
        if (!state.loading && state.homepage && this.isBrowser) {
          setTimeout(() => this.updateNearbyMap(), 300);
        }
      });

    // Charger les favoris depuis le localStorage (seulement côté browser)
    if (this.isBrowser) {
      this.loadFavorites();
    }

    // Charger automatiquement si demandé
    if (this.autoLoad) {
      setTimeout(() => {
        // Essayer d'obtenir la géolocalisation automatiquement en arrière-plan
        this.tryAutoGeolocation();
        this.loadRecommendations();
        // Charger aussi les disponibilités temps réel
        this.loadAvailableNowFromApi();
      }, 500);
    }
  }

  ngOnDestroy(): void {


    // Nettoyer le timeout de rafraîchissement
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    this.destroy$.next();
    this.destroy$.complete();

    if (this.leafletMap) {
      this.leafletMap.remove();
      this.leafletMap = null;
    }
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  /**
   * Charger les recommandations
   */
  loadRecommendations(): void {


    this.fetchRecommendations();
  }

  /**
   * Rafraîchir les recommandations
   */
  refreshRecommendations(): void {


    this.recommendationService.refreshRecommendations()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.loadRecommendations();
          if (this.isBrowser) {
            this.snackBar.open('Recommandations mises à jour', '', {
              duration: 2000,
              panelClass: ['success-snackbar']
            });
          }
        },
        error: (error) => {
          console.error('Erreur rafraîchissement:', error);
          if (this.isBrowser) {
            this.snackBar.open('Erreur lors du rafraîchissement', 'OK', {
              duration: 3000,
              panelClass: ['error-snackbar']
            });
          }
        }
      });
  }

  // ==================== GESTIONNAIRES D'ÉVÉNEMENTS ====================

  /**
   * Gestion du clic sur un salon (pour compatibilité)
   */
  onSalonClick(salon: RecommendationData): void {


    // Enregistrer l'interaction
    this.recommendationService.recordInteraction(salon.id, 'click')
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    // Émettre l'événement
    this.salonClick.emit(salon);

    // Ouvrir directement les détails
    this.openSalonDetailDialog(salon.id);
  }


  /**
   * Ouvrir les détails selon le type (salon ou freelance)
   */
  openItemDetail(item: RecommendationData): void {
    if (this.isFreelance(item)) {
      this.openFreelanceDetailDialog(item.id);
    } else {
      this.openSalonDetailDialog(item.id);
    }
  }

  /**
   * Ouvrir les détails d'un freelance
   */
  openFreelanceDetailDialog(freelanceId: number): void {


    if (!this.isBrowser) {

      return;
    }

    if (!freelanceId) {
      console.error('ID de freelance invalide:', freelanceId);
      return;
    }

    // Enregistrer l'interaction pour les statistiques
    this.recommendationService.recordInteraction(freelanceId, 'view_details')
      .pipe(takeUntil(this.destroy$))
      .subscribe();

    // Ouvrir le dialog des détails du freelance
    const dialogRef = this.dialog.open(FreelanceDetailsComponent, {
      width: '95vw',
      height: '90vh',
      maxWidth: '1200px',
      maxHeight: '800px',
      data: { freelanceId: freelanceId },
      panelClass: ['dialog-responsive', 'freelance-details-dialog'],
      autoFocus: false,
      restoreFocus: true
    });

    dialogRef.afterClosed()
      .pipe(takeUntil(this.destroy$))
      .subscribe(result => {

      });
  }

  openSalonDetailDialog(salonId: number): void {


    if (!this.isBrowser) {

      return;
    }

    if (!salonId) {
      console.error('ID de salon invalide:', salonId);
      return;
    }

    // Enregistrer l'interaction pour les statistiques
    this.recommendationService.recordInteraction(salonId, 'view_details')
      .pipe(takeUntil(this.destroy$))
      .subscribe();

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


        // Si l'utilisateur a effectué une action (réservation, favori, etc.)
        if (result && result.action) {
          this.handleDialogAction(result);
        }
      });
    } catch (error) {
      console.error('Erreur lors de l\'ouverture du dialogue:', error);

      const errorMessage = error instanceof Error ? error.message : 'Inconnue';
      this.snackBar.open('Impossible d\'ouvrir les détails du salon. Erreur: ' + errorMessage, 'OK', {
        duration: 5000
      });
    }
  }

  // ==================== SOLUTION 3 : NAVIGATION VERS PAGE DE RECHERCHE ====================

  /**
   *  Obtenir les recommandations d'une section
   */
  getSectionRecommendations(sectionName: string, limit?: number): RecommendationData[] {
    const allRecommendations = this.recommendationService.getSectionRecommendations(sectionName);
    const defaultLimit = limit || 4;
    return allRecommendations.slice(0, defaultLimit);
  }

  /**
   *  Navigation vers tous les résultats (ancienne méthode renommée)
   */
  onViewAllSection(sectionName: string): void {


    const sectionData = this.recommendationService.getSectionRecommendations(sectionName);

    if (sectionData.length === 0) {
      if (this.isBrowser) {
        this.snackBar.open(`Aucun résultat pour ${sectionName}`, 'OK', {
          duration: 3000,
          panelClass: ['warning-snackbar']
        });
      }
      return;
    }



    // Naviguer vers une page de recherche filtrée
    this.navigateToFilteredSearch(sectionName, sectionData);

    // Émettre l'événement pour le composant parent (si nécessaire)
    this.viewAllSection.emit({ section: sectionName, data: sectionData });
  }

  /**
   *  Naviguer vers une recherche filtrée avec les données de la section
   */
  private navigateToFilteredSearch(sectionName: string, sectionData: any[]): void {
    if (!this.isBrowser) return;



    // Sauvegarder les données dans localStorage pour les récupérer sur la page de destination
    if (typeof localStorage !== 'undefined') {
      const searchResultsData = {
        section: sectionName,
        data: sectionData,
        title: this.getSectionTitle(sectionName),
        type: this.getSectionType(sectionName),
        timestamp: Date.now(),
        userLocation: this.userLocation
      };

      localStorage.setItem('searchResults', JSON.stringify(searchResultsData));

    }

    // Configurer les paramètres de navigation selon la section
    const navigationParams = this.getNavigationParams(sectionName);

    // Navigation vers la page avec paramètres
    this.router.navigate(['/search-results'], {
      queryParams: {
        ...navigationParams,
        count: sectionData.length,
        source: 'recommendations'
      }
    }).then(() => {


      // Notification de succès
      if (this.snackBar) {
        this.snackBar.open(
          `Affichage de ${sectionData.length} résultats pour ${this.getSectionTitle(sectionName)}`,
          '',
          {
            duration: 2000,
            panelClass: ['success-snackbar']
          }
        );
      }
    }).catch(error => {
      console.error('Erreur de navigation:', error);

      // Fallback : essayer la page principale avec filtres
      this.fallbackNavigation(sectionName, sectionData);
    });
  }

  /**
   *  Obtenir les paramètres de navigation selon la section
   */
  private getNavigationParams(sectionName: string): any {
    const baseParams = {
      section: sectionName,
      type: this.getSectionType(sectionName)
    };

    // Paramètres spécifiques selon la section
    switch (sectionName) {
      case 'populaires':
        return {
          ...baseParams,
          sortBy: 'popularity',
          filter: 'popular'
        };

      case 'proches':
        const locationParams: any = {
          ...baseParams,
          sortBy: 'distance',
          filter: 'nearby'
        };

        // Ajouter la géolocalisation si disponible
        if (this.userLocation.lat && this.userLocation.lon) {
          locationParams.lat = this.userLocation.lat;
          locationParams.lon = this.userLocation.lon;
          locationParams.radius = 10; // 10km par défaut
        }

        return locationParams;

      default:
        return baseParams;
    }
  }

  /**
   *  Navigation de secours en cas d'échec
   */
  private fallbackNavigation(sectionName: string, sectionData: any[]): void {


    // Essayer la page principale avec les paramètres de recherche
    const searchParams = this.getSearchParams(sectionName);

    this.router.navigate(['/'], {
      queryParams: searchParams
    }).then(() => {


      if (this.snackBar) {
        this.snackBar.open(
          `Redirection vers la recherche pour ${this.getSectionTitle(sectionName)}`,
          'OK',
          {
            duration: 3000,
            panelClass: ['info-snackbar']
          }
        );
      }
    }).catch(fallbackError => {
      console.error('Échec de la navigation de secours:', fallbackError);

      // Dernier recours : afficher une notification avec le nombre de résultats
      if (this.snackBar) {
        this.snackBar.open(
          `${sectionData.length} professionnels trouvés pour ${this.getSectionTitle(sectionName)}. Utilisez la recherche pour les voir.`,
          'OK',
          {
            duration: 5000,
            panelClass: ['info-snackbar']
          }
        );
      }
    });
  }

  /**
   *  Obtenir les paramètres de recherche pour la page principale
   */
  private getSearchParams(sectionName: string): any {
    switch (sectionName) {
      case 'populaires':
        return { sortBy: 'popularity' };
      case 'proches':
        return {
          sortBy: 'distance',
          ...(this.userLocation.lat && this.userLocation.lon ? {
            lat: this.userLocation.lat,
            lon: this.userLocation.lon
          } : {})
        };
      default:
        return { searchTerm: sectionName };
    }
  }

  /**
   *  Obtenir le titre de la section
   */
  private getSectionTitle(sectionName: string): string {
    const titles: { [key: string]: string } = {
      'populaires': 'Les plus populaires',
      'proches': 'Près de chez vous'
    };

    return titles[sectionName] || `Résultats pour ${sectionName}`;
  }

  /**
   *  Obtenir le type de la section
   */
  private getSectionType(sectionName: string): string {
    const types: { [key: string]: string } = {
      'populaires': 'popular',
      'proches': 'nearby'
    };

    return types[sectionName] || 'general';
  }

  // ==================== AUTRES GESTIONNAIRES D'ÉVÉNEMENTS ====================

  /**
   *  Gestion du toggle favori
   */
  onToggleFavorite(salon: RecommendationData, event: Event): void {
    event.stopPropagation();

    const isFavorite = !this.isFavorite(salon.id);

    if (isFavorite) {
      this.favoriteSalons.add(salon.id);
    } else {
      this.favoriteSalons.delete(salon.id);
    }

    // Sauvegarder seulement côté browser
    if (this.isBrowser) {
      this.saveFavorites();
    }

    // Mettre à jour côté serveur
    const action = isFavorite ? 'add' : 'remove';
    this.recommendationService.updateFavorite(salon.id, action)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {

        },
        error: (error) => {
          console.error('Erreur mise à jour favori:', error);
          // Revenir en arrière en cas d'erreur
          if (isFavorite) {
            this.favoriteSalons.delete(salon.id);
          } else {
            this.favoriteSalons.add(salon.id);
          }
          if (this.isBrowser) {
            this.saveFavorites();
          }
        }
      });

    // Émettre l'événement
    this.favoriteToggle.emit({ salon, isFavorite });

    // Notification discrète (seulement côté browser)
    if (this.isBrowser) {
      const message = isFavorite ? 'Ajouté aux favoris' : 'Retiré des favoris';
      this.snackBar.open(message, '', {
        duration: 1500,
        panelClass: ['subtle-snackbar']
      });
    }
  }


  /**
   *  Debug (à supprimer en production)
   */
  onDebug(): void {
    this.recommendationService.debugState();
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   *  Obtenir les recommandations populaires
   */
  getPopularRecommendations(): RecommendationData[] {
    const salons = this.getSectionRecommendations('populaires', 4);
    const freelances = this.getSectionRecommendations('freelances_populaires', 4);
    // Intercaler salons et freelances : s, f, s, f...
    const result: RecommendationData[] = [];
    const maxLen = Math.max(salons.length, freelances.length);
    for (let i = 0; i < maxLen; i++) {
      if (i < salons.length) result.push(salons[i]);
      if (i < freelances.length) result.push(freelances[i]);
    }
    return result.filter((item, index, arr) => arr.findIndex(t => t.id === item.id) === index);
  }

  /**
   *  Obtenir les recommandations proches (salons + freelances)
   */
  getNearbyRecommendations(): RecommendationData[] {
    const salonsProches = this.getSectionRecommendations('proches', 10);
    const freelancesProches = this.getSectionRecommendations('freelances_proches', 10);

    // Mélanger salons et freelances
    const combined = [...salonsProches, ...freelancesProches];

    // Supprimer les doublons par ID
    const uniqueItems = combined.filter((item, index, array) =>
      array.findIndex(t => t.id === item.id) === index
    );

    // Trier par distance (les plus proches en premier) - gérer les valeurs nulles/undefined
    const sorted = uniqueItems.sort((a, b) => {
      const distanceA = a.distance ?? 999;
      const distanceB = b.distance ?? 999;
      return distanceA - distanceB;
    });

    // Limiter à 8 éléments maximum
    return sorted.slice(0, 8);
  }

  /**
   *  Définir le filtre pour la section proche de vous
   */
  setNearbyFilter(filter: 'salons' | 'freelances' | 'disponible'): void {
    this.nearbyFilter = filter;
    this.filteredNearbyRecommendations = this.getFilteredNearbyRecommendations();
    setTimeout(() => this.updateNearbyMap(), 50);
  }

  /**
   * Nombre d'items disponibles maintenant parmi les proches
   */
  getDisponibleNearbyCount(): number {
    const allNearby = this.getNearbyRecommendations();
    const availableIds = new Set(this.availableNowData.map((a: any) => a.id));
    const nearbyAvailable = allNearby.filter(item => item.isAvailableNow === true || availableIds.has(item.id));
    return Math.max(nearbyAvailable.length, this.getAvailableNowCount());
  }

  checkIsAvailableNow(item: RecommendationData): boolean {
    if (item.isAvailableNow === true) return true;
    return this.availableNowData.some((a: any) => a.id === item.id);
  }

  getNextSlotForItem(item: RecommendationData): string {
    if (item.nextSlot && item.nextSlot !== 'N/A') return item.nextSlot;
    return '';
  }

  /**
   *  Obtenir les recommandations proches filtrées
   */
  getFilteredNearbyRecommendations(): RecommendationData[] {
    const allNearby = this.getNearbyRecommendations();

    if (this.nearbyFilter === 'disponible') {
      // Priorité : items "proches" qui sont aussi dans availableNowData
      const availableIds = new Set(this.availableNowData.map((a: any) => a.id));
      const nearbyAndAvailable = allNearby.filter(item => availableIds.has(item.id));

      if (nearbyAndAvailable.length > 0) {
        return nearbyAndAvailable;
      }
      // Fallback : données de l'API disponibilité même si pas dans "proches"
      return this.getAvailableNow();
    }

    const salons = allNearby.filter(item => !this.isFreelance(item));
    const freelances = allNearby.filter(item => this.isFreelance(item));

    if (this.nearbyFilter === 'salons') {
      if (salons.length === 0 && freelances.length > 0) {
        this.nearbyFilter = 'freelances';
        return freelances;
      }
      return salons;
    } else {
      if (freelances.length === 0 && salons.length > 0) {
        this.nearbyFilter = 'salons';
        return salons;
      }
      return freelances;
    }
  }

  /**
   *  Formater la distance
   */
  formatDistance(distance: number | undefined): string {
    if (!distance) return 'N/A';

    if (distance < 1) {
      return `${(distance * 1000).toFixed(0)}m`;
    } else {
      return `${distance.toFixed(1)}km`;
    }
  }

  /**
   *  Calculer le temps estimé basé sur la distance réelle
   */
  calculateEstimatedTime(distance: number | undefined): string {
    if (!distance) return 'N/A';

    // Vitesse moyenne à pied/transport : ~5 km/h
    const timeInHours = distance / 5;
    const timeInMinutes = Math.round(timeInHours * 60);

    if (timeInMinutes < 5) {
      return '< 5 min';
    } else if (timeInMinutes < 60) {
      return `${timeInMinutes} min`;
    } else {
      const hours = Math.floor(timeInMinutes / 60);
      const remainingMinutes = timeInMinutes % 60;
      return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
    }
  }

  /**
   * Extraire les noms des services depuis un tableau d'objets ou de strings
   */
  getServicesText(services: any[]): string {
    if (!services || services.length === 0) {
      return '';
    }

    const serviceNames = services.map(service => {
      if (typeof service === 'string') {
        return service;
      } else if (service && typeof service === 'object') {
        // Essayer différentes propriétés possibles
        return service.nom || service.name || service.titre || service.title || service.libelle || 'Service';
      }
      return 'Service';
    });

    return serviceNames.slice(0, 2).join(' & ');
  }


  /**
   *  Obtenir le nombre d'éléments dans une section
   */
  getSectionCount(sectionName: string): number {
    return this.recommendationService.getSectionRecommendations(sectionName).length;
  }

  /**
   *  Obtenir le nombre total d'éléments proches (salons + freelances)
   */
  getNearbyTotalCount(): number {
    return this.getSectionCount('proches') + this.getSectionCount('freelances_proches');
  }



  /**
   *  Obtenir le nombre total de recommandations
   */
  getTotalRecommendations(): number {
    const total = this.recommendationService.getTotalRecommendations();

    return total;
  }

  /**
   *  Obtenir les sections disponibles
   */
  getAvailableSections(): string[] {
    return this.recommendationService.getAvailableSections();
  }

  /**
   *  Vérifier si c'est un freelance
   */
  isFreelance(item: RecommendationData): boolean {
    return item.type === 'freelance';
  }

  /**
   *  Obtenir le type d'icône selon le type (salon/freelance)
   */
  getItemTypeIcon(item: RecommendationData): string {
    return this.isFreelance(item) ? 'fas fa-user' : 'fas fa-store';
  }

  /**
   *  Obtenir la classe CSS selon le type
   */
  getItemTypeClass(item: RecommendationData): string {
    return this.isFreelance(item) ? 'freelance-card' : 'salon-card';
  }

  // ==================== MÉTHODES DE GESTION D'IMAGES CORRIGÉES ====================

  /**
   *  Obtenir l'URL de l'image d'un salon - CORRIGÉ avec logique du HeaderComponent
   */
  getSalonImage(salon: RecommendationData): string {
    if (!salon) {
      return 'assets/images/salon-placeholder.jpg';
    }

    // Utiliser la même logique que dans HeaderComponent
    const imageUrl = this.getValidImageUrl(salon);

    return imageUrl;
  }

  /**
   * COPIÉE DU HEADERCOMPONENT - Récupération d'URL d'image valide avec toutes les variantes
   */
  private getValidImageUrl(item: any): string {
    // Ordre de priorité pour les champs d'image (élargi)
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

    // Image par défaut selon le type
    const defaultImage = item.type === 'freelance'
      ? 'assets/images/freelance-placeholder.jpg'
      : 'assets/images/salon-placeholder.jpg';

    return defaultImage;
  }

  /**
   * COPIÉE DU HEADERCOMPONENT - Traitement d'URL d'image
   */
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

  /**
   * COPIÉE DU HEADERCOMPONENT - Gestion d'erreur d'image améliorée
   */
  onImageError(event: any): void {
    const img = event.target;

    // Éviter les boucles infinies
    if (img.dataset.retryCount) {
      const retryCount = parseInt(img.dataset.retryCount);
      if (retryCount >= 3) {
        this.createImagePlaceholder(img);
        return;
      }
      img.dataset.retryCount = (retryCount + 1).toString();
    } else {
      img.dataset.retryCount = '1';
    }

    // Images de fallback
    const fallbackImages = [
      'assets/images/salon-placeholder.jpg',
      'assets/images/default-salon.jpg',
      'assets/images/store-placeholder.jpg'
    ];

    const currentRetry = parseInt(img.dataset.retryCount) - 1;
    if (currentRetry < fallbackImages.length) {
      img.src = fallbackImages[currentRetry];
    } else {
      this.createImagePlaceholder(img);
    }
  }

  /**
   * Callback succès d'image
   */
  onImageLoad(event: any): void {
    const img = event.target;

    // Ajouter une classe pour l'animation
    img.classList.add('loaded');
    img.style.opacity = '1';

    // Supprimer le compteur de retry
    delete img.dataset.retryCount;
  }

  /**
   * COPIÉE DU HEADERCOMPONENT - Placeholder amélioré
   */
  private createImagePlaceholder(imgElement: HTMLImageElement): void {
    const container = imgElement.parentElement;
    if (!container) return;

    // Vérifier si un placeholder existe déjà
    if (container.querySelector('.image-placeholder-salon')) return;

    // Masquer l'image défaillante
    imgElement.style.display = 'none';

    // Créer le placeholder
    const placeholder = document.createElement('div');
    placeholder.className = 'image-placeholder-salon';

    placeholder.style.cssText = `
      width: 100%;
      height: 100%;
      backgroundImage: url('assets/images/salon.jpg');
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      font-weight: bold;
      border-radius: inherit;
      position: absolute;
      top: 0;
      left: 0;
    `;

    // Icône du salon
    placeholder.innerHTML = '<i class="fas fa-store"></i>';

    // Ajouter le placeholder
    container.style.position = 'relative';
    container.appendChild(placeholder);
  }

  /**
   *  Vérifier si un salon est favori
   */
  isFavorite(salonId: number): boolean {
    return this.favoriteSalons.has(salonId);
  }

  /**
   * TrackBy pour les ngFor
   */
  trackBySalonId(index: number, salon: RecommendationData): number {
    return salon.id;
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   *  Récupérer les recommandations depuis l'API
   */
  private fetchRecommendations(): void {
    const { lat, lon } = this.userLocation;

    this.recommendationService.loadRecommendationsWithCache(lat, lon)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          //
        },
        error: (error) => {
          // console.error('Erreur chargement recommandations:', error);

          // Afficher l'erreur seulement côté browser
          if (this.isBrowser) {
            this.snackBar.open('Impossible de charger les recommandations', 'Réessayer', {
              duration: 5000,
              panelClass: ['error-snackbar']
            }).onAction().subscribe(() => {
              this.loadRecommendations();
            });
          }
        }
      });
  }

  /**
   *  Charger les favoris depuis le localStorage (FIX SSR)
   */
  private loadFavorites(): void {
    try {
      if (this.isBrowser && typeof localStorage !== 'undefined') {
        const favorites = localStorage.getItem('favoriteSalons');
        if (favorites) {
          this.favoriteSalons = new Set(JSON.parse(favorites));
        }
      }
    } catch (error) {
      console.warn('LocalStorage non disponible ou erreur:', error);
    }
  }

  /**
   *  Sauvegarder les favoris dans le localStorage (FIX SSR)
   */
  private saveFavorites(): void {
    try {
      if (this.isBrowser && typeof localStorage !== 'undefined') {
        localStorage.setItem('favoriteSalons', JSON.stringify([...this.favoriteSalons]));
      }
    } catch (error) {
      console.warn('Impossible de sauvegarder dans localStorage:', error);
    }
  }

  /**
   *  Gérer les actions du dialogue (réservation, ajout aux favoris, etc.)
   */
  private handleDialogAction(result: any): void {
    switch (result.action) {
      case 'favorite_added':
        this.favoriteSalons.add(result.salonId);
        if (this.isBrowser) {
          this.saveFavorites();
          this.snackBar.open('Ajouté aux favoris', '', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        }
        break;

      case 'favorite_removed':
        this.favoriteSalons.delete(result.salonId);
        if (this.isBrowser) {
          this.saveFavorites();
          this.snackBar.open('Retiré des favoris', '', {
            duration: 2000,
            panelClass: ['success-snackbar']
          });
        }
        break;

      case 'reservation_made':
        if (this.isBrowser) {
          this.snackBar.open('Réservation effectuée avec succès !', 'Voir', {
            duration: 5000,
            panelClass: ['success-snackbar']
          }).onAction().subscribe(() => {
            // Rediriger vers la page des réservations
            this.router.navigate(['/reservations']);
          });
        }
        break;

      default:

    }
  }

  // ==================== MÉTHODES POUR LA GÉOLOCALISATION ====================

  /**
   *  Essayer d'obtenir la géolocalisation automatiquement en arrière-plan
   */
  private tryAutoGeolocation(): void {
    if (!this.isBrowser || !navigator.geolocation) {

      return;
    }

    // Si on a déjà une position, ne pas redemander
    if (this.userLocation.lat && this.userLocation.lon) {
      return;
    }


    this.locationRequesting = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {


        this.userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };

        this.hasLocationPermission = true;
        this.locationDenied = false;
        this.locationRequesting = false;

        // Recharger discrètement les recommandations avec la position
        this.loadRecommendations();
        this.loadAvailableNowFromApi();
      },
      (error) => {

        this.hasLocationPermission = false;
        this.locationRequesting = false;
        // Code 1 = PERMISSION_DENIED : l'utilisateur a refusé ou le navigateur bloque
        if (error.code === 1) {
          this.locationDenied = true;
        }
      },
      {
        enableHighAccuracy: false, // Plus rapide
        timeout: 5000, // Timeout court
        maximumAge: 600000 // Cache 10 minutes
      }
    );
  }

  /**
   *  Vérifier si on a déjà une position
   */
  hasLocation(): boolean {
    return this.userLocation && this.userLocation.lat != null && this.userLocation.lon != null;
  }

  // ==================== MÉTHODES CARTE INTERACTIVE (LEAFLET) ====================

// ==================== MÉTHODES DE LA CARTE ====================

  updateNearbyMap(): void {
    // Retry si le conteneur n'est pas encore dans le DOM
    if (!this.isBrowser) return;
    if (!this.nearbyMapContainer?.nativeElement) {
      setTimeout(() => this.updateNearbyMap(), 300);
      return;
    }

    import('leaflet').then(L => {
      const items = this.getFilteredNearbyRecommendations();

      // Coordonnées par défaut (Dakar si rien n'est trouvé)
      const DEFAULT_LAT = 14.6937;
      const DEFAULT_LNG = -17.4441;
      const centerLat = this.userLocation.lat ?? DEFAULT_LAT;
      const centerLng = this.userLocation.lon ?? DEFAULT_LNG;

      // Initialiser ou réutiliser la carte
      if (!this.leafletMap) {
        this.leafletMap = L.map(this.nearbyMapContainer.nativeElement, {
          zoomControl: true,
          scrollWheelZoom: false
        }).setView([centerLat, centerLng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '',
          maxZoom: 19
        }).addTo(this.leafletMap);
      } else {
        this.leafletMap.setView([centerLat, centerLng], 14);
        this.leafletMarkers.forEach(m => m.remove());
        this.leafletMarkers = [];
      }

      // Marqueur utilisateur (Bleu)
      if (this.userLocation.lat != null && this.userLocation.lon != null) {
        const userIcon = L.divIcon({
          html: `<div class="lf-marker-user"></div>`,
          className: 'custom-user-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        L.marker([this.userLocation.lat, this.userLocation.lon], { icon: userIcon, zIndexOffset: 1000 })
          .bindTooltip('Vous êtes ici', { permanent: false })
          .addTo(this.leafletMap);
      }

      // Marqueurs salons / freelances
      // Pour les items sans coordonnées, on génère une position approchée autour du centre
      items.forEach((item, index) => {
        const lat = item.latitude ?? (centerLat + (index % 3 - 1) * 0.005 + Math.floor(index / 3) * 0.004);
        const lng = item.longitude ?? (centerLng + (index % 3 - 1) * 0.006 + Math.floor(index / 3) * 0.004);
        const hasRealCoords = item.latitude != null && item.longitude != null;

        const freelance = this.isFreelance(item);
        const icon = L.divIcon({
          html: `<div class="lf-marker-pin ${freelance ? 'freelance' : 'salon'}${hasRealCoords ? '' : ' approx'}"><div class="lf-pin-inner"></div></div>`,
          className: 'custom-div-icon',
          iconSize: [28, 35],
          iconAnchor: [14, 35]
        });

        const marker = L.marker([lat, lng], { icon })
          .bindPopup(`
            <div class="lf-popup">
              <strong>${item.nom}</strong>
              <span class="lf-popup-type ${freelance ? 'freelance' : ''}">${freelance ? 'Freelance' : 'Salon'}</span>
              ${item.adresse ? `<p>${item.adresse}</p>` : ''}
              ${!hasRealCoords ? '<small style="color:#888">Position approximative</small>' : ''}
            </div>
          `, { maxWidth: 200 })
          .on('click', () => {
            this.activeNearbyId = item.id;
            const el = document.getElementById(`nearby-card-${item.id}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          })
          .addTo(this.leafletMap);

        this.leafletMarkers.push(marker);
      });

      // Crucial pour éviter la carte grise/blanche
      setTimeout(() => {
        if (this.leafletMap) this.leafletMap.invalidateSize();
      }, 400);
    });
  }

  highlightOnMap(item: RecommendationData): void {
    this.activeNearbyId = item.id;
    if (this.leafletMap) {
      const marker = this.leafletMarkers[this.getFilteredNearbyRecommendations().findIndex(i => i.id === item.id)];
      if (marker) {
        const latlng = marker.getLatLng();
        this.leafletMap.setView([latlng.lat, latlng.lng], 16, { animate: true });
        marker.openPopup();
      }
    }
  }

  get nearbyMapMarkersCount(): number {
    return this.getFilteredNearbyRecommendations().length;
  }

  /**
   *  Demander la localisation à l'utilisateur (appelé depuis le bouton UI)
   */
  requestLocation(): void {
    if (!this.isBrowser || !navigator.geolocation) return;

    this.locationRequesting = true;
    this.locationDenied = false;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        this.hasLocationPermission = true;
        this.locationDenied = false;
        this.locationRequesting = false;
        this.loadRecommendations();
      },
      (error) => {
        this.hasLocationPermission = false;
        this.locationRequesting = false;
        this.locationDenied = true;
        console.warn('Localisation refusée:', error.message);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 0 }
    );
  }

  /**
   *  Faire défiler le carousel horizontalement
   */
  scrollCarousel(section: string, direction: 'prev' | 'next'): void {
    if (!this.isBrowser) return;

    let carousel: ElementRef<HTMLDivElement> | undefined;

    switch (section) {
      case 'populaires':
        carousel = this.popularCarousel;
        break;
      case 'proches':
        carousel = this.nearbyCarousel;
        break;
      case 'available':
        carousel = this.availableCarousel;
        break;
      default:
        return;
    }

    if (!carousel?.nativeElement) return;

    const scrollContainer = carousel.nativeElement;
    const cardWidth = section === 'available' ? 180 : 260; // Cards plus petites pour disponible
    const scrollAmount = cardWidth + 20;

    const currentScroll = scrollContainer.scrollLeft;
    const newScroll = direction === 'next'
      ? currentScroll + scrollAmount
      : currentScroll - scrollAmount;

    scrollContainer.scrollTo({
      left: newScroll,
      behavior: 'smooth'
    });
  }

  /**
   * Obtenir la liste des professionnels disponibles maintenant (VRAIE API)
   */
  getAvailableNow(): RecommendationData[] {
    // SEULEMENT les vraies données API, pas de simulation
    if (!this.availableNowData || this.availableNowData.length === 0) {
      return []; // Retourner liste vide si pas de données réelles
    }

    // Convertir et dédupliquer les données de l'API
    const converted = this.availableNowData.map(item => this.convertApiToRecommendationData(item));
    return this.deduplicateAvailableData(converted);
  }

  /**
   * Données temps réel depuis l'API (cache local)
   */
  private availableNowData: any[] = [];
  private lastAvailableNowUpdate: Date | null = null;

  /**
   * Déduplication des données disponibles
   */
  private deduplicateAvailableData(items: RecommendationData[]): RecommendationData[] {
    const seen = new Set<number>();
    return items.filter(item => {
      if (seen.has(item.id)) {

        return false;
      }
      seen.add(item.id);
      return true;
    });
  }

  /**
   * Charger les données temps réel depuis l'API
   */
  private loadAvailableNowFromApi(): void {
    const { lat, lon } = this.userLocation;

    this.recommendationService.getAvailableNow(lat, lon, 10, 8)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {

          this.availableNowData = response.availableNow || [];
          this.lastAvailableNowUpdate = new Date();

          // Programmer le prochain rafraîchissement dans 5 minutes
          this.scheduleNextRefresh();
        },
        error: (error) => {
          console.error('Erreur chargement temps réel:', error);
          // En cas d'erreur, utiliser les données simulées et réessayer dans 2 minutes
          this.availableNowData = [];
          this.scheduleNextRefresh(2 * 60 * 1000); // 2 minutes
        }
      });
  }

  /**
   * Programmer le prochain rafraîchissement automatique
   */
  private refreshTimeout: any = null;

  private scheduleNextRefresh(delay: number = 5 * 60 * 1000): void { // 5 minutes par défaut
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (this.isBrowser) {
      this.refreshTimeout = setTimeout(() => {

        this.loadAvailableNowFromApi();
      }, delay);
    }
  }


  /**
   * Convertir les données de l'API en format RecommendationData
   */
  private convertApiToRecommendationData(apiItem: any): RecommendationData {
    return {
      id: apiItem.id,
      nom: apiItem.nom,
      type: apiItem.type as 'salon' | 'freelance',
      adresse: apiItem.adresse || 'Adresse non disponible',
      services: [],
      isAvailableNow: true,
      nextSlot: this.formatTimeSlot(apiItem.nextSlot),
      openUntil: this.formatTimeSlot(apiItem.closingTime),
      distance: apiItem.distance,
      availableSlots: [this.formatTimeSlot(apiItem.nextSlot)],
      note: apiItem.note || apiItem.rating || 4.5,
      nombreAvis: apiItem.nombreAvis || apiItem.reviewCount || 0,
      latitude: apiItem.latitude,
      longitude: apiItem.longitude
    };
  }

  /**
   * Formater les heures depuis l'API
   */
  private formatTimeSlot(timeString: any): string {
    if (!timeString || timeString === 'Fermé') return 'Fermé';

    // Si c'est déjà un string formaté, le retourner
    if (typeof timeString === 'string' && timeString.includes('h')) {
      return timeString;
    }

    // Si c'est un objet LocalTime de Java, le convertir
    try {
      if (typeof timeString === 'object' && timeString.hour !== undefined) {
        const hour = timeString.hour;
        const minute = timeString.minute || 0;
        return `${hour}h${minute.toString().padStart(2, '0')}`;
      }

      // Tentative de parsing d'autres formats
      return String(timeString);
    } catch (e) {
      return 'N/A';
    }
  }

  /**
   * Compter les professionnels disponibles maintenant
   */
  getAvailableNowCount(): number {
    return this.getAvailableNow().length;
  }

  /**
   * Obtenir le prochain créneau disponible (seulement API réelle)
   */
  getNextSlot(salon: RecommendationData): string {
    // Utiliser seulement les données de l'API temps réel
    if (salon.nextSlot && salon.nextSlot !== 'N/A' && salon.nextSlot !== '') {
      return salon.nextSlot;
    }

    // Si pas de données API, retourner message clair
    return 'Vérifier disponibilité';
  }


  /**
   * Convertir les données API en RecommendationData
   */
  private convertApiToRecommendation(apiData: any): RecommendationData | null {
    if (!apiData) return null;

    return {
      id: apiData.prestataireId || apiData.id,
      nom: apiData.nom || apiData.name || 'Professionnel',
      prenom: apiData.prenom,
      description: apiData.description,
      adresse: apiData.adresse || apiData.address || 'Adresse non spécifiée',
      photoProfil: apiData.photoProfil || apiData.imageUrl,
      note: apiData.note || apiData.rating || apiData.noteMoyenne,
      nombreAvis: apiData.nombreAvis || apiData.reviewCount || 0,
      services: Array.isArray(apiData.services) ? apiData.services : [],
      distance: apiData.distance,
      latitude: apiData.latitude,
      longitude: apiData.longitude,
      type: apiData.estSalon ? 'salon' : 'freelance',
      rating: apiData.rating || apiData.note,
      reviewCount: apiData.reviewCount || apiData.nombreAvis,
      experience: apiData.experience,
      specialite: apiData.specialite,
      availableSlots: apiData.creneauxDisponibles?.map((c: any) => c.heure) || [],
      isAvailableNow: true,
      nextSlot: apiData.prochainCreneau?.heure,
      openUntil: apiData.fermeA
    };
  }

  /**
   * Action de réservation directe
   */
  bookNow(salon: RecommendationData, event: Event): void {
    event.stopPropagation();
    this.openItemDetail(salon);
  }
}
