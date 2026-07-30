import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, EventEmitter, Inject, inject, OnInit, Output, PLATFORM_ID, ViewEncapsulation } from '@angular/core';
import { DomSanitizer, SafeStyle } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { SalonService } from '../../../shared/services/salons/salons.service';
import { Router, RouterModule } from '@angular/router';
import { SalonComponent } from '../salon/salon.component';
import { HeaderService } from '../../../shared/services/header/header.service';
import { MesSalonsComponent } from "../mes-salons/mes-salons.component";
import { OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { FormsModule } from '@angular/forms';
import { CandidatureService } from '../../../freelance/services/candidatures.service';
import { Candidature } from '../../../freelance/interfaces/candidatures.interface';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { ReservationsComponent } from '../../../shared/components/reservations/reservations.component';
import { NotificationService, Notification } from '../../../shared/services/notification/notification.service';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';
import { AvisRecusComponent } from "../../../shared/components/avis-recus/avis-recus.component";
import { MatTabsModule } from "@angular/material/tabs";
import { MatSelectModule } from '@angular/material/select';
import { MatDividerModule } from '@angular/material/divider';
import { ProfileManagementComponent } from "../../../shared/components/profile-management/profile-management.component";
import { NotificationListComponent } from '../../../shared/components/notification-list/notification-list.component';
import { AuthService } from '../../../core/servces/auth.service';
import { PlaceholderImageService } from '../../../shared/services/placeholder-image.service';
import { OffresManagerComponent } from "../offres-manager/offres-manager.component";
import { CandidaturesManagerComponent } from "../candidatures-manager/candidatures-manager.component";
import { HorairesManagerComponent } from '../../../shared/components/horaires-manager/horaires-manager.component';
import { MonEquipeComponent } from '../mon-equipe/mon-equipe.component';


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
    MatBadgeModule,
    MatMenuModule,
    RouterModule,
    FormsModule,
    SalonComponent,
    // OffreEmploisComponent,
    MesSalonsComponent,
    ReservationsComponent,
    AvisRecusComponent,
    MatTabsModule,
    MatSelectModule,
    MatDividerModule,
    ProfileManagementComponent,
    NotificationListComponent,
    OffresManagerComponent,
    HorairesManagerComponent,
    CandidaturesManagerComponent,
    MonEquipeComponent
],
  templateUrl: './home-employee.component.html',
  styleUrl: './home-employee.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class HomeEmployeeComponent implements OnInit {
  // ===== PROPRIÉTÉS PRINCIPALES =====
  sidebarOpen = true;
  showCreationForm = false;
  showOffreEmploiForm = false;
  showSalonsList = false;
  showServicesList = false;
  showCandidatures = false;
  showOffresManager = false;
  showReservations = false;
  showAvis = false;
  showAvailabilityManager = false;
  showMonEquipe = false;
  selectedSalonForAvailability: Salon | null = null;

  //  NOUVELLES PROPRIÉTÉS POUR L'AFFICHAGE OPTIMISÉ
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
  
  //  NOUVELLES STATS RÉSERVATIONS
  pendingReservationsCount = 0; // Pour le badge sidebar
  confirmedReservationsCount = 0;
  todayReservationsCount = 0;
  totalRevenue = 0;
  salonEmployees: any[] = [];
  
  // ===== PARAMÈTRES UI =====
  currentSection = 'dashboard';
  pageTitle = 'Tableau de bord';
  activePeriod = 'month';
  userMenuOpen = false;
  
  //  Notifications
  notifications: Notification[] = [];
  unreadNotifications = 0;

  //  Availability and appointments
  formattedAverageRating = '4.5';
  upcomingAppointments: any[] = [];
  
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
  

  // ===== PROPRIÉTÉS POUR L'AUTHENTIFICATION =====
  currentUser: any = null;
  isAuthenticated = false;
  userFullName = '';
  userEmail = '';
  userRole = '';
  userPhotoUrl = '';
  showProfile = false;
  isLoadingStats = false;
  recentActivities: any[] = [];

  private isBrowser: boolean;

  constructor(
    private salonService: SalonService,
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService,
    private router: Router,
    private notificationService: NotificationService,
    private authService: AuthService,
    private reservationService: ReservationService,
    private placeholderSvc: PlaceholderImageService,
    private sanitizer: DomSanitizer,
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    this.loadUserProfile();
    this.initRecentActivities();
    if (this.isBrowser) {
      this.loadNotifications();
      this.loadSalons();
      this.loadOffresWithCandidatures();
    }
    this.filteredOffers = [...this.recentOffers];
  }

  // ===== MÉTHODES D'AUTHENTIFICATION =====
  loadUserProfile(): void {
    this.authService.currentUser$.subscribe({
      next: (user: { prenom: any; nom: any; email: string; role: string; photoProfile: string; }) => {
        if (user) {
          this.currentUser = user;
          this.isAuthenticated = true;
          this.userFullName = `${user.prenom} ${user.nom}`;
          this.userEmail = user.email;
          this.userRole = user.role;
          this.userPhotoUrl = this.resolveUserPhotoUrl(user.photoProfile);
        } else {
          this.isAuthenticated = false;
          this.currentUser = null;
        }
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement du profil utilisateur:', error);
        this.isAuthenticated = false;
      }
    });
  }

  loadNotifications(): void {

    
    // Charger toutes les notifications
    this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.initRecentActivities();

      },
      error: (error) => {
        console.error(' Erreur lors du chargement des notifications:', error);
        this.notifications = [];
      }
    });

    // Charger le compteur de notifications non lues
    this.notificationService.getUnreadCount().subscribe({
      next: (countData) => {
        this.unreadNotifications = countData.count;

      },
      error: (error) => {
        console.error(' Erreur lors du chargement du compteur:', error);
        this.unreadNotifications = 0;
      }
    });
  }

  initRecentActivities(): void {
    const activities: { date: Date; icon: string; title: string; description: string; time: string }[] = [];

    // 1. Depuis les notifications
    for (const n of this.notifications) {
      activities.push({
        date: new Date(n.dateNotif),
        icon: this.getActivityIcon(n.message),
        title: n.message,
        description: n.reservation?.serviceSalon?.nom || '',
        time: ''
      });
    }

    // 2. Depuis les candidatures (toutes offres confondues)
    for (const offreId of Object.keys(this.candidatures)) {
      const offre = this.offresEmploi.find(o => o.id === +offreId);
      for (const c of this.candidatures[+offreId]) {
        const rawDate = c.dateCandidature || c.dateCreation || c.datePostulation;
        const date = rawDate ? new Date(rawDate) : new Date();
        const nom = [c.freelancePrenom, c.freelanceNom].filter(Boolean).join(' ') || 'Un candidat';
        activities.push({
          date,
          icon: 'person_add',
          title: `Nouvelle candidature de ${nom}`,
          description: offre?.titre || `Offre #${offreId}`,
          time: ''
        });
      }
    }

    // Trier par date desc, prendre les 5 plus récentes
    this.recentActivities = activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 5)
      .map(a => ({ ...a, time: this.timeAgo(a.date.toISOString()) }));
  }

  private getActivityIcon(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('réservation') || msg.includes('reservation')) return 'event';
    if (msg.includes('annul')) return 'cancel';
    if (msg.includes('termin')) return 'check_circle';
    if (msg.includes('offre') || msg.includes('emploi')) return 'work';
    if (msg.includes('candidature')) return 'person_add';
    if (msg.includes('message')) return 'chat_bubble';
    return 'notifications';
  }

  private timeAgo(dateString: string): string {
    const diffMs = new Date().getTime() - new Date(dateString).getTime();
    const mins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMs / 3600000);
    const days = Math.floor(diffMs / 86400000);
    if (mins < 1) return "À l'instant";
    if (mins < 60) return `Il y a ${mins}m`;
    if (hours < 24) return `Il y a ${hours}h`;
    if (days === 1) return 'Hier';
    return `Il y a ${days}j`;
  }

  loadUpcomingAppointments(): void {
    // Chargement des vraies réservations de l'employeur
    this.reservationService.getEmployeurReservations().subscribe({
      next: (reservations: any[]) => {
        const today = new Date();
        const monthAgo = new Date();
        monthAgo.setDate(today.getDate() - 30);

        // Calcul du revenu mensuel (TERMINEE + CONFIRMEE dans les 30 derniers jours)
        this.totalRevenue = reservations
          .filter((r: any) => {
            const statut = (r.status || r.statut || '').toUpperCase();
            const date = new Date(r.datePrestation || r.dateReservation || r.date);
            return (statut === 'TERMINEE' || statut === 'CONFIRMEE') && date >= monthAgo;
          })
          .reduce((sum: number, r: any) => {
            return sum + (r.prixTotal ?? r.servicePrixMax ?? r.servicePrixMin ?? 0);
          }, 0);

        // Filtrer les réservations confirmées et à venir
        const upcomingReservations = reservations.filter((reservation: any) => {
          const reservationDate = new Date(reservation.datePrestation || reservation.dateReservation || reservation.date);
          const statut = (reservation.status || reservation.statut || '').toUpperCase();
          return reservationDate >= today && (statut === 'CONFIRMEE' || statut === 'CONFIRME' || statut === 'EN_ATTENTE' || statut === 'EN_ATTENTE_PAIEMENT');
        });

        // Trier par date
        upcomingReservations.sort((a: any, b: any) => {
          const da = new Date(a.datePrestation || a.dateReservation || a.date).getTime();
          const db = new Date(b.datePrestation || b.dateReservation || b.date).getTime();
          return da - db;
        });

        // Formater pour l'affichage
        this.upcomingAppointments = upcomingReservations.map((reservation: any) => ({
          id: reservation.id,
          serviceName: reservation.serviceName || reservation.serviceNom || 'Service non spécifié',
          clientName: `${reservation.clientPrenom || ''} ${reservation.clientNom || ''}`.trim() || 'Client non spécifié',
          date: new Date(reservation.datePrestation || reservation.dateReservation || reservation.date),
          time: reservation.heureDebut || reservation.heure,
          salonName: reservation.salonName || reservation.salonNom || 'Salon non spécifié',
          status: reservation.status || reservation.statut
        }));

        // Mettre à jour les statistiques
        this.reservationStats = this.upcomingAppointments.length;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des réservations:', error);
        this.upcomingAppointments = [];
        this.reservationStats = 0;
      }
    });

    // Charger la note moyenne de tous les salons de l'employeur
    this.loadAverageRating();
  }

  loadAverageRating(): void {
    // Récupérer tous les avis de tous les salons de l'employeur
    this.reservationService.getSalonAvis().subscribe({
      next: (avis: any[]) => {
        if (avis && avis.length > 0) {
          // Calculer la moyenne de tous les avis de tous les salons
          const totalRating = avis.reduce((sum: number, avisItem: any) => sum + (avisItem.note || 0), 0);
          const averageRating = totalRating / avis.length;
          this.formattedAverageRating = averageRating.toFixed(1);
        } else {
          this.formattedAverageRating = 'N/A';
        }

      },
      error: (error: any) => {
        console.error('Erreur lors du chargement de la note moyenne:', error);
        this.formattedAverageRating = 'N/A';
      }
    });
  }



  navigateToProfile(): void {
    this.navigateTo('profile');
  }

  closeProfile(): void {
    this.navigateTo('dashboard');
  }

  onNotificationRead(): void {
    this.unreadNotifications = this.notifications.filter(n => !n.vue).length;
  }

  goToMainPage(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ==========================================
  //  GESTION DES RÉSERVATIONS
  // ==========================================

  openReservations(): void {
    this.resetAllSections();
    this.currentSection = 'reservations';
    this.pageTitle = 'Réservations & Avis';
    this.showReservations = true;

  }

  openAvis(): void {
    this.resetAllSections();
    this.currentSection = 'avis';
    this.showAvis = true;
  }

  closeReservations(): void {
    this.navigateTo('dashboard');

  }

  onReservationStatsUpdated(stats: any): void {
    this.pendingReservationsCount = stats.pendingReservationsCount || 0;
    this.confirmedReservationsCount = stats.confirmedReservationsCount || 0;
    this.todayReservationsCount = stats.todayReservationsCount || 0;
    this.totalRevenue = stats.totalRevenue || 0;
    this.reservationStats = stats.confirmedReservationsCount + stats.pendingReservationsCount;

  }

  onReservationUpdated(event: any): void {

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

  }

  // ==========================================
  //  GESTION DES CANDIDATURES 
  // ==========================================

  /**
   *  Ouvre le modal des candidatures pour une offre spécifique
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
   *  Ferme le modal des candidatures
   */
  closeCandidaturesModal(event?: MouseEvent): void {
    if (event && event.target !== event.currentTarget) return;
    
    this.showCandidaturesModal = false;
    this.selectedOfferId = null;
    this.selectedOfferTitle = '';
    this.modalCandidatures = [];
  }

  /**
   *  Retourne les initiales d'un candidat
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
   *  Retourne le nom du candidat depuis les données disponibles
   */
  getCandidateName(candidature: Candidature): string {
    // Champs plats (format le plus courant depuis l'API)
    if (candidature.freelancePrenom || candidature.freelanceNom) {
      return [candidature.freelancePrenom, candidature.freelanceNom].filter(Boolean).join(' ');
    }
    // Objet imbriqué freelance
    if (candidature.freelance) {
      const p = candidature.freelance.prenom || '';
      const n = candidature.freelance.nom || '';
      if (p || n) return `${p} ${n}`.trim();
    }
    // Champ générique nomCandidat
    if (candidature.nomCandidat) return candidature.nomCandidat;

    return `Candidat #${candidature.id || 'X'}`;
  }

  /**
   *  Retourne l'email du candidat depuis les données disponibles
   */
  getCandidateEmail(candidature: Candidature): string {
    return candidature.freelanceEmail
      || candidature.freelance?.email
      || candidature.emailCandidat
      || '';
  }

  /**
   *  Formate le statut d'une candidature
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
   *  Contacter un candidat
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
   *  Ouvrir les détails complets d'un candidat
   */
  openCandidateDetails(candidature: Candidature): void {
    // Fermer le modal des candidatures
    this.closeCandidaturesModal();
    
    // Ouvrir le modal de détails existant
    this.selectedCandidature = candidature;
  }

  /**
   *  Éditer une offre
   */
  editOffer(offerId: number): void {

    this.openOffreEmploiForm();
    // TODO: Charger les données de l'offre pour édition
  }

  /**
   *  Supprimer une offre
   */
  deleteOffer(offerId: number): void {
    const offer = this.recentOffers.find(o => o.id === offerId);
    if (offer && confirm(`Êtes-vous sûr de vouloir supprimer l'offre "${offer.title}" ?`)) {
      this.offreEmploisService.deleteOffreEmploi(offerId).subscribe({
        next: () => {
          this.showNotification('Offre supprimée avec succès', 'success');
          this.loadOffresWithCandidatures();
        },
        error: (error: any) => {
          console.error('Erreur lors de la suppression:', error);
          this.showNotification('Erreur lors de la suppression', 'error');
        }
      });
    }
  }

  /**
   *  Partager une offre
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

        });
      }
    }
  }

  /**
   *  Vérifie s'il y a des filtres actifs
   */
  hasActiveFilters(): boolean {
    return !!(this.currentFilter.searchQuery.trim() || 
              this.currentFilter.status || 
              this.currentFilter.sortBy !== 'date-desc');
  }

  // ==========================================
  //  GESTION DES OFFRES ET CANDIDATURES (ADAPTÉ)
  // ==========================================

  contactCandidat(candidature: Candidature): void {
    const email = this.getCandidateEmail(candidature);
    if (email && email !== 'Email non disponible') {
      const subject = `Concernant votre candidature - ${this.getOfferTitleById(candidature.offreEmploiId || 0)}`;
      const nom = this.getCandidateName(candidature);
      const body = `Bonjour ${nom.split(' ')[0]},\n\nNous avons bien reçu votre candidature et souhaitons vous contacter.\n\nCordialement,`;
      window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    }
  }

  navigateTo(section: string): void {
    this.resetAllSections();
    
    switch (section) {
      case 'dashboard':
        this.currentSection = 'dashboard';
        this.pageTitle = 'Tableau de bord';
        break;
      case 'profile':
        this.currentSection = 'profile';
        this.pageTitle = 'Mon Profil';
        this.showProfile = true;
        break;
      case 'salons':
        this.openSalonsList();
        break;
      case 'reservations':
        this.openReservations();
        break;
      case 'offres':
        this.navigateToOffresManager();
        break;
      default:
        this.currentSection = 'dashboard';
        this.pageTitle = 'Tableau de bord';
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
   *  MÉTHODE ADAPTÉE : Charge les offres avec leurs candidatures
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
        this.initRecentActivities();

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
   *  MÉTHODE ADAPTÉE : Charge les candidatures pour une offre
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
   *  MÉTHODE ADAPTÉE : Charge toutes les candidatures
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
   *  MÉTHODE ADAPTÉE : Met à jour le statut d'une candidature
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
    this.resetAllSections();
    
    this.currentSection = 'salons';
    this.pageTitle = 'Mes Salons';
    this.showSalonsList = true;
    

  }

  private resetAllSections(): void {
    this.showSalonsList = false;
    this.showCreationForm = false;
    this.showOffreEmploiForm = false;
    this.showCandidatures = false;
    this.showOffresManager = false;
    this.showReservations = false;
    this.showAvis = false;
    this.showServicesList = false;
    this.showCandidaturesModal = false;
    this.showAvailabilityManager = false;
    this.showMonEquipe = false;
    this.showProfile = false;
    this.currentSection = 'dashboard';
    this.pageTitle = 'Tableau de bord';
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
    this.navigateTo('dashboard');
    this.loadSalons();
  }

  preSelectEmployeeId: number | null = null;

  openMonEquipe(): void {
    this.resetAllSections();
    this.currentSection = 'equipe';
    this.pageTitle = 'Mon équipe';
    this.showMonEquipe = true;
  }

  openEquipeForEmployee(employee: any): void {
    this.preSelectEmployeeId = employee.id ?? null;
    this.openMonEquipe();
  }

  closeMonEquipe(): void {
    this.navigateTo('dashboard');
  }

  openCreationForm(): void {
    this.resetAllSections();
    
    this.currentSection = 'create-salon';
    this.pageTitle = 'Créer un Salon';
    this.showCreationForm = true;
  }

  closeCreationForm(): void {
    this.navigateTo('dashboard');
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
    // TODO: Implémenter le chargement des services
    // const services = this.salonService.getEmployeurServices();
  }
  
  loadSalons(): void {
    this.salonService.getEmployeurSalons()
      .subscribe({
        next: (data: any[]) => {
          this.salons = data.map(salon => this.processSalonData(salon));
          this.loadUpcomingAppointments();
          this.loadSalonEmployees();
        },
        error: (err: any) => {
          console.error('Erreur lors du chargement des salons', err);
          this.salons = [];
          this.loadUpcomingAppointments();
        }
      });
  }

  private loadSalonEmployees(): void {
    if (!this.salons.length) return;

    const calls = this.salons.map(salon =>
      this.http.get<any>(`http://localhost:8081/api/employes/salon/${salon.id}/actifs`).pipe(
        map((page: any) =>
          (page.content || []).map((e: any) => ({
            id: e.id,
            name: e.nomComplet || `${e.prenom || ''} ${e.nom || ''}`.trim(),
            initials: (e.nomComplet || `${e.prenom || ''} ${e.nom || ''}`)
              .split(' ').filter(Boolean).map((p: string) => p[0]).join('').toUpperCase().slice(0, 2),
            specialty: e.specialites?.length
              ? [...e.specialites][0].toString().toLowerCase().replace(/_/g, ' ')
              : '',
            salon: salon.nom,
            rating: 4.5,
            status: e.statut === 'ACTIF' ? 'EN SERVICE' : (e.statut || 'EN SERVICE')
          }))
        ),
        catchError(() => of([]))
      )
    );

    forkJoin(calls).pipe(catchError(() => of([]))).subscribe((results: any[][]) => {
      this.salonEmployees = results.flat();
    });
  }

  processSalonData(salon: any): Salon {
    return {
      ...salon,
      id: salon.id || 0,
      nom: salon.nom || salon.name || 'Salon sans nom',
      imageUrl: salon.imageUrl || salon.photoProfilUrl || salon.photo || '',
      adresse: salon.adresse || salon.address || 'Adresse non définie',
      rating: salon.rating || salon.note || 0,
      reviewCount: salon.reviewCount || salon.nombreAvis || 0
    };
  }

  onSalonImgError(event: Event, salon: Salon): void {
    const img = event.target as HTMLImageElement;
    img.onerror = null;
    img.src = this.placeholderSvc.getPlaceholder(salon.id, 'salon');
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
   *  Export simple des candidatures avec votre service
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
   *  Recherche dans les candidatures
   */
  searchCandidatures(query: string): void {
    if (query.length < 2) return;
    
    this.candidatureService.searchCandidatures(query).subscribe({
      next: (results) => {

        // Ici vous pouvez mettre à jour l'affichage avec les résultats
      },
      error: (error) => {
        console.error('Erreur de recherche:', error);
      }
    });
  }

  // ===== AVAILABILITY MANAGEMENT METHODS =====
  
  openAvailabilityManager(): void {
    this.resetAllSections();
    this.showAvailabilityManager = true;
  }

  selectSalonForAvailability(salon: Salon): void {
    this.selectedSalonForAvailability = salon;
  }

  onHoraireError(event: any): void {
    console.error('Erreur horaire:', event);
    this.showNotification('Erreur lors de la gestion des horaires', 'error');
  }

  viewAppointmentDetails(appointmentId: number): void {

    // Pour l'instant, naviguer vers la section réservations pour voir tous les détails
    this.openReservations();
  }

  // ===== GETTERS DASHBOARD =====

  private resolveUserPhotoUrl(photo: string): string {
    if (!photo) return '';
    if (photo.startsWith('http')) return photo;
    if (photo.startsWith('/uploads/')) return `http://localhost:8081${photo}`;
    if (photo.startsWith('assets/')) return photo;
    return `http://localhost:8081/uploads/${photo}`;
  }

  get heroStyle(): SafeStyle {
    if (this.userPhotoUrl) {
      return this.sanitizer.bypassSecurityTrustStyle(
        `background-image: linear-gradient(to right, rgba(20,32,42,0.88) 35%, rgba(20,32,42,0.35) 100%), url(${this.userPhotoUrl}); background-size: cover; background-position: center top;`
      );
    }
    return this.sanitizer.bypassSecurityTrustStyle(
      `background: linear-gradient(135deg, #1C2B35 0%, #2D4050 100%);`
    );
  }

  get userInitials(): string {
    const p = this.currentUser?.prenom || '';
    const n = this.currentUser?.nom || '';
    return `${p.charAt(0)}${n.charAt(0)}`.toUpperCase();
  }

  get flatCandidatures(): Candidature[] {
    const all: Candidature[] = [];
    for (const id of Object.keys(this.candidatures)) {
      all.push(...this.candidatures[+id]);
    }
    return all.slice(0, 3);
  }

  get totalCandidaturesCount(): number {
    return Object.values(this.candidatures).reduce((s, arr) => s + arr.length, 0);
  }

  get formattedRevenue(): string {
    const r = this.totalRevenue || 0;
    return r >= 1000 ? `${Math.round(r / 1000)}K` : `${r}`;
  }

  get todayAppointments(): any[] {
    const today = new Date().toDateString();
    return this.upcomingAppointments
      .filter(a => new Date(a.date).toDateString() === today)
      .slice(0, 4);
  }

  get teamMembersDisplay(): any[] {
    // Priorité : vrais employés de la table employes
    if (this.salonEmployees.length > 0) {
      return this.salonEmployees.slice(0, 5);
    }
    // Fallback : candidatures acceptées/embauchées
    const members: any[] = [];
    for (const id of Object.keys(this.candidatures)) {
      for (const c of this.candidatures[+id]) {
        const st = ((c as any).status || (c as any).statut || '').toUpperCase();
        if (/ACCEPTEE|ACCEPTE|ACTIF|EMBAUCHE/.test(st)) {
          const offre = this.offresEmploi.find(o => o.id === +id);
          members.push({
            name: this.getCandidateName(c),
            initials: this.getCandidateInitials(c),
            specialty: (c as any).specialite || offre?.titre || '',
            salon: this.salons[0]?.nom || '',
            rating: 4.5,
            status: 'EN SERVICE'
          });
        }
      }
    }
    return members.slice(0, 5);
  }

  get offresPubTruncated(): OffreEmploi[] {
    return this.offresEmploi.filter(o => !o.estFermee).slice(0, 3);
  }

  // ===== MÉTHODES SALON / CANDIDATURE =====

  getSalonImage(salon: Salon): string {
    return this.placeholderSvc.resolveImage(salon, 'salon');
  }

  getSalonMembersCount(salon: Salon): number {
    return (salon as any).membresCount || (salon as any).teamSize || (salon as any).nombreMembres || 0;
  }

  getSalonOffresCount(salon: Salon): number {
    return this.offresEmploi.filter(o =>
      (o as any).salonId === salon.id ||
      (o.lieu || '').toLowerCase().includes((salon.adresse || '').toLowerCase().split(',')[0])
    ).length;
  }

  getCandidatureOffre(c: Candidature): string {
    for (const id of Object.keys(this.candidatures)) {
      if (this.candidatures[+id].some(x => x.id === c.id)) {
        return this.offresEmploi.find(o => o.id === +id)?.titre || '';
      }
    }
    return '';
  }

  getCandidatureExperience(c: Candidature): string {
    const exp = (c as any).anneesExperience || (c as any).experience || (c.freelance as any)?.anneesExperience;
    return exp ? `${exp}ans d'exp.` : '';
  }

  getCandidatureSpecialty(c: Candidature): string {
    return (c as any).specialite || (c.freelance as any)?.specialite || (c.freelance as any)?.metier || '';
  }

}