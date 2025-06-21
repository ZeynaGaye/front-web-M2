

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
import { forkJoin } from 'rxjs';
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
  showReservations = false; // ⭐ NOUVEAU
  
  // ===== STATISTIQUES ET DONNÉES =====
  offreCount = 0;
  newMessages = 3; // À connecter avec un service de messages
  visitorStats = 128; // À connecter avec un service d'analytics
  reservationStats = 56; // À connecter avec un service de réservations
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
  }

  // ==========================================
  // 📅 NOUVELLES MÉTHODES POUR LES RÉSERVATIONS
  // ==========================================

  /**
   * ✅ Ouvre la section réservations
   */
  openReservations(): void {
    this.currentSection = 'reservations';
    this.pageTitle = 'Réservations';
    this.showReservations = true;
    
    // Fermer les autres sections
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showCandidatures = false;
    this.showOffresManager = false;
    
    console.log('Section réservations ouverte');
  }

  /**
   * ✅ Ferme la section réservations
   */
  closeReservations(): void {
    this.showReservations = false;
    this.navigateTo('dashboard');
    console.log('Section réservations fermée');
  }

  /**
   * ✅ Reçoit les mises à jour de stats depuis le composant réservations
   */
  onReservationStatsUpdated(stats: any): void {
    this.pendingReservationsCount = stats.pendingReservationsCount || 0;
    this.confirmedReservationsCount = stats.confirmedReservationsCount || 0;
    this.todayReservationsCount = stats.todayReservationsCount || 0;
    this.totalRevenue = stats.totalRevenue || 0;
    
    // Mettre à jour les stats du dashboard si nécessaire
    this.reservationStats = stats.confirmedReservationsCount + stats.pendingReservationsCount;
    
    console.log('Stats réservations mises à jour:', stats);
  }

  /**
   * ✅ Reçoit les notifications de changement de réservation
   */
  onReservationUpdated(event: any): void {
    console.log('Réservation mise à jour:', event);
    
    // Ici vous pouvez ajouter des notifications toast
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

  /**
   * ✅ Affiche une notification (à adapter selon votre système)
   */
  private showNotification(message: string, type: 'success' | 'warning' | 'error' = 'success'): void {
    console.log(`${type.toUpperCase()}: ${message}`);
    // Ici vous pouvez intégrer votre système de notifications
    // Exemple avec ngx-toastr :
    // this.toastr.success(message);
  }

  // ==========================================
  // 📅 MÉTHODES EXISTANTES MODIFIÉES
  // ==========================================

  /**
   * ✅ Modifiée pour inclure les réservations
   */
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

  /**
   * ✅ Modifiée pour inclure les réservations
   */
  getPageTitle(section: string): string {
    switch (section) {
      case 'dashboard': return 'Tableau de bord';
      case 'salons': return 'Mes Salons';
      case 'create-salon': return 'Créer un Salon';
      case 'offres': return 'Offres d\'emploi';
      case 'candidatures': return 'Candidatures';
      case 'reservations': return 'Réservations'; // ⭐ NOUVEAU
      case 'messages': return 'Messages';
      default: return 'Tableau de bord';
    }
  }

  /**
   * ✅ Modifiée pour inclure les réservations dans expandedMenuItems
   */
  expandedMenuItems: { [key: string]: boolean } = {
    dashboard: false,
    salons: false,
    createSalon: false,
    offres: false,
    candidatures: false,
    reservations: false, // ⭐ NOUVEAU
    messages: false
  };

  // ==========================================
  // 📅 MÉTHODES EXISTANTES (INCHANGÉES)
  // ==========================================

  /**
   * NOUVELLE MÉTHODE : Charge les offres avec leurs candidatures associées
   */
  loadOffresWithCandidatures(): void {
    this.loadingCandidatures = true;
    this.candidaturesError = null;

    // Charger les offres et toutes les candidatures en parallèle
    forkJoin({
      offres: this.offreEmploisService.getMyOffresEmplois(),
      candidatures: this.candidatureService.getAllCandidatures()
    }).subscribe({
      next: (data) => {
        this.offresEmploi = data.offres;
        this.offreCount = data.offres.length;
        
        // Grouper les candidatures par offre
        this.groupCandidaturesByOffer(data.candidatures);
        
        // Mettre à jour le nombre de candidatures pour chaque offre
        this.updateOffersCandidaturesCount();
        
        // Formater les offres récentes pour l'affichage
        this.formatRecentOffers();
        
        this.loadingCandidatures = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des offres et candidatures:', error);
        this.candidaturesError = 'Impossible de charger les données.';
        this.loadingCandidatures = false;
        
        // Fallback: charger au moins les offres
        this.loadOffresOnly();
      }
    });
  }

  /**
   * Méthode de fallback si le chargement complet échoue
   */
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

  /**
   * Groupe les candidatures par offre d'emploi
   */
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

  /**
   * Met à jour le nombre de candidatures pour chaque offre
   */
  private updateOffersCandidaturesCount(): void {
    this.offresEmploi.forEach(offre => {
      if (offre.id) {
        offre.candidaturesCount = this.candidatures[offre.id]?.length || 0;
      }
    });
  }

  /**
   * Formate les offres récentes pour l'affichage
   */
  private formatRecentOffers(): void {
    this.recentOffers = this.offresEmploi.slice(0, 10).map(offre => ({
      id: offre.id || 0,
      title: offre.titre || 'Titre non défini',
      location: offre.lieu || 'Lieu non défini',
      date: offre.datePublication || new Date(),
      applicationsCount: offre.candidaturesCount || 0, // Utilise le nombre réel
      status: this.getOfferStatus(offre)
    }));
  }

  /**
   * Retourne le nombre réel de candidatures pour une offre
   */
  getCandidaturesCountForOffer(offerId: number): number {
    return this.candidatures[offerId]?.length || 0;
  }

  /**
   * Retourne le nombre de nouvelles candidatures pour une offre
   */
  getNewCandidaturesCount(offerId: number): number {
    return this.candidatures[offerId]?.filter(c => 
      c.status === 'Nouveau' || !c.status
    ).length || 0;
  }

  /**
   * MÉTHODE AMÉLIORÉE : Charge les candidatures d'une offre spécifique
   */
  loadCandidaturesForOffer(offerId: number): void {
    // Si les candidatures sont déjà chargées, pas besoin de refaire l'appel
    if (this.candidatures[offerId] && this.candidatures[offerId].length > 0) {
      return;
    }
    
    this.loadingCandidatures = true;
    this.candidaturesError = null;
    
    this.candidatureService.getCandidaturesByOffre(offerId).subscribe({
      next: (data: Candidature[]) => {
        this.candidatures[offerId] = data;
        this.loadingCandidatures = false;
        
        // Mettre à jour le count dans l'offre correspondante
        const offre = this.offresEmploi.find(o => o.id === offerId);
        if (offre) {
          offre.candidaturesCount = data.length;
        }
        
        // Mettre à jour les offres récentes aussi
        const recentOffer = this.recentOffers.find(o => o.id === offerId);
        if (recentOffer) {
          recentOffer.applicationsCount = data.length;
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des candidatures:', error);
        this.candidaturesError = 'Impossible de charger les candidatures.';
        this.loadingCandidatures = false;
      }
    });
  }

  /**
   * MÉTHODE AMÉLIORÉE : Charge toutes les candidatures et met à jour les compteurs
   */
  loadAllCandidatures(): void {
    this.loadingCandidatures = true;
    this.candidaturesError = null;
    
    this.candidatureService.getAllCandidatures().subscribe({
      next: (data: Candidature[]) => {
        this.groupCandidaturesByOffer(data);
        this.updateOffersCandidaturesCount();
        this.formatRecentOffers(); // Remet à jour les offres récentes
        this.loadingCandidatures = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des candidatures:', error);
        this.candidaturesError = 'Impossible de charger les candidatures.';
        this.loadingCandidatures = false;
      }
    });
  }

  /**
   * Recharge toutes les données (offres + candidatures)
   */
  refreshAllData(): void {
    this.loadOffresWithCandidatures();
  }

  // ===== MÉTHODES EXISTANTES (inchangées) =====

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
    this.currentSection = 'candidatures';
    this.pageTitle = 'Candidatures';
    this.showCandidatures = true;
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showOffresManager = false;
    this.showReservations = false; // ⭐ AJOUTÉ
    
    // Si les candidatures ne sont pas encore chargées, les charger
    if (Object.keys(this.candidatures).length === 0) {
      this.loadAllCandidatures();
    }
  }

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
          
          // Mettre à jour la candidature sélectionnée si c'est la même
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
  }

  navigateToOffresManager(): void {
    this.currentSection = 'offres';
    this.pageTitle = 'Offres d\'emploi';
    this.showOffresManager = true;
    
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showCandidatures = false;
    this.showReservations = false; // ⭐ AJOUTÉ
  }

  closeOffresManager(): void {
    this.showOffresManager = false;
    this.navigateTo('dashboard');
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
    if (this.showSalonsList) {
      this.showSalonsList = false;
      this.navigateTo('dashboard');
    } else {
      this.currentSection = 'salons';
      this.pageTitle = 'Mes Salons';
      this.showSalonsList = true;
      this.showCreationForm = false;
      this.showOffreEmploiForm = false;
      this.showCandidatures = false;
      this.showOffresManager = false;
      this.showReservations = false; // ⭐ AJOUTÉ
      
      Object.keys(this.expandedMenuItems).forEach(key => {
        this.expandedMenuItems[key] = false;
      });
      this.expandedMenuItems['salons'] = true;
    }
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
    this.loadSalons();
  }

  openCreationForm(): void {
    this.currentSection = 'create-salon';
    this.pageTitle = 'Créer un Salon';
    this.showCreationForm = true;
    this.showSalonsList = false;
    this.showOffreEmploiForm = false;
    this.showReservations = false; // ⭐ AJOUTÉ
  }

  closeCreationForm(): void {
    this.showCreationForm = false;
    this.loadSalons();
  }
  
  openOffreEmploiForm(): void {
    this.currentSection = 'offres';
    this.pageTitle = 'Publier une Offre';
    this.showOffreEmploiForm = true;
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showReservations = false; // ⭐ AJOUTÉ
  }

  closeOffreEmploiForm(): void {
    this.showOffreEmploiForm = false;
    // Recharger les offres avec les candidatures après création d'une nouvelle offre
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

  // ===== MÉTHODES AUXILIAIRES =====
  
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
}