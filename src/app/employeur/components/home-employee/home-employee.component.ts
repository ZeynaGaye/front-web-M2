import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, OnInit, Output, ViewEncapsulation } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { SalonService } from '../../../shared/services/salons/salons.service';
import { Router, RouterModule } from '@angular/router';
import { SalonComponent } from '../salon/salon.component';
import { OffreEmploisComponent } from '../offre-emplois/offre-emplois.component';
import { HeaderService } from '../../../shared/services/header/header.service';
import { MesSalonsComponent } from "../mes-salons/mes-salons.component";
import { OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { FormsModule } from '@angular/forms';
import { Candidature, CandidatureService } from '../../../freelance/services/candidatures.service';
import { forkJoin, of } from 'rxjs';
import { ReservationsComponent } from '../../../shared/components/reservations/reservations.component';

// Interface pour les salons pour le typage approprié
interface Salon {
  id: number;
  nom: string;
  imageUrl: string;
  adresse: string;
  rating: number;
  reviewCount: number;
  [key: string]: any; // Pour les propriétés supplémentaires
}

// Interface pour les offres d'emploi - AMÉLIORÉE
interface OffreEmploi {
  id?: number;
  titre: string;
  lieu: string;
  datePublication?: Date;
  dateExpiration?: Date;
  estPubliee?: boolean;
  estFermee?: boolean;
  candidatures?: any[];
  candidaturesCount?: number; // Nombre réel de candidatures
  [key: string]: any; // Pour les propriétés supplémentaires
}

// Interface pour les offres formatées pour l'affichage
interface RecentOffer {
  id: number;
  title: string;
  location: string;
  date: Date;
  applicationsCount: number;
  status: string;
}

@Component({
  standalone: true,
  selector: 'app-home-employee',
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterModule,
    FormsModule,
    SalonComponent,
    OffreEmploisComponent,
    MesSalonsComponent,
    ReservationsComponent
  ],
  templateUrl: './home-employee.component.html',
  styleUrl: './home-employee.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HomeEmployeeComponent implements OnInit {
  [x: string]: any;

  // ===== PROPRIÉTÉS PRINCIPALES =====
  sidebarOpen = true;
  showCreationForm = false;
  showOffreEmploiForm = false;
  showSalonsList = false;
  showServicesList = false;
  showCandidatures = false;
  showOffresManager = false;
  showReservations = false;

  // ✅ NOUVELLES PROPRIÉTÉS POUR L'AFFICHAGE OPTIMISÉ
  showCandidaturesModal = false;
  selectedOfferTitle = '';
  selectedOfferId: number | null = null;
  modalCandidatures: Candidature[] = [];

  // Filtres et recherche
  currentFilter = {
    status: '',
    sortBy: 'date-desc',
    searchQuery: ''
  };
  viewMode: 'cards' | 'list' = 'cards';
  filteredOffers: RecentOffer[] = [];

  // ===== STATISTIQUES ET DONNÉES =====
  offreCount = 0;
  newMessages = 3; // À connecter avec un service de messages
  reservationStats = 5; // À connecter avec un service de réservations
  offreCountTrend = 15; // Tendance en pourcentage
  
  // ⭐ NOUVELLES STATS RÉSERVATIONS
  pendingReservationsCount = 0; // Pour le badge sidebar
  confirmedReservationsCount = 0;
  todayReservationsCount = 0;
  totalRevenue = 0;
  
  // ===== PARAMÈTRES UI =====
  currentSection = 'dashboard';
  pageTitle = 'Tableau de bord';
  activePeriod = 'month';
  userMenuOpen = false;
  notificationCount = 2;
  
  // ===== DONNÉES SALONS ET OFFRES =====
  salons: Salon[] = [];
  recentOffers: RecentOffer[] = [];
  offresEmploi: OffreEmploi[] = []; // Stockage des offres complètes
  Math = Math;
  
  candidatures: { [offreId: number]: Candidature[] } = {}; // Stocke les candidatures par offre
  loadingCandidatures: boolean = false;
  candidaturesError: string | null = null;
  expandedOfferId: number | null = null;
  selectedCandidature: Candidature | null = null;
  
  // Services injectés
  public headerService = inject(HeaderService);
  
  @Output() closeModalEvent = new EventEmitter<void>();

  // ===== EXPANDED MENU ITEMS =====
  expandedMenuItems: { [key: string]: boolean } = {
    dashboard: false,
    salons: false,
    createSalon: false,
    offres: false,
    candidatures: false,
    reservations: false,
    messages: false
  };
  
  constructor(
    private salonService: SalonService,
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService, 
    private router: Router
  ) { } 

  ngOnInit(): void {
    this.loadServices();
    this.loadSalons();
    // Charger les offres avec leurs candidatures
    this.loadOffresWithCandidatures();
    this.filteredOffers = [...this.recentOffers];
  }

  // ==========================================
  // 📅 GESTION DES RÉSERVATIONS
  // ==========================================

  openReservations(): void {
    this.resetAllSections();
    this.currentSection = 'reservations';
    this.pageTitle = 'Réservations';
    this.showReservations = true;
    console.log('Section réservations ouverte');
  }

  closeReservations(): void {
    this.showReservations = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
    console.log('Section réservations fermée');
  }

  onReservationStatsUpdated(stats: any): void {
    this.pendingReservationsCount = stats.pendingReservationsCount || 0;
    this.confirmedReservationsCount = stats.confirmedReservationsCount || 0;
    this.todayReservationsCount = stats.todayReservationsCount || 0;
    this.totalRevenue = stats.totalRevenue || 0;
    this.reservationStats = stats.confirmedReservationsCount + stats.pendingReservationsCount;
    console.log('Stats réservations mises à jour:', stats);
  }

  onReservationUpdated(event: any): void {
    console.log('Réservation mise à jour:', event);
    switch (event.action) {
      case 'confirmed':
        this.showNotification('Réservation confirmée avec succès', 'success');
        break;
      case 'rejected':
        this.showNotification('Réservation refusée', 'warning');
        break;
      case 'completed':
        this.showNotification('Réservation terminée', 'success');
        break;
      case 'cancelled':
        this.showNotification('Réservation annulée', 'warning');
        break;
    }
  }

  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  // ==========================================
  // 📋 GESTION DES CANDIDATURES 
  // ==========================================

  /**
   * ✅ Ouvre le modal des candidatures pour une offre spécifique
   */
  openCandidaturesModal(offer: RecentOffer): void {
    if (!offer.id || offer.applicationsCount === 0) return;
    
    this.selectedOfferId = offer.id;
    this.selectedOfferTitle = `Candidatures - ${offer.title}`;
    this.modalCandidatures = this.candidatures[offer.id] || [];
    this.showCandidaturesModal = true;
    
    // Si les candidatures ne sont pas encore chargées
    if (this.modalCandidatures.length === 0) {
      this.loadCandidaturesForOffer(offer.id);
    }
  }

  /**
   * ✅ Ferme le modal des candidatures
   */
  closeCandidaturesModal(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    
    this.showCandidaturesModal = false;
    this.selectedOfferId = null;
    this.selectedOfferTitle = '';
    this.modalCandidatures = [];
  }

  /**
   * ✅ Retourne les initiales d'un candidat
   */
  getCandidateInitials(candidature: Candidature): string {
    const nom = this.getCandidateName(candidature);
    return nom.split(' ')
              .map(n => n.charAt(0))
              .join('')
              .toUpperCase()
              .slice(0, 2);
  }

  /**
   * ✅ Retourne le nom du candidat depuis les données disponibles
   */
  getCandidateName(candidature: Candidature): string {
    // Essayer d'abord le nomCandidat normalisé
    if (candidature.nomCandidat && typeof candidature.nomCandidat === 'string') {
      return candidature.nomCandidat;
    }
    
    // Essayer d'extraire depuis l'objet freelance
    if (candidature.freelance) {
      if (candidature.freelance.nom && candidature.freelance.prenom) {
        return `${candidature.freelance.prenom} ${candidature.freelance.nom}`;
      }
      if (candidature.freelance.nomComplet) {
        return candidature.freelance.nomComplet;
      }
      if (candidature.freelance.name) {
        return candidature.freelance.name;
      }
    }
    
    // Nom générique avec ID
    return `Candidat #${candidature.id || 'X'}`;
  }

  /**
   * ✅ Retourne l'email du candidat depuis les données disponibles
   */
  getCandidateEmail(candidature: Candidature): string {
    // Essayer d'abord l'emailCandidat normalisé
    if (candidature.emailCandidat && typeof candidature.emailCandidat === 'string') {
      return candidature.emailCandidat;
    }
    
    // Essayer d'extraire depuis l'objet freelance
    if (candidature.freelance && candidature.freelance.email) {
      return candidature.freelance.email;
    }
    
    // Email générique
    const nom = this.getCandidateName(candidature);
    const email = nom.toLowerCase()
                     .replace(/\s+/g, '.')
                     .replace(/[^a-z.0-9]/g, '');
    
    return `${email}@email.com`;
  }

  /**
   * ✅ Formate le statut d'une candidature
   */
  formatCandidatureStatus(status: string | undefined): string {
    const statusMap: { [key: string]: string } = {
      'Nouveau': 'Nouveau',
      'nouveau': 'Nouveau',
      'Contacté': 'Contacté',
      'contacté': 'Contacté',
      'Entretien': 'Entretien',
      'entretien': 'Entretien',
      'Embauché': 'Embauché',
      'embauché': 'Embauché',
      'Refusé': 'Refusé',
      'refusé': 'Refusé'
    };
    
    return statusMap[status || 'nouveau'] || 'Nouveau';
  }

  /**
   * ✅ Contacter un candidat
   */
  contactCandidate(candidature: Candidature): void {
    const email = this.getCandidateEmail(candidature);
    const nom = this.getCandidateName(candidature);
    const offerTitle = this.getOfferTitleById(candidature.offreEmploiId || 0);
    
    const subject = `Concernant votre candidature - ${offerTitle}`;
    const body = `Bonjour ${nom.split(' ')[0]},\n\nNous avons bien reçu votre candidature pour le poste "${offerTitle}" et souhaitons vous contacter.\n\nCordialement,\nL'équipe BeautyHub`;
    
    const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink);
  }

  /**
   * ✅ Ouvrir les détails complets d'un candidat
   */
  openCandidateDetails(candidature: Candidature): void {
    // Fermer le modal des candidatures
    this.closeCandidaturesModal();
    
    // Ouvrir le modal de détails existant
    this.selectedCandidature = {
      ...candidature,
      nomCandidat: this.getCandidateName(candidature),
      emailCandidat: this.getCandidateEmail(candidature)
    };
  }

  /**
   * ✅ Éditer une offre
   */
  editOffer(offerId: number): void {
    console.log('Édition de l\'offre:', offerId);
    // Implémentez la logique d'édition
  }

  /**
   * ✅ Partager une offre
   */
  shareOffer(offerId: number): void {
    const offer = this.recentOffers.find(o => o.id === offerId);
    if (offer) {
      const shareText = `Découvrez cette offre d'emploi : ${offer.title} à ${offer.location}`;
      if (navigator.share) {
        navigator.share({
          title: offer.title,
          text: shareText,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(shareText).then(() => {
          console.log('Lien copié dans le presse-papier');
        });
      }
    }
  }

  /**
   * ✅ Vérifie s'il y a des filtres actifs
   */
  hasActiveFilters(): boolean {
    return !!(this.currentFilter.searchQuery.trim() || 
              this.currentFilter.status || 
              this.currentFilter.sortBy !== 'date-desc');
  }

  // ==========================================
  // 📋 GESTION DES OFFRES ET CANDIDATURES (ADAPTÉ)
  // ==========================================

  contactCandidat(candidature: any): void {
    const email = candidature.emailCandidat || this.getCandidateEmail(candidature);
    if (email) {
      const subject = `Concernant votre candidature - ${this.getOfferTitleById(candidature.offreEmploiId || 0)}`;
      const nom = candidature.nomCandidat || this.getCandidateName(candidature);
      const body = `Bonjour ${nom.split(' ')[0]},\n\nNous avons bien reçu votre candidature et souhaitons vous contacter.\n\nCordialement,`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }

  navigateTo(section: string): void {
    if (this.currentSection === section) {
      this.currentSection = 'dashboard';
      this.pageTitle = this.getPageTitle('dashboard');
      Object.keys(this.expandedMenuItems).forEach(key => {
        this.expandedMenuItems[key] = false;
      });
    } else {
      this.currentSection = section;
      this.pageTitle = this.getPageTitle(section);
      
      Object.keys(this.expandedMenuItems).forEach(key => {
        this.expandedMenuItems[key] = false;
      });
      
      this.expandedMenuItems[section] = true;
    }
  }

  getPageTitle(section: string): string {
    switch (section) {
      case 'dashboard': return 'Tableau de bord';
      case 'salons': return 'Mes Salons';
      case 'create-salon': return 'Créer un Salon';
      case 'offres': return 'Offres d\'emploi';
      case 'candidatures': return 'Candidatures';
      case 'reservations': return 'Réservations';
      case 'messages': return 'Messages';
      default: return 'Tableau de bord';
    }
  }

  /**
   * ✅ MÉTHODE ADAPTÉE : Charge les offres avec leurs candidatures
   */
  loadOffresWithCandidatures(): void {
    this.loadingCandidatures = true;
    this.candidaturesError = null;

    forkJoin({
      offres: this.offreEmploisService.getMyOffresEmplois(),
      candidatures: this.candidatureService.getAllCandidatures()
    }).subscribe({
      next: (data) => {
        this.offresEmploi = data.offres;
        this.offreCount = data.offres.length;
        
        this.groupCandidaturesByOffer(data.candidatures);
        this.updateOffersCandidaturesCount();
        this.formatRecentOffers();
        
        this.loadingCandidatures = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des offres et candidatures:', error);
        this.candidaturesError = 'Impossible de charger les données.';
        this.loadingCandidatures = false;
        this.loadOffresOnly();
      }
    });
  }

  private loadOffresOnly(): void {
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres: OffreEmploi[]) => {
        this.offresEmploi = offres;
        this.offreCount = offres.length;
        this.formatRecentOffers();
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des offres:', error);
      }
    });
  }

  private groupCandidaturesByOffer(candidatures: Candidature[]): void {
    this.candidatures = candidatures.reduce((acc, candidature) => {
      const offreId = candidature.offreEmploiId;
      if (!acc[offreId]) {
        acc[offreId] = [];
      }
      acc[offreId].push(candidature);
      return acc;
    }, {} as { [offreId: number]: Candidature[] });
  }

  private updateOffersCandidaturesCount(): void {
    this.offresEmploi.forEach(offre => {
      if (offre.id) {
        offre.candidaturesCount = this.candidatures[offre.id]?.length || 0;
      }
    });
  }

  private formatRecentOffers(): void {
    this.recentOffers = this.offresEmploi.slice(0, 10).map(offre => ({
      id: offre.id || 0,
      title: offre.titre || 'Titre non défini',
      location: offre.lieu || 'Lieu non défini',
      date: offre.datePublication || new Date(),
      applicationsCount: offre.candidaturesCount || 0,
      status: this.getOfferStatus(offre)
    }));
    this.filterAndSortOffers();
  }

  getCandidaturesCountForOffer(offerId: number): number {
    return this.candidatures[offerId]?.length || 0;
  }

  getNewCandidaturesCount(offerId: number): number {
    return this.candidatures[offerId]?.filter(c => 
      c.status === 'Nouveau' || !c.status
    ).length || 0;
  }

  /**
   * ✅ MÉTHODE ADAPTÉE : Charge les candidatures pour une offre
   */
  loadCandidaturesForOffer(offerId: number): void {
    if (this.candidatures[offerId] && this.candidatures[offerId].length > 0) {
      return;
    }
    
    this.loadingCandidatures = true;
    this.candidaturesError = null;
    
    this.candidatureService.getCandidaturesByOffre(offerId).subscribe({
      next: (data: Candidature[]) => {
        this.candidatures[offerId] = data;
        this.loadingCandidatures = false;
        
        // Mettre à jour le modal si il est ouvert pour cette offre
        if (this.selectedOfferId === offerId) {
          this.modalCandidatures = data;
        }
        
        const offre = this.offresEmploi.find(o => o.id === offerId);
        if (offre) {
          offre.candidaturesCount = data.length;
        }
        
        const recentOffer = this.recentOffers.find(o => o.id === offerId);
        if (recentOffer) {
          recentOffer.applicationsCount = data.length;
        }
        
        this.filterAndSortOffers();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des candidatures:', error);
        this.candidaturesError = 'Impossible de charger les candidatures.';
        this.loadingCandidatures = false;
      }
    });
  }

  /**
   * ✅ MÉTHODE ADAPTÉE : Charge toutes les candidatures
   */
  loadAllCandidatures(): void {
    this.loadingCandidatures = true;
    this.candidaturesError = null;
    
    this.candidatureService.getAllCandidatures().subscribe({
      next: (data: Candidature[]) => {
        this.groupCandidaturesByOffer(data);
        this.updateOffersCandidaturesCount();
        this.formatRecentOffers();
        this.loadingCandidatures = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des candidatures:', error);
        this.candidaturesError = 'Impossible de charger les candidatures.';
        this.loadingCandidatures = false;
      }
    });
  }

  refreshAllData(): void {
    this.loadOffresWithCandidatures();
  }

  viewCandidatureDetails(candidature: Candidature): void {
    this.selectedCandidature = candidature;
  }

  closeDetailModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.selectedCandidature = null;
    } 
    else if (!event) {
      this.selectedCandidature = null;
    }
  }

  openCandidatures(): void {
    this.resetAllSections();
    
    this.currentSection = 'candidatures';
    this.pageTitle = 'Candidatures';
    this.showCandidatures = true;
    
    if (Object.keys(this.candidatures).length === 0) {
      this.loadAllCandidatures();
    }
  }

  /**
   * ✅ MÉTHODE ADAPTÉE : Met à jour le statut d'une candidature
   */
  updateCandidatureStatus(candidatureId: number, newStatus: string): void {
    let candidatureToUpdate: Candidature | null = null;
    let offreId: number | null = null;
    
    Object.entries(this.candidatures).forEach(([id, candidatures]) => {
      const candidature = candidatures.find(c => c.id === candidatureId);
      if (candidature) {
        candidatureToUpdate = candidature;
        offreId = parseInt(id);
      }
    });
    
    if (candidatureToUpdate && offreId !== null) {
      const updatedCandidature: Candidature = {
        ...(candidatureToUpdate as Candidature),
        status: newStatus
      };
      
      this.candidatureService.updateCandidature(candidatureId, updatedCandidature).subscribe({
        next: (data: Candidature) => {
          const index = this.candidatures[offreId as number].findIndex(c => c.id === candidatureId);
          if (index !== -1) {
            this.candidatures[offreId as number][index] = data;
          }
          
          if (this.selectedCandidature && this.selectedCandidature.id === candidatureId) {
            this.selectedCandidature = data;
          }
        },
        error: (error) => {
          console.error('Erreur lors de la mise à jour du statut:', error);
        }
      });
    }
  }

  closeCandidatures(): void {
    this.showCandidatures = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
  }

  navigateToOffresManager(): void {
    this.resetAllSections();
    
    this.currentSection = 'offres';
    this.pageTitle = 'Offres d\'emploi';
    this.showOffresManager = true;
  }

  closeOffresManager(): void {
    this.showOffresManager = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }
  
  toggleUserMenu(): void {
    this.userMenuOpen = !this.userMenuOpen;
  }
  
  setPeriod(period: string): void {
    this.activePeriod = period;
  }
  
  openSalonsList(): void {
    this.resetAllSections();
    
    this.currentSection = 'salons';
    this.pageTitle = 'Mes Salons';
    this.showSalonsList = true;
    
    console.log('Section salons ouverte');
  }

  private resetAllSections(): void {
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showCandidatures = false;
    this.showOffresManager = false;
    this.showReservations = false;
    this.showServicesList = false;
    this.showCandidaturesModal = false;
  }

  getOfferTitleById(offerId: number): string {
    const offer = this.recentOffers.find(o => o.id === offerId);
    return offer ? offer.title : `Offre #${offerId}`;
  }

  getObjectKeys(obj: any): any[] {
    return Object.keys(obj);
  }

  isObjectEmpty(obj: any): boolean {
    return obj && Object.keys(obj).length === 0;
  }

  toggleCandidaturesList(offerId: number | null): void {
    if (this.expandedOfferId === offerId) {
      this.expandedOfferId = null;
    } else {
      this.expandedOfferId = offerId;
      
      if (offerId !== null) {
        this.loadCandidaturesForOffer(offerId);
      }
    }
  }

  closeSalonsList(): void {
    this.showSalonsList = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
    this.loadSalons();
  }

  openCreationForm(): void {
    this.resetAllSections();
    
    this.currentSection = 'create-salon';
    this.pageTitle = 'Créer un Salon';
    this.showCreationForm = true;
  }

  closeCreationForm(): void {
    this.showCreationForm = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
    this.loadSalons();
  }
  
  openOffreEmploiForm(): void {
    this.resetAllSections();
    
    this.currentSection = 'offres';
    this.pageTitle = 'Publier une Offre';
    this.showOffreEmploiForm = true;
  }

  closeOffreEmploiForm(): void {
    this.showOffreEmploiForm = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
    this.loadOffresWithCandidatures();
  }
  
  loadServices(): void {
    const services = this.salonService.getEmployeurServices();
  }
  
  loadSalons(): void {
    this.salonService.getEmployeurSalons()
      .subscribe({
        next: (data: any[]) => {
          this.salons = data.map(salon => this.processSalonData(salon));
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement des salons', err);
          this.salons = [];
        }
      });
  }

  processSalonData(salon: any): Salon {
    return {
      id: salon.id || 0,
      nom: salon.nom || salon.name || 'Salon sans nom',
      imageUrl: salon.imageUrl || salon.photo || 'assets/images/salon-placeholder.jpg',
      adresse: salon.adresse || salon.address || 'Adresse non définie',
      rating: salon.rating || salon.note || 0,
      reviewCount: salon.reviewCount || salon.nombreAvis || 0
    };
  }
  
  getOfferStatus(offre: OffreEmploi): string {
    const now = new Date();
    const expirationDate = offre.dateExpiration ? new Date(offre.dateExpiration) : null;
    
    if (offre.estFermee) {
      return 'Closed';
    } else if (expirationDate && expirationDate < now) {
      return 'Expired';
    } else if (offre.estPubliee) {
      return 'Active';
    } else {
      return 'Pending';
    }
  }
  
  hasHalfStar(rating: number): boolean {
    if (!rating || isNaN(rating)) return false;
    return rating % 1 >= 0.5 && Math.floor(rating) < 5;
  }
  
  logout(): void {
    console.log('Déconnexion...');
  }
  
  get username(): string {
    return this.headerService.username() || 'Utilisateur';
  }

  // ===== MÉTHODES DE FILTRAGE =====
  filterAndSortOffers(): void {
    let filtered = [...this.recentOffers];

    // Filtrage par recherche
    if (this.currentFilter.searchQuery.trim()) {
      const query = this.currentFilter.searchQuery.toLowerCase();
      filtered = filtered.filter(offer => 
        offer.title.toLowerCase().includes(query) ||
        offer.location.toLowerCase().includes(query)
      );
    }

    // Filtrage par statut
    if (this.currentFilter.status) {
      filtered = filtered.filter(offer => 
        offer.status.toLowerCase() === this.currentFilter.status.toLowerCase()
      );
    }

    // Tri
    switch (this.currentFilter.sortBy) {
      case 'date-desc':
        filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
      case 'date-asc':
        filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case 'applications':
        filtered.sort((a, b) => b.applicationsCount - a.applicationsCount);
        break;
      case 'title':
        filtered.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    this.filteredOffers = filtered;
  }

  onFilterChange(filterType: string, value: string): void {
    switch (filterType) {
      case 'search':
        this.currentFilter.searchQuery = value;
        break;
      case 'status':
        this.currentFilter.status = value;
        break;
      case 'sort':
        this.currentFilter.sortBy = value;
        break;
    }
    this.filterAndSortOffers();
  }

  setViewMode(mode: 'cards' | 'list'): void {
    this.viewMode = mode;
  }

  resetFilters(): void {
    this.currentFilter = {
      status: '',
      sortBy: 'date-desc',
      searchQuery: ''
    };
    this.filterAndSortOffers();
  }

  // ===== MÉTHODES UTILITAIRES SUPPLÉMENTAIRES =====

  /**
   * ✅ Export simple des candidatures avec votre service
   */
  exportCandidatures(): void {
    this.candidatureService.getAllCandidatures().subscribe({
      next: (candidatures) => {
        this.candidatureService.exportToCsv(candidatures);
        this.showNotification('Export réussi', 'success');
      },
      error: (error) => {
        console.error('Erreur lors de l\'export:', error);
        this.showNotification('Erreur lors de l\'export', 'error');
      }
    });
  }

  /**
   * ✅ Recherche dans les candidatures
   */
  searchCandidatures(query: string): void {
    if (query.length < 2) return;
    
    this.candidatureService.searchCandidatures(query).subscribe({
      next: (results) => {
        console.log('Résultats de recherche:', results);
        // Ici vous pouvez mettre à jour l'affichage avec les résultats
      },
      error: (error) => {
        console.error('Erreur de recherche:', error);
      }
    });
  }
}