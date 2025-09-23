import { Component, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { NgClass, NgForOf, NgIf, DatePipe } from '@angular/common';
import { EmployeListItem, EmployeResponse, StatutEmploye, TypeContrat } from '../../../models/employe';
import { EmployeService } from '../../services/employe';

export interface EmployeDetailsData {
  employe: EmployeListItem;
}

@Component({
  selector: 'app-employe-details',
  templateUrl: './employe-details.component.html',
  styleUrls: ['./employe-details.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatDividerModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    NgClass,
    NgForOf,
    NgIf,
    DatePipe
  ]
})
export class EmployeDetailsComponent implements OnInit {
  
  employe: EmployeListItem;
  employeComplet: EmployeResponse | null = null;
  loading = true;

  constructor(
    public dialogRef: MatDialogRef<EmployeDetailsComponent>,
    @Inject(MAT_DIALOG_DATA) public data: EmployeDetailsData,
    private employeService: EmployeService
  ) {
    this.employe = data.employe;
  }

  ngOnInit(): void {
    this.chargerDetailsEmploye();
  }

  chargerDetailsEmploye(): void {
    this.loading = true;
    this.employeService.obtenirEmploye(this.employe.id).subscribe({
      next: (employeComplet: EmployeResponse) => {
        this.employeComplet = employeComplet;
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des détails:', error);
        this.loading = false;
      }
    });
  }

  fermer(): void {
    this.dialogRef.close();
  }

  formatSpecialiteName(specialite: string): string {
    return specialite
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
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

  getTypeContratLabel(typeContrat: TypeContrat): string {
    const labelMap: { [key: string]: string } = {
      [TypeContrat.CDI]: 'CDI',
      [TypeContrat.CDD]: 'CDD',
      [TypeContrat.TEMPS_PARTIEL]: 'Temps partiel',
      [TypeContrat.STAGE]: 'Stage',
      [TypeContrat.INTERIM]: 'Intérim'
    };
    return labelMap[typeContrat] || typeContrat;
  }
}