import { Component, OnInit, OnDestroy, ElementRef, ViewChild, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';

import { Subscription } from 'rxjs';
import { forkJoin } from 'rxjs';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';
import { RecommendationService } from '../../../shared/services/recommendation.service';
import { NotificationService, Notification } from '../../../shared/services/notification/notification.service';
import { NotificationListComponent } from '../../../shared/components/notification-list/notification-list.component';
import { FreelanceDetailsComponent } from '../../../freelance/components/freelance-details/freelance-details.component';
import { SalonDetailsComponent } from '../../../shared/components/salon-details/salon-details.component';
import { ProfileManagementComponent } from '../../../shared/components/profile-management/profile-management.component';
import { AuthService } from '../../../core/servces/auth.service';

interface CalendarDay {
  date: number;
  fullDate: Date;
  hasAppointment: boolean;
  isToday: boolean;
  isOtherMonth: boolean;
  appointments?: any[];
}

interface SpendingData {
  month: string;
  amount: number;
  percentage: number;
}

interface LoyaltyProgram {
  level: string;
  nextLevel: string;
  points: number;
  pointsToNext: number;
  progressPercent: number;
}

@Component({
  selector: 'app-enhanced-client-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatSelectModule,
    MatBadgeModule,
    MatMenuModule,
    FormsModule,
    ProfileManagementComponent,
    NotificationListComponent,
  ],
  templateUrl: './client-dashboard.component.html',
  styleUrl: './client-dashboard.component.scss'
})
export class ClientDashboardComponent implements OnInit, OnDestroy {

  // ==========================================
  //  DONNÉES DU DASHBOARD
  // ==========================================

  loading = true;
  loadingNotifications = false;
  notificationRetryCount = 0;
  maxNotificationRetries = 2;
  error: string | null = null;

  // Statistiques client
  stats: any = {
    total: 0,
    aVenir: 0,
    terminees: 0,
    annulees: 0,
    totalDepense: 0,
    moyenneDepenseParReservation: 0
  };

  // Réservations
  allReservations: any[] = [];
  upcomingReservations: any[] = [];
  todayReservations: any[] = [];
  recentHistory: any[] = [];

  // Prochain RDV
  nextAppointment: any = null;

  // Popup détails RDV
  showRdvPopup = false;
  rdvPopupData: any = null;

  // Avis et notation
  reservationsToRate: any[] = [];
  recentAvis: any[] = [];

  // Suggestions "Sélectionné pour vous"
  suggestions: any[] = [];

  // Prestataires favoris
  favoriteProviders: any[] = [];

  // Notifications
  unreadNotifications = 0;
  notifications: Notification[] = [];

  // Recherche
  searchQuery = '';
  searchFocused = false;

  // User information
  currentUser: any = null;

  // Programme fidélité
  loyaltyProgram: LoyaltyProgram = {
    level: 'Gold',
    nextLevel: 'Platinum',
    points: 1250,
    pointsToNext: 250,
    progressPercent: 75
  };

  // Graphique des dépenses
  spendingData: SpendingData[] = [];
  selectedPeriod = '6months';

  // Calendrier
  currentDate = new Date();
  currentMonthName = '';
  currentYear = 0;
  dayNames = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  calendarDays: CalendarDay[] = [];

  // État du composant
  selectedTab = 0;

  // Annulation
  showCancelModal = false;
  cancelReason = '';
  cancelCustomReason = '';
  reservationToCancel: any = null;
  cancellingInProgress = false;
  readonly cancelReasons = [
    'Empêchement de dernière minute',
    'Changement de programme',
    'Problème de transport',
    'Raison personnelle',
    'Autre'
  ];

  @ViewChild('scrollContainer') scrollContainer!: ElementRef<HTMLElement>;
  @ViewChild('tabsSection') tabsSection!: ElementRef<HTMLElement>;
  @ViewChild('favSection') favSection!: ElementRef<HTMLElement>;

  private subscriptions = new Subscription();

  // Profil
  showProfile = false;

  private isBrowser: boolean;

  constructor(
    private reservationService: ReservationService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private router: Router,
    private authService: AuthService,
    private recommendationService: RecommendationService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  // ==========================================
  //  CYCLE DE VIE
  // ==========================================

  ngOnInit(): void {
    this.initializeData();
    this.loadUserData();
    this.subscribeToUserChanges();
    this.generateCalendar();
    this.generateSpendingData();

    // Appels API uniquement côté browser (SSR n'a pas de token d'auth)
    if (this.isBrowser) {
      this.loadDashboardData();
      this.loadNotifications();
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ==========================================
  //  INITIALISATION
  // ==========================================

  private initializeData(): void {
    this.currentMonthName = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
  }

  loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser();
  }

  subscribeToUserChanges(): void {
    this.subscriptions.add(
      this.authService.currentUser$.subscribe(user => {
        this.currentUser = user;
      })
    );
  }

  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  // ==========================================
  //  CHARGEMENT DES DONNÉES
  // ==========================================

  loadDashboardData(): void {
    this.loading = true;
    this.error = null;

    // Charger toutes les données en parallèle
    const dataLoad$ = forkJoin({
      reservations: this.reservationService.getClientReservations(),
      upcoming: this.reservationService.getClientUpcomingReservations(),
      today: this.reservationService.getClientTodayReservations(),
      history: this.reservationService.getClientReservationHistory(),
      stats: this.reservationService.getClientStats(),
      toRate: this.reservationService.getReservationsToRate(),
      avis: this.reservationService.getClientAvis(),
      favorites: this.reservationService.getClientFavoriteProviders()
    });

    this.subscriptions.add(
      dataLoad$.subscribe({
        next: (data) => {


          this.allReservations = data.reservations;
          this.upcomingReservations = data.upcoming;
          this.todayReservations = data.today;
          this.recentHistory = data.history.slice(0, 10);
          // Mapper les statistiques du backend vers le format attendu par le frontend
          this.stats = {
            total: data.stats.totalReservations || 0,
            aVenir: data.stats.reservationsAVenir || 0,
            terminees: data.stats.reservationsTerminees || 0,
            annulees: data.stats.reservationsAnnulees || 0,
            totalDepense: data.stats.totalDepense || 0,
            moyenneDepenseParReservation: data.stats.moyenneDepenseParReservation || 0,
            avisCount: data.stats.avisCount || 0,
            noteMoyenneDonnee: data.stats.noteMoyenneDonnee || 0
          };

          this.reservationsToRate = data.toRate.reservationsToRate || [];
          this.recentAvis = data.avis.slice(0, 5);
          this.favoriteProviders = data.favorites.slice(0, 6);

          // Calculer le prochain RDV
          this.nextAppointment = this.reservationService.getNextClientAppointment(this.upcomingReservations);

          // Vérifier les favoris automatiques après chargement des données
          this.checkAutomaticFavorites();

          this.loading = false;
          this.generateCalendarWithAppointments();
          this.loadSuggestions();
        },
        error: (error) => {
          console.error(' Erreur chargement dashboard:', error);
          this.error = 'Erreur lors du chargement des données';
          this.loading = false;
          this.showError('Impossible de charger les données du dashboard');
        }
      })
    );
  }

  loadNotifications(): void {
    this.subscriptions.add(
      forkJoin({
        notifications: this.notificationService.getNotifications(),
        unreadCount: this.notificationService.getUnreadCount()
      }).subscribe({
        next: (data) => {
          this.notifications = data.notifications;
          this.unreadNotifications = data.unreadCount.count;
        },
        error: (error) => {
          console.error(' Erreur chargement notifications client:', error);
          this.notifications = [];
          this.unreadNotifications = 0;
        }
      })
    );

    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadNotifications = count;
      })
    );
  }

  // ==========================================
  //  ACTIONS UTILISATEUR
  // ==========================================


  onNotificationRead(): void {
    // Callback quand une notification est lue
    this.loadNotifications();
  }

  /**
   *  Prendre un nouveau RDV
   */
  /** Retourne les services sans doublons (par nom de service + prestataire), max 8 */
  get uniqueRecommendations(): any[] {
    return this.suggestions;
  }

  loadSuggestions(): void {
    this.recommendationService.getQuickRecommendations('', undefined, undefined, 10).subscribe({
      next: (response) => {
        const salons: any[] = response.recommendations || [];
        const items: any[] = [];
        for (const salon of salons) {
          const services: any[] = salon.servicesComplets || [];
          for (const svc of services) {
            items.push({
              serviceId: svc.id,
              serviceName: svc.nomService || svc.nom,
              prix: svc.prix,
              dureeMinutes: svc.dureeEnMinutes,
              salonId: salon.id,
              salonName: salon.nom,
              salonAdresse: salon.adresse,
              photoProfilUrl: salon.photoProfilUrl,
              _isSuggestion: true
            });
            if (items.length >= 8) break;
          }
          if (items.length >= 8) break;
        }
        this.suggestions = items;
      },
      error: () => {
        // Fallback : suggestions depuis l'historique
        const seen = new Set<string>();
        this.suggestions = this.recentHistory.filter(r => {
          const key = `${this.getServiceName(r)}__${this.getProviderName(r)}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 8);
      }
    });
  }

  scrollLeft(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: -220, behavior: 'smooth' });
  }

  scrollRight(): void {
    this.scrollContainer?.nativeElement.scrollBy({ left: 220, behavior: 'smooth' });
  }

  logout(): void {
    this.authService.logout().subscribe();
  }

  toggleProfile(): void {
    this.showProfile = !this.showProfile;
    if (this.showProfile) {
      setTimeout(() => {
        document.getElementById('profile-section')?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }

  onSearch(): void {
    const q = this.searchQuery.trim();
    if (!q) return;
    this.router.navigate(['/accueil'], { queryParams: { q } });
  }

  scrollToSection(ref: 'tabsSection' | 'favSection'): void {
    const el = this[ref]?.nativeElement;
    if (!el) return;
    const container = el.closest('.db-scroll') as HTMLElement;
    if (container) {
      const top = el.offsetTop - container.offsetTop;
      container.scrollTo({ top, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  bookNewAppointment(): void {

    this.showInfo('Redirection vers la prise de rendez-vous...');
  }

  /**
   *  Annuler une réservation
   */
  cancelReservation(reservation: any): void {
    if (!this.canCancelReservation(reservation)) {
      this.showError('Cette réservation ne peut plus être annulée (moins de 2h avant)');
      return;
    }
    this.reservationToCancel = reservation;
    this.cancelReason = '';
    this.cancelCustomReason = '';
    this.showCancelModal = true;
  }

  closeCancelModal(): void {
    this.showCancelModal = false;
    this.reservationToCancel = null;
    this.cancelReason = '';
    this.cancelCustomReason = '';
  }

  confirmCancellation(): void {
    if (!this.cancelReason) return;
    const finalReason = this.cancelReason === 'Autre' ? this.cancelCustomReason : this.cancelReason;
    this.cancellingInProgress = true;
    this.subscriptions.add(
      this.reservationService.cancelReservation(this.reservationToCancel.id, finalReason).subscribe({
        next: () => {
          this.cancellingInProgress = false;
          this.closeCancelModal();
          this.showSuccess('Réservation annulée avec succès');
          this.loadDashboardData();
        },
        error: (error: any) => {
          this.cancellingInProgress = false;
          console.error('Erreur annulation:', error);
          this.showError('Impossible d\'annuler la réservation');
        }
      })
    );
  }

  /**
   *  Terminer une réservation
   */
  completeReservation(reservation: any): void {
    if (!this.canCompleteReservation(reservation)) {
      this.showError('Cette réservation ne peut pas encore être terminée');
      return;
    }

    this.subscriptions.add(
      this.reservationService.terminerReservation(reservation.id).subscribe({
        next: (updatedReservation) => {
          this.showSuccess('Réservation terminée ! Merci de donner votre avis.');
          this.loadDashboardData();

          // Ouvrir automatiquement le formulaire de notation après 1 seconde
          setTimeout(() => {
            this.openRatingDialog({
              ...reservation,
              status: 'terminee',
              ...updatedReservation
            });
          }, 1000);
        },
        error: (error: any) => {
          console.error(' Erreur finalisation:', error);
          this.showError('Impossible de terminer la réservation');
        }
      })
    );
  }

  /**
   *  Voir détails d'une réservation

   */
  viewReservationDetails(reservation: any): void {
    this.rdvPopupData = {
      appointments: [reservation],
      title: 'Détails du rendez-vous'
    };
    this.showRdvPopup = true;
  }

  closeRdvPopup(): void {
    this.showRdvPopup = false;
    this.rdvPopupData = null;
  }

  /**
   *  Réserver à nouveau un service
   */
  rebookService(reservation: any): void {


    // Importer le dialog de booking dynamiquement
    import('../../../shared/components/booking-dialog/booking-dialog.component').then(module => {

      // Déterminer le type de prestataire et préparer les données
      let dialogData: any = {};

      if (reservation.salonId) {
        // Réservation chez un salon
        dialogData = {
          service: {
            id: reservation.serviceId,
            nom: reservation.serviceName || reservation.serviceNom,
            prix: reservation.servicePrix || reservation.prixTotal || reservation.prix,
            dureeMinutes: reservation.dureeMinutes
          },
          salon: {
            id: reservation.salonId,
            nom: reservation.salonName || reservation.salonNom,
            adresse: reservation.salonAdresse,
            photoProfilUrl: reservation.photoProfilUrl
          },
          type: 'salon'
        };
      } else if (reservation.freelanceId) {
        // Réservation chez un freelance
        dialogData = {
          service: {
            id: reservation.serviceId,
            nom: reservation.serviceName || reservation.serviceNom,
            prixMin: reservation.servicePrixMin,
            prixMax: reservation.servicePrixMax,
            dureeMinutes: reservation.dureeMinutes
          },
          freelance: {
            id: reservation.freelanceId,
            prenom: reservation.freelancePrenom,
            nom: reservation.freelanceNom,
            adresse: reservation.freelanceAdresse
          },
          type: 'freelance'
        };
      } else {
        this.showError('Impossible de déterminer le type de prestataire pour cette réservation');
        return;
      }

      // Ouvrir le dialog de booking
      const dialogRef = this.dialog.open(module.BookingDialogComponent, {
        width: '800px',
        maxWidth: '95vw',
        maxHeight: '90vh',
        disableClose: false,
        data: dialogData
      });

      // Gérer la fermeture du dialog
      dialogRef.afterClosed().subscribe(result => {
        if (result && result.success) {

          this.showSuccess('Votre nouvelle réservation a été confirmée !');

          // Vérifier si ce prestataire doit être ajouté aux favoris
          this.checkAndAddToFavorites(reservation);

          // Recharger les données du dashboard pour voir la nouvelle réservation
          this.loadDashboardData();
        } else if (result && result.cancelled) {
          this.showInfo('Réservation annulée');
        }
      });

    }).catch(error => {
      console.error(' Erreur lors du chargement du dialog de réservation:', error);
      this.showError('Impossible d\'ouvrir le formulaire de réservation');
    });
  }

  /**
   *  Ouvrir le formulaire de notation
   */
  // Dans votre classe ClientDashboardComponent
  openRatingDialog(reservation: any): void {


    // Importer la modal de notation dynamiquement
    import('../../../shared/components/rating-modal/rating-modal.component').then(module => {

      // Déterminer le type et l'ID du prestataire en toute sécurité
      let prestataireId: number | undefined;
      let prestataireType: 'salon' | 'freelance' | undefined;

      if (reservation.salonId) {
        prestataireId = reservation.salonId;
        prestataireType = 'salon';
      } else if (reservation.freelanceId) {
        prestataireId = reservation.freelanceId;
        prestataireType = 'freelance';
      }

      if (!prestataireId || !prestataireType) {
        console.error(' Impossible de déterminer l\'ID ou le type du prestataire pour la réservation:', reservation);
        this.showError('Les informations du prestataire sont manquantes.');
        return; // Sortir de la fonction si les données sont invalides
      }

      const dialogRef = this.dialog.open(module.RatingModalComponent, {
        width: '480px',
        maxWidth: '94vw',
        panelClass: 'rm-dialog-panel',
        disableClose: false,
        data: {
          reservation: reservation,
          serviceNom: this.getServiceName(reservation),
          prestataire: this.getProviderName(reservation),
          type: prestataireType,
          existingRating: reservation.avis ? {
            note: reservation.avis.note,
            commentaire: reservation.avis.commentaire
          } : null
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.success) {

          this.showSuccess('Votre avis a été enregistré avec succès !');
          this.loadDashboardData();
        }
      });
    }).catch(error => {
      console.error(' Erreur lors du chargement de la modal:', error);
      this.showError('Impossible d\'ouvrir le formulaire de notation');
    });
  }

  /**
   *  Modifier un avis
   */
  editReview(avis: any): void {
    import('../../../shared/components/rating-modal/rating-modal.component').then(module => {
      const type: 'salon' | 'freelance' =
        (avis.typePrestataire === 'salon' || avis.salonId) ? 'salon' : 'freelance';

      const dialogRef = this.dialog.open(module.RatingModalComponent, {
        width: '480px',
        maxWidth: '94vw',
        panelClass: 'rm-dialog-panel',
        disableClose: false,
        data: {
          reservation: {
            id: avis.reservationId,
            salonId: avis.salonId,
            freelanceId: avis.freelanceId,
            avisId: avis.id,
            serviceId: null
          },
          serviceNom: avis.nomService,
          prestataire: avis.nomPrestataire,
          type,
          existingRating: {
            note: avis.note,
            commentaire: avis.commentaire
          }
        }
      });

      dialogRef.afterClosed().subscribe(result => {
        if (result && result.success) {
          this.showSuccess('Votre avis a été modifié avec succès !');
          this.loadDashboardData();
        }
      });
    }).catch(error => {
      console.error('Erreur lors du chargement de la modal:', error);
      this.showError('Impossible d\'ouvrir le formulaire de modification');
    });
  }

  /**
   *  Voir profil prestataire
   */
  viewProviderProfile(provider: any): void {

    this.showInfo('Profil de ' + provider.prestataire);
  }

  /**
   *  Ouvrir le détail du salon ou freelance favori
   */
  viewProviderDetail(provider: any): void {
    const isSalon = provider.type === 'SALON' || provider.type === 'salon';
    const id: number = isSalon
      ? (provider.salonId || provider.id)
      : (provider.freelanceId || provider.id);

    if (!id) {
      this.showInfo('Détail non disponible pour ' + provider.prestataire);
      return;
    }

    if (isSalon) {
      this.dialog.open(SalonDetailsComponent, {
        width: '900px',
        height: '90vh',
        maxWidth: '90vw',
        data: { salonId: id },
        panelClass: 'salon-detail-dialog-container',
        autoFocus: false
      });
    } else {
      this.dialog.open(FreelanceDetailsComponent, {
        data: { freelanceId: id },
        width: '95vw',
        height: '90vh',
        maxWidth: '1200px',
        maxHeight: '800px',
        panelClass: ['dialog-responsive', 'freelance-details-dialog']
      });
    }
  }

  /**
   *  Réserver avec un prestataire favori
   */
  bookWithProvider(provider: any): void {
    this.viewProviderDetail(provider);
  }

  /**
   *  Voir les offres
   */
  viewOffers(): void {

    this.showInfo('Consultez nos offres exclusives !');
  }

  /**
   *  Partager l'application
   */
  shareApp(): void {

    this.showInfo('Fonctionnalité de partage activée');
  }

  /**
   *  Ouvrir le support
   */
  openSupport(): void {

    this.showInfo('Support client disponible 24h/7j');
  }

  /**
   *  Ouvrir les notifications
   */
  openNotifications(): void {


    // Ouvrir le dialog des notifications
    const dialogRef = this.dialog.open(NotificationListComponent, {
      width: '500px',
      maxWidth: '95vw',
      maxHeight: '80vh',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'cdk-overlay-dark-backdrop',
      panelClass: 'notification-dialog-panel',
      data: {
        notifications: this.notifications,
        unreadCount: this.unreadNotifications
      }
    });

    // Gérer la fermeture du dialog
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.notificationsRead) {
        // Recharger les notifications si certaines ont été lues
        this.loadNotifications();
      }
    });
  }

  // ==========================================
  //  GRAPHIQUE DES DÉPENSES
  // ==========================================

  generateSpendingData(): void {
    const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'];
    const amounts = [120, 160, 90, 200, 140, 170];
    const maxAmount = Math.max(...amounts);

    this.spendingData = months.map((month, index) => ({
      month,
      amount: amounts[index],
      percentage: (amounts[index] / maxAmount) * 100
    }));
  }

  updateSpendingChart(): void {

    this.generateSpendingData(); // Régénérer avec la nouvelle période
  }

  // ==========================================
  //  CALENDRIER
  // ==========================================

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    // Premier jour du mois
    const firstDay = new Date(year, month, 1);

    // Premier lundi à afficher
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    startDate.setDate(firstDay.getDate() - daysToSubtract);

    this.calendarDays = [];
    const today = new Date();

    // Générer 42 jours (6 semaines)
    for (let i = 0; i < 42; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);

      const isCurrentMonth = currentDate.getMonth() === month;
      const isToday = currentDate.toDateString() === today.toDateString();

      this.calendarDays.push({
        date: currentDate.getDate(),
        fullDate: new Date(currentDate),
        hasAppointment: false,
        isToday,
        isOtherMonth: !isCurrentMonth,
        appointments: []
      });
    }
  }

  generateCalendarWithAppointments(): void {
    this.generateCalendar();

    // Marquer les jours avec des RDV
    this.upcomingReservations.forEach(reservation => {
      const reservationDate = new Date(reservation.datePrestation);
      const dayIndex = this.calendarDays.findIndex(day =>
        day.fullDate.toDateString() === reservationDate.toDateString()
      );

      if (dayIndex !== -1) {
        this.calendarDays[dayIndex].hasAppointment = true;
        this.calendarDays[dayIndex].appointments = this.calendarDays[dayIndex].appointments || [];
        this.calendarDays[dayIndex].appointments!.push(reservation);
      }
    });
  }

  previousMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.currentMonthName = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
    this.generateCalendarWithAppointments();
  }

  nextMonth(): void {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.currentMonthName = this.getMonthName(this.currentDate.getMonth());
    this.currentYear = this.currentDate.getFullYear();
    this.generateCalendarWithAppointments();
  }

  selectDate(day: CalendarDay): void {
    if (day.hasAppointment && day.appointments?.length) {
      this.rdvPopupData = {
        appointments: day.appointments,
        title: `Rendez-vous du ${day.date} ${this.currentMonthName}`
      };
      this.showRdvPopup = true;
    }
  }

  private getMonthName(monthIndex: number): string {
    const months = [
      'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
    ];
    return months[monthIndex];
  }

  // ==========================================
  //  MÉTHODES UTILITAIRES
  // ==========================================

  /**
   *  Obtenir le label d'un onglet avec compteur
   */
  getTabLabel(label: string, count: number): string {
    return count > 0 ? `${label} (${count})` : label;
  }

  /**
   *  Vérifier si une réservation peut être annulée
   * CORRECTION : Plus simple - toute réservation confirmée peut être annulée jusqu'à 2h avant
   */
  canCancelReservation(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();

    // Si pas confirmée, ne peut pas annuler
    if (status !== 'confirmee' && status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const prestationDate = new Date(reservation.datePrestation);
    const hoursUntil = (prestationDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    // Peut annuler si au moins 2h avant ou si date déjà passée (rattrapage)
    return hoursUntil >= 2 || prestationDate <= now;
  }

  /**
   *  Vérifier si une réservation peut être terminée
   * CORRECTION : Plus simple - toute réservation confirmée peut être terminée après l'heure prévue
   */
  canCompleteReservation(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();

    // Seulement les réservations confirmées peuvent être terminées
    if (status !== 'confirmee' && status !== 'confirmed') {
      return false;
    }

    const now = new Date();
    const prestationDate = new Date(reservation.datePrestation);

    // Peut terminer si l'heure est passée ou dans les 30 min qui précèdent
    const minutesUntil = (prestationDate.getTime() - now.getTime()) / (1000 * 60);
    return minutesUntil <= 30; // 30 min avant ou après
  }

  /**
   *  Vérifier si une réservation peut être notée
   */
  canRateReservation(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
    return status === 'terminee' || status === 'completed';
  }

  /**
   *  Formater le statut pour affichage
   */
  formatStatus(status: string): string {
    return this.reservationService.formatClientReservationStatus(status);
  }

  /**
   *  Obtenir la couleur du statut
   */
  getStatusColor(status: string): string {
    return this.reservationService.getClientStatusColor(status);
  }

  /**
   *  Formater prix
   */
  formatPrice(price: number): string {
    return this.reservationService.formatPrix(price);
  }

  /**
   *  Formater date
   */
  formatDate(date: string | Date): string {
    return this.reservationService.formatDateFrancaise(date);
  }

  /**
   *  Formater heure
   */
  formatTime(date: string | Date): string {
    return this.reservationService.formatHeureComplete(date);
  }

  /**
   *  Formater note en étoiles
   */
  formatStars(rating: number): string {
    return this.reservationService.formatRatingStars(rating);
  }

  /**
   *  Obtenir le temps relatif
   */
  getRelativeTime(date: string | Date): string {
    return this.reservationService.getTempsDepuisCreation(date);
  }

  /**
   *  Calculer le temps jusqu'au prochain RDV
   */
  getTimeUntilNext(date: string | Date): string {
    try {
      const target = new Date(date);
      const now = new Date();
      const diffMs = target.getTime() - now.getTime();

      if (diffMs <= 0) return 'Maintenant';

      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffHours / 24);

      if (diffDays > 0) {
        return `dans ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
      } else if (diffHours > 0) {
        return `dans ${diffHours}h`;
      } else {
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        return `dans ${diffMinutes}min`;
      }
    } catch (error) {
      return 'Bientôt';
    }
  }

  // ==========================================
  //  MÉTHODES D'AFFICHAGE
  // ==========================================

  /**
   *  Obtenir l'icône du statut
   */
  getStatusIcon(status: string): string {
    const statusMap: { [key: string]: string } = {
      'confirmee': 'check_circle',
      'confirmed': 'check_circle',
      'terminee': 'task_alt',
      'completed': 'task_alt',
      'annulee_client': 'cancel',
      'annulee_prestataire': 'block',
      'cancelled': 'cancel'
    };

    return statusMap[status?.toLowerCase()] || 'help';
  }

  /**
   *  Obtenir l'icône du type de prestataire
   */
  getProviderIcon(reservation: any): string {
    return reservation.salonId ? 'store' : 'person';
  }

  /**
   *  Obtenir le nom du prestataire
   * MISE À JOUR : Utilise les nouvelles propriétés du DTO
   */
  getProviderName(reservation: any): string {
    // Utiliser d'abord la méthode du DTO si disponible
    if (reservation.getProviderName) {
      return reservation.getProviderName();
    }

    // Fallback pour compatibilité
    if (reservation.salonName) {
      return reservation.salonName;
    }

    if (reservation.freelancePrenom || reservation.freelanceNom) {
      const prenom = reservation.freelancePrenom || '';
      const nom = reservation.freelanceNom || '';
      return `${prenom} ${nom}`.trim();
    }

    // Legacy support
    return reservation.salonNom ||
      (reservation.freelancePrenom + ' ' + reservation.freelanceNom) ||
      'Prestataire inconnu';
  }

  // ==========================================
  //  NOTIFICATIONS
  // ==========================================

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }

  private showInfo(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 4000,
      panelClass: ['info-snackbar']
    });
  }

  /**
   *  NOUVEAU : Obtenir l'adresse du prestataire
   */
  getProviderAddress(reservation: any): string {
    if (reservation.getProviderAddress) {
      return reservation.getProviderAddress();
    }

    // Fallback
    if (reservation.salonAdresse) {
      return reservation.salonAdresse;
    }

    if (reservation.freelanceAdresse) {
      return reservation.freelanceAdresse;
    }

    return 'Adresse non renseignée';
  }

  /**
   *  NOUVEAU : Obtenir le téléphone du prestataire
   */
  getProviderPhone(reservation: any): string | null {
    if (reservation.getProviderPhone) {
      return reservation.getProviderPhone();
    }

    // Fallback
    return reservation.salonTelephone || reservation.freelanceTelephone || null;
  }

  /**
   *  NOUVEAU : Obtenir le nom du service avec fallback
   */
  getServiceName(reservation: any): string {
    if (!reservation) return 'Service inconnu';

    // Essayer toutes les variantes possibles
    return reservation.serviceName ||
           reservation.serviceNom ||
           reservation.nom ||
           'Service inconnu';
  }

  /**
   *  NOUVEAU : Obtenir le prix du service (nombre)
   */
  getServicePrice(reservation: any): number {
    if (!reservation) return 0;

    // Pour les statistiques, utiliser le prix total ou moyen
    return reservation.prixTotal ||
           reservation.servicePrix ||
           reservation.prix ||
           0;
  }

  /**
   *  NOUVEAU : Obtenir le prix formaté (fourchette ou prix fixe)
   */
  getFormattedServicePrice(reservation: any): string {
    if (!reservation) return '0 CFA';

    // Utiliser la méthode du DTO si disponible
    if (reservation.getFormattedPrice) {
      return reservation.getFormattedPrice();
    }

    // Fallback : logique côté frontend
    const prixMin = reservation.servicePrixMin;
    const prixMax = reservation.servicePrixMax;

    // Si fourchette de prix différente (service freelance)
    if (prixMin && prixMax && prixMin !== prixMax) {
      return `${Math.round(prixMin)} - ${Math.round(prixMax)} CFA`;
    }

    // Prix fixe (service salon)
    const prix = reservation.prixTotal || reservation.servicePrix || prixMin || prixMax;
    if (prix) {
      return `${Math.round(prix)} CFA`;
    }

    return 'Prix non défini';
  }

  /**
   *  NOUVEAU : Obtenir la durée du service
   */
  getServiceDuration(reservation: any): string {
    const minutes = reservation.dureeMinutes;
    if (!minutes) return 'Durée non précisée';

    if (minutes >= 60) {
      const heures = Math.floor(minutes / 60);
      const minutesRestantes = minutes % 60;
      return minutesRestantes > 0 ? `${heures}h${minutesRestantes}` : `${heures}h`;
    }

    return `${minutes}min`;
  }

  /**
   *  NOUVEAU : Vérifier si toutes les infos sont complètes
   */
  hasCompleteInfo(reservation: any): boolean {
    const hasProvider = !!(reservation.salonName || reservation.freelanceNom || reservation.freelancePrenom);
    const hasService = !!reservation.serviceName;
    const hasPrice = !!(reservation.prixTotal && reservation.prixTotal > 0);
    const hasDate = !!reservation.datePrestation;

    return hasProvider && hasService && hasPrice && hasDate;
  }

  /**
   *  Rafraîchir les données
   */
  refresh(): void {
    this.loadDashboardData();
    this.showInfo('Données actualisées');
  }

  /**
   *  Obtenir la classe CSS pour le statut du rendez-vous
   */
  getAppointmentStatusClass(appointment: any): string {
    const status = appointment.status?.toLowerCase() || appointment.bookstatus?.toLowerCase();

    switch (status) {
      case 'confirmee':
      case 'confirmed':
        return 'appointment-confirmed';
      case 'terminee':
      case 'completed':
        return 'appointment-completed';
      case 'annulee_client':
      case 'annulee_prestataire':
      case 'cancelled':
        return 'appointment-cancelled';
      default:
        return 'appointment-pending';
    }
  }

  /**
   *  Obtenir le texte du tooltip pour un jour du calendrier
   */
  getTooltipText(day: any): string {
    if (!day.appointments || day.appointments.length === 0) {
      return '';
    }
    return `${day.appointments.length} RDV`;
  }

  /**
   *  Vérifier et ajouter automatiquement aux favoris après 2+ réservations
   */
  private checkAndAddToFavorites(baseReservation: any): void {


    // Identifier le prestataire de la réservation de base
    const prestataireId = baseReservation.salonId || baseReservation.freelanceId;
    const prestataireType = baseReservation.salonId ? 'salon' : 'freelance';

    if (!prestataireId) {
      console.warn(' Impossible d\'identifier le prestataire pour l\'ajout aux favoris');
      return;
    }

    // Compter les réservations avec ce prestataire
    const reservationsWithSameProvider = this.allReservations.filter(reservation => {
      const currentPrestataireId = reservation.salonId || reservation.freelanceId;
      return currentPrestataireId === prestataireId;
    });



    // Si 2+ réservations, vérifier s'il n'est pas déjà dans les favoris
    if (reservationsWithSameProvider.length >= 2) {
      const isAlreadyFavorite = this.favoriteProviders.some(fav => {
        return (fav.salonId === prestataireId && prestataireType === 'salon') ||
               (fav.freelanceId === prestataireId && prestataireType === 'freelance');
      });

      if (!isAlreadyFavorite) {
        this.addToFavorites(baseReservation, prestataireType);
      } else {

      }
    } else {

    }
  }

  /**
   *  Ajouter un prestataire aux favoris
   */
  private addToFavorites(reservation: any, type: 'salon' | 'freelance'): void {
    const prestataireId = type === 'salon' ? reservation.salonId : reservation.freelanceId;
    const prestataireName = type === 'salon'
      ? (reservation.salonName || reservation.salonNom)
      : `${reservation.freelancePrenom} ${reservation.freelanceNom}`;



    // Appeler l'API pour ajouter aux favoris
    const favoriteData = {
      prestataireId: prestataireId,
      type: type,
      raison: 'auto' // Indicateur que c'est un ajout automatique
    };

    // Créer un objet favori local pour mise à jour immédiate
    const newFavorite = {
      id: prestataireId,
      prestataire: prestataireName,
      type: type.toUpperCase(),
      nombreReservations: this.allReservations.filter(r =>
        (r.salonId === prestataireId && type === 'salon') ||
        (r.freelanceId === prestataireId && type === 'freelance')
      ).length,
      adresse: type === 'salon'
        ? (reservation.salonAdresse || 'Adresse non renseignée')
        : (reservation.freelanceAdresse || 'Adresse non renseignée'),
      autoAdded: true // Marqueur pour indication visuelle
    };

    // Vérifier si la méthode existe dans le service
    if (typeof (this.reservationService as any).addToFavorites === 'function') {
      // Appel API pour ajouter aux favoris
      (this.reservationService as any).addToFavorites(favoriteData).subscribe({
        next: (response: any) => {

        },
        error: (error: any) => {
          console.error(' Erreur lors de l\'ajout aux favoris:', error);
        }
      });
    } else {
      // Fallback : ajout local uniquement (pour développement)

    }

    // Ajouter à la liste locale dans tous les cas
    this.favoriteProviders.unshift(newFavorite);

    // Notification avec style spécial
    this.showFavoriteAddedNotification(prestataireName, type);
  }


  /**
   *  Vérifier tous les prestataires pour ajout automatique aux favoris
   */
  private checkAutomaticFavorites(): void {


    // Grouper les réservations par prestataire
    const prestataireStats = new Map();

    this.allReservations.forEach(reservation => {
      const prestataireId = reservation.salonId || reservation.freelanceId;
      const prestataireType = reservation.salonId ? 'salon' : 'freelance';
      const prestataireName = prestataireType === 'salon'
        ? (reservation.salonName || reservation.salonNom)
        : `${reservation.freelancePrenom || ''} ${reservation.freelanceNom || ''}`.trim();

      if (prestataireId && prestataireName) {
        const key = `${prestataireType}_${prestataireId}`;

        if (!prestataireStats.has(key)) {
          prestataireStats.set(key, {
            id: prestataireId,
            type: prestataireType,
            name: prestataireName,
            reservations: [],
            sampleReservation: reservation
          });
        }

        prestataireStats.get(key).reservations.push(reservation);
      }
    });

    // Vérifier chaque prestataire pour ajout automatique
    prestataireStats.forEach((stats) => {
      if (stats.reservations.length >= 2) {
        // Vérifier s'il n'est pas déjà dans les favoris
        const isAlreadyFavorite = this.favoriteProviders.some(fav => {
          return (fav.salonId === stats.id && stats.type === 'salon') ||
                 (fav.freelanceId === stats.id && stats.type === 'freelance') ||
                 (fav.id === stats.id) ||
                 (fav.prestataire === stats.name);
        });

        if (!isAlreadyFavorite) {

          this.addToFavoritesQuietly(stats.sampleReservation, stats.type, stats.id, stats.name);
        }
      }
    });
  }

  /**
   *  Ajouter aux favoris silencieusement (sans notification)
   */
  private addToFavoritesQuietly(reservation: any, type: 'salon' | 'freelance', prestataireId: number, prestataireName: string): void {
    // Créer un objet favori local
    const newFavorite = {
      id: prestataireId,
      salonId: type === 'salon' ? prestataireId : undefined,
      freelanceId: type === 'freelance' ? prestataireId : undefined,
      prestataire: prestataireName,
      type: type.toUpperCase(),
      nombreReservations: this.allReservations.filter(r =>
        (r.salonId === prestataireId && type === 'salon') ||
        (r.freelanceId === prestataireId && type === 'freelance')
      ).length,
      adresse: type === 'salon'
        ? (reservation.salonAdresse || 'Adresse non renseignée')
        : (reservation.freelanceAdresse || 'Adresse non renseignée'),
      autoAdded: true
    };



    // Tentative d'appel API si disponible
    if (typeof (this.reservationService as any).addToFavorites === 'function') {
      const favoriteData = {
        prestataireId: prestataireId,
        type: type,
        raison: 'auto'
      };

      (this.reservationService as any).addToFavorites(favoriteData).subscribe({
        next: (response: any) => {

        },
        error: (error: any) => {
          console.error(' Erreur API favoris (mode silencieux):', error);
        }
      });
    }

    // Ajouter à la liste locale
    this.favoriteProviders.unshift(newFavorite);
  }

  /**
   *  Notification spéciale pour ajout automatique aux favoris
   */
  private showFavoriteAddedNotification(prestataireName: string, type: string): void {
    const message = ` ${prestataireName} a été ajouté à vos favoris ! (${type === 'salon' ? 'Salon' : 'Freelance'})`;

    this.snackBar.open(message, 'Voir mes favoris', {
      duration: 8000,
      panelClass: ['favorite-snackbar'],
      horizontalPosition: 'right',
      verticalPosition: 'top'
    }).onAction().subscribe(() => {
      // Naviguer vers la section favoris
      this.scrollToSection('favSection');
    });
  }

}
