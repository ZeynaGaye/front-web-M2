import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';

interface Reservation {
  id: number;
  clientId: number;
  clientNom?: string;
  clientPrenom?: string;
  clientAdresse?: string;
  clientEmail?: string;
  clientTelephone?: string;
  salonId?: number;
  salonNom?: string;
  salonAdresse?: string;
  freelanceId?: number;
  freelanceNom?: string;
  serviceId: number;
  serviceNom: string;
  serviceDescription?: string;
  serviceDuree: number;
  servicePrix: number;
  datePrestation: Date;
  dateCreation: Date;
  statut: 'confirmee' | 'terminee' | 'annulee' | 'non_presentee';
  notes?: string;
}

interface Salon {
  id: number;
  nom: string;
  adresse: string;
  [key: string]: any;
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit, OnDestroy {

  @Input() salons: Salon[] = [];
  @Input() isFreelance: boolean = true; //  NOUVEAU: Indique si c'est pour un freelance
  @Input() isClient: boolean = false; //  NOUVEAU: Indique si c'est pour un client
  @Output() closeEvent = new EventEmitter<void>();
  @Output() reservationUpdated = new EventEmitter<any>();
  @Output() statsUpdated = new EventEmitter<any>();

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  loadingReservations = false;
  reservationsError: string | null = null;

  //  GESTION DES AVIS
  avis: any[] = [];
  loadingAvis = false;
  avisError: string | null = null;
  showAvisSection = true;

  //  STATISTIQUES
  confirmedReservationsCount = 0; // CONFIRMEE
  completedReservationsCount = 0; // TERMINEE
  todayReservationsCount = 0;
  totalRevenue = 0;

  searchTerm = '';
  statusFilter = '';
  salonFilter = '';
  dateFilter = '';
  viewMode: 'cards' | 'list' | 'calendar' = 'cards';

  constructor(private reservationService: ReservationService) {}

  ngOnInit(): void {
    this.loadReservations();
    this.loadAvis();
  }

  trackByReservationId(index: number, reservation: Reservation): number {
    return reservation.id;
  }

  /**
   *  LABELS CORRIGÉS
   */
  getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'confirmee': 'Confirmée',
      'terminee': 'Terminée',
      'annulee': 'Annulée',
      'non_presentee': 'Non présenté'
    };
    return labels[statut] || statut;
  }

  /**
   *  CHARGEMENT CORRIGÉ - Utilise la bonne méthode selon le contexte
   */
  loadReservations(): void {
    this.loadingReservations = true;
    this.reservationsError = null;



    //  CORRECTION: Utiliser la bonne méthode selon le contexte
    const reservationsObservable = this.isFreelance 
      ? this.reservationService.getFreelanceReservations()
      : this.reservationService.getEmployeurReservations();

    reservationsObservable.subscribe({
      next: (data: any[]) => {


        this.reservations = data.map(reservation => ({
          id: reservation.id,
          clientId: reservation.clientId || reservation.client?.id || reservation.utilisateurId,
          //  MAPPING CLIENT
          clientNom: reservation.clientNom || reservation.nomClient || reservation.client?.nom || `Client #${reservation.clientId}`,
          clientPrenom: reservation.clientPrenom || reservation.prenomClient || reservation.client?.prenom,
          clientAdresse: reservation.clientAdresse || reservation.adresseClient || reservation.client?.adresse,
          clientEmail: reservation.clientEmail || reservation.emailClient || reservation.client?.email,
          clientTelephone: reservation.clientTelephone || reservation.telephoneClient || reservation.client?.telephone,
          //  MAPPING SALON/FREELANCE
          salonId: reservation.salonId || reservation.salon?.id,
          salonNom: reservation.salonNom || reservation.nomSalon || reservation.salon?.nom,
          salonAdresse: reservation.salonAdresse || reservation.adresseSalon || reservation.salon?.adresse,
          freelanceId: reservation.freelanceId || reservation.freelance?.id,
          freelanceNom: reservation.freelanceNom || reservation.nomFreelance || reservation.freelance?.nom,
          //  MAPPING SERVICE
          serviceId: reservation.serviceId || reservation.serviceSalon?.id || reservation.service?.id,
          serviceNom: reservation.serviceNom || reservation.nomService || reservation.serviceSalon?.nom || reservation.service?.nom || reservation.serviceName || 'Service',
          serviceDescription: reservation.serviceDescription || reservation.descriptionService || reservation.serviceSalon?.description || reservation.service?.description,
          serviceDuree: reservation.serviceDuree || reservation.dureeService || reservation.serviceSalon?.duree || reservation.service?.duree || 30,
          servicePrix: reservation.servicePrix || reservation.prixService || reservation.serviceSalon?.prix || reservation.service?.prix || reservation.prixTotal || 0,
          //  MAPPING DATES
          datePrestation: new Date(reservation.datePrestation || reservation.dateRendezVous),
          dateCreation: new Date(reservation.dateCreation || reservation.createdAt || Date.now()),
          statut: this.normalizeStatut(reservation.statut || reservation.status || 'confirmee'),
          notes: reservation.notes || reservation.commentaires || ''
        }));

        this.calculateReservationsStats();
        this.filterReservations();
        this.loadingReservations = false;
        this.emitStatsToParent();
      },
      error: (error) => {
        console.error(' Erreur lors du chargement des réservations:', error);
        this.reservationsError = 'Impossible de charger les réservations.';
        this.loadingReservations = false;
        
        //  En cas d'erreur, essayer de charger des données de test pour le développement
        if (error.status === 403 || error.status === 401) {
          console.warn(' Erreur d\'autorisation - Chargement de données de test');
          this.loadMockReservations();
        }
      }
    });
  }

  /**
   *  MAPPING STATUTS CORRIGÉ
   */
  private normalizeStatut(statut: string): 'confirmee' | 'terminee' | 'annulee' | 'non_presentee' {
    const statusMap: { [key: string]: 'confirmee' | 'terminee' | 'annulee' | 'non_presentee' } = {
      'CONFIRMEE': 'confirmee',
      'confirmed': 'confirmee',
      'TERMINEE': 'terminee',
      'completed': 'terminee',
      'ANNULEE_CLIENT': 'annulee',
      'ANNULEE_PRESTATAIRE': 'annulee',
      'cancelled': 'annulee',
      'NON_PRESENTEE': 'non_presentee',
      'no_show': 'non_presentee'
    };

    return statusMap[statut] || 'confirmee';
  }

  /**
   *  STATISTIQUES CORRIGÉES
   */
  private calculateReservationsStats(): void {
    const stats = {
      total: this.reservations.length,
      confirmees: 0,
      terminees: 0,
      annulees: 0,
      nonPresentees: 0,
      chiffreAffaires: 0,
      reservationsAujourdhui: 0
    };

    const today = new Date().toISOString().split('T')[0];

    this.reservations.forEach(reservation => {
      switch (reservation.statut) {
        case 'confirmee':
          stats.confirmees++;
          break;
        case 'terminee':
          stats.terminees++;
          stats.chiffreAffaires += reservation.servicePrix;
          break;
        case 'annulee':
          stats.annulees++;
          break;
        case 'non_presentee':
          stats.nonPresentees++;
          break;
      }

      const reservationDate = new Date(reservation.datePrestation);
      if (reservationDate.toISOString().split('T')[0] === today) {
        stats.reservationsAujourdhui++;
      }
    });

    this.confirmedReservationsCount = stats.confirmees;
    this.completedReservationsCount = stats.terminees;
    this.todayReservationsCount = stats.reservationsAujourdhui;
    this.totalRevenue = stats.chiffreAffaires;


  }

  private emitStatsToParent(): void {
    const stats = {
      confirmedReservationsCount: this.confirmedReservationsCount,
      completedReservationsCount: this.completedReservationsCount,
      todayReservationsCount: this.todayReservationsCount,
      totalRevenue: this.totalRevenue
    };

    this.statsUpdated.emit(stats);
  }

  // ==========================================
  //  ACTIONS CORRIGÉES POUR FREELANCE
  // ==========================================

  /**
   *  TERMINER (CONFIRMEE → TERMINEE)
   */
  completeReservation(reservationId: number): void {


    this.reservationService.terminerReservation(reservationId).subscribe({
      next: (updatedReservation) => {

        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation terminée avec succès');
        this.reservationUpdated.emit({ action: 'completed', reservation: updatedReservation });
      },
      error: (error) => {
        console.error(' Erreur finalisation:', error);
        this.showErrorMessage('Impossible de terminer la réservation');
      }
    });
  }

  /**
   *  ANNULER/REFUSER (CONFIRMEE → ANNULEE_PRESTATAIRE)
   */
  cancelReservation(reservationId: number): void {


    const motif = this.isFreelance ? 'Annulée par le freelance' : 'Annulée par le salon';
    
    this.reservationService.refuserReservation(reservationId, motif).subscribe({
      next: (updatedReservation) => {

        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation annulée');
        this.reservationUpdated.emit({ action: 'cancelled', reservation: updatedReservation });
      },
      error: (error) => {
        console.error(' Erreur annulation:', error);
        this.showErrorMessage('Impossible d\'annuler la réservation');
      }
    });
  }

  /**
   *  MARQUER COMME NON PRÉSENTÉ (CONFIRMEE → NON_PRESENTEE)
   */
  markNoShow(reservationId: number): void {


    this.reservationService.marquerNonPresentee(reservationId).subscribe({
      next: (updatedReservation) => {

        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Client marqué comme non présenté');
        this.reservationUpdated.emit({ action: 'no_show', reservation: updatedReservation });
      },
      error: (error) => {
        console.error(' Erreur non présenté:', error);
        this.showErrorMessage('Impossible de marquer comme non présenté');
      }
    });
  }

  /**
   *  CONFIRMER UNE RÉSERVATION (pour freelance)
   */
  confirmReservation(reservationId: number): void {


    this.reservationService.confirmerReservation(reservationId).subscribe({
      next: (updatedReservation) => {

        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation confirmée');
        this.reservationUpdated.emit({ action: 'confirmed', reservation: updatedReservation });
      },
      error: (error) => {
        console.error(' Erreur confirmation:', error);
        this.showErrorMessage('Impossible de confirmer la réservation');
      }
    });
  }

  /**
   *  Fermer modal
   */
  closeReservationModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('modal')) {
      this.selectedReservation = null;
      document.body.style.overflow = 'auto';
    } else if (!event) {
      this.selectedReservation = null;
      document.body.style.overflow = 'auto';
    }
  }

  private updateLocalReservation(reservationId: number, updatedData: any): void {
    const index = this.reservations.findIndex(r => r.id === reservationId);
    if (index !== -1) {
      this.reservations[index] = {
        ...this.reservations[index],
        ...updatedData,
        statut: this.normalizeStatut(updatedData.statut || updatedData.status),
        datePrestation: new Date(updatedData.datePrestation || this.reservations[index].datePrestation),
        dateCreation: new Date(updatedData.dateCreation || this.reservations[index].dateCreation)
      };

      if (this.selectedReservation && this.selectedReservation.id === reservationId) {
        this.selectedReservation = this.reservations[index];
      }

      this.calculateReservationsStats();
      this.filterReservations();
      this.emitStatsToParent();
    }
  }

  // ==========================================
  //  FILTRAGE ET RECHERCHE
  // ==========================================

  filterReservations(): void {
    let filtered = [...this.reservations];

    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.clientNom?.toLowerCase().includes(searchLower) ||
        r.serviceNom?.toLowerCase().includes(searchLower) ||
        this.getServiceProviderName(r).toLowerCase().includes(searchLower) ||
        r.clientEmail?.toLowerCase().includes(searchLower) ||
        r.clientTelephone?.includes(this.searchTerm.trim())
      );
    }

    if (this.statusFilter) {
      filtered = filtered.filter(r => r.statut === this.statusFilter);
    }

    if (this.salonFilter) {
      filtered = filtered.filter(r => r.salonId?.toString() === this.salonFilter);
    }

    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter);
      filterDate.setHours(0, 0, 0, 0);

      filtered = filtered.filter(r => {
        const reservationDate = new Date(r.datePrestation);
        reservationDate.setHours(0, 0, 0, 0);
        return reservationDate.getTime() === filterDate.getTime();
      });
    }

    this.filteredReservations = filtered.sort((a, b) => {
      return new Date(b.datePrestation).getTime() - new Date(a.datePrestation).getTime();
    });
  }

  closeReservations(): void {
    this.closeEvent.emit();
  }

  viewReservationDetails(reservation: Reservation): void {
    this.selectedReservation = reservation;
    document.body.style.overflow = 'hidden';
  }

  setViewMode(mode: 'cards' | 'list' | 'calendar'): void {
    this.viewMode = mode;
  }

  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.salonFilter || this.dateFilter);
  }

  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.salonFilter = '';
    this.dateFilter = '';
    this.filterReservations();
  }

  // ==========================================
  //  MÉTHODES D'AFFICHAGE
  // ==========================================

  formatDay(date: Date): string {
    return date.getDate().toString().padStart(2, '0');
  }

  formatMonth(date: Date): string {
    const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN',
                    'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    return months[date.getMonth()];
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatFullDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  //  Méthodes pour gérer le nom et l'adresse du prestataire
  getServiceProviderName(reservation: Reservation): string {
    if (reservation.salonId) {
      const salon = this.salons.find(s => s.id === reservation.salonId);
      return reservation.salonNom || salon?.nom || `Salon #${reservation.salonId}`;
    } else if (reservation.freelanceId) {
      return reservation.freelanceNom || `Freelance #${reservation.freelanceId}`;
    }
    return 'Prestataire inconnu';
  }

  getServiceProviderAddress(reservation: Reservation): string {
    if (reservation.salonId) {
      const salon = this.salons.find(s => s.id === reservation.salonId);
      return reservation.salonAdresse || salon?.adresse || 'Adresse salon non trouvée';
    }
    return 'Adresse non applicable';
  }

  // ==========================================
  //  GESTION DES AVIS
  // ==========================================

  /**
   * Charger les avis selon le type d'utilisateur
   */
  loadAvis(): void {
    this.loadingAvis = true;
    this.avisError = null;

    const avisObservable = this.isFreelance 
      ? this.reservationService.getFreelanceAvis()
      : this.reservationService.getSalonAvis();

    avisObservable.subscribe({
      next: (data: any[]) => {

        this.avis = data;
        this.loadingAvis = false;
      },
      error: (error) => {
        console.error(' Erreur chargement avis:', error);
        this.avisError = 'Impossible de charger les avis';
        this.loadingAvis = false;
      }
    });
  }

  /**
   * Basculer l'affichage de la section avis
   */
  toggleAvisSection(): void {
    this.showAvisSection = !this.showAvisSection;
    if (this.showAvisSection && this.avis.length === 0) {
      this.loadAvis();
    }
  }

  /**
   * Formater les étoiles pour affichage
   */
  formatStars(rating: number): string {
    const stars = ''.repeat(rating) + ''.repeat(5 - rating);
    return stars;
  }

  /**
   * Formater la date relative
   */
  getRelativeTime(date: string | Date): string {
    const now = new Date();
    const targetDate = new Date(date);
    const diffMs = now.getTime() - targetDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Aujourd\'hui';
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} jours`;
    if (diffDays < 30) return `Il y a ${Math.floor(diffDays / 7)} semaines`;
    return `Il y a ${Math.floor(diffDays / 30)} mois`;
  }

  private showSuccessMessage(message: string): void {

    // Ici vous pouvez ajouter une notification toast
  }

  private showErrorMessage(message: string): void {
    console.error(' Erreur:', message);
    // Ici vous pouvez ajouter une notification toast d'erreur
  }

  /**
   *  DONNÉES DE TEST POUR LE DÉVELOPPEMENT
   */
  private loadMockReservations(): void {


    this.reservations = [
      {
        id: 1,
        clientId: 101,
        clientNom: 'Dupont',
        clientPrenom: 'Marie',
        clientAdresse: '123 Rue de la Paix, Paris',
        clientEmail: 'marie.dupont@email.com',
        clientTelephone: '0123456789',
        freelanceId: 1, //  Freelance, pas salon
        freelanceNom: 'Votre Freelance',
        serviceId: 1,
        serviceNom: 'Maquillage Mariage',
        serviceDescription: 'Maquillage complet pour mariage',
        serviceDuree: 120,
        servicePrix: 85000,
        datePrestation: new Date('2025-07-30T14:00:00'),
        dateCreation: new Date('2025-07-25T10:30:00'),
        statut: 'confirmee',
        notes: 'Maquillage naturel demandé'
      },
      {
        id: 2,
        clientId: 102,
        clientNom: 'Martin',
        clientPrenom: 'Sophie',
        clientAdresse: '789 Boulevard de la Joie, Lyon',
        clientEmail: 'sophie.martin@email.com',
        clientTelephone: '0987654321',
        freelanceId: 1,
        freelanceNom: 'Votre Freelance',
        serviceId: 2,
        serviceNom: 'Coiffure Soirée',
        serviceDescription: 'Coiffure élégante pour soirée',
        serviceDuree: 90,
        servicePrix: 65000,
        datePrestation: new Date('2025-07-28T18:00:00'),
        dateCreation: new Date('2025-07-26T15:20:00'),
        statut: 'terminee',
        notes: 'Cliente très satisfaite'
      },
      {
        id: 3,
        clientId: 103,
        clientNom: 'Leblanc',
        clientPrenom: 'Julie',
        clientAdresse: '10 Rue des Roses, Marseille',
        clientEmail: 'julie.leblanc@email.com',
        clientTelephone: '0156789123',
        freelanceId: 1,
        freelanceNom: 'Votre Freelance',
        serviceId: 3,
        serviceNom: 'Manucure & Pédicure',
        serviceDescription: 'Manucure et pédicure complètes',
        serviceDuree: 60,
        servicePrix: 45000,
        datePrestation: new Date(),
        dateCreation: new Date('2025-07-27T11:45:00'),
        statut: 'confirmee',
        notes: ''
      }
    ];

    this.calculateReservationsStats();
    this.filterReservations();
    this.loadingReservations = false;
    this.emitStatsToParent();
    
    // Supprimer l'erreur puisque les données de test sont chargées
    this.reservationsError = null;
  }

  ngOnDestroy(): void {
    // Restaurer le scroll de la page au cas où le modal serait ouvert
    document.body.style.overflow = 'auto';
  }
}