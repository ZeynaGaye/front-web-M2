import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CandidatureService } from '../../services/candidatures.service';
import { AuthService } from '../../../core/servces/auth.service';
import { Candidature } from '../../interfaces/candidatures.interface';

@Component({
  selector: 'app-mes-candidatures',
  standalone: true,
  imports: [
    CommonModule, 
    MatCardModule, 
    MatIconModule, 
    MatButtonModule, 
    MatBadgeModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './mes-candidatures.component.html',
  styleUrls: ['./mes-candidatures.component.scss']
})
export class MesCandidaturesComponent implements OnInit {
  
  candidatures: Candidature[] = [];
  isLoading = false;
  currentUser: any = null;

  private candidatureService = inject(CandidatureService);
  private authService = inject(AuthService);

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadMesCandidatures();
  }

  loadCurrentUser(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });
  }

  loadMesCandidatures(): void {
    if (!this.currentUser?.id) {
      console.error('Utilisateur non connecté');
      return;
    }

    this.isLoading = true;
    this.candidatureService.getCandidaturesByFreelance(this.currentUser.id).subscribe({
      next: (candidatures) => {
        this.candidatures = candidatures.sort((a, b) => 
          new Date(b.dateCandidature || '').getTime() - new Date(a.dateCandidature || '').getTime()
        );
        this.isLoading = false;
        console.log('Mes candidatures chargées:', this.candidatures);
      },
      error: (error) => {
        console.error('Erreur lors du chargement des candidatures:', error);
        this.isLoading = false;
      }
    });
  }

  getStatusBadgeClass(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'acceptee':
        return 'status-accepted';
      case 'refusee':
        return 'status-rejected';
      case 'en_attente':
      case 'nouveau':
        return 'status-pending';
      default:
        return 'status-unknown';
    }
  }

  getStatusDisplayName(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'acceptee':
        return 'Acceptée';
      case 'refusee':
        return 'Refusée';
      case 'en_attente':
        return 'En attente';
      case 'nouveau':
        return 'Nouvelle';
      default:
        return status || 'Inconnu';
    }
  }

  getStatusIcon(status: string | undefined): string {
    switch (status?.toLowerCase()) {
      case 'acceptee':
        return 'check_circle';
      case 'refusee':
        return 'cancel';
      case 'en_attente':
      case 'nouveau':
        return 'hourglass_empty';
      default:
        return 'help';
    }
  }

  formatDate(dateStr: string | Date | undefined): string {
    if (!dateStr) return 'Date non disponible';
    
    const date = new Date(dateStr);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  refreshCandidatures(): void {
    this.loadMesCandidatures();
  }
}