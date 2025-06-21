
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';

// Interface pour les réservations
interface Reservation {
  id: number;
  clientId: number;
  clientNom?: string;
  clientEmail?: string;
  clientTelephone?: string;
  salonId: number;
  serviceId: number;
  serviceNom: string;
  serviceDescription?: string;
  serviceDuree: number;
  servicePrix: number;
  datePrestation: Date;
  dateCreation: Date;
  statut: 'en_attente' | 'confirmee' | 'annulee' | 'terminee';
  notes?: string;
}

// Interface pour les salons (reçu du parent)
interface Salon {
  id: number;
  nom: string;
  adresse: string;
  [key: string]: any;
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit {
  
  // ===== INPUTS DEPUIS LE PARENT =====
  @Input() salons: Salon[] = []; // Liste des salons depuis le parent
  
  // ===== OUTPUTS VERS LE PARENT =====
  @Output() closeEvent = new EventEmitter<void>();
  @Output() reservationUpdated = new EventEmitter<any>();
  @Output() statsUpdated = new EventEmitter<any>();
  
  // ===== PROPRIÉTÉS DU COMPOSANT =====
  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  loadingReservations = false;
  reservationsError: string | null = null;
  
  // Statistiques des réservations
  pendingReservationsCount = 0;
  confirmedReservationsCount = 0;
  todayReservationsCount = 0;
  totalRevenue = 0;
  
  // Filtres et recherche
  searchTerm = '';
  statusFilter = '';
  salonFilter = '';
  dateFilter = '';
  viewMode: 'cards' | 'list' | 'calendar' = 'cards';
  
  constructor(private reservationService: ReservationService) {}
  
  ngOnInit(): void {
    this.loadReservations();
  }
  
  // ==========================================
  // 🔧 MÉTHODES UTILITAIRES TRACKBY (CORRIGÉ)
  // ==========================================
  
  /**
   * ✅ TrackBy pour optimiser les performances de ngFor
   */
  trackByReservationId(index: number, reservation: Reservation): number {
    return reservation.id;
  }
  
  /**
   * ✅ Formate le label du statut pour l'affichage
   */
  getStatusLabel(statut: string): string {
    const labels: { [key: string]: string } = {
      'en_attente': 'En attente',
      'confirmee': 'Confirmée',
      'annulee': 'Annulée',
      'terminee': 'Terminée'
    };
    return labels[statut] || statut;
  }
  
  // ==========================================
  // 📅 MÉTHODES DE CHARGEMENT DES DONNÉES
  // ==========================================
  
  /**
   * ✅ Charge toutes les réservations des salons de l'employeur
   */
  loadReservations(): void {
    this.loadingReservations = true;
    this.reservationsError = null;
    
    this.reservationService.getEmployeurReservations().subscribe({
      next: (data: any[]) => {
        console.log('Réservations chargées:', data);
        
        // Mapper les données selon votre structure
        this.reservations = data.map(reservation => ({
          id: reservation.id,
          clientId: reservation.clientId || reservation.utilisateurId,
          clientNom: reservation.clientNom || reservation.nomClient || `Client #${reservation.clientId}`,
          clientEmail: reservation.clientEmail || reservation.emailClient,
          clientTelephone: reservation.clientTelephone || reservation.telephoneClient,
          salonId: reservation.salonId,
          serviceId: reservation.serviceId,
          serviceNom: reservation.serviceNom || reservation.nomService || 'Service',
          serviceDescription: reservation.serviceDescription || reservation.descriptionService,
          serviceDuree: reservation.serviceDuree || reservation.dureeService || 30,
          servicePrix: reservation.servicePrix || reservation.prixService || 0,
          datePrestation: new Date(reservation.datePrestation || reservation.dateRendezVous),
          dateCreation: new Date(reservation.dateCreation || reservation.createdAt || Date.now()),
          statut: this.normalizeStatut(reservation.statut || reservation.status || 'en_attente'),
          notes: reservation.notes || reservation.commentaires || ''
        }));
        
        // Calculer les statistiques
        this.calculateReservationsStats();
        
        // Appliquer les filtres
        this.filterReservations();
        
        this.loadingReservations = false;
        console.log(`${this.reservations.length} réservations traitées`);
        
        // Émettre les stats vers le parent
        this.emitStatsToParent();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des réservations:', error);
        this.reservationsError = 'Impossible de charger les réservations.';
        this.loadingReservations = false;
        
        // Fallback avec données de test en développement
        this.loadMockReservations();
      }
    });
  }
  
  /**
   * ✅ Normalise le statut de réservation
   */
  private normalizeStatut(statut: string): 'en_attente' | 'confirmee' | 'annulee' | 'terminee' {
    const statusMap: { [key: string]: 'en_attente' | 'confirmee' | 'annulee' | 'terminee' } = {
      'pending': 'en_attente',
      'PENDING': 'en_attente',
      'confirmed': 'confirmee',
      'CONFIRMED': 'confirmee',
      'cancelled': 'annulee',
      'CANCELLED': 'annulee',
      'completed': 'terminee',
      'COMPLETED': 'terminee'
    };
    
    return statusMap[statut] || 'en_attente';
  }
  
  /**
   * ✅ Calcule les statistiques des réservations
   */
  private calculateReservationsStats(): void {
    const stats = {
      total: this.reservations.length,
      enAttente: 0,
      confirmees: 0,
      annulees: 0,
      terminees: 0,
      chiffreAffaires: 0,
      reservationsAujourdhui: 0
    };
    
    const today = new Date().toISOString().split('T')[0];
    
    this.reservations.forEach(reservation => {
      // Compter par statut
      switch (reservation.statut) {
        case 'en_attente':
          stats.enAttente++;
          break;
        case 'confirmee':
          stats.confirmees++;
          break;
        case 'annulee':
          stats.annulees++;
          break;
        case 'terminee':
          stats.terminees++;
          stats.chiffreAffaires += reservation.servicePrix;
          break;
      }
      
      // Compter réservations du jour
      const reservationDate = new Date(reservation.datePrestation);
      if (reservationDate.toISOString().split('T')[0] === today) {
        stats.reservationsAujourdhui++;
      }
    });
    
    this.pendingReservationsCount = stats.enAttente;
    this.confirmedReservationsCount = stats.confirmees;
    this.todayReservationsCount = stats.reservationsAujourdhui;
    this.totalRevenue = stats.chiffreAffaires;
    
    console.log('Statistiques calculées:', stats);
  }
  
  /**
   * ✅ Émet les statistiques vers le composant parent
   */
  private emitStatsToParent(): void {
    const stats = {
      pendingReservationsCount: this.pendingReservationsCount,
      confirmedReservationsCount: this.confirmedReservationsCount,
      todayReservationsCount: this.todayReservationsCount,
      totalRevenue: this.totalRevenue
    };
    
    this.statsUpdated.emit(stats);
  }
  
  // ==========================================
  // 🎯 ACTIONS SUR LES RÉSERVATIONS
  // ==========================================
  
  /**
   * ✅ Confirme une réservation en attente
   */
  confirmReservation(reservationId: number): void {
    console.log('Confirmation réservation:', reservationId);
    
    this.reservationService.confirmerReservation(reservationId).subscribe({
      next: (updatedReservation) => {
        console.log('Réservation confirmée:', updatedReservation);
        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation confirmée avec succès');
        this.reservationUpdated.emit({ action: 'confirmed', reservation: updatedReservation });
      },
      error: (error) => {
        console.error('Erreur confirmation:', error);
        this.showErrorMessage('Impossible de confirmer la réservation');
      }
    });
  }
  
  /**
   * ✅ Refuse une réservation en attente
   */
  rejectReservation(reservationId: number, motif?: string): void {
    console.log('Refus réservation:', reservationId, motif);
    
    this.reservationService.refuserReservation(reservationId, motif).subscribe({
      next: (updatedReservation) => {
        console.log('Réservation refusée:', updatedReservation);
        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation refusée');
        this.reservationUpdated.emit({ action: 'rejected', reservation: updatedReservation });
      },
      error: (error) => {
        console.error('Erreur refus:', error);
        this.showErrorMessage('Impossible de refuser la réservation');
      }
    });
  }
  
  /**
   * ✅ Termine une réservation confirmée
   */
  completeReservation(reservationId: number): void {
    console.log('Finalisation réservation:', reservationId);
    
    this.reservationService.terminerReservation(reservationId).subscribe({
      next: (updatedReservation) => {
        console.log('Réservation terminée:', updatedReservation);
        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation terminée avec succès');
        this.reservationUpdated.emit({ action: 'completed', reservation: updatedReservation });
      },
      error: (error) => {
        console.error('Erreur finalisation:', error);
        this.showErrorMessage('Impossible de terminer la réservation');
      }
    });
  }
  
  /**
   * ✅ Annule une réservation confirmée
   */
  cancelReservation(reservationId: number): void {
    console.log('Annulation réservation:', reservationId);
    
    this.reservationService.refuserReservation(reservationId, 'Annulée par le salon').subscribe({
      next: (updatedReservation) => {
        console.log('Réservation annulée:', updatedReservation);
        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Réservation annulée');
        this.reservationUpdated.emit({ action: 'cancelled', reservation: updatedReservation });
      },
      error: (error) => {
        console.error('Erreur annulation:', error);
        this.showErrorMessage('Impossible d\'annuler la réservation');
      }
    });
  }
  
  /**
   * ✅ Met à jour une réservation dans la liste locale
   */
  private updateLocalReservation(reservationId: number, updatedData: any): void {
    const index = this.reservations.findIndex(r => r.id === reservationId);
    if (index !== -1) {
      // Mettre à jour la réservation
      this.reservations[index] = {
        ...this.reservations[index],
        ...updatedData,
        statut: this.normalizeStatut(updatedData.statut || updatedData.status),
        datePrestation: new Date(updatedData.datePrestation || this.reservations[index].datePrestation),
        dateCreation: new Date(updatedData.dateCreation || this.reservations[index].dateCreation)
      };
      
      // Mettre à jour la réservation sélectionnée si c'est la même
      if (this.selectedReservation && this.selectedReservation.id === reservationId) {
        this.selectedReservation = this.reservations[index];
      }
      
      // Recalculer les statistiques
      this.calculateReservationsStats();
      
      // Refiltrer les réservations
      this.filterReservations();
      
      // Émettre les nouvelles stats
      this.emitStatsToParent();
    }
  }
  
  // ==========================================
  // 🔍 FILTRAGE ET RECHERCHE
  // ==========================================
  
  /**
   * ✅ Filtre les réservations selon les critères
   */
  filterReservations(): void {
    let filtered = [...this.reservations];
    
    // Filtre par terme de recherche
    if (this.searchTerm.trim()) {
      const searchLower = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.clientNom?.toLowerCase().includes(searchLower) ||
        r.serviceNom?.toLowerCase().includes(searchLower) ||
        this.getSalonName(r.salonId).toLowerCase().includes(searchLower) ||
        r.clientEmail?.toLowerCase().includes(searchLower) ||
        r.clientTelephone?.includes(this.searchTerm.trim())
      );
    }
    
    // Filtre par statut
    if (this.statusFilter) {
      filtered = filtered.filter(r => r.statut === this.statusFilter);
    }
    
    // Filtre par salon
    if (this.salonFilter) {
      filtered = filtered.filter(r => r.salonId.toString() === this.salonFilter);
    }
    
    // Filtre par date
    if (this.dateFilter) {
      const filterDate = new Date(this.dateFilter);
      filterDate.setHours(0, 0, 0, 0);
      
      filtered = filtered.filter(r => {
        const reservationDate = new Date(r.datePrestation);
        reservationDate.setHours(0, 0, 0, 0);
        return reservationDate.getTime() === filterDate.getTime();
      });
    }
    
    // Trier par date (plus récent en premier)
    this.filteredReservations = filtered.sort((a, b) => {
      return new Date(b.datePrestation).getTime() - new Date(a.datePrestation).getTime();
    });
    
    console.log(`${this.filteredReservations.length} réservations après filtrage`);
  }
  
  // ==========================================
  // 🎯 NAVIGATION ET UI
  // ==========================================
  
  /**
   * ✅ Ferme le composant et émet vers le parent
   */
  closeReservations(): void {
    this.closeEvent.emit();
  }
  
  /**
   * ✅ Affiche les détails d'une réservation
   */
  viewReservationDetails(reservation: Reservation): void {
    this.selectedReservation = reservation;
    console.log('Affichage détails réservation:', reservation);
  }
  
  /**
   * ✅ Ferme la modal de détails
   */
  closeReservationModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.selectedReservation = null;
    } else if (!event) {
      this.selectedReservation = null;
    }
  }
  
  /**
   * ✅ Change le mode d'affichage
   */
  setViewMode(mode: 'cards' | 'list' | 'calendar'): void {
    this.viewMode = mode;
    console.log('Mode d\'affichage changé:', mode);
  }
  
  /**
   * ✅ Vérifie s'il y a des filtres actifs
   */
  hasActiveFilters(): boolean {
    return !!(this.searchTerm || this.statusFilter || this.salonFilter || this.dateFilter);
  }
  
  /**
   * ✅ Efface tous les filtres
   */
  clearFilters(): void {
    this.searchTerm = '';
    this.statusFilter = '';
    this.salonFilter = '';
    this.dateFilter = '';
    this.filterReservations();
    console.log('Filtres effacés');
  }
  
  // ==========================================
  // 🎨 MÉTHODES D'AFFICHAGE
  // ==========================================
  
  /**
   * ✅ Formate le jour pour l'affichage
   */
  formatDay(date: Date): string {
    return date.getDate().toString().padStart(2, '0');
  }
  
  /**
   * ✅ Formate le mois pour l'affichage
   */
  formatMonth(date: Date): string {
    const months = ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUN', 
                   'JUL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'];
    return months[date.getMonth()];
  }
  
  /**
   * ✅ Formate l'heure
   */
  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }
  
  /**
   * ✅ Formate la date complète
   */
  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
  
  /**
   * ✅ Formate la date complète avec jour
   */
  formatFullDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }
  
  /**
   * ✅ Retourne le nom d'un salon
   */
  getSalonName(salonId: number): string {
    const salon = this.salons.find(s => s.id === salonId);
    return salon ? salon.nom : `Salon #${salonId}`;
  }
  
  /**
   * ✅ Retourne l'adresse d'un salon
   */
  getSalonAddress(salonId: number): string {
    const salon = this.salons.find(s => s.id === salonId);
    return salon ? salon.adresse : 'Adresse non trouvée';
  }
  
  // ==========================================
  // 💬 MESSAGES ET NOTIFICATIONS
  // ==========================================
  
  /**
   * ✅ Affiche un message de succès
   */
  private showSuccessMessage(message: string): void {
    console.log('✅ Succès:', message);
    // Ici vous pouvez intégrer votre système de notifications
    // Exemple : this.toastr.success(message);
  }
  
  /**
   * ✅ Affiche un message d'erreur
   */
  private showErrorMessage(message: string): void {
    console.error('❌ Erreur:', message);
    // Ici vous pouvez intégrer votre système de notifications
    // Exemple : this.toastr.error(message);
  }
  
  // ==========================================
  // 🧪 DONNÉES DE TEST (DÉVELOPPEMENT)
  // ==========================================
  
  /**
   * ✅ Charge des données de test (fallback développement)
   */
  private loadMockReservations(): void {
    console.log('🧪 Chargement de données de test');
    
    this.reservations = [
      {
        id: 1,
        clientId: 101,
        clientNom: 'Marie Dupont',
        clientEmail: 'marie.dupont@email.com',
        clientTelephone: '0123456789',
        salonId: 1,
        serviceId: 1,
        serviceNom: 'Coupe + Brushing',
        serviceDescription: 'Coupe personnalisée avec brushing',
        serviceDuree: 60,
        servicePrix: 45000,
        datePrestation: new Date('2024-06-17T10:00:00'),
        dateCreation: new Date('2024-06-15T14:30:00'),
        statut: 'en_attente',
        notes: 'Première visite au salon'
      },
      {
        id: 2,
        clientId: 102,
        clientNom: 'Sophie Martin',
        clientEmail: 'sophie.martin@email.com',
        clientTelephone: '0987654321',
        salonId: 1,
        serviceId: 2,
        serviceNom: 'Coloration',
        serviceDescription: 'Coloration complète',
        serviceDuree: 120,
        servicePrix: 75000,
        datePrestation: new Date('2024-06-16T14:00:00'),
        dateCreation: new Date('2024-06-14T09:15:00'),
        statut: 'confirmee',
        notes: 'Allergie aux sulfates'
      },
      {
        id: 3,
        clientId: 103,
        clientNom: 'Julie Leblanc',
        clientEmail: 'julie.leblanc@email.com',
        clientTelephone: '0156789123',
        salonId: 2,
        serviceId: 3,
        serviceNom: 'Manucure',
        serviceDescription: 'Manucure française',
        serviceDuree: 45,
        servicePrix: 25000,
        datePrestation: new Date(), // Aujourd'hui
        dateCreation: new Date('2024-06-14T16:20:00'),
        statut: 'terminee',
        notes: ''
      }
    ];
    
    this.calculateReservationsStats();
    this.filterReservations();
    this.loadingReservations = false;
    this.emitStatsToParent();
  }
}