import { Component, OnInit, OnDestroy, inject, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { Subscription, forkJoin } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ReservationService } from '../../services/reservation/reservation.service';
import { AuthService } from '../../../core/servces/auth.service';


interface AvisRecu {
  id: number;
  note: number;
  commentaire: string;
  dateAvis: string;
  client: {
    nom: string;
    prenom: string;
  };
  reservation: {
    id: number;
    dateReservation: string;
    serviceSalon: {
      nom: string;
    };
  };
}

interface StatistiquesAvis {
  totalAvis: number;
  noteMoyenne: number;
  repartitionNotes: { [key: number]: number };
  tendance: 'positive' | 'negative' | 'stable';
}

@Component({
  selector: 'app-avis-recus',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatButtonToggleModule
  ],
  templateUrl: './avis-recus.component.html',
  styleUrls: ['./avis-recus.component.scss']
})
export class AvisRecusComponent implements OnInit, OnDestroy {
  @Input() userType: 'freelance' | 'employeur' = 'freelance';
  @Input() showHeader = true;
  @Input() compactMode = false;

  // Services
  private reservationService = inject(ReservationService);
  private authService = inject(AuthService);

  // Données
  avisRecus: AvisRecu[] = [];
  statistiques: StatistiquesAvis = {
    totalAvis: 0,
    noteMoyenne: 0,
    repartitionNotes: {},
    tendance: 'stable'
  };

  // États
  isLoading = false;
  isLoadingStats = false;
  error: string | null = null;
  selectedTabIndex = 0;

  // Filtres
  filtreNote: number | null = null;
  triSelected: 'recent' | 'ancien' | 'note_asc' | 'note_desc' = 'recent';

  // Pagination
  pageSize = 10;
  currentPage = 0;

  // Subscriptions
  private subscriptions = new Subscription();

  ngOnInit(): void {
    this.loadAvisRecus();
    this.loadStatistiques();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ✅ Charger les avis reçus
  loadAvisRecus(): void {
    this.isLoading = true;
    this.error = null;

    const avisObservable = this.userType === 'freelance' 
      ? this.reservationService.getFreelanceAvis()
      : this.reservationService.getSalonAvis();

    this.subscriptions.add(
      avisObservable.subscribe({
        next: (avis) => {
          console.log('✅ Avis reçus chargés:', avis);
          this.avisRecus = this.transformAvisData(avis);
          console.log('🔄 Avis après transformation:', this.avisRecus);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur lors du chargement des avis:', error);
          this.isLoading = false;
          this.error = 'Erreur lors du chargement des avis: ' + (error.error?.message || error.message || 'Erreur inconnue');
          this.avisRecus = []; // Afficher une liste vide plutôt que des données mock
        }
      })
    );
  }

  // ✅ Charger les statistiques
  loadStatistiques(): void {
    this.isLoadingStats = true;

    // Simuler le calcul des statistiques
    // En production, cela devrait venir du backend
    setTimeout(() => {
      this.calculateStatistiques();
      this.isLoadingStats = false;
    }, 1000);
  }

  // ✅ Calculer les statistiques à partir des avis
  private calculateStatistiques(): void {
    if (this.avisRecus.length === 0) {
      return;
    }

    const totalAvis = this.avisRecus.length;
    const sommeNotes = this.avisRecus.reduce((sum, avis) => sum + avis.note, 0);
    const noteMoyenne = sommeNotes / totalAvis;

    // Répartition des notes
    const repartitionNotes: { [key: number]: number } = {};
    for (let i = 1; i <= 5; i++) {
      repartitionNotes[i] = this.avisRecus.filter(avis => avis.note === i).length;
    }

    // Tendance (simplifié - basé sur les avis récents vs anciens)
    const avisRecents = this.avisRecus.slice(0, Math.min(5, this.avisRecus.length));
    const avisAnciens = this.avisRecus.slice(-Math.min(5, this.avisRecus.length));
    
    const moyenneRecente = avisRecents.reduce((sum, avis) => sum + avis.note, 0) / avisRecents.length;
    const moyenneAncienne = avisAnciens.reduce((sum, avis) => sum + avis.note, 0) / avisAnciens.length;
    
    let tendance: 'positive' | 'negative' | 'stable' = 'stable';
    if (moyenneRecente > moyenneAncienne + 0.2) tendance = 'positive';
    else if (moyenneRecente < moyenneAncienne - 0.2) tendance = 'negative';

    this.statistiques = {
      totalAvis,
      noteMoyenne: Math.round(noteMoyenne * 10) / 10,
      repartitionNotes,
      tendance
    };
  }

  // ✅ Transformer les données d'avis
  private transformAvisData(avisData: any[]): AvisRecu[] {
    return avisData.map(avis => {
      // Extraction du nom et prénom depuis nomClient (format: "prénom nom")
      let nom = 'Client';
      let prenom = 'Anonyme';
      
      if (avis.nomClient) {
        const nomComplet = avis.nomClient.trim().split(' ');
        if (nomComplet.length >= 2) {
          prenom = nomComplet[0];
          nom = nomComplet.slice(1).join(' '); // Au cas où il y aurait plusieurs mots pour le nom
        } else if (nomComplet.length === 1) {
          prenom = nomComplet[0];
          nom = '';
        }
      } else if (avis.client) {
        // Fallback vers l'ancienne structure si elle existe
        nom = avis.client.nom || 'Client';
        prenom = avis.client.prenom || 'Anonyme';
      }

      return {
        id: avis.id,
        note: avis.note,
        commentaire: avis.commentaire,
        dateAvis: avis.dateAvis,
        client: {
          nom: nom,
          prenom: prenom
        },
        reservation: {
          id: avis.reservationId || avis.reservation?.id,
          dateReservation: avis.datePrestation || avis.reservation?.dateReservation,
          serviceSalon: {
            nom: avis.nomService || avis.reservation?.serviceSalon?.nom || 'Service'
          }
        }
      };
    });
  }

  // ✅ Données de test en cas d'erreur API
  private getMockAvis(): any[] {
    return [
      {
        id: 1,
        note: 5,
        commentaire: "Service excellent ! Je recommande vivement. Très professionnelle et à l'écoute.",
        dateAvis: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        client: { nom: 'Martin', prenom: 'Sophie' },
        reservation: {
          id: 101,
          dateReservation: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          serviceSalon: { nom: 'Coiffure et Brushing' }
        }
      },
      {
        id: 2,
        note: 4,
        commentaire: "Très bon travail, je reviendrai ! Ambiance agréable.",
        dateAvis: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        client: { nom: 'Dubois', prenom: 'Marie' },
        reservation: {
          id: 102,
          dateReservation: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          serviceSalon: { nom: 'Maquillage' }
        }
      },
      {
        id: 3,
        note: 5,
        commentaire: "Parfait ! Exactement ce que je voulais. Merci beaucoup !",
        dateAvis: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        client: { nom: 'Petit', prenom: 'Laura' },
        reservation: {
          id: 103,
          dateReservation: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
          serviceSalon: { nom: 'Manucure' }
        }
      }
    ];
  }

  // ✅ Getters pour le template
  get avisFiltrés(): AvisRecu[] {
    let avis = [...this.avisRecus];

    // Filtrer par note si sélectionnée
    if (this.filtreNote) {
      avis = avis.filter(a => a.note === this.filtreNote);
    }

    // Trier
    switch (this.triSelected) {
      case 'recent':
        avis.sort((a, b) => new Date(b.dateAvis).getTime() - new Date(a.dateAvis).getTime());
        break;
      case 'ancien':
        avis.sort((a, b) => new Date(a.dateAvis).getTime() - new Date(b.dateAvis).getTime());
        break;
      case 'note_desc':
        avis.sort((a, b) => b.note - a.note);
        break;
      case 'note_asc':
        avis.sort((a, b) => a.note - b.note);
        break;
    }

    return avis;
  }

  get avisAffiches(): AvisRecu[] {
    const debut = this.currentPage * this.pageSize;
    return this.avisFiltrés.slice(debut, debut + this.pageSize);
  }

  get hasMorePages(): boolean {
    return (this.currentPage + 1) * this.pageSize < this.avisFiltrés.length;
  }

  get etoilesArray(): number[] {
    return [1, 2, 3, 4, 5];
  }

  // ✅ Actions de filtrage et tri
  filtrerParNote(note: number | null): void {
    this.filtreNote = note;
    this.currentPage = 0;
  }

  changerTri(tri: typeof this.triSelected): void {
    this.triSelected = tri;
    this.currentPage = 0;
  }

  // ✅ Navigation pages
  pageSuivante(): void {
    if (this.hasMorePages) {
      this.currentPage++;
    }
  }

  pagePrecedente(): void {
    if (this.currentPage > 0) {
      this.currentPage--;
    }
  }

  // ✅ Utilitaires d'affichage
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

  getInitiales(nom: string, prenom: string): string {
    return `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase();
  }

  getTendanceIcon(): string {
    switch (this.statistiques.tendance) {
      case 'positive': return 'trending_up';
      case 'negative': return 'trending_down';
      default: return 'trending_flat';
    }
  }

  getTendanceColor(): string {
    switch (this.statistiques.tendance) {
      case 'positive': return '#4CAF50';
      case 'negative': return '#F44336';
      default: return '#757575';
    }
  }

  // ✅ Actions
  actualiser(): void {
    this.loadAvisRecus();
    this.loadStatistiques();
  }

  exporterAvis(): void {
    // TODO: Implémenter l'export des avis en PDF/Excel
    console.log('Export des avis en cours...');
  }

  // Méthode utilitaire pour Math.min (car Math n'est pas accessible dans les templates)
  getMin(a: number, b: number): number {
    return Math.min(a, b);
  }

  // ✅ Méthodes pour les statistiques détaillées
  getPercentage(value: number, total: number): number {
    return total > 0 ? Math.round((value / total) * 100) : 0;
  }

  getPositivePercentage(): number {
    const positives = (this.statistiques.repartitionNotes[4] || 0) + (this.statistiques.repartitionNotes[5] || 0);
    return this.getPercentage(positives, this.statistiques.totalAvis);
  }

  getNeutralPercentage(): number {
    const neutrals = this.statistiques.repartitionNotes[3] || 0;
    return this.getPercentage(neutrals, this.statistiques.totalAvis);
  }

  getNegativePercentage(): number {
    const negatives = (this.statistiques.repartitionNotes[1] || 0) + (this.statistiques.repartitionNotes[2] || 0);
    return this.getPercentage(negatives, this.statistiques.totalAvis);
  }

  // ✅ TrackBy function pour optimiser les performances
  trackByAvisId(index: number, avis: AvisRecu): number {
    return avis.id;
  }
}