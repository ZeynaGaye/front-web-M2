import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { OffreEmploi, OffreEmploisService } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';
import { OffreDetailsComponent } from '../offre-details/offre-details.component';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { CandidatureService } from '../../services/candidatures.service';

@Component({
  selector: 'app-opportunites-emploi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OffreDetailsComponent, MatIconModule],
  templateUrl: './opportunites-emploi.component.html',
  styleUrls: ['./opportunites-emploi.component.scss']
})
export class OpportunitesEmploiComponent implements OnInit, OnDestroy {
  
  // ==========================================
  // 🔧 INPUTS POUR LA RÉUTILISABILITÉ
  // ==========================================
  
  @Input() maxOffersToShow?: number;
  @Input() showHeader: boolean = true;
  @Input() compactMode: boolean = false;
  @Input() autoLoad: boolean = true;
  @Input() initialFilter?: { searchTerm?: string, status?: string };
  @Input() customTitle?: string;
  @Input() customSubtitle?: string;
  @Input() freelanceId?: number; // Pour vérifier les candidatures postulées

  // ==========================================
  // 📤 OUTPUTS POUR LA COMMUNICATION
  // ==========================================
  
  @Output() filtersChanged = new EventEmitter<{ search: string, status: string }>();
  @Output() offreClick = new EventEmitter<OffreEmploi>();
  @Output() viewAllClick = new EventEmitter<void>();
  @Output() filterChange = new EventEmitter<{type: string, value: string}>();
  @Output() dataLoaded = new EventEmitter<OffreEmploi[]>();
  @Output() error = new EventEmitter<any>();

  // ==========================================
  // 📊 PROPRIÉTÉS PRINCIPALES
  // ==========================================
  offres: OffreEmploi[] = [];
  filteredOffres: OffreEmploi[] = [];
  displayedOffres: OffreEmploi[] = [];
  isLoading: boolean = true;
  searchForm: FormGroup;
  selectedOffre: OffreEmploi | null = null;
  showDetails: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = '';
  selectedJobFilter: string = 'all';
  isExpanded: boolean = false;
  searchText: string = '';

  // ==========================================
  // 🆕 PROPRIÉTÉS POUR LE FILTRE "DÉJÀ POSTULÉ"
  // ==========================================
  showOnlyApplied: boolean = false; // Pour le filtre "Déjà postulé"
  appliedOffers: number[] = []; // IDs des offres où l'utilisateur a postulé
  candidatureStatuses = new Map<number, {status: string, date: Date}>(); // Statuts des candidatures
  isLoadingAppliedOffers: boolean = false;
 
  // Subject pour gérer la désinscription
  private destroy$ = new Subject<void>();
  
  // Options de statut
  statusOptions = ['OUVERT', 'FERMÉ', 'EN_ATTENTE', 'URGENT', 'FEATURED'];
  
  // Mapping des statuts pour l'affichage
  private statusDisplayMap: { [key: string]: string } = {
    'OUVERT': '✅ Ouvert',
    'FERMÉ': '❌ Fermé', 
    'EN_ATTENTE': '⏳ En attente',
    'URGENT': '🚨 Urgent',
    'FEATURED': '⭐ À la une'
  };
  
  constructor(
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService,
    private fb: FormBuilder
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      status: ['']
    });
  }

  onFiltersChange() {
    this.filtersChanged.emit({
      search: this.searchText.trim(),
      status: this.selectedStatus
    });
  }
  
  // ==========================================
  // 🔄 CYCLE DE VIE
  // ==========================================
  ngOnInit(): void {
    console.log('🔧 OpportunitesEmploiComponent ngOnInit', {
      maxOffersToShow: this.maxOffersToShow,
      compactMode: this.compactMode,
      showHeader: this.showHeader,
      freelanceId: this.freelanceId
    });
    
    this.initializeComponent();
    if (!this.maxOffersToShow && this.compactMode) {
      this.maxOffersToShow = 4;
    }
    
    // 🆕 Charger les candidatures si freelanceId fourni
    if (this.freelanceId) {
      this.loadAppliedOffers();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==========================================
  // 🚀 INITIALISATION
  // ==========================================
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
  // 📡 CHARGEMENT DES DONNÉES
  // ==========================================
  loadOffres(): void {
    console.log('📡 Chargement des offres...');
    this.isLoading = true;
    
    this.offreEmploisService.getAllOffresEmplois()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data) => {
          console.log('✅ Données reçues:', data);
          this.offres = data || [];
          this.applyFilters();
          this.isLoading = false;
          this.dataLoaded.emit(this.offres);
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement:', err);
          this.offres = [];
          this.filteredOffres = [];
          this.displayedOffres = [];
          this.isLoading = false;
          this.error.emit(err);
        }
      });
  }

  // ==========================================
  // 🆕 CHARGEMENT DES CANDIDATURES
  // ==========================================
  
  /**
   * 📋 Charger les candidatures du freelance
   */
  loadAppliedOffers(): void {
    if (!this.freelanceId) {
      console.warn('⚠️ ID du freelance non fourni');
      return;
    }

    console.log('📋 Chargement des candidatures...');
    this.isLoadingAppliedOffers = true;
    
    this.candidatureService.getCandidaturesByFreelance(this.freelanceId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (candidatures) => {
          console.log('✅ Candidatures reçues:', candidatures);
          
          // Extraire les IDs et statuts
          this.appliedOffers = [];
          this.candidatureStatuses.clear();
          
          (candidatures || []).forEach(candidature => {
            if (candidature.offreEmploiId) {
              this.appliedOffers.push(candidature.offreEmploiId);
              this.candidatureStatuses.set(candidature.offreEmploiId, {
                status: candidature.status || 'EN_ATTENTE',
                date: new Date(candidature.dateCandidature || Date.now())
              });
            }
          });
          
          this.isLoadingAppliedOffers = false;
          console.log(`📊 ${this.appliedOffers.length} candidatures chargées`);
          
          // Réappliquer les filtres si on est en mode "Déjà postulé"
          if (this.showOnlyApplied) {
            this.applyFilters();
          }
        },
        error: (err) => {
          console.error('❌ Erreur lors du chargement des candidatures:', err);
          this.appliedOffers = [];
          this.candidatureStatuses.clear();
          this.isLoadingAppliedOffers = false;
        }
      });
  }

  // ==========================================
  // 🔍 FILTRAGE ET AFFICHAGE MODIFIÉ
  // ==========================================
  applyFilters(): void {
    let filtered = [...this.offres];
    
    // 🆕 Filtre "Déjà postulé"
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
    
    this.filteredOffres = filtered;
    
    // Appliquer la limitation d'affichage si définie
    if (this.maxOffersToShow && this.maxOffersToShow > 0) {
      this.displayedOffres = this.filteredOffres.slice(0, this.maxOffersToShow);
    } else {
      this.displayedOffres = [...this.filteredOffres];
    }
    
    console.log(`🔍 Filtrage: ${this.displayedOffres.length}/${this.filteredOffres.length}/${this.offres.length} (Déjà postulé: ${this.showOnlyApplied})`);
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
  // 🔄 MÉTHODES MODIFIÉES
  // ==========================================
  
  resetFilters(): void {
    console.log('🔄 Réinitialisation des filtres');
    this.searchForm.reset();
    this.searchTerm = '';
    this.selectedStatus = '';
    this.showOnlyApplied = false; // 🆕 Reset du filtre "Déjà postulé"
    this.applyFilters();
  }

  setStatusFilter(status: string): void {
    // 🆕 Désactiver le filtre "Déjà postulé" si on sélectionne un statut
    if (this.showOnlyApplied) {
      this.showOnlyApplied = false;
    }
    
    this.searchForm.patchValue({ status });
  }

  // ==========================================
  // 🆕 GESTION DU FILTRE "DÉJÀ POSTULÉ"
  // ==========================================

  /**
   * 🔄 Basculer le filtre "Déjà postulé"
   */
  toggleAppliedFilter(): void {
    this.showOnlyApplied = !this.showOnlyApplied;
    console.log('🔄 Filtre "Déjà postulé":', this.showOnlyApplied);
    
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
   * 📋 Vérifier si l'utilisateur a postulé à une offre
   */
  hasAppliedToOffer(offreId: number | undefined): boolean {
    if (!offreId || !this.freelanceId) return false;
    return this.appliedOffers.includes(offreId);
  }

  /**
   * 📊 Obtenir le statut de candidature pour une offre
   */
  getCandidatureStatus(offreId: number | undefined): string | null {
    if (!offreId) return null;
    return this.candidatureStatuses.get(offreId)?.status || null;
  }

  /**
   * 🎨 Obtenir la classe CSS pour le statut de candidature
   */
  getCandidatureStatusClass(offreId: number | undefined): string {
    const status = this.getCandidatureStatus(offreId);
    const classMap: { [key: string]: string } = {
      'EN_ATTENTE': 'status-pending',
      'ACCEPTE': 'status-accepted', 
      'REFUSE': 'status-rejected',
      'EN_COURS': 'status-in-progress'
    };
    return classMap[status || ''] || 'status-unknown';
  }

  /**
   * 📝 Obtenir le texte d'affichage du statut
   */
  getCandidatureStatusText(offreId: number | undefined): string {
    const status = this.getCandidatureStatus(offreId);
    const textMap: { [key: string]: string } = {
      'EN_ATTENTE': 'En attente',
      'ACCEPTE': 'Acceptée',
      'REFUSE': 'Refusée', 
      'EN_COURS': 'En cours'
    };
    return textMap[status || ''] || 'Inconnu';
  }

  // ==========================================
  // 🎯 GESTION DES ÉVÉNEMENTS
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
    console.log('📋 Voir toutes les offres');
    this.viewAllClick.emit();
  }

  onCollapseSection(): void {
    console.log('📋 Réduction de la section');
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
  // 🎨 MÉTHODES D'AFFICHAGE
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

  trackByOffreId(index: number, offre: OffreEmploi): any {
    return offre.id || index;
  }

  // ==========================================
  // 📊 GETTERS POUR LE TEMPLATE
  // ==========================================
  
  /**
   * 📊 Nombre d'offres auxquelles l'utilisateur a postulé
   */
  get appliedOffersCount(): number {
    return this.appliedOffers.length;
  }

  /**
   * 📋 Titre adapté selon le mode
   */
  get displayTitle(): string {
    if (this.customTitle) return this.customTitle;
    if (this.showOnlyApplied) {
      return this.compactMode ? '📋 Mes Candidatures' : '📋 Mes candidatures envoyées';
    }
    if (this.compactMode) return '💼 Opportunités d\'Emploi';
    return '💼 Opportunités d\'Emplois en Beauté';
  }

  /**
   * 📝 Sous-titre adapté selon le mode
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
  // 🛠️ MÉTHODES PUBLIQUES POUR L'API
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
  // 🆕 MÉTHODES SUPPLÉMENTAIRES
  // ==========================================

  getCompetencesList(competencesString: string): string[] {
    if (!competencesString) return [];
    return competencesString.split(',').map(c => c.trim()).filter(c => c.length > 0);
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
    console.log('✈️ Candidature pour:', offre.titre);
  }

  onPublishOffer(): void {
    console.log('📝 Publier une offre');
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
    console.log('🔍 Changement de filtre:', filter);
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
    console.log('📋 Extension de la section pour voir toutes les offres');
    this.isExpanded = true;
    this.maxOffersToShow = undefined;
    this.applyFilters();
    this.viewAllClick.emit();
  }
}