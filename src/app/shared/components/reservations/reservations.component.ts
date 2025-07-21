import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';


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
  statut: 'confirmee' | 'terminee' | 'annulee' | 'non_presentee'; // ✅ CORRIGÉ
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
export class ReservationsComponent implements OnInit {
  
  @Input() salons: Salon[] = [];
  @Output() closeEvent = new EventEmitter<void>();
  @Output() reservationUpdated = new EventEmitter<any>();
  @Output() statsUpdated = new EventEmitter<any>();
  
  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  loadingReservations = false;
  reservationsError: string | null = null;
  
  // ✅ STATISTIQUES CORRIGÉES
  confirmedReservationsCount = 0; // CONFIRMEE = "en attente" dans l'affichage
  completedReservationsCount = 0;   // TERMINEE
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
  }
  
  trackByReservationId(index: number, reservation: Reservation): number {
    return reservation.id;
  }
  
  /**
   * ✅ LABELS CORRIGÉS
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
  
  loadReservations(): void {
    this.loadingReservations = true;
    this.reservationsError = null;
    
    this.reservationService.getEmployeurReservations().subscribe({
      next: (data: any[]) => {
        console.log('Réservations chargées:', data);
        
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
          statut: this.normalizeStatut(reservation.statut || reservation.status || 'confirmee'),
          notes: reservation.notes || reservation.commentaires || ''
        }));
        
        this.calculateReservationsStats();
        this.filterReservations();
        this.loadingReservations = false;
        this.emitStatsToParent();
      },
      error: (error) => {
        console.error('Erreur lors du chargement des réservations:', error);
        this.reservationsError = 'Impossible de charger les réservations.';
        this.loadingReservations = false;
        this.loadMockReservations();
      }
    });
  }
  
  /**
   * ✅ MAPPING STATUTS CORRIGÉ
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
   * ✅ STATISTIQUES CORRIGÉES
   */
  private calculateReservationsStats(): void {
    const stats = {
      total: this.reservations.length,
      confirmees: 0,    // "En attente" dans l'affichage
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
    
    console.log('Statistiques calculées:', stats);
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
  // 🎯 ACTIONS CORRIGÉES
  // ==========================================
  
  /**
   * ✅ TERMINER (CONFIRMEE → TERMINEE)
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
   * ✅ ANNULER (CONFIRMEE → ANNULEE_PRESTATAIRE)
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
   * ✅ NOUVEAU : NON PRÉSENTÉ (CONFIRMEE → NON_PRESENTEE)
   */
  markNoShow(reservationId: number): void {
    console.log('Marquer non présenté:', reservationId);
    
    this.reservationService.marquerNonPresentee(reservationId).subscribe({
      next: (updatedReservation) => {
        console.log('Client marqué non présenté:', updatedReservation);
        this.updateLocalReservation(reservationId, updatedReservation);
        this.showSuccessMessage('Client marqué comme non présenté');
        this.reservationUpdated.emit({ action: 'no_show', reservation: updatedReservation });
      },
      error: (error) => {
        console.error('Erreur non présenté:', error);
        this.showErrorMessage('Impossible de marquer comme non présenté');
      }
    });
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
  
  filterReservations(): void {
    let filtered = [...this.reservations];
    
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
    
    if (this.statusFilter) {
      filtered = filtered.filter(r => r.statut === this.statusFilter);
    }
    
    if (this.salonFilter) {
      filtered = filtered.filter(r => r.salonId.toString() === this.salonFilter);
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
  }
  
  closeReservationModal(event?: MouseEvent): void {
    if (event && (event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.selectedReservation = null;
    } else if (!event) {
      this.selectedReservation = null;
    }
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
  
  // Méthodes d'affichage (inchangées)
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
  
  getSalonName(salonId: number): string {
    const salon = this.salons.find(s => s.id === salonId);
    return salon ? salon.nom : `Salon #${salonId}`;
  }
  
  getSalonAddress(salonId: number): string {
    const salon = this.salons.find(s => s.id === salonId);
    return salon ? salon.adresse : 'Adresse non trouvée';
  }
  
  private showSuccessMessage(message: string): void {
    console.log('✅ Succès:', message);
  }
  
  private showErrorMessage(message: string): void {
    console.error('❌ Erreur:', message);
  }
  
  /**
   * ✅ DONNÉES DE TEST CORRIGÉES
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
        datePrestation: new Date('2024-07-22T10:00:00'),
        dateCreation: new Date('2024-07-20T14:30:00'),
        statut: 'confirmee', // ✅ CORRIGÉ
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
        datePrestation: new Date('2024-07-21T14:00:00'),
        dateCreation: new Date('2024-07-19T09:15:00'),
        statut: 'terminee', // ✅ CORRIGÉ
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
        datePrestation: new Date(),
        dateCreation: new Date('2024-07-20T16:20:00'),
        statut: 'confirmee', // ✅ CORRIGÉ
        notes: ''
      }
    ];
    
    this.calculateReservationsStats();
    this.filterReservations();
    this.loadingReservations = false;
    this.emitStatsToParent();
  }
}