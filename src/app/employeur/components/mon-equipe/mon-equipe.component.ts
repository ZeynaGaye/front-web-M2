import {
  Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import {
  trigger, transition, style, animate, query, stagger
} from '@angular/animations';
import { EmployeService } from '../../services/employe';
import {
  EmployeListItem, EmployeResponse, EmployeUpdateRequest,
  Specialite, StatutEmploye, TypeContrat
} from '../../../models/employe';

export interface EmployeRow {
  id: number;
  nomComplet: string;
  email: string;
  specialites: string[];
  specialite: string;
  statut: StatutEmploye;
  salonNom: string;
  salonId: number;
  initials: string;
  rating: string;
}

// ── Animations ─────────────────────────────────────────────────────────────────
const listAnim = trigger('listAnim', [
  transition('* => *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(14px)' }),
      stagger(45, animate('280ms cubic-bezier(0.25,0.46,0.45,0.94)',
        style({ opacity: 1, transform: 'translateY(0)' })))
    ], { optional: true })
  ])
]);

const fadeIn = trigger('fadeIn', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateY(-8px)' }),
    animate('350ms cubic-bezier(0.25,0.46,0.45,0.94)',
      style({ opacity: 1, transform: 'translateY(0)' }))
  ])
]);

const drawerSlide = trigger('drawerSlide', [
  transition(':enter', [
    style({ transform: 'translateX(100%)', opacity: 0.6 }),
    animate('440ms cubic-bezier(0.34, 1.56, 0.64, 1)',
      style({ transform: 'translateX(0)', opacity: 1 }))
  ]),
  transition(':leave', [
    animate('260ms cubic-bezier(0.4, 0, 0.2, 1)',
      style({ transform: 'translateX(100%)', opacity: 0 }))
  ])
]);

const backdropFade = trigger('backdropFade', [
  transition(':enter', [style({ opacity: 0 }), animate('220ms ease', style({ opacity: 1 }))]),
  transition(':leave', [animate('220ms ease', style({ opacity: 0 }))])
]);

const stepSlide = trigger('stepSlide', [
  transition(':enter', [
    style({ opacity: 0, transform: 'translateX(18px)' }),
    animate('260ms cubic-bezier(0.25,0.46,0.45,0.94)',
      style({ opacity: 1, transform: 'translateX(0)' }))
  ]),
  transition(':leave', [
    animate('180ms cubic-bezier(0.4,0,0.2,1)',
      style({ opacity: 0, transform: 'translateX(-18px)' }))
  ])
]);

// ── Component ──────────────────────────────────────────────────────────────────
@Component({
  selector: 'app-mon-equipe',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatMenuModule, MatButtonModule],
  templateUrl: './mon-equipe.component.html',
  styleUrls: ['./mon-equipe.component.scss'],
  animations: [listAnim, fadeIn, drawerSlide, backdropFade, stepSlide]
})
export class MonEquipeComponent implements OnInit, OnChanges {
  @Input() salons: any[] = [];
  @Input() preSelectEmployeId: number | null = null;
  @Output() close = new EventEmitter<void>();

  allEmployes: EmployeRow[] = [];
  loading = true;
  activeTab: number | 'all' = 'all';
  searchTerm = '';

  // ── Drawer mode: null = closed, 'fiche' | 'inviter'
  drawerMode: null | 'fiche' | 'inviter' = null;

  // ── Fiche state
  selectedRow: EmployeRow | null = null;
  ficheDetail: EmployeResponse | null = null;
  loadingFiche = false;
  isSaving = false;
  saveSuccess = false;

  // ── Fiche step: 'main' | 'change-salon' | 'retirer'
  ficheStep: 'main' | 'change-salon' | 'retirer' = 'main';
  selectedNewSalonId: number | null = null;
  isTransfering = false;
  isRetirant = false;

  // ── Editable fiche form
  ficheForm = {
    nom: '', prenom: '', email: '', telephone: '',
    specialites: [] as string[],
    typeContrat: '' as TypeContrat | '',
    statut: '' as StatutEmploye | '',
    horaireDebut: '',
    horaireFin: ''
  };

  // ── Inviter form
  inviterForm = {
    nom: '', prenom: '', email: '', telephone: '',
    specialites: [] as string[],
    typeContrat: '' as TypeContrat | '',
    salonId: null as number | null,
    horaireDebut: '09:00',
    horaireFin: '17:00'
  };
  isCreating = false;
  createSuccess = false;
  createError = '';

  // ── Enum options
  readonly specialiteOptions = Object.values(Specialite);
  readonly typeContratOptions = Object.values(TypeContrat);
  readonly statutOptions = Object.values(StatutEmploye);

  private readonly AVATAR_COLORS = [
    '#D4735A', '#6C63FF', '#22A38A', '#E0845C', '#5B8FDB'
  ];

  constructor(private employeService: EmployeService) {}

  ngOnInit(): void { this.loadAll(); }
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['salons'] && !changes['salons'].firstChange) this.loadAll();
    if (changes['preSelectEmployeId'] && !changes['preSelectEmployeId'].firstChange) {
      this.tryOpenPreSelected();
    }
  }

  private loadAll(): void {
    if (!this.salons?.length) { this.loading = false; return; }
    this.loading = true;
    const calls = this.salons.map(s =>
      this.employeService.listerEmployes(s.id, 0, 50).pipe(
        map(resp => (resp.content || []).map(e => this.toRow(e, s))),
        catchError(() => of([] as EmployeRow[]))
      )
    );
    forkJoin(calls).subscribe(results => {
      this.allEmployes = results.flat();
      this.loading = false;
      this.tryOpenPreSelected();
    });
  }

  private tryOpenPreSelected(): void {
    if (!this.preSelectEmployeId || !this.allEmployes.length) return;
    const row = this.allEmployes.find(e => e.id === this.preSelectEmployeId);
    if (row) { this.openFiche(row); this.preSelectEmployeId = null; }
  }

  private toRow(e: EmployeListItem, salon: any): EmployeRow {
    const parts = (e.nomComplet || '').split(' ');
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : (e.nomComplet || '?').slice(0, 2).toUpperCase();
    return {
      id: e.id, nomComplet: e.nomComplet, email: e.email,
      specialites: (e.specialites || []).map(s => this.fmt(s)),
      specialite: this.fmt(e.specialites?.[0]),
      statut: e.statut, salonNom: salon.nom, salonId: salon.id,
      initials, rating: (3.5 + Math.random() * 1.5).toFixed(1)
    };
  }

  // ── Formatters ──────────────────────────────────────────────────────────────
  fmt(s: string | undefined): string {
    if (!s) return 'Polyvalent(e)';
    return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
  }
  fmtContrat(c: string): string {
    return ({ CDI:'CDI', CDD:'CDD', TEMPS_PARTIEL:'Temps partiel', STAGE:'Stage', INTERIM:'Intérim' } as any)[c] || c;
  }
  fmtStatut(s: string): string {
    return ({ ACTIF:'En service', INACTIF:'Hors service', CONGE:'En congé', SUSPENDU:'Suspendu' } as any)[s] || s;
  }

  // ── List helpers ─────────────────────────────────────────────────────────────
  get filteredEmployes(): EmployeRow[] {
    let list = this.activeTab === 'all'
      ? this.allEmployes
      : this.allEmployes.filter(e => e.salonId === this.activeTab);
    const q = this.searchTerm.trim().toLowerCase();
    if (q) list = list.filter(e =>
      e.nomComplet.toLowerCase().includes(q) ||
      e.specialite.toLowerCase().includes(q) ||
      e.salonNom.toLowerCase().includes(q)
    );
    return list;
  }

  get totalCount(): number { return this.allEmployes.length; }
  countBySalon(id: number): number { return this.allEmployes.filter(e => e.salonId === id).length; }
  avatarColor(row: EmployeRow): string { return this.AVATAR_COLORS[row.id % this.AVATAR_COLORS.length]; }

  statusLabel(s: string): string {
    return ({ ACTIF:'EN SERVICE', INACTIF:'HORS SERVICE', CONGE:'EN CONGÉ', SUSPENDU:'SUSPENDU' } as any)[s] ?? s;
  }
  statusClass(s: string): string {
    return ({ ACTIF:'badge--active', INACTIF:'badge--inactive', CONGE:'badge--conge', SUSPENDU:'badge--suspend' } as any)[s] ?? '';
  }
  setTab(tab: number | 'all'): void { this.activeTab = tab; }

  // ── Drawer open/close ────────────────────────────────────────────────────────
  get drawerOpen(): boolean { return this.drawerMode !== null; }

  openFiche(row: EmployeRow): void {
    this.selectedRow = row;
    this.ficheDetail = null;
    this.ficheStep = 'main';
    this.selectedNewSalonId = null;
    this.saveSuccess = false;
    this.drawerMode = 'fiche';
    this.loadingFiche = true;
    this.employeService.obtenirEmploye(row.id).pipe(catchError(() => of(null)))
      .subscribe(d => {
        this.ficheDetail = d;
        this.loadingFiche = false;
        this.populateForm(d, row);
      });
  }

  openInviter(): void {
    this.inviterForm = {
      nom: '', prenom: '', email: '', telephone: '',
      specialites: [], typeContrat: '',
      salonId: this.salons[0]?.id ?? null,
      horaireDebut: '09:00', horaireFin: '17:00'
    };
    this.createSuccess = false;
    this.createError = '';
    this.drawerMode = 'inviter';
    this.selectedRow = null;
  }

  closeDrawer(): void {
    this.drawerMode = null;
    this.selectedRow = null;
    this.ficheDetail = null;
  }

  // ── Fiche form ───────────────────────────────────────────────────────────────
  private populateForm(d: EmployeResponse | null, row: EmployeRow): void {
    const parts = row.nomComplet.split(' ');
    this.ficheForm = {
      nom:         parts.slice(1).join(' ') || parts[0] || '',
      prenom:      parts[0] || '',
      email:       d?.email       || row.email,
      telephone:   d?.telephone   || '',
      specialites: (d?.specialites || []).map(s => String(s)),
      typeContrat: (d?.typeContrat || '') as TypeContrat | '',
      statut:      (d?.statut || row.statut) as StatutEmploye,
      horaireDebut: d?.horaires?.split('-')[0]?.trim() || '',
      horaireFin:   d?.horaires?.split('-')[1]?.trim() || ''
    };
  }

  saveFiche(): void {
    if (!this.selectedRow || this.isSaving) return;
    this.isSaving = true;
    const req: EmployeUpdateRequest = {
      nom: this.ficheForm.nom, prenom: this.ficheForm.prenom,
      email: this.ficheForm.email, telephone: this.ficheForm.telephone,
      specialites: this.ficheForm.specialites as Specialite[],
      typeContrat: this.ficheForm.typeContrat as TypeContrat,
      statut: this.ficheForm.statut as StatutEmploye,
      horaireDebut: this.ficheForm.horaireDebut,
      horaireFin: this.ficheForm.horaireFin
    };
    this.employeService.modifierEmploye(this.selectedRow.id, req)
      .pipe(catchError(() => of(null)))
      .subscribe(result => {
        this.isSaving = false;
        if (result) {
          const row = this.allEmployes.find(e => e.id === this.selectedRow!.id);
          if (row) {
            row.nomComplet = `${req.prenom} ${req.nom}`.trim();
            row.statut = req.statut;
            row.specialites = req.specialites.map(s => this.fmt(s));
            row.specialite  = row.specialites[0] || 'Polyvalent(e)';
            const p = row.nomComplet.split(' ');
            row.initials = p.length >= 2 ? (p[0][0]+p[1][0]).toUpperCase() : row.nomComplet.slice(0,2).toUpperCase();
            this.selectedRow = { ...row };
          }
          this.saveSuccess = true;
          setTimeout(() => this.saveSuccess = false, 2500);
        }
      });
  }

  // ── Specialité toggles ───────────────────────────────────────────────────────
  toggleFicheSp(sp: string): void {
    const idx = this.ficheForm.specialites.indexOf(sp);
    if (idx > -1) this.ficheForm.specialites.splice(idx, 1);
    else if (this.ficheForm.specialites.length < 5) this.ficheForm.specialites.push(sp);
  }
  isFicheSpOn(sp: string): boolean { return this.ficheForm.specialites.includes(sp); }

  toggleInviterSp(sp: string): void {
    const idx = this.inviterForm.specialites.indexOf(sp);
    if (idx > -1) this.inviterForm.specialites.splice(idx, 1);
    else if (this.inviterForm.specialites.length < 5) this.inviterForm.specialites.push(sp);
  }
  isInviterSpOn(sp: string): boolean { return this.inviterForm.specialites.includes(sp); }

  // ── Changer de salon ─────────────────────────────────────────────────────────
  get autresSalons(): any[] {
    return this.salons.filter(s => s.id !== this.selectedRow?.salonId);
  }

  goToChangeSalon(): void {
    this.selectedNewSalonId = null;
    this.ficheStep = 'change-salon';
  }

  confirmerTransfert(): void {
    if (!this.selectedRow || !this.selectedNewSalonId || this.isTransfering) return;
    this.isTransfering = true;
    this.employeService.transfererEmploye(this.selectedRow.id, this.selectedNewSalonId)
      .pipe(catchError(() => of(null)))
      .subscribe(result => {
        this.isTransfering = false;
        const newSalon = this.salons.find(s => s.id === this.selectedNewSalonId);
        if (newSalon) {
          // Update list row
          const row = this.allEmployes.find(e => e.id === this.selectedRow!.id);
          if (row) { row.salonNom = newSalon.nom; row.salonId = newSalon.id; }
          this.selectedRow = row ? { ...row } : this.selectedRow;
        }
        this.ficheStep = 'main';
      });
  }

  // ── Retirer du salon ─────────────────────────────────────────────────────────
  goToRetirer(): void { this.ficheStep = 'retirer'; }

  confirmerRetrait(): void {
    if (!this.selectedRow || this.isRetirant) return;
    this.isRetirant = true;
    this.employeService.retirerDuSalon(this.selectedRow.id)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.isRetirant = false;
        this.allEmployes = this.allEmployes.filter(e => e.id !== this.selectedRow!.id);
        this.closeDrawer();
      });
  }

  // ── Inviter ──────────────────────────────────────────────────────────────────
  get inviterFormValid(): boolean {
    return !!(this.inviterForm.prenom && this.inviterForm.nom &&
              this.inviterForm.email && this.inviterForm.salonId &&
              this.inviterForm.typeContrat);
  }

  creerEmploye(): void {
    if (!this.inviterFormValid || this.isCreating) return;
    this.isCreating = true;
    this.createError = '';
    const req = {
      nom: this.inviterForm.nom,
      prenom: this.inviterForm.prenom,
      email: this.inviterForm.email,
      telephone: this.inviterForm.telephone,
      specialites: this.inviterForm.specialites as Specialite[],
      typeContrat: this.inviterForm.typeContrat as TypeContrat,
      horaireDebut: this.inviterForm.horaireDebut,
      horaireFin: this.inviterForm.horaireFin,
      salonId: this.inviterForm.salonId!
    };
    this.employeService.creerEmploye(req)
      .pipe(catchError(err => {
        this.createError = err?.error?.message || 'Une erreur est survenue.';
        return of(null);
      }))
      .subscribe(result => {
        this.isCreating = false;
        if (result) {
          // Add to the local list
          const salon = this.salons.find(s => s.id === req.salonId);
          if (salon) {
            const row = this.toRow({
              id: result.id, nomComplet: result.nomComplet,
              email: result.email, statut: result.statut,
              specialites: result.specialites
            } as any, salon);
            this.allEmployes = [...this.allEmployes, row];
          }
          this.createSuccess = true;
          setTimeout(() => this.closeDrawer(), 1800);
        }
      });
  }

  // ── Duration helpers ─────────────────────────────────────────────────────────
  getDuree(debut: string, fin: string): string {
    if (!debut || !fin) return '';
    const [dh, dm] = debut.split(':').map(Number);
    const [fh, fm] = fin.split(':').map(Number);
    const mins = (fh * 60 + fm) - (dh * 60 + dm);
    if (mins <= 0) return '';
    const h = Math.floor(mins / 60), m = mins % 60;
    return m ? `${h}h${String(m).padStart(2,'0')} par jour` : `${h}h par jour`;
  }
  get ficheDuree(): string { return this.getDuree(this.ficheForm.horaireDebut, this.ficheForm.horaireFin); }
  get inviterDuree(): string { return this.getDuree(this.inviterForm.horaireDebut, this.inviterForm.horaireFin); }

  ficheEmbauche(): string {
    const d = this.ficheDetail?.dateEmbauche;
    if (!d) return '';
    return new Date(d).toLocaleDateString('fr-FR', { month:'long', year:'numeric' });
  }

  goBack(): void { this.close.emit(); }
}
