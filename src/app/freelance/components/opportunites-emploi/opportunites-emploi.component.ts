import { Component, OnInit, OnDestroy, Input, Output, EventEmitter, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { OffreEmploi, OffreEmploisService } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';
import { OffreDetailsComponent } from '../offre-details/offre-details.component';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

import { CandidatureService } from '../../services/candidatures.service';

@Component({
  selector: 'app-opportunites-emploi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, OffreDetailsComponent, MatIconModule, RouterLink],
  templateUrl: './opportunites-emploi.component.html',
  styleUrls: ['./opportunites-emploi.component.scss']
})
export class OpportunitesEmploiComponent implements OnInit, OnDestroy {
  
  // ==========================================
  //  INPUTS POUR LA RÉUTILISABILITÉ
  // ==========================================
  
  @Input() maxOffersToShow?: number;
  @Input() showHeader: boolean = true;
  @Input() compactMode: boolean = false;
  @Input() hideNav: boolean = false;
  @Input() autoLoad: boolean = true;
  @Input() initialFilter?: { searchTerm?: string, status?: string };
  @Input() customTitle?: string;
  @Input() customSubtitle?: string;
  @Input() freelanceId?: number; // Pour vérifier les candidatures postulées

  // ==========================================
  //  OUTPUTS POUR LA COMMUNICATION
  // ==========================================
  
  @Output() filtersChanged = new EventEmitter<{ search: string, status: string }>();
  @Output() offreClick = new EventEmitter<OffreEmploi>();
  @Output() viewAllClick = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<{type: string, value: string}>();
  @Output() dataLoaded = new EventEmitter<OffreEmploi[]>();
  @Output() error = new EventEmitter<any>();

  // ==========================================
  //  PROPRIÉTÉS PRINCIPALES
  // ==========================================
  offres: OffreEmploi[] = [];
  filteredOffres: OffreEmploi[] = [];
  displayedOffres: OffreEmploi[] = [];
  isLoading: boolean = true;

  // Rotation compacte (homepage)
  compactOpenOffers: OffreEmploi[] = [];  // toutes les offres OUVERT triées par date
  compactIndex = 0;                        // index de départ du groupe de 3 affiché
  compactAnimating = false;                // pour déclencher l'animation CSS
  compactDisplayedOffers: OffreEmploi[] = []; // tableau stable pour le ngFor
  private rotationInterval: any = null;
  searchForm: FormGroup;
  selectedOffre: OffreEmploi | null = null;
  showDetails: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedJobFilter: string = 'all';
  isExpanded: boolean = false;
  searchText: string = '';

  // New filter properties
  readonly categories = ['Coiffure', 'Maquillage', 'Onglerie', 'Soin de la peau'];
  readonly contractTypes = ['CDI', 'CDD', 'Temps partiel', 'Stage', 'Intérim', 'Freelance', 'Formation'];
  selectedCategories: string[] = [];
  sortBy: string = 'recent';
  currentPage: number = 1;
  readonly pageSize: number = 5;

  // ==========================================
  //  PROPRIÉTÉS POUR LE FILTRE "DÉJÀ POSTULÉ"
  // ==========================================
  showOnlyApplied: boolean = false; // Pour le filtre "Déjà postulé"
  appliedOffers: number[] = []; // IDs des offres où l'utilisateur a postulé
  candidatureStatuses = new Map<number, {status: string, date: Date, isNew?: boolean, offreTitre?: string}>(); // Statuts des candidatures
  isLoadingAppliedOffers: boolean = false;
  
  // ==========================================
  //  PROPRIÉTÉS POUR LES NOTIFICATIONS DE STATUT
  // ==========================================
  recentStatusChanges: Array<{
    offreId: number,
    status: string,
    date: Date,
    offreTitre?: string
  }> = [];
 
  // Subject pour gérer la désinscription
  private destroy$ = new Subject<void>();
  
  // Options de statut
  statusOptions = ['OUVERT', 'FERMÉ', 'EN_ATTENTE', 'URGENT', 'FEATURED'];
  
  // Mapping des statuts pour l'affichage
  private statusDisplayMap: { [key: string]: string } = {
    'OUVERT': ' Ouvert',
    'FERMÉ': ' Fermé', 
    'EN_ATTENTE': ' En attente',
    'URGENT': ' Urgent',
    'FEATURED': ' À la une'
  };
  
  private platformId = inject(PLATFORM_ID);

  constructor(
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      status: [''],
      ville: [''],
      specialisation: [''],
      typeContrat: [''],
      experience: [''],
      salaire: ['']
    });
  }

  onFiltersChange() {
    this.filtersChanged.emit({
      search: this.searchText.trim(),
      status: this.selectedStatus
    });
  }
  
 
  ngOnInit(): void {
    this.initializeComponent();
    if (!this.maxOffersToShow && this.compactMode) {
      this.maxOffersToShow = 3;
    }
    if (this.freelanceId) {
      this.loadAppliedOffers();
    }
  }

  ngOnDestroy(): void {
    this.stopRotation();
    this.destroy$.next();
    this.destroy$.complete();
  }

 
  
  private initializeComponent(): void {
    if (this.initialFilter) {
      this.searchForm.patchValue(this.initialFilter);
      this.searchTerm = this.initialFilter.searchTerm || '';
      this.selectedStatus = this.initialFilter.status || '';
    }
    
    if (this.autoLoad) {
      this.loadOffres();
    }
    
    this.setupFormSubscriptions();
  }

  private setupFormSubscriptions(): void {
    this.searchForm.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(values => {
        const oldSearchTerm = this.searchTerm;
        const oldStatus = this.selectedStatus;
        
        this.searchTerm = values.searchTerm || '';
        this.selectedStatus = values.status || '';
        
        this.applyFilters();
        
        if (oldSearchTerm !== this.searchTerm) {
          this.filterChange.emit({ type: 'searchTerm', value: this.searchTerm });
        }
        if (oldStatus !== this.selectedStatus) {
          this.filterChange.emit({ type: 'status', value: this.selectedStatus });
        }
      });
  }

  // ==========================================
  //  CHARGEMENT DES DONNÉES
  // ==========================================
  loadOffres(): void {
    this.isLoading = true;
    
    this.offreEmploisService.getAllOffresEmplois()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          this.offres = data || [];
          this.applyFilters();
          this.isLoading = false;
          this.dataLoaded.emit(this.offres);
        },
        error: (err) => {
          console.error(' Erreur lors du chargement:', err);
          this.offres = [];
          this.filteredOffres = [];
          this.displayedOffres = [];
          this.isLoading = false;
          this.error.emit(err);
        }
      });
  }

  // ==========================================
  //  CHARGEMENT DES CANDIDATURES
  // ==========================================
  
  /**
   *  Charger les candidatures du freelance
   */
  loadAppliedOffers(): void {
    if (!this.freelanceId) {
      console.warn(' ID du freelance non fourni - freelanceId:', this.freelanceId);
      return;
    }

    this.isLoadingAppliedOffers = true;
    
    this.candidatureService.getCandidaturesByFreelance(this.freelanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (candidatures) => {
          
          // Extraire les IDs et statuts
          this.appliedOffers = [];
          this.candidatureStatuses.clear();
          
          (candidatures || []).forEach(candidature => {
            if (candidature.offreEmploiId) {
              this.appliedOffers.push(candidature.offreEmploiId);
              
              const candidatureDate = new Date(candidature.dateCandidature || Date.now());
              const status = candidature.status || 'EN_ATTENTE';
              const isRecentChange = this.isRecentStatusChange(candidatureDate, status);
              
              const offreTitre = candidature['offreTitre']
                || this.offres.find(o => o.id === candidature.offreEmploiId)?.titre
                || 'ce poste';
              this.candidatureStatuses.set(candidature.offreEmploiId, {
                status: status,
                date: candidatureDate,
                isNew: isRecentChange,
                offreTitre
              });
              
              // Ajouter aux changements récents si c'est un statut important et récent
              if (isRecentChange && (status === 'ACCEPTEE' || status === 'REFUSEE')) {
                this.recentStatusChanges.push({
                  offreId: candidature.offreEmploiId,
                  status: status,
                  date: candidatureDate,
                  offreTitre: candidature['offreTitre'] || 'Offre d\'emploi'
                });
              }
            }
          });
          
          this.isLoadingAppliedOffers = false;
          
          // Réappliquer les filtres si on est en mode "Déjà postulé"
          if (this.showOnlyApplied) {
            this.applyFilters();
          }
        },
        error: (err) => {
          console.error(' Erreur lors du chargement des candidatures:', err);
          this.appliedOffers = [];
          this.candidatureStatuses.clear();
          this.isLoadingAppliedOffers = false;
        }
      });
  }

  // ==========================================
  //  FILTRAGE ET AFFICHAGE MODIFIÉ
  // ==========================================
  applyFilters(): void {
    let filtered = [...this.offres];
    
    //  Filtre "Déjà postulé"
    if (this.showOnlyApplied) {
      filtered = filtered.filter(offre => 
        offre.id && this.appliedOffers.includes(offre.id)
      );
      
      // Trier par date de candidature (plus récent d'abord)
      filtered.sort((a, b) => {
        const statusA = this.candidatureStatuses.get(a.id!);
        const statusB = this.candidatureStatuses.get(b.id!);
        if (!statusA || !statusB) return 0;
        return statusB.date.getTime() - statusA.date.getTime();
      });
    }
    
    // Filtre par terme de recherche
    if (this.searchTerm) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(offre => 
        this.matchesSearchTerm(offre, searchLower)
      );
    }
    
    // Filtre par statut - désactivé si "Déjà postulé" actif
    if (this.selectedStatus && !this.showOnlyApplied) {
      filtered = filtered.filter(offre => 
        offre.status === this.selectedStatus
      );
    }

    // Filtre par ville
    const ville = this.searchForm.get('ville')?.value?.trim().toLowerCase();
    if (ville) {
      filtered = filtered.filter(offre =>
        offre.lieu && offre.lieu.toLowerCase().includes(ville)
      );
    }

    // Filtre par spécialisation
    const specialisation = this.searchForm.get('specialisation')?.value;
    if (specialisation) {
      const specLower = specialisation.toLowerCase();
      filtered = filtered.filter(offre =>
        (offre.competences && offre.competences.toLowerCase().includes(specLower)) ||
        (offre.titre && offre.titre.toLowerCase().includes(specLower))
      );
    }

    // Filtre par catégories sélectionnées (checkboxes)
    if (this.selectedCategories.length > 0) {
      filtered = filtered.filter(offre =>
        this.selectedCategories.some(cat => {
          const catLower = cat.toLowerCase();
          return (offre.competences && offre.competences.toLowerCase().includes(catLower)) ||
                 (offre.titre && offre.titre.toLowerCase().includes(catLower));
        })
      );
    }

    // Filtre par type de contrat — matching insensible à la casse dans les deux sens
    const typeContrat = this.searchForm.get('typeContrat')?.value;
    if (typeContrat) {
      const contractLower = typeContrat.toLowerCase().replace(/_/g, ' ');
      filtered = filtered.filter(offre => {
        if (!offre.typeContrat) return false;
        const offreLower = offre.typeContrat.toLowerCase().replace(/_/g, ' ');
        return offreLower === contractLower || offreLower.includes(contractLower) || contractLower.includes(offreLower);
      });
    }

    // Filtre par expérience — matching sur le mot clé principal
    const experience = this.searchForm.get('experience')?.value;
    if (experience) {
      const expLower = experience.toLowerCase();
      filtered = filtered.filter(offre => {
        if (!offre.experienceRequise) return false;
        return offre.experienceRequise.toLowerCase().includes(expLower);
      });
    }

    // Filtre par salaire — recherche textuelle dans le champ salaire
    const salaire = this.searchForm.get('salaire')?.value?.trim().toLowerCase();
    if (salaire) {
      filtered = filtered.filter(offre =>
        offre.salaire && offre.salaire.toLowerCase().includes(salaire)
      );
    }

    // Tri
    if (this.sortBy === 'recent') {
      filtered.sort((a, b) => {
        const dateA = (a.dateCreation || a.datePublication) ? new Date(a.dateCreation || a.datePublication!).getTime() : 0;
        const dateB = (b.dateCreation || b.datePublication) ? new Date(b.dateCreation || b.datePublication!).getTime() : 0;
        return dateB - dateA;
      });
    } else if (this.sortBy === 'titre') {
      filtered.sort((a, b) => (a.titre || '').localeCompare(b.titre || ''));
    }

    this.filteredOffres = filtered;
    this.currentPage = 1;

    // Appliquer la limitation d'affichage si définie
    if (this.maxOffersToShow && this.maxOffersToShow > 0) {
      this.displayedOffres = this.filteredOffres.slice(0, this.maxOffersToShow);
    } else {
      this.displayedOffres = [...this.filteredOffres];
    }

    // En mode compact : construire la liste des offres OUVERT pour la rotation
    if (this.compactMode) {
      this.compactOpenOffers = this.offres
        .filter(o => o.status === 'OUVERT')
        .sort((a, b) => {
          const da = a.datePublication ? new Date(a.datePublication).getTime() : 0;
          const db = b.datePublication ? new Date(b.datePublication).getTime() : 0;
          return db - da;
        });
      this.compactIndex = 0;
      this.updateCompactDisplayedOffers();
      this.startRotation();
    }
    
  }

  private matchesSearchTerm(offre: OffreEmploi, searchTerm: string): boolean {
    const searchableFields = [
      offre.titre,
      offre.description,
      offre.lieu,
      offre.competences,
      offre.typeContrat,
      offre.experienceRequise
    ];
    
    return searchableFields.some(field => 
      field && field.toLowerCase().includes(searchTerm)
    );
  }

  // ==========================================
  //  MÉTHODES MODIFIÉES
  // ==========================================
  
  resetFilters(): void {
    this.searchForm.reset();
    this.searchTerm = '';
    this.selectedStatus = '';
    this.showOnlyApplied = false; //  Reset du filtre "Déjà postulé"
    this.selectedCategories = [];
    this.sortBy = 'recent';
    this.currentPage = 1;
    this.applyFilters();
  }

  setStatusFilter(status: string): void {
    //  Désactiver le filtre "Déjà postulé" si on sélectionne un statut
    if (this.showOnlyApplied) {
      this.showOnlyApplied = false;
    }
    
    this.searchForm.patchValue({ status });
  }

  // ==========================================
  //  GESTION DU FILTRE "DÉJÀ POSTULÉ"
  // ==========================================

  /**
   *  Basculer le filtre "Déjà postulé"
   */
  toggleAppliedFilter(): void {
    this.showOnlyApplied = !this.showOnlyApplied;
    
    // Charger les candidatures si pas encore fait
    if (this.showOnlyApplied && this.appliedOffers.length === 0) {
      this.loadAppliedOffers();
    }
    
    // Réinitialiser les autres filtres
    if (this.showOnlyApplied) {
      this.searchForm.patchValue({ status: '' });
      this.selectedStatus = '';
    }
    
    this.applyFilters();
    this.filterChange.emit({ 
      type: 'applied', 
      value: this.showOnlyApplied ? 'true' : 'false' 
    });
  }

  /**
   *  Vérifier si l'utilisateur a postulé à une offre
   */
  hasAppliedToOffer(offreId: number | undefined): boolean {
    if (!offreId || !this.freelanceId) return false;
    return this.appliedOffers.includes(offreId);
  }

  /**
   *  Obtenir le statut de candidature pour une offre
   */
  getCandidatureStatus(offreId: number | undefined): string | null {
    if (!offreId) return null;
    const status = this.candidatureStatuses.get(offreId)?.status || null;
    
    // Debug logs
    if (this.candidatureStatuses.size > 0) {
    }
    
    return status;
  }

  /**
   *  Obtenir la classe CSS pour le statut de candidature
   */
  getCandidatureStatusClass(offreId: number | undefined): string {
    const status = this.getCandidatureStatus(offreId);
    const classMap: { [key: string]: string } = {
      'EN_ATTENTE': 'status-pending',
      'ACCEPTEE': 'status-accepted', 
      'REFUSEE': 'status-rejected',
      'EN_COURS': 'status-in-progress'
    };
    return classMap[status || ''] || 'status-unknown';
  }

  /**
   *  Obtenir le texte d'affichage du statut
   */
  getCandidatureStatusText(offreId: number | undefined): string {
    const status = this.getCandidatureStatus(offreId);
    const textMap: { [key: string]: string } = {
      'EN_ATTENTE': 'En attente',
      'ACCEPTEE': 'Acceptée',
      'REFUSEE': 'Refusée', 
      'EN_COURS': 'En cours'
    };
    return textMap[status || ''] || 'Inconnu';
  }

  // ==========================================
  //  GESTION DES ÉVÉNEMENTS
  // ==========================================
  
  viewOffreDetails(offre: OffreEmploi): void {
    this.selectedOffre = offre;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedOffre = null;
  }

  onViewAllOffers(): void {
    this.viewAllClick.emit();
  }

  onCollapseSection(): void {
    this.isExpanded = false;
    this.maxOffersToShow = 4;
    this.applyFilters();
    
    const element = document.querySelector('.opportunites-container');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  get totalJobsCount(): number {
    return this.filteredOffres.length;
  }

  get displayedJobsCount(): number {
    return this.displayedOffres.length;
  }

  // ==========================================
  //  MÉTHODES D'AFFICHAGE
  // ==========================================
  
  getStatusClass(status: string): string {
    const statusClassMap: { [key: string]: string } = {
      'OUVERT': 'status-open',
      'FERMÉ': 'status-closed', 
      'EN_ATTENTE': 'status-pending',
      'URGENT': 'status-urgent',
      'FEATURED': 'status-featured'
    };
    return statusClassMap[status] || '';
  }

  getStatusDisplayName(status: string): string {
    return this.statusDisplayMap[status] || status;
  }

  truncateText(text: string, maxLength: number): string {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    
    const truncated = text.substring(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxLength * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  getJobDuration(offre: OffreEmploi): string {
    switch (offre.typeContrat?.toLowerCase()) {
      case 'cdi': return 'Temps plein';
      case 'cdd': return 'Durée déterminée';
      case 'freelance': case 'mission': return 'Mission';
      case 'stage': return 'Stage';
      case 'temps partiel': return 'Temps partiel';
      default: return 'À définir';
    }
  }

  // New pagination and category methods
  toggleCategory(cat: string): void {
    const idx = this.selectedCategories.indexOf(cat);
    if (idx >= 0) this.selectedCategories.splice(idx, 1);
    else this.selectedCategories.push(cat);
    this.currentPage = 1;
    this.applyFilters();
  }

  isCategorySelected(cat: string): boolean {
    return this.selectedCategories.includes(cat);
  }

  get paginatedOffres(): OffreEmploi[] {
    const source = (this.maxOffersToShow && this.maxOffersToShow > 0)
      ? this.displayedOffres
      : this.filteredOffres;
    const start = (this.currentPage - 1) * this.pageSize;
    return source.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.filteredOffres.length / this.pageSize);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) this.currentPage = page;
  }

  getPageNumbers(): (number | string)[] {
    const total = this.totalPages;
    const current = this.currentPage;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | string)[] = [1];
    if (current > 3) pages.push('...');
    for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
      pages.push(i);
    }
    if (current < total - 2) pages.push('...');
    pages.push(total);
    return pages;
  }

  getSalonImage(offre: OffreEmploi): string {
    return offre.salonPhotoProfil || '';
  }

  trackByOffreId(index: number, offre: OffreEmploi): any {
    return offre.id || index;
  }

  // ==========================================
  //  GETTERS POUR LE TEMPLATE
  // ==========================================
  
  /**
   *  Nombre d'offres auxquelles l'utilisateur a postulé
   */
  get appliedOffersCount(): number {
    return this.appliedOffers.length;
  }

  /**
   *  Titre adapté selon le mode
   */
  get displayTitle(): string {
    if (this.customTitle) return this.customTitle;
    if (this.showOnlyApplied) {
      return this.compactMode ? ' Mes Candidatures' : ' Mes candidatures envoyées';
    }
    if (this.compactMode) return ' Opportunités d\'Emploi';
    return ' Opportunités d\'Emplois en Beauté';
  }

  /**
   *  Sous-titre adapté selon le mode
   */
  get displaySubtitle(): string {
    if (this.customSubtitle) return this.customSubtitle;
    if (this.showOnlyApplied) {
      return this.compactMode ? 
        'Vos candidatures avec statuts' : 
        'Consultez vos candidatures et leur évolution';
    }
    if (this.compactMode) return 'Découvrez les dernières offres';
    return 'Découvrez les dernières opportunités professionnelles et trouvez votre prochaine mission dans l\'univers de la beauté !';
  }

  get hasMoreOffers(): boolean {
    return this.maxOffersToShow ? 
      this.filteredOffres.length > this.maxOffersToShow : 
      false;
  }

  get hiddenOffersCount(): number {
    if (!this.maxOffersToShow) return 0;
    return Math.max(0, this.filteredOffres.length - this.maxOffersToShow);
  }

  // ==========================================
  //  MÉTHODES PUBLIQUES POUR L'API
  // ==========================================
  
  public refreshData(): void {
    this.loadOffres();
    if (this.freelanceId) {
      this.loadAppliedOffers();
    }
  }

  public applyExternalFilter(filter: { searchTerm?: string, status?: string }): void {
    this.searchForm.patchValue(filter);
  }

  public getStats(): { 
    total: number, 
    filtered: number, 
    displayed: number,
    applied?: number
  } {
    return {
      total: this.offres.length,
      filtered: this.filteredOffres.length,
      displayed: this.displayedOffres.length,
      applied: this.appliedOffersCount
    };
  }

  public setFreelanceId(freelanceId: number): void {
    this.freelanceId = freelanceId;
    this.loadAppliedOffers();
  }

  // ==========================================
  //  MÉTHODES SUPPLÉMENTAIRES
  // ==========================================

  getCompetencesList(competencesString: string): string[] {
    if (!competencesString) return [];
    return competencesString.split(',').map(c => c.trim()).filter(c => c.length > 0);
  }

  getCompactDate(date: string | Date | undefined): string {
    if (!date) return 'Nouveau';
    const now = new Date();
    const targetDate = new Date(date);
    const diffMs = now.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays < 30) return `il y a ${diffDays}j`;
    const diffMonths = Math.floor(diffDays / 30);
    return `il y a ${diffMonths}m`;
  }

  getRelativeDate(date: string | Date): string {
    if (!date) return 'Date inconnue';
    
    const now = new Date();
    const targetDate = new Date(date);
    const diffTime = Math.abs(now.getTime() - targetDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'aujourd\'hui';
    if (diffDays === 1) return 'hier';
    if (diffDays < 7) return `il y a ${diffDays} jours`;
    if (diffDays < 30) return `il y a ${Math.floor(diffDays / 7)} semaine${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return `il y a ${Math.floor(diffDays / 30)} mois`;
  }

  applyToOffer(offre: OffreEmploi): void {
  }

  onPublishOffer(): void {
  }

  getJobStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'OUVERT': 'Ouvert',
      'FERMÉ': 'Fermé',
      'EN_ATTENTE': 'En attente',
      'URGENT': 'Urgent',
      'FEATURED': 'À la une'
    };
    return statusMap[status] || status;
  }

  onJobFilterChange(filter: string): void {
    this.selectedJobFilter = filter;
    
    if (filter === 'all') {
      this.resetFilters();
    } else {
      this.searchForm.patchValue({ 
        searchTerm: filter === 'all' ? '' : filter 
      });
    }
    
    this.filterChange.emit({ type: 'category', value: filter });
  }

  onViewJobDetails(offre: OffreEmploi): void {
    this.viewOffreDetails(offre);
  }

  onApplyToJob(offre: OffreEmploi): void {
    this.applyToOffer(offre);
  }

  onPublishJob(): void {
    this.onPublishOffer();
  }

  onViewAllJobs(): void {
    if (this.compactMode) {
      this.viewAllClick.emit();
    } else {
      this.isExpanded = true;
      this.maxOffersToShow = undefined;
      this.applyFilters();
    }
  }

  // ==========================================
  //  ROTATION COMPACTE (homepage)
  // ==========================================

  private updateCompactDisplayedOffers(): void {
    if (this.compactOpenOffers.length === 0) {
      this.compactDisplayedOffers = [];
      return;
    }
    const total = this.compactOpenOffers.length;
    const result: OffreEmploi[] = [];
    for (let i = 0; i < 3; i++) {
      result.push(this.compactOpenOffers[(this.compactIndex + i) % total]);
    }
    this.compactDisplayedOffers = result;
  }

  private startRotation(): void {
    this.stopRotation();
    if (!isPlatformBrowser(this.platformId)) return; // pas de setInterval côté SSR
    if (this.compactOpenOffers.length <= 3) return; // pas assez d'offres pour tourner
    this.rotationInterval = setInterval(() => {
      this.rotateOffers();
    }, 8000); // toutes les 8 secondes
  }

  private stopRotation(): void {
    if (this.rotationInterval) {
      clearInterval(this.rotationInterval);
      this.rotationInterval = null;
    }
  }

  private rotateOffers(): void {
    this.compactAnimating = false;
    // Courte pause pour reset l'animation
    setTimeout(() => {
      this.compactIndex = (this.compactIndex + 3) % this.compactOpenOffers.length;
      this.updateCompactDisplayedOffers();
      this.compactAnimating = true;
      // Reset après animation
      setTimeout(() => { this.compactAnimating = false; }, 600);
    }, 50);
  }

  // ==========================================
  //  MÉTHODES POUR LES NOTIFICATIONS DE STATUT
  // ==========================================

  /**
   * Vérifie s'il y a des changements de statut récents
   */
  hasRecentStatusChanges(): boolean {
    return this.recentStatusChanges.length > 0;
  }

  /**
   * Détermine si un changement de statut est récent (dans les 7 derniers jours)
   */
  private isRecentStatusChange(date: Date, status: string): boolean {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return date > sevenDaysAgo && (status === 'ACCEPTEE' || status === 'REFUSEE' || status === 'EN_COURS');
  }

  /**
   * Obtient la classe CSS pour la notification globale
   */
  getGlobalNotificationClass(): string {
    const acceptedCount = this.getStatusCount('ACCEPTEE');
    const rejectedCount = this.getStatusCount('REFUSEE');
    if (acceptedCount > 0 && rejectedCount === 0) return 'notification-success';
    if (rejectedCount > 0 && acceptedCount === 0) return 'notification-warning';
    if (acceptedCount > 0 && rejectedCount > 0) return 'notification-warning';
    return 'notification-info';
  }

  getGlobalNotificationTitle(): string {
    return `Mes candidatures (${this.appliedOffersCount})`;
  }

  getGlobalNotificationMessage(): string {
    const acceptedCount = this.getStatusCount('ACCEPTEE');
    const rejectedCount = this.getStatusCount('REFUSEE');
    const pendingCount  = this.getStatusCount('EN_ATTENTE');
    const inProgressCount = this.getStatusCount('EN_COURS');
    const parts: string[] = [];
    if (acceptedCount > 0)    parts.push(`${acceptedCount} acceptée${acceptedCount > 1 ? 's' : ''}`);
    if (rejectedCount > 0)    parts.push(`${rejectedCount} non retenue${rejectedCount > 1 ? 's' : ''}`);
    if (inProgressCount > 0)  parts.push(`${inProgressCount} en cours`);
    if (pendingCount > 0)     parts.push(`${pendingCount} en attente`);
    return parts.join(' · ');
  }

  private getStatusCount(status: string): number {
    let count = 0;
    this.candidatureStatuses.forEach(c => { if (c.status === status) count++; });
    return count;
  }

  getAcceptedMessages(): string[] {
    const msgs: string[] = [];
    this.candidatureStatuses.forEach(c => {
      if (c.status === 'ACCEPTEE') {
        msgs.push(`Félicitations ! Votre candidature pour le poste "${c.offreTitre}" a été retenue !`);
      }
    });
    return msgs;
  }

  getRefusedMessages(): string[] {
    const msgs: string[] = [];
    this.candidatureStatuses.forEach(c => {
      if (c.status === 'REFUSEE') {
        msgs.push(`Votre candidature pour le poste "${c.offreTitre}" n'a pas été retenue cette fois.`);
      }
    });
    return msgs;
  }

  getPendingSummary(): string {
    const pendingCount = this.getStatusCount('EN_ATTENTE');
    const inProgressCount = this.getStatusCount('EN_COURS');
    const parts: string[] = [];
    if (inProgressCount > 0) parts.push(`${inProgressCount} en cours d'examen`);
    if (pendingCount > 0)    parts.push(`${pendingCount} en attente de réponse`);
    return parts.join(' · ');
  }

  hasCandidatureMessages(): boolean {
    return this.getAcceptedMessages().length > 0 || this.getRefusedMessages().length > 0;
  }

  /**
   * Fait défiler vers les offres avec changements de statut
   */
  scrollToStatusChanges(): void {
    this.showOnlyApplied = true;
    this.applyFilters();
    setTimeout(() => {
      const target = document.querySelector('.badge-candidature') || document.querySelector('.offers-list');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }
}