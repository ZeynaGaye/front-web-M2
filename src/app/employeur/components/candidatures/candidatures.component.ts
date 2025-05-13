import { Component, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';

@Component({
  selector: 'app-candidatures',
  imports: [MatTableModule,
    MatIconModule,
    MatButtonModule,],
  templateUrl: './candidatures.component.html',
  styleUrls: ['./candidatures.component.scss'],

})
export class CandidaturesComponent implements OnInit {
  // Colonnes à afficher dans le tableau
  displayedColumns: string[] = ['nom', 'prenom', 'email', 'statut', 'actions'];

  // Données des candidatures (exemple)
  candidatures = [
    { id: 1, nom: 'Doe', prenom: 'John', email: 'john.doe@example.com', statut: 'En attente' },
    { id: 2, nom: 'Smith', prenom: 'Jane', email: 'jane.smith@example.com', statut: 'En attente' },
    { id: 3, nom: 'Brown', prenom: 'Chris', email: 'chris.brown@example.com', statut: 'En attente' },
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
}