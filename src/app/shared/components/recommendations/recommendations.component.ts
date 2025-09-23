import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, inject, Inject, PLATFORM_ID } from '@angular/core';
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
  @Input() headerTitle = 'Recommandations pour vous';
  @Input() headerSubtitle = 'Découvrez les meilleurs professionnels sélectionnés selon vos préférences';
  @Input() showCta = true;
  @Input() ctaTitle = 'Vous ne trouvez pas ce que vous cherchez ?';
  @Input() ctaDescription = 'Utilisez notre recherche avancée pour découvrir plus d\'options';
  @Input() ctaButtonText = 'Recherche avancée';
  @Input() debugMode = false;
  @Input() userLocation: { lat?: number, lon?: number } = {};

  @Output() salonClick = new EventEmitter<RecommendationData>();
  @Output() viewAllSection = new EventEmitter<{ section: string, data: RecommendationData[] }>();
  @Output() favoriteToggle = new EventEmitter<{ salon: RecommendationData, isFavorite: boolean }>();
  @Output() ctaClick = new EventEmitter<void>();

  // ==================== PROPRIÉTÉS PRIVÉES ====================
  
  private destroy$ = new Subject<void>();
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private router = inject(Router);
  private favoriteSalons = new Set<number>();
  private isBrowser: boolean;
  public isGettingLocation = false;
  public locationError: string | null = null;
  public hasLocationPermission = false;

  // ==================== PROPRIÉTÉS PUBLIQUES ====================
  
  public isLoading = false;
  public homepageData: HomepageRecommendations | null = null;
  public recommendationService = inject(RecommendationService);
  public expandedSections: { [key: string]: boolean } = {
    'populaires': false,
    'proches': false,
    'coiffure': false,
    'manucure': false,
    'barbier': false,
    'freelances_populaires': false,
    'freelances_proches': false
  };

  // ==================== CONSTRUCTEUR ====================
  
  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ==================== CYCLE DE VIE ====================

  ngOnInit(): void {
    console.log('🎯 RecommendationsComponent initialisé');
    
    // Écouter l'état du service
    this.recommendationService.recommendationsState$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.isLoading = state.loading;
        this.homepageData = state.homepage;
      });

    // Charger les favoris depuis le localStorage (seulement côté browser)
    if (this.isBrowser) {
      this.loadFavorites();
    }

    // Charger automatiquement si demandé
    if (this.autoLoad) {
      setTimeout(() => {
        this.loadRecommendations();
      }, 500);
    }
  }

  ngOnDestroy(): void {
    console.log('🎯 RecommendationsComponent détruit');
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== MÉTHODES PUBLIQUES ====================

  /**
   * 🔄 Charger les recommandations
   */
  loadRecommendations(): void {
    console.log('🔄 Chargement des recommandations...');
    
    // Essayer d'obtenir la géolocalisation si pas fournie (seulement côté browser)
    if (this.isBrowser && (!this.userLocation.lat || !this.userLocation.lon)) {
      this.recommendationService.getCurrentLocation()
        .then(location => {
          this.userLocation = location;
          this.fetchRecommendations();
        })
        .catch(() => {
          // Continuer sans géolocalisation
          this.fetchRecommendations();
        });
    } else {
      this.fetchRecommendations();
    }
  }

  /**
   * 🔄 Rafraîchir les recommandations
   */
  refreshRecommendations(): void {
    console.log('🔄 Rafraîchissement des recommandations...');
    
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
          console.error('❌ Erreur rafraîchissement:', error);
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
   * 👆 Gestion du clic sur un salon (pour compatibilité)
   */
  onSalonClick(salon: RecommendationData): void {
    console.log('👆 Clic sur salon:', salon.nom);
    
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
   * 🏪 Ouvrir le dialogue des détails du salon - MÉTHODE INTÉGRÉE DU HEADER
   */
  /**
   * 🏪 Ouvrir les détails selon le type (salon ou freelance)
   */
  openItemDetail(item: RecommendationData): void {
    if (this.isFreelance(item)) {
      this.openFreelanceDetailDialog(item.id);
    } else {
      this.openSalonDetailDialog(item.id);
    }
  }

  /**
   * 👤 Ouvrir les détails d'un freelance
   */
  openFreelanceDetailDialog(freelanceId: number): void {
    console.log('👤 RecommendationsComponent - Ouverture détails freelance:', freelanceId);
    
    if (!this.isBrowser) {
      console.log('Non-browser environment, returning');
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
        console.log('👤 Dialog freelance fermé:', result);
      });
  }

  openSalonDetailDialog(salonId: number): void {
    console.log('🏪 RecommendationsComponent - Ouverture détails salon:', salonId);
    
    if (!this.isBrowser) {
      console.log('Non-browser environment, returning');
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
      console.log('Tentative d\'ouverture du dialogue pour le salon ID:', salonId);
      
      const dialogRef = this.dialog.open(SalonDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { salonId: salonId },
        panelClass: 'salon-detail-dialog-container',
        autoFocus: false,
        disableClose: true, // Empêche la fermeture par clic sur le backdrop ou ESC
      });
      
      console.log('Dialogue ouvert avec succès depuis RecommendationsComponent');
      
      dialogRef.afterOpened().subscribe(() => {
        console.log('Événement afterOpened déclenché - RecommendationsComponent');
      });
      
      dialogRef.afterClosed().subscribe(result => {
        console.log('Dialogue fermé avec résultat - RecommendationsComponent:', result);
        
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
   * 👆 Toggle d'expansion d'une section
   */
  toggleSection(sectionName: string): void {
    console.log('👆 Toggle section:', sectionName);
    this.expandedSections[sectionName] = !this.expandedSections[sectionName];
  }

  /**
   * 📊 Vérifier si une section est étendue
   */
  isSectionExpanded(sectionName: string): boolean {
    return this.expandedSections[sectionName] || false;
  }

  /**
   * 📊 Obtenir les recommandations d'une section selon l'état d'expansion
   */
  getSectionRecommendations(sectionName: string, limit?: number): RecommendationData[] {
    const allRecommendations = this.recommendationService.getSectionRecommendations(sectionName);
    
    if (this.isSectionExpanded(sectionName)) {
      return allRecommendations; // Afficher tous
    }
    
    const defaultLimit = limit || 4;
    return allRecommendations.slice(0, defaultLimit); // Afficher seulement le nombre limité
  }

  /**
   * 👆 Navigation vers tous les résultats (ancienne méthode renommée)
   */
  onViewAllSection(sectionName: string): void {
    console.log('👆 Voir tout section:', sectionName);
    
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
    
    console.log(`Navigation vers les résultats pour: ${sectionName} (${sectionData.length} éléments)`);
    
    // ✅ Naviguer vers une page de recherche filtrée
    this.navigateToFilteredSearch(sectionName, sectionData);
    
    // ✅ Émettre l'événement pour le composant parent (si nécessaire)
    this.viewAllSection.emit({ section: sectionName, data: sectionData });
  }

  /**
   * 🧭 Naviguer vers une recherche filtrée avec les données de la section
   */
  private navigateToFilteredSearch(sectionName: string, sectionData: any[]): void {
    if (!this.isBrowser) return;
    
    console.log(`🧭 Navigation vers les résultats pour: ${sectionName}`);
    
    // ✅ Sauvegarder les données dans localStorage pour les récupérer sur la page de destination
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
      console.log('📦 Données sauvegardées dans localStorage:', searchResultsData);
    }
    
    // ✅ Configurer les paramètres de navigation selon la section
    const navigationParams = this.getNavigationParams(sectionName);
    
    // ✅ Navigation vers la page avec paramètres
    this.router.navigate(['/search-results'], {
      queryParams: {
        ...navigationParams,
        count: sectionData.length,
        source: 'recommendations'
      }
    }).then(() => {
      console.log(`✅ Navigation réussie vers les résultats de ${sectionName}`);
      
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
      console.error('❌ Erreur de navigation:', error);
      
      // Fallback : essayer la page principale avec filtres
      this.fallbackNavigation(sectionName, sectionData);
    });
  }

  /**
   * 🔧 Obtenir les paramètres de navigation selon la section
   */
  private getNavigationParams(sectionName: string): any {
    const baseParams = {
      section: sectionName,
      type: this.getSectionType(sectionName)
    };
    
    // Paramètres spécifiques selon la section
    switch (sectionName) {
      case 'coiffure':
        return {
          ...baseParams,
          service: 'Coiffure',
          category: 'hair'
        };
        
      case 'manucure':
        return {
          ...baseParams,
          service: 'Pedicure,Manucure',
          category: 'nails'
        };
        
      case 'barber':
        return {
          ...baseParams,
          service: 'Barber',
          category: 'barber'
        };
        
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
   * 🆘 Navigation de secours en cas d'échec
   */
  private fallbackNavigation(sectionName: string, sectionData: any[]): void {
    console.log('🆘 Navigation de secours activée');
    
    // Essayer la page principale avec les paramètres de recherche
    const searchParams = this.getSearchParams(sectionName);
    
    this.router.navigate(['/'], { 
      queryParams: searchParams 
    }).then(() => {
      console.log('✅ Navigation de secours réussie');
      
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
      console.error('❌ Échec de la navigation de secours:', fallbackError);
      
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
   * 🔍 Obtenir les paramètres de recherche pour la page principale
   */
  private getSearchParams(sectionName: string): any {
    switch (sectionName) {
      case 'coiffure':
        return { searchTerm: 'Coiffure' };
      case 'manucure':
        return { searchTerm: 'Manucure' };
      case 'barber':
        return { searchTerm: 'Barber' };
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
   * 🏷️ Obtenir le titre de la section
   */
  private getSectionTitle(sectionName: string): string {
    const titles: { [key: string]: string } = {
      'populaires': 'Les plus populaires',
      'proches': 'Près de chez vous',
      'coiffure': 'Experts Coiffure',
      'manucure': 'Spécialistes Manucure',
      'barber': 'Maîtres Barbiers',
      'esthetique': 'Soins Esthétiques',
      'massage': 'Massages & Bien-être'
    };
    
    return titles[sectionName] || `Résultats pour ${sectionName}`;
  }

  /**
   * 🏷️ Obtenir le type de la section
   */
  private getSectionType(sectionName: string): string {
    const types: { [key: string]: string } = {
      'populaires': 'popular',
      'proches': 'nearby',
      'coiffure': 'service',
      'manucure': 'service',
      'barber': 'service',
      'esthetique': 'service',
      'massage': 'service'
    };
    
    return types[sectionName] || 'general';
  }

  // ==================== AUTRES GESTIONNAIRES D'ÉVÉNEMENTS ====================

  /**
   * ❤️ Gestion du toggle favori
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
          console.log('✅ Favori mis à jour côté serveur');
        },
        error: (error) => {
          console.error('❌ Erreur mise à jour favori:', error);
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
   * 👆 Gestion du clic CTA
   */
  onCtaClick(): void {
    console.log('👆 Clic CTA');
    this.ctaClick.emit();
  }

  /**
   * 🐛 Debug (à supprimer en production)
   */
  onDebug(): void {
    this.recommendationService.debugState();
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * 📊 Obtenir les recommandations populaires
   */
  getPopularRecommendations(): RecommendationData[] {
    return this.getSectionRecommendations('populaires', 4);
  }

  /**
   * 📊 Obtenir les recommandations proches
   */
  getNearbyRecommendations(): RecommendationData[] {
    return this.getSectionRecommendations('proches', 4);
  }

  /**
   * 📊 Obtenir le nombre d'éléments dans une section
   */
  getSectionCount(sectionName: string): number {
    return this.recommendationService.getSectionRecommendations(sectionName).length;
  }

  /**
   * 📊 Obtenir le premier élément d'une section
   */
  getFirstFromSection(sectionName: string): RecommendationData | null {
    const section = this.recommendationService.getSectionRecommendations(sectionName);
    return section.length > 0 ? section[0] : null;
  }

  /**
   * 📊 Vérifier s'il y a des recommandations de services
   */
  hasServiceRecommendations(): boolean {
    return this.getSectionCount('coiffure') > 0 || 
           this.getSectionCount('manucure') > 0 || 
           this.getSectionCount('barber') > 0;
  }

  /**
   * 📊 Obtenir le nombre total de recommandations
   */
  getTotalRecommendations(): number {
    return this.recommendationService.getTotalRecommendations();
  }

  /**
   * 📊 Obtenir les sections disponibles
   */
  getAvailableSections(): string[] {
    return this.recommendationService.getAvailableSections();
  }

  /**
   * 📊 Vérifier s'il y a des recommandations de freelances
   */
  hasFreelanceRecommendations(): boolean {
    return this.getSectionCount('freelances_populaires') > 0 || 
           this.getSectionCount('freelances_proches') > 0;
  }

  /**
   * 📊 Obtenir les freelances populaires
   */
  getPopularFreelancers(): RecommendationData[] {
    return this.getSectionRecommendations('freelances_populaires', 4);
  }

  /**
   * 📊 Obtenir les freelances proches
   */
  getNearbyFreelancers(): RecommendationData[] {
    return this.getSectionRecommendations('freelances_proches', 4);
  }

  /**
   * 🏷️ Vérifier si c'est un freelance
   */
  isFreelance(item: RecommendationData): boolean {
    return item.type === 'freelance';
  }

  /**
   * 🏷️ Obtenir le type d'icône selon le type (salon/freelance)
   */
  getItemTypeIcon(item: RecommendationData): string {
    return this.isFreelance(item) ? 'fas fa-user' : 'fas fa-store';
  }

  /**
   * 🏷️ Obtenir la classe CSS selon le type
   */
  getItemTypeClass(item: RecommendationData): string {
    return this.isFreelance(item) ? 'freelance-card' : 'salon-card';
  }

  // ==================== MÉTHODES DE GESTION D'IMAGES CORRIGÉES ====================

  /**
   * 🖼️ Obtenir l'URL de l'image d'un salon - CORRIGÉ avec logique du HeaderComponent
   */
  getSalonImage(salon: RecommendationData): string {
    if (!salon) {
      return 'assets/images/salon-placeholder.jpg';
    }
    
    // ✅ Utiliser la même logique que dans HeaderComponent
    const imageUrl = this.getValidImageUrl(salon);
    
    return imageUrl;
  }

  /**
   * ✅ COPIÉE DU HEADERCOMPONENT - Récupération d'URL d'image valide avec toutes les variantes
   */
  private getValidImageUrl(item: any): string {
    // ✅ Ordre de priorité pour les champs d'image (élargi)
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

    // ✅ Vérifier dans les objets imbriqués si ils existent
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
   * ✅ COPIÉE DU HEADERCOMPONENT - Traitement d'URL d'image
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
   * ✅ COPIÉE DU HEADERCOMPONENT - Gestion d'erreur d'image améliorée
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
   * ✅ Callback succès d'image
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
   * ✅ COPIÉE DU HEADERCOMPONENT - Placeholder amélioré
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
   * ❤️ Vérifier si un salon est favori
   */
  isFavorite(salonId: number): boolean {
    return this.favoriteSalons.has(salonId);
  }

  /**
   * 🔄 TrackBy pour les ngFor
   */
  trackBySalonId(index: number, salon: RecommendationData): number {
    return salon.id;
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * 🌐 Récupérer les recommandations depuis l'API
   */
  private fetchRecommendations(): void {
    const { lat, lon } = this.userLocation;
    
    this.recommendationService.loadRecommendationsWithCache(lat, lon)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          // console.log('✅ Recommandations chargées:', data);
        },
        error: (error) => {
          // console.error('❌ Erreur chargement recommandations:', error);
          
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
   * 💾 Charger les favoris depuis le localStorage (FIX SSR)
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
   * 💾 Sauvegarder les favoris dans le localStorage (FIX SSR)
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
   * ⚡ Gérer les actions du dialogue (réservation, ajout aux favoris, etc.)
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
        console.log('Action non gérée:', result.action);
    }
  }

  // ==================== MÉTHODES POUR LA GÉOLOCALISATION ====================

  /**
   * 📍 Demander explicitement la géolocalisation
   */
  requestLocation(): void {
    if (!this.isBrowser) {
      console.warn('Géolocalisation non disponible côté serveur');
      return;
    }

    if (!navigator.geolocation) {
      this.locationError = 'Géolocalisation non supportée par votre navigateur';
      console.warn('Géolocalisation non supportée');
      return;
    }

    this.isGettingLocation = true;
    this.locationError = null;
    
    console.log('📍 Demande de géolocalisation...');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log('✅ Géolocalisation obtenue:', position.coords);
        
        this.userLocation = {
          lat: position.coords.latitude,
          lon: position.coords.longitude
        };
        
        this.hasLocationPermission = true;
        this.isGettingLocation = false;
        this.locationError = null;
        
        // Recharger les recommandations avec la nouvelle position
        this.loadRecommendations();
        
        if (this.snackBar) {
          this.snackBar.open('📍 Position détectée ! Recommandations mises à jour', '', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        }
      },
      (error) => {
        console.error('❌ Erreur géolocalisation:', error);
        this.isGettingLocation = false;
        this.hasLocationPermission = false;
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            this.locationError = 'Accès à la localisation refusé';
            break;
          case error.POSITION_UNAVAILABLE:
            this.locationError = 'Position indisponible';
            break;
          case error.TIMEOUT:
            this.locationError = 'Délai de localisation dépassé';
            break;
          default:
            this.locationError = 'Erreur de géolocalisation';
            break;
        }
        
        if (this.snackBar) {
          this.snackBar.open(`Géolocalisation échouée: ${this.locationError}`, 'OK', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // Cache 5 minutes
      }
    );
  }

  /**
   * 🔄 Actualiser avec géolocalisation
   */
  refreshWithLocation(): void {
    this.requestLocation();
  }

  /**
   * 📍 Vérifier si la géolocalisation est supportée
   */
  isGeolocationSupported(): boolean {
    return this.isBrowser && 'geolocation' in navigator;
  }

  /**
   * 📍 Vérifier si on a déjà une position
   */
  hasLocation(): boolean {
    return this.userLocation && this.userLocation.lat != null && this.userLocation.lon != null;
  }
}