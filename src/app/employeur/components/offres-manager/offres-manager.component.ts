import { CommonModule } from '@angular/common';
import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule } from '@angular/router';
import { OffreEmploisComponent } from '../offre-emplois/offre-emplois.component';
import { MatSnackBar } from '@angular/material/snack-bar';
import { forkJoin } from 'rxjs';
import { Candidature, CandidatureService } from '../../../freelance/services/candidatures.service';
import { OffreEmploi, OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { ConfirmDialogComponent } from './confirm-dialog';

@Component({
  selector: 'app-offres-manager',
  imports: [CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatToolbarModule,
    RouterModule,
    MatTableModule,
    MatMenuModule, 
    MatProgressSpinnerModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    OffreEmploisComponent
],
  templateUrl: './offres-manager.component.html',
 styleUrls: ['./offres-manager.component.scss'],
 standalone:true

})
export class OffresManagerComponent implements OnInit {
  @ViewChild('candidatesDialog') candidatesDialog!: TemplateRef<any>;
  
  offres: OffreEmploi[] = [];
  isLoading = true;
  showOffreEmploiForm = false;
  
  // Pagination
  itemsPerPage = 6;
  currentPage = 0;
  totalPages = 0;
  paginatedOffres: OffreEmploi[] = [];
  
  // ✅ Candidatures avec le bon type
  selectedOffreCandidatures: Candidature[] = [];
  dialogRef: MatDialogRef<any> | null = null;
  isLoadingCandidatures = false;

  constructor(
    private offreEmploisService: OffreEmploisService,
    private candidatureService: CandidatureService, // ✅ Injection du bon service
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadOffres();
  }

  loadOffres() {
    this.isLoading = true;
    
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres) => {
        this.loadOffresWithCandidatesCount(offres);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des offres:', error);
        this.isLoading = false;
        this.snackBar.open('Erreur lors du chargement des offres', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE : Utilise le bon service CandidatureService
  private loadOffresWithCandidatesCount(offres: OffreEmploi[]) {
    if (offres.length === 0) {
      this.offres = [];
      this.isLoading = false;
      this.initPagination();
      return;
    }

    // Créer un tableau d'observables pour récupérer le nombre de candidatures
    const candidaturesRequests = offres.map(offre => 
      this.candidatureService.getCandidaturesByOffre(offre.id!) // ✅ Utilise candidatureService
    );

    forkJoin(candidaturesRequests).subscribe({
      next: (candidaturesArrays) => {
        this.offres = offres.map((offre, index) => ({
          ...offre,
          experienceRequise: offre.experienceRequise || '',
          status: offre.status || 'OUVERT',
          candidaturesCount: candidaturesArrays[index].length // ✅ Nombre réel de candidatures
        }));
        
        console.log('✅ Offres chargées avec candidatures:', this.offres);
        this.isLoading = false;
        this.checkExpiredOffres();
        this.initPagination();
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement du nombre de candidatures:', error);
        this.offres = offres.map(offre => ({
          ...offre,
          experienceRequise: offre.experienceRequise || '',
          status: offre.status || 'OUVERT',
          candidaturesCount: 0 
        }));
        
        this.isLoading = false;
        this.checkExpiredOffres();
        this.initPagination();
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE : Utilise le bon service
  viewCandidates(offreId: number) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) {
      this.snackBar.open('Offre introuvable', 'Fermer', { duration: 3000 });
      return;
    }
    
    this.isLoadingCandidatures = true;
    this.selectedOffreCandidatures = [];
    
    // ✅ Utilise candidatureService au lieu d'offreEmploisService
    this.candidatureService.getCandidaturesByOffre(offreId).subscribe({
      next: (candidatures) => {
        // ✅ Mapper les candidatures pour ajouter les données d'affichage manquantes
        this.selectedOffreCandidatures = candidatures.map(candidature => ({
          ...candidature,
          nomCandidat: candidature.freelance?.nom || `Freelance ${candidature.freelanceId}`,
          emailCandidat: candidature.freelance?.email || 'Email non disponible',
          datePostulation: candidature.dateCandidature || new Date()
        }));
        
        console.log('✅ Candidatures chargées:', this.selectedOffreCandidatures);
        this.isLoadingCandidatures = false;
        
        // Ouvrir la boîte de dialogue
        this.dialogRef = this.dialog.open(this.candidatesDialog, {
          width: '600px',
          maxHeight: '80vh',
          data: { 
            offreId: offreId, 
            offreTitre: offre.titre,
            candidaturesCount: candidatures.length
          }
        });
      },
      error: (error) => {
        console.error('❌ Erreur lors du chargement des candidatures:', error);
        this.isLoadingCandidatures = false;
        this.snackBar.open('Erreur lors du chargement des candidatures', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE : Mise à jour du statut de candidature
  updateCandidatureStatus(candidature: Candidature, newStatus: string) {
    if (!candidature.id) {
      this.snackBar.open('Impossible de mettre à jour le statut', 'Fermer', {
        duration: 3000
      });
      return;
    }

    const updatedCandidature = { ...candidature, status: newStatus };
    
    this.candidatureService.updateCandidature(candidature.id, updatedCandidature).subscribe({
      next: (updated) => {
        const index = this.selectedOffreCandidatures.findIndex(c => c.id === candidature.id);
        if (index !== -1) {
          this.selectedOffreCandidatures[index] = {
            ...updated,
            nomCandidat: candidature.nomCandidat,
            emailCandidat: candidature.emailCandidat,
            datePostulation: candidature.datePostulation
          };
        }
        
        this.snackBar.open(`Statut mis à jour vers "${newStatus}"`, 'OK', {
          duration: 3000
        });
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  // Resto des méthodes inchangées...
  initPagination() {
    this.totalPages = Math.ceil(this.offres.length / this.itemsPerPage);
    this.currentPage = 0;
    this.updatePaginatedOffres();
  }

  updatePaginatedOffres() {
    const startIndex = this.currentPage * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.paginatedOffres = this.offres.slice(startIndex, endIndex);
  }

  nextPage() {
    if (this.currentPage < this.totalPages - 1) {
      this.currentPage++;
      this.updatePaginatedOffres();
    }
  }

  previousPage() {
    if (this.currentPage > 0) {
      this.currentPage--;
      this.updatePaginatedOffres();
    }
  }

  checkExpiredOffres() {
    const today = new Date();
    this.offres.forEach(offre => {
      const dateLimite = new Date(offre.dateLimite);
      if (offre.status !== 'FERMÉE' && dateLimite < today) {
        if (offre.id !== undefined) {
          this.updateOffreStatus(offre.id, 'FERMÉE');
        }
      }
    });
  }

  updateOffreStatus(offreId: number, newStatus: string) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) return;

    const updatedOffre: OffreEmploi = {
      ...offre,
      status: newStatus,
      datePublication: offre.datePublication || new Date(),
      candidatures: offre.candidatures || []
    };
    
    this.offreEmploisService.updateOffreEmploi(offreId, updatedOffre).subscribe({
      next: (response) => {
        const index = this.offres.findIndex(o => o.id === offreId);
        if (index !== -1) {
          this.offres[index] = { ...offre, ...response };
        }
        this.snackBar.open(`Offre "${offre.titre}" : statut mis à jour`, 'OK', {
          duration: 3000
        });
        this.updatePaginatedOffres();
      },
      error: (error) => {
        console.error('Erreur lors de la mise à jour du statut:', error);
        this.snackBar.open('Erreur lors de la mise à jour du statut', 'Fermer', {
          duration: 3000
        });
      }
    });
  }

  deleteOffre(offreId: number) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) return;

    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { title: 'Confirmer la suppression', message: `Êtes-vous sûr de vouloir supprimer l'offre "${offre.titre}" ?` }
    });

    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.offreEmploisService.deleteOffreEmploi(offreId).subscribe({
          next: () => {
            this.offres = this.offres.filter(o => o.id !== offreId);
            this.snackBar.open(`Offre "${offre.titre}" supprimée avec succès`, 'OK', {
              duration: 3000
            });
            this.initPagination();
          },
          error: (error) => {
            console.error('Erreur lors de la suppression:', error);
            this.snackBar.open('Erreur lors de la suppression de l\'offre', 'Fermer', {
              duration: 3000
            });
          }
        });
      }
    });
  }

  formatDate(date: string | Date | undefined): string {
    if (!date) return 'Date non définie';
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('fr-FR');
  }

  isExpired(dateLimite: string): boolean {
    return new Date(dateLimite) < new Date();
  }

  openOffreEmploiForm() {
    this.showOffreEmploiForm = true;
  }

  closeOffreEmploiForm() {
    this.showOffreEmploiForm = false;
    this.loadOffres();
  }

  // ✅ Méthodes d'affichage corrigées
  getActiveOffresCount(): number {
    return this.offres.filter(offre => 
      offre.status === 'ACTIVE' || offre.status === 'OUVERT'
    ).length;
  }

  getTotalCandidatures(): number {
    return this.offres.reduce((total, offre) => 
      total + (offre.candidaturesCount || 0), 0
    );
  }

  getJobIcon(typeContrat: string): string {
    const iconMap: { [key: string]: string } = {
      'CDI': 'work',
      'CDD': 'schedule',
      'Stage': 'school',
      'Freelance': 'person',
      'Temps partiel': 'schedule',
      'Mission': 'assignment',
      'Contrat pro': 'business_center'
    };
    return iconMap[typeContrat] || 'work_outline';
  }

  getStatusDisplayName(status: string): string {
    const statusMap: { [key: string]: string } = {
      'ACTIVE': 'Active',
      'OUVERT': 'Ouverte',
      'FERMÉE': 'Fermée',
      'FERMÉ': 'Fermée',
      'ARCHIVÉE': 'Archivée',
      'BROUILLON': 'Brouillon'
    };
    return statusMap[status] || status;
  }

  trackByOffreId(index: number, offre: OffreEmploi): any {
    return offre.id || index;
  }

  trackByCandidatureId(index: number, candidature: Candidature): any {
    return candidature.id || index;
  }

  duplicateOffre(offre: OffreEmploi): void {
    this.snackBar.open('Fonctionnalité de duplication en cours de développement', 'OK', {
      duration: 3000
    });
  }

  downloadCV(candidature: Candidature): void {
    if (candidature.cv) {
      this.snackBar.open(`CV de ${candidature.nomCandidat} téléchargé`, 'OK', {
        duration: 3000
      });
    } else {
      this.snackBar.open('Aucun CV disponible pour ce candidat', 'OK', {
        duration: 3000
      });
    }
  }

  viewCandidatureDetails(candidature: Candidature) {
    console.log('Détails de la candidature:', candidature);
    this.snackBar.open('Détails affichés dans la console', 'OK', {
      duration: 2000
    });
  }
}
