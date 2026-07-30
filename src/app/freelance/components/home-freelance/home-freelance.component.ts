import { Component, inject, OnInit, OnDestroy, Renderer2, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgIf, NgFor, DatePipe, DecimalPipe, isPlatformBrowser, CommonModule } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { Subscription, forkJoin, of } from 'rxjs';


import { PortfolioComponent } from '../portfolio/portfolio.component';
import { OpportunitesEmploiComponent } from '../opportunites-emploi/opportunites-emploi.component';
import { MesServicesFreelanceComponent } from '../mes-service-freelance/mes-service-freelance.component';
import { HorairesManagerComponent } from '../../../shared/components/horaires-manager/horaires-manager.component';
import { ReservationsComponent } from '../../../shared/components/reservations/reservations.component';
import { NotificationService, Notification } from '../../../shared/services/notification/notification.service';
import { NotificationListComponent } from '../../../shared/components/notification-list/notification-list.component';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';
import { PortfolioService } from '../../services/portfolio.service';
import { catchError, map } from 'rxjs/operators';
import { AuthService } from '../../../core/servces/auth.service';
import { ProfileManagementComponent } from "../../../shared/components/profile-management/profile-management.component";
import { ProfileManagementService } from '../../../shared/services/profile/profile-management.service';
import { OffreEmploi, OffreEmploisService } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';


@Component({
  selector: 'app-home-freelance',
  standalone: true,
  imports: [
    CommonModule, RouterModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatListModule, MatButtonModule, MatCardModule,
    MatInputModule, MatFormFieldModule, MatMenuModule, MatDividerModule,
    MatProgressSpinnerModule, MatChipsModule, MatBadgeModule, MatTabsModule, MatTooltipModule,
    PortfolioComponent,
    OpportunitesEmploiComponent,
    MesServicesFreelanceComponent,
    HorairesManagerComponent,
    ReservationsComponent,
    NotificationListComponent,
    ProfileManagementComponent,
],
  templateUrl: './home-freelance.component.html',
  styleUrls: ['./home-freelance.component.scss']
})
export class HomeFreelanceComponent implements OnInit, OnDestroy {
  // États de navigation
  sidebarOpen = true;
  showPortfolio = false;
  showOpportunities = false;
  showServices = false;
  showProfile = false;
  showAvailability = false;
  showReservations = false;
  showNotifications = false;

  //  Données utilisateur
  currentUser: any = null;
  username = '';

  //  Données pour le composant réservations (si nécessaire)
  salons: any[] = []; // Liste des salons si nécessaire pour le composant enfant
  reservationStats: any = null; // Statistiques reçues du composant enfant
  
  //  Données du tableau de bord
  upcomingAppointments: any[] = [];
  dashboardStats = {
    weeklyAppointments: 0,
    averageRating: 0,
    monthlyRevenue: 0,
    portfolioPhotos: 0
  };
  
  //  États de chargement
  isLoadingStats = false;
  isLoadingAppointments = false;
  statsError: string | null = null;

  //  Notifications
  notifications: Notification[] = [];
  unreadNotifications = 0;

  //  Activités récentes
  recentActivities: any[] = [];

  // Nouvelles propriétés pour le redesign
  portfolioItems: any[] = [];
  loyalClients: any[] = [];
  totalClientsCount = 0;
  latestOffre: OffreEmploi | null = null;
  totalOffres = 0;

  //  Gestion des subscriptions
  private subscriptions = new Subscription();

  // Services
  private router = inject(Router);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private dialog = inject(MatDialog);
  private notificationService = inject(NotificationService);
  private reservationService = inject(ReservationService);
  private portfolioService = inject(PortfolioService);
  private profileService = inject(ProfileManagementService);
  private offreService = inject(OffreEmploisService);
  private platformId = inject(PLATFORM_ID);

  //  Propriété pour vérifier si on est côté browser
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadUserData();
    this.subscribeToUserChanges();

    //  Seulement côté browser (SSR n'a pas de token Keycloak)
    if (this.isBrowser) {
      this.loadNotifications();
      this.loadDashboardData();
      this.setupModalManagement();
      
      // Ajout des fonctions de debug au window (développement seulement)
      if (typeof window !== 'undefined') {
        (window as any).debugModal = {
          checkZIndex: this.debugZIndex.bind(this),
          forceOnTop: this.forceModalOnTop.bind(this),
          fixAllModals: this.fixAllModals.bind(this)
        };
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    
    //  Nettoyer les classes du body seulement côté browser
    if (this.isBrowser && typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'modal-open');
    }
  }
  

  
  //  Charger les données utilisateur
  loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser() as any;
    this.updateUsername();
    this.loadProfilePhoto();
  }

  private loadProfilePhoto(): void {
    if (!this.currentUser?.id) return;
    this.subscriptions.add(
      this.profileService.getCurrentUserProfile().pipe(
        catchError(() => of(null))
      ).subscribe((profile: any) => {
        const photoUrl = profile?.photoProfile || profile?.profileImage;
        if (photoUrl && this.currentUser) {
          this.currentUser = { ...this.currentUser, photoProfile: photoUrl };
          // Persist back to AuthService so token refreshes don't erase the photo
          this.authService.setCurrentUser(this.currentUser);
        }
      })
    );
  }

  //  Écouter les changements d'authentification
  subscribeToUserChanges(): void {
    const userSub = this.authService.currentUser$.subscribe((user: any) => {
      if (user) {
        const existingPhoto = this.currentUser?.photoProfile;
        this.currentUser = user as any;
        // Preserve photo if the incoming user object doesn't carry it yet
        if (!this.currentUser.photoProfile && existingPhoto) {
          this.currentUser = { ...this.currentUser, photoProfile: existingPhoto };
        }
      } else {
        this.currentUser = null;
      }
      this.updateUsername();
    });

    this.subscriptions.add(userSub);
  }

  //  Mettre à jour le nom d'affichage
  updateUsername(): void {
    if (this.currentUser) {
      this.username = `${this.currentUser.prenom} ${this.currentUser.nom}`;
    } else {
      this.username = 'Utilisateur';
    }
  }

  //  Getters pour le template
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated() as boolean;
  }

  get userFullName(): string {
    return this.currentUser ? 
      `${this.currentUser.prenom} ${this.currentUser.nom}` : 
      'Utilisateur';
  }

  get userEmail(): string {
    return this.currentUser?.email || '';
  }

  get userRole(): string {
    return this.currentUser?.role || '';
  }

  get isHomeView(): boolean {
    return !this.showPortfolio && !this.showOpportunities && !this.showServices &&
           !this.showProfile && !this.showAvailability && !this.showReservations && !this.showNotifications;
  }

  get userInitials(): string {
    const p = this.currentUser?.prenom || '';
    const n = this.currentUser?.nom || '';
    return `${p.charAt(0)}${n.charAt(0)}`.toUpperCase();
  }

  get userPhotoUrl(): string {
    const photo = this.currentUser?.photoProfile || this.currentUser?.profileImage;
    if (photo) {
      return photo.startsWith('http') ? photo : `http://localhost:8081${photo}`;
    }
    return '';
  }

  //  Charger les notifications
  loadNotifications(): void {
    this.subscriptions.add(
      forkJoin({
        notifications: this.notificationService.getNotifications(),
        unreadCount: this.notificationService.getUnreadCount()
      }).subscribe({
        next: (data: any) => {
          this.notifications = data.notifications;
          this.unreadNotifications = data.unreadCount.count;

        },
        error: (error) => {
          console.error(' Erreur chargement notifications freelance:', error);
          this.notifications = [];
          this.unreadNotifications = 0;

        }
      })
    );

    // S'abonner aux changements du compteur
    this.subscriptions.add(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadNotifications = count;
      })
    );
  }

  //  Callback quand une notification est lue
  onNotificationRead(): void {
    this.loadNotifications();
  }

  private getMockNotifications(): Notification[] {
    return [
      {
        id: 1,
        message: "Nouvelle offre d'emploi disponible: Coiffeur(se) expérimenté(e)",
        vue: false,
        dateNotif: new Date().toISOString(),
        reservation: {
          id: 1,
          dateReservation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Offre d'emploi"
          }
        }
      },
      {
        id: 2,
        message: "Réservation terminée avec Jean Martin pour Massage",
        vue: false,
        dateNotif: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        reservation: {
          id: 2,
          dateReservation: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Massage"
          }
        }
      },
      {
        id: 3,
        message: "Réservation annulée par Sophie Lambert pour Manucure",
        vue: true,
        dateNotif: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        reservation: {
          id: 3,
          dateReservation: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Manucure"
          }
        }
      }
    ];
  }

  markAsRead(notification: Notification): void {
    if (!notification.vue) {
      // En production, utiliser this.notificationService.markAsRead(notification.id)
      notification.vue = true;
      this.unreadNotifications = this.notifications.filter(n => !n.vue).length;
    }
  }

  markAllAsRead(): void {
    // En production, utiliser this.notificationService.markAllAsRead()
    this.notifications.forEach(n => n.vue = true);
    this.unreadNotifications = 0;
  }

  getNotificationIcon(notification: Notification): string {
    if (notification.message.includes('annulée')) {
      return 'cancel';
    } else if (notification.message.includes('terminée')) {
      return 'check_circle';
    } else if (notification.message.includes('Nouvelle') || notification.message.includes('offre')) {
      return 'work';
    } else if (notification.message.includes('Rappel')) {
      return 'schedule';
    }
    return 'notifications';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      return 'Aujourd\'hui';
    } else if (diffDays === 2) {
      return 'Hier';
    } else if (diffDays <= 7) {
      return `Il y a ${diffDays - 1} jours`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    }
  }

  //  Charger les vraies données du tableau de bord
  loadDashboardData(): void {
    if (!this.currentUser?.id) {
      console.warn(' Utilisateur non connecté - impossible de charger les stats');
      return;
    }

    this.loadFreelanceStats();
    this.loadUpcomingAppointments();
    this.loadPortfolioStats();
    this.loadRecentActivities();
    this.loadLoyalClients();
    this.loadLatestOpportunity();
  }

  //  Charger les statistiques du freelance
  private loadFreelanceStats(): void {
    this.isLoadingStats = true;
    this.statsError = null;
    

    
    // Utiliser directement des statistiques calculées à partir des vraies données
    this.calculateStatsFromReservations();
    
    /* Temporairement désactivé à cause de l'erreur getTotalSpent
    this.subscriptions.add(
      this.reservationService.getFreelanceStats().pipe(
        catchError((error: any) => {
          console.error(' Erreur lors du chargement des stats:', error);
          this.statsError = 'Erreur lors du chargement des statistiques';
          this.calculateStatsFromReservations();
          return of({});
        })
      ).subscribe({
        next: (stats: any) => {

          this.dashboardStats = {
            weeklyAppointments: stats.weeklyReservations || stats.todayReservations || 0,
            averageRating: stats.averageRating || 0,
            monthlyRevenue: stats.monthlyRevenue || 0,
            portfolioPhotos: this.dashboardStats.portfolioPhotos // Sera mis à jour par loadPortfolioStats
          };
          this.isLoadingStats = false;
        },
        error: (error: any) => {
          console.error(' Erreur finale stats:', error);
          this.isLoadingStats = false;
          this.statsError = 'Impossible de charger les statistiques';
        }
      })
    );
    */
  }

  //  Calculer les statistiques à partir des vraies réservations
  private calculateStatsFromReservations(): void {
    this.subscriptions.add(
      this.reservationService.getFreelanceReservations().pipe(
        catchError((error: any) => {
          console.error(' Erreur lors du calcul des stats:', error);
          return of([]);
        })
      ).subscribe({
        next: (reservations: any[]) => {

          const today = new Date();
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          
          const monthAgo = new Date();
          monthAgo.setDate(today.getDate() - 30);
          
          // Réservations de cette semaine (basées sur datePrestation ou dateReservation)
          const weeklyReservations = reservations.filter(r => {
            const prestationDate = new Date(r.datePrestation || r.dateReservation);
            return prestationDate >= weekAgo && prestationDate <= today;
          });
          
          // Réservations de ce mois pour le revenu (terminées + confirmées)
          const monthlyReservations = reservations.filter(r => {
            const prestationDate = new Date(r.datePrestation || r.dateReservation);
            const statut = (r.status || r.statut || '').toUpperCase();
            return prestationDate >= monthAgo && prestationDate <= today
              && (statut === 'TERMINEE' || statut === 'COMPLETED'
                  || statut === 'CONFIRMEE' || statut === 'CONFIRMED');
          });

          const totalRevenue = monthlyReservations.reduce((sum, r) => {
            const prix = r.prixTotal
              ?? r.servicePrixMax
              ?? r.servicePrixMin
              ?? r.servicePrix
              ?? r.prix
              ?? r.montant
              ?? 0;
            return sum + prix;
          }, 0);
          
          this.dashboardStats = {
            weeklyAppointments: Math.max(weeklyReservations.length, reservations.length), // Afficher au moins le nombre total si aucune cette semaine
            averageRating: 0, // Sera mis à jour par loadRealAverageRating()
            monthlyRevenue: totalRevenue,
            portfolioPhotos: this.dashboardStats.portfolioPhotos || 0
          };
          
          // Charger la vraie note moyenne depuis les avis
          this.loadRealAverageRating();
          

          
          this.isLoadingStats = false;

        }
      })
    );
  }

  //  Calculer la vraie note moyenne basée sur les avis clients
  private loadRealAverageRating(): void {
    this.subscriptions.add(
      this.reservationService.getFreelanceAvis().pipe(
        catchError((error: any) => {
          console.error(' Erreur lors du chargement des avis:', error);
          return of([]);
        })
      ).subscribe({
        next: (avis: any[]) => {

          
          if (avis.length === 0) {
            this.dashboardStats.averageRating = 4.5; // Note par défaut

            return;
          }
          
          // Calculer la vraie moyenne des notes
          const total = avis.reduce((sum, avis) => sum + (avis.note || 0), 0);
          const average = total / avis.length;
          this.dashboardStats.averageRating = Math.round(average * 10) / 10;
          

        }
      })
    );
  }

  //  Charger les prochains rendez-vous
  private loadUpcomingAppointments(): void {
    this.isLoadingAppointments = true;
    

    
    this.subscriptions.add(
      this.reservationService.getFreelanceReservations().pipe(
        map((reservations: any[]) => {

          
          // Prendre toutes les réservations et les trier par date de prestation
          const sortedReservations = reservations
            .sort((a, b) => new Date(b.datePrestation || b.dateReservation).getTime() - new Date(a.datePrestation || a.dateReservation).getTime())
            .slice(0, 3);
          

          return sortedReservations;
        }),
        catchError((error: any) => {
          console.error(' Erreur lors du chargement des rendez-vous:', error);
          // Données de fallback
          return of([
            {
              id: 1,
              dateReservation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
              heureDebut: '14:00',
              serviceSalon: { nom: 'Soin du visage', duree: 60 },
              utilisateur: { prenom: 'Marie', nom: 'Dubois' },
              statut: 'CONFIRMEE'
            }
          ]);
        })
      ).subscribe({
        next: (reservations: any[]) => {

          this.upcomingAppointments = reservations.map((r: any) => ({
            id: r.id,
            date: new Date(r.datePrestation || r.dateReservation),
            time: new Date(r.heureDebut).toLocaleTimeString('fr-FR', {hour: '2-digit', minute: '2-digit'}),
            serviceName: r.serviceName || 'Service',
            clientName: r.clientFullName || `${r.clientPrenom || ''} ${r.clientNom || ''}`.trim() || 'Client',
            duration: Math.abs(r.dureeMinutes) || 60,
            status: r.status?.toLowerCase() || 'pending',
            statusLabel: this.getStatusLabel(r.status)
          }));
          

          this.isLoadingAppointments = false;
        },
        error: (error: any) => {
          console.error(' Erreur finale rendez-vous:', error);
          this.isLoadingAppointments = false;
        }
      })
    );
  }

  //  Charger les statistiques du portfolio
  private loadPortfolioStats(): void {
    if (!this.currentUser?.id) return;

    this.subscriptions.add(
      this.portfolioService.getFreelancePortfolio(this.currentUser.id).pipe(
        catchError((error: any) => {
          console.error(' Erreur portfolio:', error);
          return of([]);
        })
      ).subscribe({
        next: (items: any[]) => {
          this.portfolioItems = items || [];
          this.dashboardStats.portfolioPhotos = items?.length || 0;
        }
      })
    );
  }

  getPortfolioImageUrl(item: any): string {
    // PortfolioItem stores images in item.images[0].url
    const raw = item?.images?.[0]?.url
      || item?.photoUrl || item?.imageUrl || item?.url
      || item?.photo || item?.fichier || '';
    if (!raw) return '';
    if (raw.startsWith('http')) return raw;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    return `http://localhost:8081${path}`;
  }

  private loadLatestOpportunity(): void {
    this.subscriptions.add(
      this.offreService.getAllOffresEmplois().pipe(
        catchError(() => of([]))
      ).subscribe((offres: OffreEmploi[]) => {
        const ouvertes = offres.filter(o => o.status === 'OUVERT' || o.status === 'ACTIVE' || !o.status);
        this.totalOffres = ouvertes.length;
        this.latestOffre = ouvertes.sort((a, b) =>
          new Date(b.datePublication || b.dateCreation || 0).getTime() -
          new Date(a.datePublication || a.dateCreation || 0).getTime()
        )[0] || null;
      })
    );
  }

  private loadLoyalClients(): void {
    this.subscriptions.add(
      this.reservationService.getFreelanceReservations().pipe(
        catchError(() => of([]))
      ).subscribe({
        next: (reservations: any[]) => {
          const clientMap = new Map<string, any>();
          reservations.forEach((r: any) => {
            const name = (r.clientFullName || `${r.clientPrenom || ''} ${r.clientNom || ''}`.trim() || 'Client').trim();
            if (!clientMap.has(name)) {
              clientMap.set(name, {
                name,
                initials: name.split(' ').map((n: string) => n.charAt(0)).join('').slice(0, 2).toUpperCase(),
                count: 0,
                rating: 5.0,
                isFavorite: false
              });
            }
            const c = clientMap.get(name)!;
            c.count++;
            if (c.count >= 2) c.isFavorite = true;
          });
          this.totalClientsCount = clientMap.size;
          this.loyalClients = Array.from(clientMap.values())
            .sort((a, b) => b.count - a.count)
            .slice(0, 3);
        }
      })
    );
  }

  //  Charger les activités récentes
  private loadRecentActivities(): void {

    
    this.subscriptions.add(
      this.reservationService.getFreelanceReservations().pipe(
        catchError((error: any) => {
          console.error(' Erreur lors du chargement des activités:', error);
          return of([]);
        })
      ).subscribe({
        next: (reservations: any[]) => {

          
          this.recentActivities = [];
          
          // Générer des activités basées sur les vraies réservations
          reservations.forEach((reservation, index) => {
            const reservationDate = new Date(reservation.dateReservation);
            const timeDiff = Date.now() - reservationDate.getTime();
            const daysAgo = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
            
            let timeLabel = '';
            if (daysAgo === 0) {
              timeLabel = "Aujourd'hui";
            } else if (daysAgo === 1) {
              timeLabel = "Hier";
            } else if (daysAgo <= 7) {
              timeLabel = `Il y a ${daysAgo} jours`;
            } else {
              timeLabel = reservationDate.toLocaleDateString('fr-FR');
            }

            // Activité de réservation
            if (reservation.status === 'TERMINEE') {
              this.recentActivities.push({
                icon: 'check_circle',
                title: 'Prestation terminée',
                description: `${reservation.serviceName} avec ${reservation.clientFullName}`,
                time: timeLabel,
                type: 'completed'
              });
            } else if (reservation.status === 'CONFIRMEE') {
              this.recentActivities.push({
                icon: 'schedule',
                title: 'Nouvelle réservation confirmée',
                description: `${reservation.serviceName} - ${new Date(reservation.datePrestation).toLocaleDateString('fr-FR')}`,
                time: timeLabel,
                type: 'confirmed'
              });
            }

            // Ajouter d'autres types d'activités si nécessaire
            if (index === 0 && reservation.status === 'TERMINEE') {
              // Simuler un avis client pour la dernière prestation terminée
              this.recentActivities.push({
                icon: 'star',
                title: 'Prestation appréciée',
                description: `${reservation.clientFullName} a terminé sa séance "${reservation.serviceName}"`,
                time: timeLabel,
                type: 'review'
              });
            }
          });

          // Trier par ordre chronologique inverse et limiter à 4 activités
          this.recentActivities = this.recentActivities
            .sort((a, b) => {
              // Trier par type d'activité et temps
              if (a.time !== b.time) {
                return a.time.localeCompare(b.time);
              }
              return a.type.localeCompare(b.type);
            })
            .slice(0, 4);


        }
      })
    );
  }

  //  Utilitaire pour les labels de statut
  private getStatusLabel(status: string): string {
    const statusMap: { [key: string]: string } = {
      'CONFIRMEE': 'Confirmé',
      'EN_ATTENTE': 'En attente',
      'ANNULEE': 'Annulé',
      'TERMINEE': 'Terminé',
      'confirmed': 'Confirmé',
      'pending': 'En attente',
      'cancelled': 'Annulé',
      'completed': 'Terminé'
    };
    return statusMap[status] || 'Inconnu';
  }

  // ==========================================
  //  MÉTHODES DE NAVIGATION
  // ==========================================

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  backToHome() {
    this.resetViews();
  }

  navigateToPortfolio() {
    this.resetViews();
    this.showPortfolio = true;
  }

  navigateToOpportunities() {
    this.resetViews();
    this.showOpportunities = true;
  }

  navigateToServices() {
    this.resetViews();
    this.showServices = true;
  }

  navigateToProfile() {
    this.resetViews();
    this.showProfile = true;
  }


  
  navigateToAvailability() {
    this.resetViews();
    this.showAvailability = true;
  }

  navigateToReservations() {
    this.resetViews();
    this.showReservations = true;
  }

  navigateToNotifications() {
    this.resetViews();
    this.showNotifications = true;
  }

  resetViews() {
    this.showPortfolio = false;
    this.showOpportunities = false;
    this.showServices = false;
    this.showProfile = false;
    this.showAvailability = false;
    this.showReservations = false;
    this.showNotifications = false;
  }

  // ==========================================
  //  MÉTHODES D'AUTHENTIFICATION
  // ==========================================

  login(): void {
    this.authService.triggerLoginModal();
    
    //  Forcer le modal au-dessus après un délai - seulement côté browser
    if (this.isBrowser) {
      setTimeout(() => {
        this.forceModalOnTop();
      }, 100);
    }
  }

  forceLogin(): void {
    this.login();
  }

  goToMainPage(): void {
    this.router.navigate(['/']);
  }

  logout(): void {
    this.authService.logout().subscribe(() => {

      this.router.navigate(['/accueil']);
    });
  }

  // ==========================================
  //  GESTION DES MODALS (SSR-SAFE)
  // ==========================================

  //  Configuration de la gestion automatique des modals (seulement côté browser)
  private setupModalManagement(): void {
    if (!this.isBrowser) return;

    // Écouter l'ouverture des dialogs
    this.dialog.afterOpened.subscribe(() => {
      this.onModalOpen();
    });

    // Écouter la fermeture des dialogs
    this.dialog.afterAllClosed.subscribe(() => {
      this.onModalClose();
    });
  }

  //  Appelé à l'ouverture d'un modal (SSR-safe)
  private onModalOpen(): void {
    if (!this.isBrowser) return;
    
    if (typeof document !== 'undefined') {
      this.renderer.addClass(document.body, 'modal-open');
    }
    
    // Forcer les z-index des modals
    setTimeout(() => {
      this.forceModalOnTop();
    }, 50);
  }

  //  Appelé à la fermeture de tous les modals (SSR-safe)
  private onModalClose(): void {
    if (!this.isBrowser) return;
    
    // Retirer la classe
    if (typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'modal-open');
    }
  }

  //  Méthode utilitaire pour ouvrir un modal avec correction automatique
  openModalWithFix(component: any, config?: any): any {
    if (!this.isBrowser) {
      console.warn(' openModalWithFix called on server side - skipping');
      return null;
    }


    
    // Ouvrir le modal
    const dialogRef = this.dialog.open(component, {
      ...config,
      panelClass: ['force-modal-top', ...(config?.panelClass || [])],
      disableClose: config?.disableClose || false
    });

    // Forcer au-dessus après ouverture
    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        this.forceModalOnTop();
      }, 50);
    });

    return dialogRef;
  }

  // ==========================================
  //  MÉTHODES DE DEBUG ET CORRECTION (SSR-SAFE)
  // ==========================================

  //  Méthode de debug pour vérifier tous les z-index (SSR-safe)
  private debugZIndex(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn(' debugZIndex called on server side - skipping');
      return;
    }

    const elements = [
      { name: 'Body', selector: 'body' },
      { name: 'Sidebar', selector: '.beauty-sidebar, .mat-sidenav' },
      { name: 'Sidebar Backdrop', selector: '.mat-sidenav-backdrop' },
      { name: 'Toolbar', selector: '.beauty-toolbar' },
      { name: 'Modal Container', selector: '.cdk-overlay-container' },
      { name: 'Modal Dialog', selector: '.mat-dialog-container' },
      { name: 'Modal Backdrop', selector: '.cdk-overlay-backdrop' },
      { name: 'Modal Pane', selector: '.cdk-overlay-pane' }
    ];
    

    elements.forEach(({ name, selector }) => {
      const element = document.querySelector(selector);
      if (element) {
        const styles = window.getComputedStyle(element);
        const zIndex = styles.zIndex;
        const position = styles.position;
        const display = styles.display;
        

        
        if (selector === 'body') {

        }
      } else {

      }
    });
    
    // Compter les modals ouverts
    const openDialogs = document.querySelectorAll('.mat-dialog-container');

  }

  //  Méthode pour forcer les modals au-dessus (SSR-safe)
  private forceModalOnTop(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn(' forceModalOnTop called on server side - skipping');
      return;
    }
    
    const overlayContainer = document.querySelector('.cdk-overlay-container');
    const dialogs = document.querySelectorAll('.mat-dialog-container');
    const backdrops = document.querySelectorAll('.cdk-overlay-backdrop');
    const overlayPanes = document.querySelectorAll('.cdk-overlay-pane');
    
    // Forcer le container overlay
    if (overlayContainer) {
      (overlayContainer as HTMLElement).style.zIndex = '99999';

    }
    
    // Forcer tous les backdrops
    backdrops.forEach((backdrop, index) => {
      (backdrop as HTMLElement).style.zIndex = '99998';
      (backdrop as HTMLElement).style.position = 'fixed';

    });
    
    // Forcer tous les overlay panes
    overlayPanes.forEach((pane, index) => {
      (pane as HTMLElement).style.zIndex = '99999';

    });
    
    // Forcer tous les dialogs
    dialogs.forEach((dialog, index) => {
      (dialog as HTMLElement).style.zIndex = '100000';
      (dialog as HTMLElement).style.position = 'relative';

    });
    
    // Réduire le z-index de la sidebar
    const sidebars = document.querySelectorAll('.mat-sidenav, .beauty-sidebar');
    sidebars.forEach((sidebar, index) => {
      (sidebar as HTMLElement).style.zIndex = '50';

    });
    
    // Réduire le z-index des backdrops de sidebar
    const sidebarBackdrops = document.querySelectorAll('.mat-sidenav-backdrop');
    sidebarBackdrops.forEach((backdrop, index) => {
      (backdrop as HTMLElement).style.zIndex = '49';

    });
    

  }

  //  Méthode pour corriger tous les modals ouverts (SSR-safe)
  private fixAllModals(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn(' fixAllModals called on server side - skipping');
      return;
    }


    
    // Ajouter la classe au body
    this.renderer.addClass(document.body, 'modal-open');

    
    // Forcer tous les z-index
    this.forceModalOnTop();
    
    // Vérifier le résultat
    setTimeout(() => {

      this.debugZIndex();
    }, 100);
  }


  // ==========================================
  //  MÉTHODES POUR GÉRER L'UPLOAD DE PHOTO DE PROFIL
  // ==========================================

  onProfilePhotoUploaded(photoUrl: string): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, photoProfile: photoUrl };
      this.authService.setCurrentUser(this.currentUser);
    }
    this.loadUserData();
  }

  onProfilePhotoDeleted(): void {
    if (this.currentUser) {
      this.currentUser = { ...this.currentUser, photoProfile: null };
      this.authService.setCurrentUser(this.currentUser);
    }
    this.loadUserData();
  }

  // ==========================================
  //  MÉTHODES CALLBACK POUR LE COMPOSANT RÉSERVATIONS
  // ==========================================

  /**
   *  Callback appelé quand une réservation est mise à jour
   * @param event - Événement de mise à jour de la réservation
   */
  onReservationUpdated(event: any): void {

    
    // Ici vous pouvez gérer des actions supplémentaires si nécessaire
    // Par exemple : mettre à jour le dashboard, afficher une notification, etc.
    
    switch (event.action) {
      case 'completed':

        break;
      case 'cancelled':

        break;
      case 'no_show':

        break;
      default:

    }
  }

  /**
   *  Callback appelé quand les statistiques des réservations sont mises à jour
   * @param stats - Nouvelles statistiques
   */
  onReservationStatsUpdated(stats: any): void {

    
    // Stocker les stats pour une utilisation ultérieure si nécessaire
    this.reservationStats = stats;
    
    // Mettre à jour les cards du dashboard avec les vraies données
    if (stats) {
      const statsData = stats as any;
      this.dashboardStats = {
        ...this.dashboardStats,
        weeklyAppointments: statsData?.weeklyReservations || statsData?.totalReservations || this.dashboardStats.weeklyAppointments,
        monthlyRevenue: statsData?.monthlyRevenue || this.dashboardStats.monthlyRevenue,
        averageRating: statsData?.averageRating || this.dashboardStats.averageRating
      };

    }
  }

  //  Rafraîchir toutes les données
  refreshDashboard(): void {

    this.loadDashboardData();
  }
}