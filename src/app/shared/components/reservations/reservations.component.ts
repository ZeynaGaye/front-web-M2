import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnInit, OnDestroy, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';
import { CalendarComponent } from '../calendar/calendar.component';
import { AuthService } from '../../../core/servces/auth.service';
import { ServiceFreelanceService } from '../../../freelance/ServiceFreelance/service-freelance.service';

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
  freelanceId?: number;
  freelanceNom?: string;
  serviceId: number;
  serviceNom: string;
  serviceDescription?: string;
  serviceDuree: number;
  servicePrix: number;
  datePrestation: Date;
  dateCreation: Date;
  statut: 'confirmee' | 'terminee' | 'annulee' | 'non_presentee' | 'en_attente';
  notes?: string;
}

interface Salon {
  id: number;
  nom: string;
  adresse: string;
  [key: string]: any;
}

interface TimelineStep {
  label: string;
  dateStr: string;
  status: 'done' | 'upcoming';
}

@Component({
  selector: 'app-reservations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, CalendarComponent],
  templateUrl: './reservations.component.html',
  styleUrls: ['./reservations.component.scss']
})
export class ReservationsComponent implements OnInit, OnDestroy {

  @Input() salons: Salon[] = [];
  @Input() isFreelance: boolean = true;
  @Input() isClient: boolean = false;
  @Output() closeEvent = new EventEmitter<void>();
  @Output() reservationUpdated = new EventEmitter<any>();
  @Output() statsUpdated = new EventEmitter<any>();

  reservations: Reservation[] = [];
  filteredReservations: Reservation[] = [];
  selectedReservation: Reservation | null = null;
  showDetail = false;
  showCalendar = false;

  loadingReservations = false;
  reservationsError: string | null = null;

  freelanceServices: any[] = [];
  avis: any[] = [];
  loadingAvis = false;

  confirmedReservationsCount = 0;
  completedReservationsCount = 0;
  todayReservationsCount = 0;
  totalRevenue = 0;

  activeTab: 'upcoming' | 'pending' | 'history' | 'avis' = 'upcoming';

  constructor(
    private reservationService: ReservationService,
    private authService: AuthService,
    private serviceFreelanceService: ServiceFreelanceService
  ) {}

  ngOnInit(): void {
    this.loadReservations();
    this.loadAvis();
  }

  // ─── Tab navigation ──────────────────────────────────

  setActiveTab(tab: 'upcoming' | 'pending' | 'history' | 'avis'): void {
    this.activeTab = tab;
  }

  // ─── Detail view ─────────────────────────────────────

  viewReservationDetails(r: Reservation): void {
    this.selectedReservation = r;
    this.showDetail = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  backToList(): void {
    this.selectedReservation = null;
    this.showDetail = false;
  }

  // ─── Computed lists ──────────────────────────────────

  get upcomingReservations(): Reservation[] {
    const now = new Date();
    return this.reservations
      .filter(r => r.statut === 'confirmee' && new Date(r.datePrestation) >= now)
      .sort((a, b) => new Date(a.datePrestation).getTime() - new Date(b.datePrestation).getTime());
  }

  get pendingReservations(): Reservation[] {
    return this.reservations
      .filter(r => r.statut === 'en_attente')
      .sort((a, b) => new Date(a.datePrestation).getTime() - new Date(b.datePrestation).getTime());
  }

  get historyReservations(): Reservation[] {
    const now = new Date();
    return this.reservations
      .filter(r =>
        r.statut === 'terminee' || r.statut === 'annulee' || r.statut === 'non_presentee' ||
        (r.statut === 'confirmee' && new Date(r.datePrestation) < now)
      )
      .sort((a, b) => new Date(b.datePrestation).getTime() - new Date(a.datePrestation).getTime());
  }

  // ─── Week stats ───────────────────────────────────────

  private getWeekBounds(): { start: Date; end: Date } {
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay() + 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 7);
    return { start, end };
  }

  get weeklyCount(): number {
    const { start, end } = this.getWeekBounds();
    return this.reservations.filter(r => { const d = new Date(r.datePrestation); return d >= start && d < end; }).length;
  }

  get weeklyConfirmedCount(): number {
    const { start, end } = this.getWeekBounds();
    return this.reservations.filter(r => {
      const d = new Date(r.datePrestation);
      return d >= start && d < end && r.statut === 'confirmee';
    }).length;
  }

  get weeklyPendingCount(): number { return this.pendingReservations.length; }

  get weeklyExpectedRevenue(): number {
    return this.upcomingReservations.reduce((s, r) => s + (r.servicePrix || 0), 0);
  }

  // ─── Avis ─────────────────────────────────────────────

  get averageRating(): number {
    if (!this.avis.length) return 0;
    return Math.round(this.avis.reduce((s, a) => s + (a.note || 0), 0) / this.avis.length * 10) / 10;
  }

  get recentAvis(): any[] { return this.avis.slice(0, 3); }

  // ─── Detail helpers ───────────────────────────────────

  getDaysUntil(date: Date): number {
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const d = new Date(date); d.setHours(0, 0, 0, 0);
    return Math.round((d.getTime() - now.getTime()) / 86400000);
  }

  getEndTime(date: Date, duration: number): string {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + duration);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getClientPrestationsCount(clientId: number): number {
    return this.reservations.filter(r => r.clientId === clientId).length;
  }

  getTimelineSteps(r: Reservation): TimelineStep[] {
    const now = new Date();
    const datePrestation = new Date(r.datePrestation);
    const dayBefore = new Date(datePrestation);
    dayBefore.setDate(dayBefore.getDate() - 1);
    dayBefore.setHours(8, 0, 0, 0);

    const isConfirmed = ['confirmee', 'terminee', 'non_presentee'].includes(r.statut);

    return [
      {
        label: 'Réservation reçue',
        dateStr: this.formatMiniDate(r.dateCreation),
        status: 'done'
      },
      {
        label: 'Confirmée par vous',
        dateStr: isConfirmed ? this.formatMiniDate(r.dateCreation) : '—',
        status: isConfirmed ? 'done' : 'upcoming'
      },
      {
        label: 'Rappel automatique à la cliente',
        dateStr: `Prévu le ${this.formatDayMonth(dayBefore)}`,
        status: now >= dayBefore ? 'done' : 'upcoming'
      },
      {
        label: 'Prestation réalisée',
        dateStr: `${this.formatDayMonth(datePrestation)} · ${this.formatTime(datePrestation)}`,
        status: r.statut === 'terminee' ? 'done' : 'upcoming'
      }
    ];
  }

  // ─── Utility ─────────────────────────────────────────

  trackByReservationId(_: number, r: Reservation): number { return r.id; }

  getStatusLabel(statut: string): string {
    const labels: { [k: string]: string } = {
      confirmee: 'Confirmée', terminee: 'Terminée',
      annulee: 'Annulée', non_presentee: 'Non présenté', en_attente: 'En attente'
    };
    return labels[statut] || statut;
  }

  getClientInitials(r: Reservation): string {
    return ((r.clientPrenom?.charAt(0) || '') + (r.clientNom?.charAt(0) || '')).toUpperCase();
  }

  getAvisInitials(a: any): string {
    const name: string = a.nomClient || '';
    return name.split(' ').map((n: string) => n.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  getStarArray(rating: number): number[] { return Array(Math.min(5, Math.round(rating || 0))).fill(0); }
  getEmptyStarArray(rating: number): number[] { return Array(5 - Math.min(5, Math.round(rating || 0))).fill(0); }

  contactClient(r: Reservation): void {
    if (r.clientEmail) window.open(`mailto:${r.clientEmail}`);
    else if (r.clientTelephone) window.open(`tel:${r.clientTelephone}`);
  }

  callClient(r: Reservation): void {
    if (r.clientTelephone) window.open(`tel:${r.clientTelephone}`);
  }

  // ─── Date formatting ──────────────────────────────────

  formatDay(date: Date): string { return new Date(date).getDate().toString().padStart(2, '0'); }

  formatMonth(date: Date): string {
    return ['JAN','FÉV','MAR','AVR','MAI','JUN','JUL','AOÛ','SEP','OCT','NOV','DÉC'][new Date(date).getMonth()];
  }

  formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  formatFullDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  formatShortDate(date: Date): string {
    return new Date(date).toLocaleDateString('fr-FR',
      { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
  }

  private formatMiniDate(date: Date): string {
    const d = new Date(date);
    const months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
    const time = d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    return `${d.getDate()} ${months[d.getMonth()]} · ${time}`;
  }

  private formatDayMonth(date: Date): string {
    const d = new Date(date);
    const months = ['jan','fév','mar','avr','mai','jun','jul','aoû','sep','oct','nov','déc'];
    return `${d.getDate()} ${months[d.getMonth()]}`;
  }

  getRelativeTime(date: string | Date): string {
    const diff = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
    if (diff === 0) return 'Aujourd\'hui';
    if (diff === 1) return 'Hier';
    if (diff < 7) return `Il y a ${diff} jours`;
    if (diff < 30) return `Il y a ${Math.floor(diff / 7)} semaines`;
    return `Il y a ${Math.floor(diff / 30)} mois`;
  }

  // ─── Data loading ─────────────────────────────────────

  loadReservations(): void {
    this.loadingReservations = true;
    this.reservationsError = null;

    const obs = this.isFreelance
      ? this.reservationService.getFreelanceReservations()
      : this.reservationService.getEmployeurReservations();

    obs.subscribe({
      next: (data: any[]) => {
        this.reservations = data.map(r => ({
          id: r.id,
          clientId: r.clientId || r.client?.id || r.utilisateurId,
          clientNom: r.clientNom || r.nomClient || r.client?.nom || `Client #${r.clientId}`,
          clientPrenom: r.clientPrenom || r.prenomClient || r.client?.prenom,
          clientAdresse: r.clientAdresse || r.adresseClient || r.client?.adresse,
          clientEmail: r.clientEmail || r.emailClient || r.client?.email,
          clientTelephone: r.clientTelephone || r.telephoneClient || r.client?.telephone,
          salonId: r.salonId || r.salon?.id,
          salonNom: r.salonNom || r.nomSalon || r.salon?.nom,
          freelanceId: r.freelanceId || r.freelance?.id,
          freelanceNom: r.freelanceNom || r.nomFreelance || r.freelance?.nom,
          serviceId: r.serviceId || r.serviceSalon?.id || r.service?.id,
          serviceNom: r.serviceName || r.serviceNom || r.nomService || r.serviceSalon?.nom || r.service?.nom || 'Service',
          serviceDescription: r.serviceDescription || r.serviceSalon?.description,
          serviceDuree: r.dureeMinutes || r.serviceDuree || r.dureeService || r.serviceSalon?.duree || r.service?.dureeEnMinutes || r.service?.duree || 30,
          servicePrix: r.prixTotal || r.servicePrix || r.prixService || r.serviceSalon?.prix || r.service?.prix || 0,
          datePrestation: new Date(r.heureDebut || r.datePrestation || r.dateRendezVous),
          dateCreation: new Date(r.dateReservation || r.dateCreation || r.createdAt || Date.now()),
          statut: this.normalizeStatut(r.status || r.statut || 'confirmee'),
          notes: r.notes || r.commentaires || ''
        }));
        this.calculateStats();
        this.filteredReservations = [...this.reservations];
        this.loadingReservations = false;
        this.emitStats();
      },
      error: (err) => {
        console.error('Erreur réservations:', err);
        this.reservationsError = 'Impossible de charger les réservations.';
        this.loadingReservations = false;
        if (err.status === 403 || err.status === 401) this.loadMockReservations();
      }
    });
  }

  loadAvis(): void {
    this.loadingAvis = true;
    const obs = this.isFreelance
      ? this.reservationService.getFreelanceAvis()
      : this.reservationService.getSalonAvis();
    obs.subscribe({
      next: (data: any[]) => { this.avis = data; this.loadingAvis = false; },
      error: () => { this.loadingAvis = false; }
    });
  }

  loadFreelanceServices(): void {
    const user = this.authService.getCurrentUser();
    const id = user?.id || user?.freelanceId || user?.userId;
    if (!id) return;
    this.serviceFreelanceService.getServicesByFreelance(id).subscribe({
      next: (services: any[]) => { this.freelanceServices = services; },
      error: () => {}
    });
  }

  private normalizeStatut(statut: string): Reservation['statut'] {
    const map: { [k: string]: Reservation['statut'] } = {
      CONFIRMEE: 'confirmee', confirmed: 'confirmee',
      TERMINEE: 'terminee', completed: 'terminee',
      ANNULEE_CLIENT: 'annulee', ANNULEE_PRESTATAIRE: 'annulee', cancelled: 'annulee',
      NON_PRESENTEE: 'non_presentee', no_show: 'non_presentee',
      EN_ATTENTE: 'en_attente', pending: 'en_attente', waiting: 'en_attente',
      confirmee: 'confirmee', terminee: 'terminee', annulee: 'annulee',
      non_presentee: 'non_presentee', en_attente: 'en_attente'
    };
    return map[statut] || 'confirmee';
  }

  private calculateStats(): void {
    const today = new Date().toISOString().split('T')[0];
    this.confirmedReservationsCount = 0;
    this.completedReservationsCount = 0;
    this.todayReservationsCount = 0;
    this.totalRevenue = 0;
    this.reservations.forEach(r => {
      if (r.statut === 'confirmee') this.confirmedReservationsCount++;
      if (r.statut === 'terminee') { this.completedReservationsCount++; this.totalRevenue += r.servicePrix; }
      if (new Date(r.datePrestation).toISOString().split('T')[0] === today) this.todayReservationsCount++;
    });
  }

  private emitStats(): void {
    this.statsUpdated.emit({
      confirmedReservationsCount: this.confirmedReservationsCount,
      completedReservationsCount: this.completedReservationsCount,
      todayReservationsCount: this.todayReservationsCount,
      totalRevenue: this.totalRevenue
    });
  }

  // ─── Actions ──────────────────────────────────────────

  confirmReservation(id: number): void {
    this.reservationService.confirmerReservation(id).subscribe({
      next: (u) => { this.updateLocal(id, u); this.reservationUpdated.emit({ action: 'confirmed', reservation: u }); },
      error: (e) => console.error('Erreur confirmation:', e)
    });
  }

  cancelReservation(id: number): void {
    const motif = this.isFreelance ? 'Annulée par le freelance' : 'Annulée par le salon';
    this.reservationService.refuserReservation(id, motif).subscribe({
      next: (u) => {
        this.updateLocal(id, u);
        this.reservationUpdated.emit({ action: 'cancelled', reservation: u });
        if (this.showDetail) this.backToList();
      },
      error: (e) => console.error('Erreur annulation:', e)
    });
  }

  markNoShow(id: number): void {
    this.reservationService.marquerNonPresentee(id).subscribe({
      next: (u) => { this.updateLocal(id, u); this.reservationUpdated.emit({ action: 'no_show', reservation: u }); },
      error: (e) => console.error('Erreur non présenté:', e)
    });
  }

  private updateLocal(id: number, updated: any): void {
    const i = this.reservations.findIndex(r => r.id === id);
    if (i !== -1) {
      this.reservations[i] = {
        ...this.reservations[i], ...updated,
        statut: this.normalizeStatut(updated.statut || updated.status),
        datePrestation: new Date(updated.datePrestation || this.reservations[i].datePrestation),
        dateCreation: new Date(updated.dateCreation || this.reservations[i].dateCreation)
      };
      if (this.selectedReservation?.id === id) this.selectedReservation = this.reservations[i];
      this.calculateStats();
      this.emitStats();
    }
  }

  handleNewReservation(rdvData: any): void {
    const [h, m] = (rdvData.heureDebut || '10:00').split(':').map(Number);
    const date = rdvData.datePrestation instanceof Date
      ? new Date(rdvData.datePrestation)
      : new Date(rdvData.datePrestation);
    date.setHours(h, m, 0, 0);

    const statusMap: { [k: string]: string } = {
      confirmee: 'CONFIRMEE', en_attente: 'EN_ATTENTE',
      terminee: 'TERMINEE', annulee: 'ANNULEE_CLIENT'
    };

    const payload = {
      clientNom: rdvData.clientNom || '',
      clientPrenom: rdvData.clientPrenom || '',
      clientTelephone: rdvData.clientTelephone || '',
      clientEmail: rdvData.clientEmail || '',
      serviceName: rdvData.serviceNom || '',
      dureeMinutes: rdvData.serviceDuree || 60,
      prixTotal: rdvData.servicePrix || 0,
      heureDebut: date.toISOString(),
      status: statusMap[rdvData.statut] || 'EN_ATTENTE',
      notes: rdvData.notes || ''
    };

    this.reservationService.createReservation(payload).subscribe({
      next: (r: any) => {
        const newR: Reservation = {
          id: r.id || Date.now(),
          clientId: r.clientId || 0,
          clientNom: r.clientNom || rdvData.clientNom,
          clientPrenom: r.clientPrenom || rdvData.clientPrenom,
          clientEmail: r.clientEmail || rdvData.clientEmail,
          clientTelephone: r.clientTelephone || rdvData.clientTelephone,
          serviceId: r.serviceId || 0,
          serviceNom: r.serviceName || rdvData.serviceNom,
          serviceDuree: r.dureeMinutes || rdvData.serviceDuree || 60,
          servicePrix: r.prixTotal || rdvData.servicePrix || 0,
          datePrestation: new Date(r.heureDebut || date),
          dateCreation: new Date(r.dateReservation || Date.now()),
          statut: this.normalizeStatut(r.status || rdvData.statut),
          notes: r.notes || rdvData.notes
        };
        this.reservations = [newR, ...this.reservations];
        this.calculateStats();
        this.emitStats();
      },
      error: (err) => {
        console.error('Erreur création RDV:', err);
        const localR: Reservation = {
          id: Date.now(),
          clientId: 0,
          clientNom: rdvData.clientNom || '',
          clientPrenom: rdvData.clientPrenom || '',
          clientEmail: rdvData.clientEmail || '',
          clientTelephone: rdvData.clientTelephone || '',
          serviceId: 0,
          serviceNom: rdvData.serviceNom || '',
          serviceDuree: rdvData.serviceDuree || 60,
          servicePrix: rdvData.servicePrix || 0,
          datePrestation: date,
          dateCreation: new Date(),
          statut: this.normalizeStatut(rdvData.statut || 'en_attente'),
          notes: rdvData.notes || ''
        };
        this.reservations = [localR, ...this.reservations];
        this.calculateStats();
        this.emitStats();
      }
    });
  }

  closeReservations(): void { this.closeEvent.emit(); }

  ngOnDestroy(): void {}

  private loadMockReservations(): void {
    this.reservations = [
      {
        id: 2451,
        clientId: 101,
        clientNom: 'Zeyna', clientPrenom: 'Gaye',
        clientAdresse: 'Villa 42, Cité Aliou Sow, Les Almadies, Dakar',
        clientEmail: 'gaye.zeyna@email.com', clientTelephone: '+221771234567',
        freelanceId: 1,
        serviceId: 2, serviceNom: 'Maquillage de mariée',
        serviceDescription: 'Mariée — essai inclus',
        serviceDuree: 120, servicePrix: 45000,
        datePrestation: new Date(Date.now() + 12 * 86400000),
        dateCreation: new Date(Date.now() - 10 * 86400000),
        statut: 'confirmee',
        notes: 'Je souhaite un maquillage naturel et lumineux, tenue longue durée pour la journée. J\'ai la peau sensible. Photos d\'inspiration envoyées par message.'
      },
      {
        id: 2452,
        clientId: 102,
        clientNom: 'Diop', clientPrenom: 'Fatou',
        clientAdresse: 'Domicile · Ngor',
        clientEmail: 'fatou@email.com', clientTelephone: '+221770000001',
        freelanceId: 1,
        serviceId: 1, serviceNom: 'Maquillage soirée',
        serviceDuree: 90, servicePrix: 35000,
        datePrestation: new Date(Date.now() + 5 * 86400000),
        dateCreation: new Date(Date.now() - 2 * 86400000),
        statut: 'en_attente'
      },
      {
        id: 2449,
        clientId: 101,
        clientNom: 'Zeyna', clientPrenom: 'Gaye',
        freelanceId: 1,
        serviceId: 3, serviceNom: 'Maquillage de jour',
        serviceDuree: 60, servicePrix: 25000,
        datePrestation: new Date(Date.now() - 20 * 86400000),
        dateCreation: new Date(Date.now() - 25 * 86400000),
        statut: 'terminee'
      }
    ];
    this.calculateStats();
    this.filteredReservations = [...this.reservations];
    this.loadingReservations = false;
    this.reservationsError = null;
    this.emitStats();
  }
}
