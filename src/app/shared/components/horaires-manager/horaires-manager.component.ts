import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { HorairesService } from '../../services/horaires/horaires.service';
import { AuthService } from '../../../core/servces/auth.service';

export interface HoraireJour {
  id?: number;
  jourSemaine: string;
  jourSemaineLibelle?: string;
  estOuvert: boolean;
  heureOuverture: string | null;
  heureFermeture: string | null;
  dureeCreneauMinutes: number | null;
  pauseEntreCreneauxMinutes?: number;
  salonId?: number;
  freelanceId?: number;
}

export interface Conge {
  id?: number;
  dateDebut: string;
  dateFin: string;
  motif?: string;
}

export interface Creneau {
  heureDebut: string;
  heureFin: string;
}

interface DaySchedule {
  code: string;
  label: string;
  open: boolean;
  start: string;
  end: string;
  dureeMinutes: number;
  editing: boolean;
  tempStart: string;
  tempEnd: string;
}

@Component({
  selector: 'app-horaires-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './horaires-manager.component.html',
  styleUrls: ['./horaires-manager.component.scss']
})
export class HorairesManagerComponent implements OnInit {

  @Input() entityId!: number;
  @Input() isSalon!: boolean;
  @Input() entityName?: string;
  @Input() entityAddress?: string;
  @Output() horaireError = new EventEmitter<string>();

  readonly JOURS: { code: string; label: string }[] = [
    { code: 'LUNDI',    label: 'Lundi'    },
    { code: 'MARDI',    label: 'Mardi'    },
    { code: 'MERCREDI', label: 'Mercredi' },
    { code: 'JEUDI',    label: 'Jeudi'    },
    { code: 'VENDREDI', label: 'Vendredi' },
    { code: 'SAMEDI',   label: 'Samedi'   },
    { code: 'DIMANCHE', label: 'Dimanche' },
  ];

  schedule: DaySchedule[] = this.JOURS.map(j => ({
    code: j.code, label: j.label, open: j.code !== 'DIMANCHE',
    start: '09:00', end: '18:00', dureeMinutes: 30,
    editing: false, tempStart: '09:00', tempEnd: '18:00'
  }));

  acceptesReservations = true;
  saving = false;

  // Congés
  congesList: Conge[] = [];
  showAddConge = false;
  addingConge = false;
  newConge: Conge = { dateDebut: '', dateFin: '', motif: '' };
  readonly todayStr = new Date().toISOString().split('T')[0];

  // Next slot (computed after loading planning)
  nextSlotDay = 'Aujourd\'hui';
  nextSlotTime = '—';
  nextSlotNote = '';

  // Toast
  toast: { type: 'success' | 'error'; msg: string } | null = null;
  private toastTimer: any;

  constructor(
    private horairesService: HorairesService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.chargerHoraires();
    this.chargerConges();
    this.chargerNextSlot();
  }

  // ── Labels selon contexte ─────────────────────────────

  get pageTitle(): string {
    return this.isSalon ? 'Horaires du salon' : 'Mes disponibilités';
  }

  get pageSubtitle(): string {
    return this.isSalon
      ? 'Définissez quand votre salon est ouvert aux réservations.'
      : 'Dites à vos clientes quand vous réserver.';
  }

  get toggleLabel(): string {
    return this.isSalon ? 'Le salon est ouvert aux réservations' : 'Je prends des réservations';
  }

  get toggleSub(): string {
    return this.isSalon
      ? 'Votre salon est visible et réservable par les clientes.'
      : 'Votre profil est visible et réservable par les clientes.';
  }

  get displayName(): string {
    if (this.entityName) return this.entityName;
    const u = this.authService.getCurrentUser();
    return u ? `${u.prenom || ''} ${u.nom || ''}`.trim() : '';
  }

  get displayAddress(): string {
    if (this.entityAddress) return this.entityAddress;
    const u = this.authService.getCurrentUser();
    return u?.adresse || u?.ville || 'Dakar, Sénégal';
  }

  // ── Toast ─────────────────────────────────────────────

  private showToast(type: 'success' | 'error', msg: string): void {
    clearTimeout(this.toastTimer);
    this.toast = { type, msg };
    this.toastTimer = setTimeout(() => this.toast = null, 3500);
  }

  // ── Horaires ──────────────────────────────────────────

  chargerHoraires(): void {
    this.horairesService.getHoraires(this.entityId, this.isSalon).subscribe({
      next: (data: HoraireJour[]) => {
        data.forEach(h => {
          const day = this.schedule.find(d => d.code === h.jourSemaine);
          if (day) {
            day.open  = h.estOuvert;
            day.start = h.heureOuverture || '09:00';
            day.end   = h.heureFermeture || '18:00';
            day.dureeMinutes = h.dureeCreneauMinutes || 30;
          }
        });
      },
      error: () => this.showToast('error', 'Impossible de charger les horaires.')
    });
  }

  toggleDay(day: DaySchedule): void {
    day.open = !day.open;
    if (!day.open) day.editing = false;
  }

  startEdit(day: DaySchedule): void {
    day.tempStart = day.start;
    day.tempEnd   = day.end;
    day.editing   = true;
  }

  confirmSlot(day: DaySchedule): void {
    if (!day.tempStart || !day.tempEnd) return;
    day.start   = day.tempStart;
    day.end     = day.tempEnd;
    day.open    = true;
    day.editing = false;
  }

  cancelEdit(day: DaySchedule): void {
    day.editing = false;
  }

  removeSlot(day: DaySchedule): void {
    day.open    = false;
    day.editing = false;
  }

  sauvegarder(): void {
    this.saving = true;
    const payload: HoraireJour[] = this.schedule.map(d => ({
      jourSemaine: d.code,
      estOuvert: d.open,
      heureOuverture: d.open ? d.start : null,
      heureFermeture: d.open ? d.end   : null,
      dureeCreneauMinutes: d.dureeMinutes
    }));
    this.horairesService.saveHoraires(this.entityId, this.isSalon, payload).subscribe({
      next: () => { this.saving = false; this.showToast('success', 'Horaires enregistrés.'); },
      error: () => { this.saving = false; this.showToast('error', 'Erreur lors de la sauvegarde.'); }
    });
  }

  // ── Congés ────────────────────────────────────────────

  chargerConges(): void {
    this.horairesService.getConges(this.entityId, this.isSalon).subscribe({
      next: (data: Conge[]) =>
        this.congesList = data.sort((a, b) => a.dateDebut.localeCompare(b.dateDebut)),
      error: () => {}
    });
  }

  get upcomingConges(): Conge[] {
    return this.congesList.filter(c => c.dateFin >= this.todayStr);
  }

  openAddConge(): void {
    this.newConge = { dateDebut: '', dateFin: '', motif: '' };
    this.showAddConge = true;
  }

  fermerAujourdhui(): void {
    const c: Conge = { dateDebut: this.todayStr, dateFin: this.todayStr, motif: 'Fermeture exceptionnelle' };
    this.horairesService.addConge(this.entityId, this.isSalon, c).subscribe({
      next: () => { this.showToast('success', "Aujourd'hui marqué comme fermé."); this.chargerConges(); },
      error: () => this.showToast('error', 'Erreur lors de la fermeture.')
    });
  }

  ajouterConge(): void {
    if (!this.newConge.dateDebut || !this.newConge.dateFin) {
      this.showToast('error', 'Renseignez les dates de début et de fin.');
      return;
    }
    if (this.newConge.dateDebut > this.newConge.dateFin) {
      this.showToast('error', 'La date de début doit être avant la date de fin.');
      return;
    }
    this.addingConge = true;
    this.horairesService.addConge(this.entityId, this.isSalon, this.newConge).subscribe({
      next: () => {
        this.addingConge = false;
        this.showAddConge = false;
        this.showToast('success', 'Indisponibilité ajoutée.');
        this.chargerConges();
      },
      error: () => { this.addingConge = false; this.showToast('error', "Erreur lors de l'ajout."); }
    });
  }

  supprimerConge(c: Conge): void {
    if (!c.id) return;
    this.horairesService.deleteConge(this.entityId, this.isSalon, c.id).subscribe({
      next: () => { this.showToast('success', 'Supprimé.'); this.chargerConges(); },
      error: () => this.showToast('error', 'Erreur lors de la suppression.')
    });
  }

  congeLabel(c: Conge): string {
    if (c.dateDebut === c.dateFin) return this.formatDate(c.dateDebut);
    return `${this.formatDate(c.dateDebut)} – ${this.formatDate(c.dateFin)}`;
  }

  congeNbJours(c: Conge): number {
    return Math.floor((new Date(c.dateFin).getTime() - new Date(c.dateDebut).getTime()) / 86400000) + 1;
  }

  formatDate(iso: string): string {
    return new Date(iso + 'T00:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  // ── Next slot ─────────────────────────────────────────

  private chargerNextSlot(): void {
    const dateStr = new Date().toISOString().split('T')[0];
    this.horairesService.getPlanning(this.entityId, this.isSalon, dateStr).subscribe({
      next: (data: Creneau[]) => {
        if (data.length > 0) {
          const first = data[0];
          const start = new Date(first.heureDebut).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          const end   = new Date(first.heureFin).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
          this.nextSlotTime = `${start} – ${end}`;
          this.nextSlotNote = `${data.length} créneau${data.length > 1 ? 'x' : ''} disponible${data.length > 1 ? 's' : ''} aujourd'hui.`;
        } else {
          this.nextSlotTime = 'Aucun créneau';
          this.nextSlotNote = 'Journée fermée ou entièrement réservée.';
        }
      },
      error: () => { this.nextSlotTime = '—'; }
    });
  }
}
