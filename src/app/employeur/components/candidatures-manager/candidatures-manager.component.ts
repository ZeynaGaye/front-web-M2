import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { Candidature } from '../../../freelance/interfaces/candidatures.interface';
import { CandidatureService } from '../../../freelance/services/candidatures.service';
import { OffreEmploi, OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { PortfolioComponent } from '../../../freelance/components/portfolio/portfolio.component';

interface CandidatureEnriched extends Candidature {
  offreTitre?: string;
  offreSalonNom?: string;
  offreLieu?: string;
  offreTypeContrat?: string;
  freelanceVille?: string;
  freelanceAdresse?: string;
  freelancePhoto?: string;
}

@Component({
  selector: 'app-candidatures-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule,
    PortfolioComponent
  ],
  templateUrl: './candidatures-manager.component.html',
  styleUrls: ['./candidatures-manager.component.scss']
})
export class CandidaturesManagerComponent implements OnInit {

  isLoading = true;
  allCandidatures: CandidatureEnriched[] = [];
  offres: OffreEmploi[] = [];

  activeFilter = 'all';
  offreFilter: number | null = null;

  // Vue profil inline (pas popup)
  selectedCandidate: CandidatureEnriched | null = null;
  selectedCandidateIndex = 0;
  freelanceProfile: any = null;

  // Valeurs précalculées pour l'affichage (évite les appels de méthodes dans les *ngIf imbriqués)
  dp = {
    name: '',
    initials: '',
    specialty: '',
    location: '',
    rating: null as string | null,
    avisCount: 0,
    prestationsCount: 0,
    experience: '',
    competences: '',
    message: '',
    email: '',
    phone: '',
    photoUrl: null as string | null,
    verified: false,
    freelanceId: null as number | null,
  };

  readonly AVATAR_COLORS = ['#D4735A', '#9B8EC4', '#5AAF8C', '#F59E0B', '#5B8FD4', '#E879A0', '#8B5CF6'];

  constructor(
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService,
    private snackBar: MatSnackBar,
    private http: HttpClient
  ) {}

  ngOnInit() { this.loadAll(); }

  loadAll() {
    this.isLoading = true;
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres) => {
        this.offres = offres;
        if (!offres.length) { this.isLoading = false; return; }
        const reqs = offres.map(o => this.offreEmploisService.getCandidaturesByOffreId(o.id!));
        forkJoin(reqs).subscribe({
          next: (results) => {
            this.allCandidatures = results.flatMap((list, i) =>
              list.map(c => ({
                ...c,
                offreTitre: offres[i].titre,
                offreSalonNom: offres[i].salonNom,
                offreLieu: offres[i].lieu,
                offreTypeContrat: offres[i].typeContrat
              }))
            );
            this.isLoading = false;
          },
          error: () => { this.isLoading = false; }
        });
      },
      error: () => { this.isLoading = false; }
    });
  }

  // ── Filtres ───────────────────────────────
  setFilter(f: string) { this.activeFilter = f; }

  getFiltered(): CandidatureEnriched[] {
    let list = this.allCandidatures;
    if (this.offreFilter) list = list.filter(c => c.offreEmploiId === this.offreFilter);
    switch (this.activeFilter) {
      case 'nouveau':   return list.filter(c => this.isNouveau(c));
      case 'entretien': return list.filter(c => this.isEntretien(c));
      case 'acceptee':  return list.filter(c => this.isAcceptee(c));
      case 'refusee':   return list.filter(c => this.isRefusee(c));
      default: return list;
    }
  }

  countByFilter(f: string): number {
    const base = this.offreFilter
      ? this.allCandidatures.filter(c => c.offreEmploiId === this.offreFilter)
      : this.allCandidatures;
    switch (f) {
      case 'nouveau':   return base.filter(c => this.isNouveau(c)).length;
      case 'entretien': return base.filter(c => this.isEntretien(c)).length;
      case 'acceptee':  return base.filter(c => this.isAcceptee(c)).length;
      case 'refusee':   return base.filter(c => this.isRefusee(c)).length;
      default: return base.length;
    }
  }

  // ── Navigation profil ────────────────────
  openProfile(c: CandidatureEnriched, index: number) {
    this.selectedCandidate = c;
    this.selectedCandidateIndex = index;
    this.freelanceProfile = null;
    this.computeDisplayProps(c, null);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    const fid = c.freelanceId || c.freelance?.id;
    if (fid) {
      this.http.get<any>(`http://localhost:8081/api/freelances/${fid}`)
        .pipe(catchError(() => of(null)))
        .subscribe(profile => {
          this.freelanceProfile = profile;
          this.computeDisplayProps(c, profile);
        });
    }
  }

  backToList() {
    this.selectedCandidate = null;
    this.freelanceProfile = null;
  }

  private computeDisplayProps(c: CandidatureEnriched, profile: any) {
    const fp = profile;

    const name = (() => {
      const p = c.freelancePrenom || c.freelance?.prenom || '';
      const n = c.freelanceNom    || c.freelance?.nom    || '';
      return `${p} ${n}`.trim() || c.nomCandidat || 'Candidat';
    })();

    const parts = name.split(' ').filter(Boolean);
    const initials = parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.substring(0, 2).toUpperCase();

    const competences = (fp?.competences || c.freelanceCompetences || '').trim();

    const specialty = (() => {
      const prof = fp?.profession || fp?.specialite || fp?.metier;
      if (prof) return prof.length <= 35 ? prof : prof.substring(0, 35) + '…';
      if (competences) {
        const first = competences.split(',')[0].trim();
        return first.length <= 35 ? first : first.substring(0, 35) + '…';
      }
      return '';
    })();

    const exp = (fp?.experiences || c.freelanceExperience || '').trim();

    const note = fp?.rating ?? fp?.note ?? (c as any).freelanceNote ?? null;
    const rating: string | null = note ? String(note) : null;

    const photo = fp?.profileImage || (c as any).freelancePhoto || c.freelance?.photo || null;
    const photoUrl: string | null = photo
      ? (photo.startsWith('http') ? photo : `http://localhost:8081/uploads/${photo}`)
      : null;

    this.dp = {
      name,
      initials,
      specialty,
      location: fp?.ville || (c as any).freelanceVille || (c as any).freelanceAdresse || fp?.adresse || c.offreLieu || '',
      rating,
      avisCount:         fp?.reviews  ?? fp?.nombreAvis ?? (c.freelance as any)?.nbAvis ?? 0,
      prestationsCount:  fp?.nbPrestations ?? fp?.prestationsCount ?? 0,
      experience:        exp.length <= 40 ? exp : '',
      competences,
      message: (() => {
        const msg = (c.message || (c as any).description || '').trim();
        if (msg) return msg;
        const bio = (fp?.experiences || fp?.experience || c.freelanceExperience || '').trim();
        return bio.length > 30 ? bio : '';
      })(),
      email:    fp?.email     || c.freelanceEmail     || c.freelance?.email     || c.emailCandidat || '',
      phone:    fp?.telephone || c.freelanceTelephone || c.freelance?.telephone || c.telCandidat   || '',
      photoUrl,
      verified: (c.freelance as any)?.identiteVerifiee === true || (c as any).freelanceIdentiteVerifiee === true,
      freelanceId: (() => {
        const id = c.freelance?.id || c.freelanceId || (c as any).freelance_id;
        return id ? Number(id) : null;
      })(),
    };
  }

  // ── Actions ───────────────────────────────
  updateStatus(c: CandidatureEnriched, newStatus: string) {
    if (!c.id) return;
    this.candidatureService.updateCandidatureStatus(c.id, c as any, newStatus).subscribe({
      next: () => {
        const idx = this.allCandidatures.findIndex(x => x.id === c.id);
        if (idx !== -1) {
          this.allCandidatures[idx] = { ...this.allCandidatures[idx], status: newStatus };
        }
        if (this.selectedCandidate && this.selectedCandidate.id === c.id) {
          this.selectedCandidate.status = newStatus;
        }
        this.snackBar.open('Statut mis à jour', 'OK', { duration: 2500 });
      },
      error: () => this.snackBar.open('Erreur lors de la mise à jour', 'Fermer', { duration: 3000 })
    });
  }

  refuseAndBack(c: CandidatureEnriched) {
    this.updateStatus(c, 'REFUSE');
    this.backToList();
  }

  contactCandidate(c: CandidatureEnriched) {
    const email = this.dp.email;
    if (!email) { this.snackBar.open('Email non disponible', 'Fermer', { duration: 3000 }); return; }
    const subj = encodeURIComponent('Réponse à votre candidature');
    const body = encodeURIComponent(`Bonjour ${this.dp.name},\n\nNous avons bien reçu votre candidature.\n\nCordialement`);
    window.open(`mailto:${email}?subject=${subj}&body=${body}`);
  }

  // ── Helpers affichage ─────────────────────
  getMessage(c: CandidatureEnriched): string {
    const msg = (c.message || (c as any).description || '').trim();
    if (msg) return msg;
    const bio = (this.freelanceProfile?.experiences || this.freelanceProfile?.experience || c.freelanceExperience || '').trim();
    return bio.length > 30 ? bio : '';
  }

  getCompetences(c: CandidatureEnriched): string {
    return (this.freelanceProfile?.competences
      || c.freelanceCompetences
      || (c.freelance as any)?.competences
      || '').trim();
  }

  getName(c: CandidatureEnriched): string {
    const p = c.freelancePrenom || c.freelance?.prenom || '';
    const n = c.freelanceNom    || c.freelance?.nom    || '';
    return `${p} ${n}`.trim() || c.nomCandidat || 'Candidat';
  }

  getInitials(c: CandidatureEnriched): string {
    const parts = this.getName(c).split(' ').filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return this.getName(c).substring(0, 2).toUpperCase();
  }

  getAvatarColor(index: number): string {
    return this.AVATAR_COLORS[index % this.AVATAR_COLORS.length];
  }

  getExperience(c: CandidatureEnriched): string {
    const exp = (this.freelanceProfile?.experiences || c.freelanceExperience || '').trim();
    return exp.length <= 40 ? exp : '';
  }

  getSpecialty(c: CandidatureEnriched): string {
    const profession = this.freelanceProfile?.profession || this.freelanceProfile?.specialite || this.freelanceProfile?.metier;
    if (profession) {
      return profession.length <= 35 ? profession : profession.substring(0, 35) + '…';
    }
    const comps = this.freelanceProfile?.competences || c.freelanceCompetences || '';
    if (comps) {
      const first = comps.split(',')[0].trim();
      return first.length <= 35 ? first : first.substring(0, 35) + '…';
    }
    return '';
  }

  getLocation(c: CandidatureEnriched): string {
    return this.freelanceProfile?.ville
        || (c as any).freelanceVille
        || (c as any).freelanceAdresse
        || this.freelanceProfile?.adresse
        || c.offreLieu
        || '';
  }

  getRating(c: CandidatureEnriched): string | null {
    const note = this.freelanceProfile?.rating ?? this.freelanceProfile?.note
               ?? (c as any).freelanceNote ?? (c.freelance as any)?.note ?? null;
    return note ? String(note) : null;
  }

  getAvisCount(c: CandidatureEnriched): number {
    return this.freelanceProfile?.reviews ?? this.freelanceProfile?.nombreAvis
        ?? (c.freelance as any)?.nbAvis ?? (c as any).freelanceNbAvis ?? 0;
  }

  getPrestationsCount(c: CandidatureEnriched): number {
    return this.freelanceProfile?.nbPrestations ?? this.freelanceProfile?.prestationsCount
        ?? (c.freelance as any)?.nbPrestations ?? (c as any).freelanceNbPrestations ?? 0;
  }

  getFreelanceId(c: CandidatureEnriched): number | null {
    const id = c.freelance?.id || c.freelanceId || (c as any).freelance_id;
    return id ? Number(id) : null;
  }

  getPhotoUrl(c: CandidatureEnriched): string | null {
    const photo = this.freelanceProfile?.profileImage
               || (c as any).freelancePhoto
               || c.freelance?.photo;
    if (!photo) return null;
    if (photo.startsWith('http')) return photo;
    return `http://localhost:8081/uploads/${photo}`;
  }

  onAvatarError(event: Event, index: number): void {
    const img = event.target as HTMLImageElement;
    img.hidden = true;
    const wrap = img.parentElement;
    if (wrap) {
      const fallback = wrap.querySelector('.cp-hero__avatar') as HTMLElement;
      if (fallback) fallback.hidden = false;
    }
  }

  isVerified(c: CandidatureEnriched): boolean {
    return (c.freelance as any)?.identiteVerifiee === true
        || (c as any).freelanceIdentiteVerifiee === true;
  }

  getCandidatureDate(c: CandidatureEnriched): Date | null {
    const d = c.dateCandidature || (c as any).datePostulation || (c as any).createdAt;
    if (!d) return null;
    return d instanceof Date ? d : new Date(d);
  }

  getOffreLabel(id: number | null): string {
    if (!id) return 'Toutes les offres';
    return this.offres.find(o => o.id === id)?.titre ?? 'Toutes les offres';
  }

  getCssBadge(status: string | undefined): string {
    switch (status) {
      case 'NOUVEAU':
      case 'CONTACTE':  return 'badge-nouveau';
      case 'ENTRETIEN': return 'badge-entretien';
      case 'EMBAUCHE':
      case 'ACCEPTEE':  return 'badge-acceptee';
      case 'REFUSE':
      case 'REFUSEE':   return 'badge-refusee';
      default:          return 'badge-nouveau';
    }
  }

  getLabelStatus(status: string | undefined): string {
    switch (status) {
      case 'NOUVEAU':   return 'NOUVELLE';
      case 'CONTACTE':  return 'CONTACTÉE';
      case 'ENTRETIEN': return 'ENTRETIEN';
      case 'EMBAUCHE':
      case 'ACCEPTEE':  return 'ACCEPTÉE';
      case 'REFUSE':
      case 'REFUSEE':   return 'REFUSÉE';
      default:          return status || 'NOUVELLE';
    }
  }

  isNouveau(c: CandidatureEnriched): boolean {
    return c.status === 'NOUVEAU' || c.status === 'CONTACTE' || !c.status;
  }
  isEntretien(c: CandidatureEnriched): boolean { return c.status === 'ENTRETIEN'; }
  isAcceptee(c: CandidatureEnriched): boolean  { return c.status === 'EMBAUCHE' || c.status === 'ACCEPTEE'; }
  isRefusee(c: CandidatureEnriched): boolean   { return c.status === 'REFUSE' || c.status === 'REFUSEE'; }
}
