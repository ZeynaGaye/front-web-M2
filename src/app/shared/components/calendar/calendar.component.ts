import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './calendar.component.html',
  styleUrls: ['./calendar.component.scss']
})
export class CalendarComponent implements OnInit, OnDestroy {

  @Input() reservations: any[] = [];
  @Input() unavailabilities: any[] = [];
  @Input() freelanceServices: any[] = [];
  @Input() isFreelance: boolean = false;
  @Output() closeCalendar = new EventEmitter<void>();
  @Output() openReservation = new EventEmitter<any>();
  @Output() newReservationCreated = new EventEmitter<any>();

  viewMode: 'jour' | 'semaine' | 'mois' = 'semaine';
  currentWeekStart: Date = this.getWeekStart(new Date());
  currentDay: Date = new Date();
  currentMonth: Date = new Date();

  readonly startHour = 8;
  readonly endHour = 20;
  readonly hourHeight = 64;

  miniCalendarDate: Date = new Date();

  // ── Nouveau RDV modal ─────────────────────────────────
  showNewRdvModal = false;
  newRdv = {
    clientPrenom: '',
    clientNom: '',
    clientTelephone: '',
    clientEmail: '',
    serviceNom: '',
    serviceDuree: 60,
    servicePrix: 0,
    datePrestation: '',
    heureDebut: '10:00',
    notes: '',
    statut: 'en_attente'
  };

  openNewRdvModal(date?: Date): void {
    if (date) {
      const d = new Date(date);
      this.newRdv.datePrestation = d.toISOString().split('T')[0];
    } else {
      this.newRdv.datePrestation = new Date().toISOString().split('T')[0];
    }
    this.showNewRdvModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeNewRdvModal(): void {
    this.showNewRdvModal = false;
    document.body.style.overflow = 'auto';
    this.resetForm();
  }

  submitNewRdv(): void {
    if (!this.newRdv.clientNom || !this.newRdv.serviceNom || !this.newRdv.datePrestation) return;
    const [h, m] = this.newRdv.heureDebut.split(':').map(Number);
    const date = new Date(this.newRdv.datePrestation);
    date.setHours(h, m, 0, 0);
    const reservation = {
      ...this.newRdv,
      datePrestation: date,
      dateCreation: new Date(),
      id: Date.now()
    };
    this.newReservationCreated.emit(reservation);
    this.closeNewRdvModal();
  }

  onServiceSelect(serviceName: string): void {
    const svc = this.freelanceServices.find((s: any) =>
      (s.nom || s.name || s.serviceNom) === serviceName
    );
    if (svc) {
      this.newRdv.serviceDuree = svc.dureeEnMinutes || svc.duree || svc.duration || 60;
      this.newRdv.servicePrix = svc.prixMin || svc.prixMoyen || svc.prix || svc.price || 0;
    }
  }

  private resetForm(): void {
    this.newRdv = {
      clientPrenom: '', clientNom: '', clientTelephone: '', clientEmail: '',
      serviceNom: '', serviceDuree: 60, servicePrix: 0,
      datePrestation: '', heureDebut: '10:00', notes: '', statut: 'en_attente'
    };
  }

  // ── Time grid ─────────────────────────────────────────

  get timeSlots(): number[] {
    return Array.from({ length: this.endHour - this.startHour }, (_, i) => this.startHour + i);
  }

  get gridHeight(): number {
    return (this.endHour - this.startHour) * this.hourHeight;
  }

  // ── Week ─────────────────────────────────────────────

  get weekDays(): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(this.currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }

  get weekLabel(): string {
    const [start, end] = [this.weekDays[0], this.weekDays[6]];
    const sm = this.getMonthName(start);
    const em = this.getMonthName(end);
    const year = end.getFullYear();
    if (sm !== em) return `${start.getDate()} ${sm} – ${end.getDate()} ${em} ${year}`;
    return `${start.getDate()} – ${end.getDate()} ${em} ${year}`;
  }

  get dayLabel(): string {
    return this.currentDay.toLocaleDateString('fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  navigateWeek(dir: 1 | -1): void {
    const d = new Date(this.currentWeekStart);
    d.setDate(d.getDate() + dir * 7);
    this.currentWeekStart = d;
  }

  navigateDay(dir: 1 | -1): void {
    const d = new Date(this.currentDay);
    d.setDate(d.getDate() + dir);
    this.currentDay = d;
  }

  goToToday(): void {
    this.currentWeekStart = this.getWeekStart(new Date());
    this.currentDay = new Date();
    this.currentMonth = new Date();
    this.miniCalendarDate = new Date();
  }

  isCurrentWeek(): boolean {
    return this.currentWeekStart.toDateString() === this.getWeekStart(new Date()).toDateString();
  }

  isCurrentDay(): boolean {
    return this.dateKey(this.currentDay) === this.dateKey(new Date());
  }

  setViewMode(mode: 'jour' | 'semaine' | 'mois'): void {
    this.viewMode = mode;
    if (mode === 'jour' && !this.currentDay) this.currentDay = new Date();
    if (mode === 'mois') this.currentMonth = new Date(this.currentDay);
  }

  // ── Month view ────────────────────────────────────────

  get monthLabel(): string {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet',
                    'Août','Septembre','Octobre','Novembre','Décembre'];
    return `${months[this.currentMonth.getMonth()]} ${this.currentMonth.getFullYear()}`;
  }

  get monthDays(): (Date | null)[] {
    const year = this.currentMonth.getFullYear();
    const month = this.currentMonth.getMonth();
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const pad = (first.getDay() + 6) % 7; // Monday-first
    const days: (Date | null)[] = Array(pad).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  navigateMonth(dir: 1 | -1): void {
    const d = new Date(this.currentMonth);
    d.setMonth(d.getMonth() + dir);
    this.currentMonth = d;
  }

  isCurrentMonthDay(date: Date): boolean {
    return date.getMonth() === this.currentMonth.getMonth() &&
           date.getFullYear() === this.currentMonth.getFullYear();
  }

  getVisibleEventsForDay(date: Date): any[] {
    return this.getEventsForDay(date).slice(0, 3);
  }

  getExtraEventsCount(date: Date): number {
    return Math.max(0, this.getEventsForDay(date).length - 3);
  }

  selectMonthDay(date: Date): void {
    this.currentDay = new Date(date);
    this.currentWeekStart = this.getWeekStart(date);
    this.viewMode = 'jour';
  }

  // ── Events ────────────────────────────────────────────

  getEventsForDay(date: Date): any[] {
    const dayStr = this.dateKey(date);
    return this.reservations
      .filter(r => r.statut !== 'annulee' &&
        this.dateKey(new Date(r.datePrestation)) === dayStr)
      .sort((a, b) => new Date(a.datePrestation).getTime() - new Date(b.datePrestation).getTime());
  }

  getUnavailabilitiesForDay(date: Date): any[] {
    const dayStr = this.dateKey(date);
    return this.unavailabilities.filter(u =>
      this.dateKey(new Date(u.date || u.dateDebut)) === dayStr
    );
  }

  // ── Event display helpers ─────────────────────────────

  getEventStyle(event: any): { [k: string]: string } {
    const d = new Date(event.datePrestation);
    const hours = d.getHours() + d.getMinutes() / 60;
    const top = Math.max((hours - this.startHour) * this.hourHeight, 0);
    const height = Math.max((event.serviceDuree || 30) / 60 * this.hourHeight, 28);
    return { top: `${top}px`, height: `${height}px` };
  }

  getUnavailStyle(u: any): { [k: string]: string } {
    const d = new Date(u.dateDebut || u.date);
    const hours = d.getHours() + d.getMinutes() / 60;
    const top = Math.max((hours - this.startHour) * this.hourHeight, 0);
    const height = Math.max((u.duree || 120) / 60 * this.hourHeight, 28);
    return { top: `${top}px`, height: `${height}px` };
  }

  showClientOnEvent(event: any): boolean {
    return Math.max((event.serviceDuree || 30) / 60 * this.hourHeight, 28) >= 44;
  }

  showDurationOnEvent(event: any): boolean {
    return Math.max((event.serviceDuree || 30) / 60 * this.hourHeight, 28) >= 80 && (event.serviceDuree || 0) > 60;
  }

  getEventTimeLabel(event: any): string {
    const start = this.formatTime(new Date(event.datePrestation));
    if ((event.serviceDuree || 0) > 60) {
      return `${start} – ${this.getEndTime(new Date(event.datePrestation), event.serviceDuree)}`;
    }
    return start;
  }

  getServiceName(event: any): string {
    return event.serviceNom || event.nomService || event.serviceName ||
           event.service?.nom || event.serviceSalon?.nom || 'Prestation';
  }

  getClientName(event: any): string {
    const prenom = event.clientPrenom || event.prenomClient || event.client?.prenom || '';
    const nom = event.clientNom || event.nomClient || event.client?.nom || '';
    return [prenom, nom].filter(Boolean).join(' ');
  }

  // ── Week stats ─────────────────────────────────────────

  get weeklyReservations(): any[] {
    const [start, end] = [this.weekDays[0], this.addDays(this.weekDays[6], 1)];
    return this.reservations.filter(r => {
      const d = new Date(r.datePrestation);
      return r.statut !== 'annulee' && d >= start && d < end;
    });
  }

  get weeklyCount(): number { return this.weeklyReservations.length; }

  get weeklyHours(): number {
    return this.weeklyReservations.reduce((s, r) => s + (r.serviceDuree || 0), 0);
  }

  get weeklyRevenue(): number {
    return this.weeklyReservations
      .filter(r => r.statut === 'confirmee')
      .reduce((s, r) => s + (r.servicePrix || 0), 0);
  }

  formatHoursLabel(minutes: number): string {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m === 0 ? `${h} h` : `${h} h ${m.toString().padStart(2, '0')}`;
  }

  // ── Mini calendar ──────────────────────────────────────

  get miniCalendarLabel(): string {
    const months = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet',
                    'Août','Septembre','Octobre','Novembre','Décembre'];
    return `${months[this.miniCalendarDate.getMonth()]} ${this.miniCalendarDate.getFullYear()}`;
  }

  get miniCalendarDays(): (Date | null)[] {
    const year = this.miniCalendarDate.getFullYear();
    const month = this.miniCalendarDate.getMonth();
    const first = new Date(year, month, 1);
    const last = new Date(year, month + 1, 0);
    const pad = (first.getDay() + 6) % 7;
    const days: (Date | null)[] = Array(pad).fill(null);
    for (let d = 1; d <= last.getDate(); d++) days.push(new Date(year, month, d));
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }

  navigateMiniCalendar(dir: 1 | -1): void {
    const d = new Date(this.miniCalendarDate);
    d.setMonth(d.getMonth() + dir);
    this.miniCalendarDate = d;
  }

  selectMiniDay(date: Date): void {
    this.currentDay = new Date(date);
    this.currentWeekStart = this.getWeekStart(date);
    if (this.viewMode === 'semaine') {
      // Stay in week view but highlight the week
    }
  }

  hasEventsOnDay(date: Date): boolean {
    return this.getEventsForDay(date).length > 0;
  }

  getMiniDotClass(date: Date): string {
    const events = this.getEventsForDay(date);
    if (events.some(e => e.statut === 'en_attente')) return 'dot--orange';
    if (events.some(e => e.statut === 'confirmee')) return 'dot--coral';
    return '';
  }

  isMiniDayInCurrentWeek(date: Date): boolean {
    return this.weekDays.some(d => this.dateKey(d) === this.dateKey(date));
  }

  // ── Date helpers ───────────────────────────────────────

  isToday(date: Date): boolean {
    return this.dateKey(date) === this.dateKey(new Date());
  }

  isRestDay(date: Date): boolean { return date.getDay() === 0; }

  getDayAbbr(date: Date): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'short' })
      .toUpperCase().replace('.', '');
  }

  formatTime(date: Date): string {
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  getEndTime(date: Date, duration: number): string {
    const d = new Date(date);
    d.setMinutes(d.getMinutes() + duration);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  }

  private getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }

  private addDays(date: Date, days: number): Date {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  dateKey(d: Date): string {
    return d.toISOString().split('T')[0];
  }

  private getMonthName(date: Date): string {
    return ['jan','fév','mar','avr','mai','juin','juil','août','sep','oct','nov','déc'][date.getMonth()];
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    document.body.style.overflow = 'auto';
  }
}
