import { Component, Input, OnInit, ViewEncapsulation } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog'; 
import { PageEvent } from '@angular/material/paginator';
import { EmployeListItem, StatutEmploye, TypeContrat } from '../../../models/employe';
import { EmployeService } from '../../services/employe';
import { EmployeFormComponent, EmployeFormData } from '../employe-form/employe-form.component';
import { EmployeDetailsComponent, EmployeDetailsData } from '../employe-details/employe-details.component'; 
import { MatInputModule } from "@angular/material/input";
import { MatChipsModule } from "@angular/material/chips";
import { MatMenuModule } from "@angular/material/menu";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialogModule } from '@angular/material/dialog'; 
import { NgClass, NgForOf, NgIf } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-employe-list',
  templateUrl: './employe-list.component.html',
  styleUrls: ['./employe-list.component.scss'],
  // encapsulation: ViewEncapsulation.None,
  standalone: true,
  imports: [
    MatInputModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatTooltipModule,
    MatDividerModule,
    MatDialogModule, 
    NgClass,
    NgForOf,
    NgIf,
    FormsModule,
    MatSnackBarModule
  ]
})
export class EmployeListComponent implements OnInit {
  
  employes: EmployeListItem[] = [];
  totalElements = 0;
  pageSize = 10;
  pageIndex = 0;
  currentPage = 0;
  loading = false;
  recherche = '';
  @Input() salonId!: number;
  
  displayedColumns: string[] = ['nomComplet', 'email', 'specialites', 'statut', 'actions'];

  constructor(
    private employeService: EmployeService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog 
  ) {}

ngOnInit(): void {
  if (!this.salonId) {
    this.snackBar.open('Erreur: Salon non trouvé', 'Fermer', { 
      duration: 3000,
      panelClass: ['error-snackbar']
    });
    return;
  }
  this.chargerEmployes();
}


  // Méthodes existantes inchangées
  chargerEmployes(): void {
    this.loading = true;
    this.employeService.listerEmployes(this.salonId, this.pageIndex, this.pageSize)
      .subscribe({
        next: (response: { content: EmployeListItem[]; totalElements: number; }) => {
          this.employes = response.content || [];
          this.totalElements = response.totalElements || 0;
          this.loading = false;
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des employés:', error);
          this.snackBar.open('Erreur lors du chargement des employés', 'Fermer', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          this.employes = [];
          this.loading = false;
        }
      });
  }

  onPageChange(event: PageEvent): void {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.currentPage = event.pageIndex;
    this.chargerEmployes();
  }

  rechercher(): void {
    if (this.recherche.trim().length >= 2) {
      this.loading = true;
      this.pageIndex = 0;
      this.currentPage = 0;
      
      this.employeService.rechercherEmployes(this.salonId, this.recherche.trim())
        .subscribe({
          next: (employes: EmployeListItem[]) => {
            this.employes = employes || [];
            this.totalElements = employes?.length || 0;
            this.loading = false;
          },
          error: (error: any) => {
            console.error('Erreur lors de la recherche:', error);
            this.snackBar.open('Erreur lors de la recherche', 'Fermer', { 
              duration: 3000,
              panelClass: ['error-snackbar']
            });
            this.loading = false;
          }
        });
    } else if (this.recherche.trim().length === 0) {
      this.pageIndex = 0;
      this.currentPage = 0;
      this.chargerEmployes();
    }
  }

  // NOUVELLES MÉTHODES POUR MODALS
  nouvelEmploye(): void {
    const dialogRef = this.dialog.open(EmployeFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
      panelClass: 'employe-modal-panel',
      data: {
        salonId: this.salonId,
        isEditMode: false
      } as EmployeFormData
    });

    // Gérer la fermeture du modal
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        console.log('Employé créé:', result.employe);
        this.snackBar.open(`Employé ${result.employe.nomComplet} créé avec succès!`, 'Fermer', { 
          duration: 4000,
          panelClass: ['success-snackbar']
        });
        this.chargerEmployes(); // Recharger la liste
      }
    });

    // Gérer les événements du composant enfant
    dialogRef.componentInstance.employeCreated.subscribe((employe: any) => {
      console.log('Événement employeCreated reçu:', employe);
      // Le rechargement sera fait dans afterClosed
    });
  }

  modifierEmploye(employe: EmployeListItem): void {
    const dialogRef = this.dialog.open(EmployeFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
      panelClass: 'employe-modal-panel',
      data: {
        salonId: this.salonId,
        employeId: employe.id,
        isEditMode: true
      } as EmployeFormData
    });

    // Gérer la fermeture du modal
    dialogRef.afterClosed().subscribe(result => {
      if (result && result.success) {
        console.log('Employé modifié:', result.employe);
        this.snackBar.open(`Employé ${result.employe.nomComplet} modifié avec succès!`, 'Fermer', { 
          duration: 4000,
          panelClass: ['success-snackbar']
        });
        this.chargerEmployes(); // Recharger la liste
      }
    });

    // Gérer les événements du composant enfant
    dialogRef.componentInstance.employeUpdated.subscribe((employe: any) => {
      console.log('Événement employeUpdated reçu:', employe);
      // Le rechargement sera fait dans afterClosed
    });
  }

  voirEmploye(employe: EmployeListItem): void {
    // Ouvrir un dialog avec les détails complets de l'employé
    const dialogRef = this.dialog.open(EmployeDetailsComponent, {
      width: '600px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      autoFocus: true,
      restoreFocus: true,
      panelClass: 'employe-details-modal-panel',
      data: {
        employe: employe
      } as EmployeDetailsData
    });

    // Pas besoin de gérer les événements car c'est en lecture seule
    dialogRef.afterClosed().subscribe(() => {
      console.log('Dialog de visualisation fermé');
    });
  }

  supprimerEmploye(employe: EmployeListItem): void {
    const confirmation = confirm(`Êtes-vous sûr de vouloir supprimer définitivement l'employé ${employe.nomComplet} ?\n\nCette action est irréversible.`);
    if (confirmation) {
      this.loading = true;
      this.employeService.supprimerEmploye(employe.id)
        .subscribe({
          next: () => {
            this.snackBar.open(`Employé ${employe.nomComplet} supprimé avec succès`, 'Fermer', { 
              duration: 4000,
              panelClass: ['success-snackbar']
            });
            this.chargerEmployes();
          },
          error: (error: any) => {
            console.error('Erreur lors de la suppression:', error);
            this.snackBar.open('Erreur lors de la suppression de l\'employé', 'Fermer', { 
              duration: 4000,
              panelClass: ['error-snackbar']
            });
            this.loading = false;
          }
        });
    }
  }

  reactiverEmploye(employe: EmployeListItem): void {
    this.employeService.reactiverEmploye(employe.id)
      .subscribe({
        next: () => {
          this.snackBar.open(`Employé ${employe.nomComplet} réactivé avec succès`, 'Fermer', { 
            duration: 4000,
            panelClass: ['success-snackbar']
          });
          this.chargerEmployes();
        },
        error: (error: any) => {
          console.error('Erreur lors de la réactivation:', error);
          this.snackBar.open('Erreur lors de la réactivation', 'Fermer', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  archiverEmploye(employe: EmployeListItem): void {
    const confirmation = confirm(`Voulez-vous archiver l'employé ${employe.nomComplet} ?\n\nIl passera en statut inactif.`);
    if (confirmation) {
      this.employeService.modifierEmploye(employe.id, {
        statut: StatutEmploye.INACTIF,
        nom: '',
        prenom: '',
        email: '',
        telephone: '',
        specialites: [],
        typeContrat: TypeContrat.CDI,
        horaireDebut: '',
        horaireFin: ''
      })
        .subscribe({
          next: () => {
            this.snackBar.open(`Employé ${employe.nomComplet} archivé avec succès`, 'Fermer', { 
              duration: 4000,
              panelClass: ['success-snackbar']
            });
            this.chargerEmployes();
          },
          error: (error: any) => {
            console.error('Erreur lors de l\'archivage:', error);
            this.snackBar.open('Erreur lors de l\'archivage', 'Fermer', { 
              duration: 4000,
              panelClass: ['error-snackbar']
            });
          }
        });
    }
  }

  // Méthodes utilitaires inchangées
  trackBySpecialite(_index: number, item: string): string {
    return item;
  }

  formatSpecialiteName(specialite: string): string {
    return specialite
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  getRestantesSpecialites(specialites: string[]): string {
    if (specialites.length <= 2) return '';
    return specialites
      .slice(2)
      .map(spec => this.formatSpecialiteName(spec))
      .join(', ');
  }

  getStatutClass(statut: StatutEmploye): string {
    const statutMap: { [key: string]: string } = {
      [StatutEmploye.ACTIF]: 'statut-actif',
      [StatutEmploye.INACTIF]: 'statut-inactif',
      [StatutEmploye.CONGE]: 'statut-conge',
      [StatutEmploye.SUSPENDU]: 'statut-suspendu'
    };
    return statutMap[statut] || 'statut-inactif';
  }

  getStatutLabel(statut: StatutEmploye): string {
    const labelMap: { [key: string]: string } = {
      [StatutEmploye.ACTIF]: 'Actif',
      [StatutEmploye.INACTIF]: 'Inactif',
      [StatutEmploye.CONGE]: 'En congé',
      [StatutEmploye.SUSPENDU]: 'Suspendu'
    };
    return labelMap[statut] || statut;
  }

  getStatutIcon(statut: StatutEmploye): string {
    const iconMap: { [key: string]: string } = {
      [StatutEmploye.ACTIF]: 'fa-check-circle',
      [StatutEmploye.INACTIF]: 'fa-times-circle',
      [StatutEmploye.CONGE]: 'fa-umbrella-beach',
      [StatutEmploye.SUSPENDU]: 'fa-ban'
    };
    return iconMap[statut] || 'fa-question-circle';
  }


  getStatutTooltip(statut: StatutEmploye): string {
    const tooltipMap: { [key: string]: string } = {
      [StatutEmploye.ACTIF]: 'Employé actif et disponible pour les rendez-vous',
      [StatutEmploye.INACTIF]: 'Employé inactif - ne peut pas prendre de rendez-vous',
      [StatutEmploye.CONGE]: 'Employé en congé temporaire',
      [StatutEmploye.SUSPENDU]: 'Employé suspendu - accès restreint au système'
    };
    return tooltipMap[statut] || 'Statut inconnu';
  }

  isMobile(): boolean {
    if (typeof window !== 'undefined') {
      return window.innerWidth <= 768;
    }
    return false;
  }

  viderRecherche(): void {
    this.recherche = '';
    this.rechercher();
  }
}