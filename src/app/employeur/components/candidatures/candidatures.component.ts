import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-candidatures',
  imports: [
    CommonModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './candidatures.component.html',
  styleUrls: ['./candidatures.component.scss'],

})
export class CandidaturesComponent implements OnInit {
  // Colonnes à afficher dans le tableau
  displayedColumns: string[] = ['nom', 'prenom', 'email', 'statut', 'actions'];
  
  // État de chargement
  isLoading = false;

  // Données des candidatures (exemple)
  candidatures = [
    { id: 1, nom: 'Doe', prenom: 'John', email: 'john.doe@example.com', telephone: '0123456789', statut: 'En attente' },
    { id: 2, nom: 'Smith', prenom: 'Jane', email: 'jane.smith@example.com', telephone: '0987654321', statut: 'En attente' },
    { id: 3, nom: 'Brown', prenom: 'Chris', email: 'chris.brown@example.com', telephone: '0555123456', statut: 'En attente' },
  ];

  constructor() {}

  ngOnInit(): void {
    // Vous pouvez charger les candidatures depuis une API ici
  }

  // Valider une candidature
  validerCandidature(candidature: any) {
    candidature.statut = 'Validée';
    console.log('Candidature validée :', candidature);
    // Envoyer une requête au backend pour mettre à jour le statut
  }

  // Rejeter une candidature
  rejeterCandidature(candidature: any) {
    candidature.statut = 'Rejetée';
    console.log('Candidature rejetée :', candidature);
    // Envoyer une requête au backend pour mettre à jour le statut
  }

  // Accepter une candidature
  accepterCandidature(candidature: any) {
    candidature.statut = 'Acceptée';
    console.log('Candidature acceptée :', candidature);
    // Envoyer une requête au backend pour mettre à jour le statut
  }

  // Voir les détails d'une candidature
  voirDetails(candidature: any) {
    console.log('Voir détails de la candidature :', candidature);
    // Ouvrir un dialog ou naviguer vers une page de détails
  }

  // Obtenir les initiales du candidat
  getInitials(candidature: any): string {
    const nom = candidature.nom || '';
    const prenom = candidature.prenom || '';
    return (prenom.charAt(0) + nom.charAt(0)).toUpperCase();
  }
}