import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { OffreEmploisService, OffreEmploi } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { MatDialog, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterModule } from '@angular/router';
import { ConfirmDialogComponent } from './confirm-dialog';
import { MatTableModule } from '@angular/material/table';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { OffreEmploisComponent } from '../offre-emplois/offre-emplois.component';

interface Candidature {
  id: number;
  nomCandidat: string;
  emailCandidat: string;
  datePostulation: string;
  cv?: string;
  lettreMotivation?: string;
  status: string;
}



@Component({
  selector: 'app-offres-manager',
  templateUrl: './offres-manager.component.html',
  styleUrls: ['./offres-manager.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
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
    MatProgressBarModule,
    MatDialogModule,
    OffreEmploisComponent,
  ]
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
  
  // Candidatures
  selectedOffreCandidatures: Candidature[] = [];
  dialogRef: MatDialogRef<any> | null = null;
  
  // Banner carousel - images de beauté
  bannerImages: string[] = [
    'https://images.unsplash.com/photo-1593642633270-c4e8c1f2b3a5?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80', // soins de la peau
    'https://images.unsplash.com/photo-1560750588-73207b1ef5b8?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80', // produits de beauté
    'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80', // maquillage
    'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1200&q=80', // coiffure
  ];
  currentBannerIndex = 0;
  bannerInterval: any;

  constructor(
    private offreEmploisService: OffreEmploisService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadOffres();
    this.startBannerCarousel();
  }

  ngOnDestroy() {
    this.stopBannerCarousel();
  }

  loadOffres() {
    this.isLoading = true;
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres) => {
        // Dans un cas réel, vous récupéreriez le nombre de candidatures depuis votre API
        // Ici on simule des candidatures aléatoires pour la démonstration
        this.offres = offres.map(offre => ({
          ...offre,
          experienceRequise: offre.experienceRequise || '',
          status: offre.status || 'OUVERT',
          candidaturesCount: this.getRandomCandidatureCount()
        }));
        this.isLoading = false;
        // Vérifier les dates limites pour les offres actives
        this.checkExpiredOffres();
        // Initialiser la pagination
        this.initPagination();
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

  // Méthode pour la démo - Générer un nombre aléatoire de candidatures
  getRandomCandidatureCount(): number {
    // 30% de chance d'avoir 0 candidature
    if (Math.random() < 0.3) return 0;
    // Sinon entre 1 et 12 candidatures
    return Math.floor(Math.random() * 12) + 1;
  }

  // Méthodes pour gérer les candidatures
  viewCandidates(offreId: number) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) return;
    
    // Simuler le chargement des candidatures
    this.selectedOffreCandidatures = [];
    if (offre.candidaturesCount && offre.candidaturesCount > 0) {
      // Générer des candidatures fictives pour la démonstration
      for (let i = 0; i < offre.candidaturesCount; i++) {
        this.selectedOffreCandidatures.push(this.generateFakeCandidature(i, offreId));
      }
    }
    
    // Ouvrir la boîte de dialogue
    this.dialogRef = this.dialog.open(this.candidatesDialog, {
      width: '500px',
      data: { offreId: offreId, offreTitre: offre.titre }
    });
  }

  // Méthode pour la démo - Générer une candidature fictive
  generateFakeCandidature(index: number, offreId: number): Candidature {
    const names = ['Jean Dupont', 'Marie Laurent', 'Sophie Martin', 'Thomas Bernard', 'Julie Petit', 'Nicolas Durand'];
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomEmail = randomName.toLowerCase().replace(' ', '.') + '@email.com';
    
    // Générer une date de postulation entre aujourd'hui et il y a 30 jours
    const today = new Date();
    const randomDaysAgo = Math.floor(Math.random() * 30);
    const randomDate = new Date(today.getTime() - randomDaysAgo * 24 * 60 * 60 * 1000);
    
    return {
      id: offreId * 100 + index,
      nomCandidat: randomName,
      emailCandidat: randomEmail,
      datePostulation: randomDate.toISOString(),
      status: Math.random() > 0.5 ? 'NOUVELLE' : 'CONSULTÉE'
    };
  }

  viewCandidatureDetails(candidatureId: number) {
    // Implémentation fictive pour la démonstration
    this.snackBar.open('Affichage des détails de la candidature', 'OK', {
      duration: 2000
    });
  }

  // Méthodes de pagination
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

  // Méthodes pour le carrousel de bannière
  startBannerCarousel() {
    this.bannerInterval = setInterval(() => {
      this.nextBanner();
    }, 5000); // Change banner every 5 seconds
  }

  stopBannerCarousel() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
    }
  }

  nextBanner() {
    this.currentBannerIndex = (this.currentBannerIndex + 1) % this.bannerImages.length;
  }

  previousBanner() {
    this.currentBannerIndex = (this.currentBannerIndex - 1 + this.bannerImages.length) % this.bannerImages.length;
  }

  // Vérifier les offres expirées
  checkExpiredOffres() {
    const today = new Date();
    this.offres.forEach(offre => {
      const dateLimite = new Date(offre.dateLimite);
      if (offre.status !== 'FERMÉE' && dateLimite < today) {
        // Mettre à jour automatiquement le statut des offres expirées
        if (offre.id !== undefined) {
          this.updateOffreStatus(offre.id, 'FERMÉE');
        }
      }
    });
  }

  // Mettre à jour le statut d'une offre
  updateOffreStatus(offreId: number, newStatus: string) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) return;

    // CORRECTION: S'assurer que toutes les propriétés requises sont présentes
    const updatedOffre: OffreEmploi = {
      ...offre,
      status: newStatus,
      // S'assurer que ces propriétés existent, sinon les initialiser
      datePublication: offre.datePublication || new Date(),
      candidatures: offre.candidatures || []
    };
    
    this.offreEmploisService.updateOffreEmploi(offreId, updatedOffre).subscribe({
      next: (response) => {
        // Mettre à jour l'offre localement
        const index = this.offres.findIndex(o => o.id === offreId);
        if (index !== -1) {
          this.offres[index] = { ...offre, ...response };
        }
        this.snackBar.open(`Offre "${offre.titre}" : statut mis à jour`, 'OK', {
          duration: 3000
        });
        // Mettre à jour les offres paginées
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

  // Supprimer une offre
  deleteOffre(offreId: number) {
    const offre = this.offres.find(o => o.id === offreId);
    if (!offre) return;

    // Option: Ajouter une boîte de dialogue de confirmation
    const confirmRef = this.dialog.open(ConfirmDialogComponent, {
      width: '350px',
      data: { title: 'Confirmer la suppression', message: `Êtes-vous sûr de vouloir supprimer l'offre "${offre.titre}" ?` }
    });

    confirmRef.afterClosed().subscribe(result => {
      if (result) {
        this.offreEmploisService.deleteOffreEmploi(offreId).subscribe({
          next: () => {
            // Supprimer l'offre de la liste locale
            this.offres = this.offres.filter(o => o.id !== offreId);
            this.snackBar.open(`Offre "${offre.titre}" supprimée avec succès`, 'OK', {
              duration: 3000
            });
            // Mettre à jour la pagination
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

  // Formater la date pour l'affichage
  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('fr-FR');
  }

  // Vérifier si une offre est expirée
  isExpired(dateLimite: string): boolean {
    return new Date(dateLimite) < new Date();
  }

  openOffreEmploiForm() {
    this.showOffreEmploiForm = true;
  }

  closeOffreEmploiForm() {
    this.showOffreEmploiForm = false;
    this.loadOffres(); // Recharger la liste après création
  }
}