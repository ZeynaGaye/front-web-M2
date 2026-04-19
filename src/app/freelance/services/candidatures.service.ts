import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map, catchError, switchMap, tap } from 'rxjs/operators';
import { FreelanceService } from './freelance.service';
import { Candidature } from '../interfaces/candidatures.interface';
import { NotificationService } from '../../shared/services/notification/notification.service';

@Injectable({
  providedIn: 'root'
})
export class CandidatureService {
  private apiUrl = 'http://localhost:8081/api/candidatures';

  constructor(
    private http: HttpClient,
    private freelanceService: FreelanceService,
    private notificationService: NotificationService
  ) {}

  
  
  createCandidature(candidatureData: {
    offreEmploiId: number;
    message: string;
    disponibilite: string;
    // tarifPropose: number;
  }): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.apiUrl}/create`, candidatureData).pipe(
      tap((candidature) => {
        // Créer une notification pour l'employeur quand une nouvelle candidature arrive
        if (candidature && candidature.id) {
          // Pour récupérer l'ID de l'employeur, on doit d'abord récupérer les détails de l'offre
          this.getOffreDetails(candidatureData.offreEmploiId).subscribe({
            next: (offre) => {
              if (offre && offre.employeurId) {
                const notificationData = {
                  id: candidature.id,
                  offreEmploiId: candidatureData.offreEmploiId,
                  freelancePrenom: candidature.freelancePrenom || '',
                  freelanceNom: candidature.freelanceNom || '',
                  offreTitre: offre.titre || 'Offre d\'emploi'
                };
                
                this.notificationService.createNewCandidatureNotification(offre.employeurId, notificationData).subscribe({
                  
                  error: (error) => console.error(' Erreur création notification employeur:', error)
                });
              }
            },
            error: (error) => console.error(' Erreur récupération détails offre:', error)
          });
        }
      })
    );
  }

  // Méthode helper pour récupérer les détails d'une offre
  private getOffreDetails(offreId: number): Observable<any> {
    return this.http.get<any>(`http://localhost:8081/api/offres-emploi/${offreId}`);
  }

  getAllCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/all`).pipe(
      map(candidatures => candidatures.map(c => this.normalizeCandidature(c))),
      catchError(error => {
        console.error('Error fetching all candidatures', error);
        return of([]);
      })
    );
  }

  getCandidatureById(id: number): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.apiUrl}/${id}`).pipe(
      map(candidature => this.normalizeCandidature(candidature))
    );
  }

  getCandidaturesByFreelance(freelanceId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/freelance/${freelanceId}`).pipe(
      map(candidatures => candidatures.map(c => this.normalizeCandidature(c)))
    );
  }

  getCandidaturesByOffre(offreId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/offre/${offreId}`).pipe(
      switchMap(candidatures => {
        if (candidatures.length === 0) {
          return of([]);
        }

        // Enrichir chaque candidature avec les données du freelance
        const enrichedCandidatures = candidatures.map(candidature => {
          // Essayer d'abord avec freelanceId
          if (candidature.freelanceId) {
            return this.freelanceService.getFreelanceById(candidature.freelanceId).pipe(
              map(freelance => {
                return {
                  ...candidature,
                  freelanceEmail: freelance.email || 'Email non disponible',
                  freelanceTel: freelance.telephone || 'Téléphone non disponible',
                  freelanceAdresse: freelance.adresse || 'Adresse non disponible',
                  freelanceCompetences: freelance.competences ? freelance.competences.split(',').map(c => c.trim()) : [],
                  freelanceExperience: freelance.experiences || 'Non spécifiée',
                  freelanceDetails: freelance
                };
              }),
              catchError(() => of(candidature))
            );
          }
          
          // Si pas de freelanceId, essayer de chercher par nom
          if (candidature.freelanceNom && candidature.freelancePrenom) {
            const searchTerm = `${candidature.freelancePrenom} ${candidature.freelanceNom}`;
            return this.freelanceService.searchFreelances(searchTerm).pipe(
              map(freelances => {
                if (freelances && freelances.length > 0) {
                  const freelance = freelances[0]; // Prendre le premier résultat
                  return {
                    ...candidature,
                    freelanceEmail: freelance.email || 'Email non disponible',
                    freelanceTel: freelance.telephone || 'Téléphone non disponible',
                    freelanceAdresse: freelance.adresse || 'Adresse non disponible',
                    freelanceCompetences: freelance.competences ? freelance.competences.split(',').map(c => c.trim()) : [],
                    freelanceExperience: freelance.experiences || 'Non spécifiée',
                    freelanceDetails: freelance
                  };
                }
                return candidature;
              }),
              catchError(() => of(candidature))
            );
          }
          
          return of(candidature);
        });

        return forkJoin(enrichedCandidatures);
      }),
      map(candidatures => candidatures.map(c => this.normalizeCandidature(c))),
      catchError(error => {
        console.error('Error fetching candidatures for offre', offreId, error);
        return of([]);
      })
    );
  }

  getCandidaturesByStatus(status: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/status/${status}`).pipe(
      map(candidatures => candidatures.map(c => this.normalizeCandidature(c)))
    );
  }

  /**
   * Méthode pour vérifier si un freelance a déjà postulé à une offre
   */
  aDejaPostule(offreId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/a-deja-postule`, {
      params: { offreId: offreId.toString() }
    });
  }

  updateCandidature(id: number, candidature: Candidature): Observable<Candidature> {
    return this.http.put<Candidature>(`${this.apiUrl}/${id}`, candidature).pipe(
      map(updatedCandidature => this.normalizeCandidature(updatedCandidature))
    );
  }

  // Méthode spécifique pour mettre à jour le statut avec notification au freelance
  updateCandidatureStatus(id: number, candidature: Candidature, newStatus: string): Observable<Candidature> {
    const oldStatus = candidature.status;
    candidature.status = newStatus;
    
    return this.http.put<Candidature>(`${this.apiUrl}/${id}`, candidature).pipe(
      map(updatedCandidature => this.normalizeCandidature(updatedCandidature)),
      tap((updatedCandidature) => {
        // Créer notification seulement si le statut a changé vers ACCEPTEE ou REFUSEE
        if ((newStatus === 'ACCEPTEE' || newStatus === 'REFUSEE') && oldStatus !== newStatus) {
          if (updatedCandidature.freelanceId) {
            // Récupérer les détails de l'offre pour le titre
            this.getOffreDetails(updatedCandidature.offreEmploiId || 0).subscribe({
              next: (offre) => {
                const notificationData = {
                  id: updatedCandidature.id,
                  offreEmploiId: updatedCandidature.offreEmploiId,
                  offreTitre: offre?.titre || 'Offre d\'emploi'
                };
                
                this.notificationService.createCandidatureStatusNotification(
                  updatedCandidature.freelanceId!, 
                  newStatus, 
                  notificationData
                ).subscribe({
                  
                  error: (error) => console.error(' Erreur création notification freelance:', error)
                });
              },
              error: (error) => console.error(' Erreur récupération détails offre pour notification:', error)
            });
          }
        }
      })
    );
  }

  deleteCandidature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ===== NOUVELLES MÉTHODES POUR L'INTERFACE AMÉLIORÉE =====

  /**
   *  Normalise les données de candidature pour l'affichage optimisé
   */
  private normalizeCandidature(candidature: any): Candidature {
    // Extraire le nom réel - adaptée à la structure réelle des données
    let nomCandidat = 'Nom non disponible';
    if (candidature.freelancePrenom && candidature.freelanceNom) {
      nomCandidat = `${candidature.freelancePrenom} ${candidature.freelanceNom}`;
    } else if (candidature.freelanceNom) {
      nomCandidat = candidature.freelanceNom;
    } else if (candidature.freelance?.prenom && candidature.freelance?.nom) {
      nomCandidat = `${candidature.freelance.prenom} ${candidature.freelance.nom}`;
    } else if (candidature.freelance?.nom) {
      nomCandidat = candidature.freelance.nom;
    } else if (candidature.nomCandidat && candidature.nomCandidat !== 'Nom non disponible') {
      nomCandidat = candidature.nomCandidat;
    }
    
    // Extraire l'email réel - le backend devrait déjà fournir freelanceEmail
    let emailCandidat = candidature.freelanceEmail || candidature.freelance?.email || candidature.emailCandidat || 'Email non disponible';
    
    // Extraire le téléphone
    let telCandidat = 'non disponible';
    if (candidature.freelanceTelephone) {
      telCandidat = candidature.freelanceTelephone;
    } else if (candidature.freelanceTel) {
      telCandidat = candidature.freelanceTel;
    } else if (candidature.freelance?.telephone) {
      telCandidat = candidature.freelance.telephone;
    }
    
    return {
      ...candidature,
      // Normaliser les dates
      dateCandidature: candidature.dateCandidature || candidature.datePostulation,
      dateCreation: candidature.dateCreation || candidature.datePostulation,
      
      // Utiliser les vraies données extraites
      nomCandidat: nomCandidat,
      emailCandidat: emailCandidat,
      telCandidat: telCandidat,
      
      // Statut par défaut
      status: candidature.status || 'Nouveau',
      
      // Propriétés pour l'interface
      isNouvelle: this.isNewCandidature(candidature),
      isLue: candidature.isLue || false,
      
      // Valeurs par défaut
      disponibilite: candidature.disponibilite || 'Non spécifiée'
    };
  }

  /**
   *  Détermine si une candidature est nouvelle
   */
  private isNewCandidature(candidature: any): boolean {
    const status = candidature.status;
    const dateCreation = new Date(candidature.datePostulation || candidature.dateCandidature);
    const maintenant = new Date();
    const septJoursEnMs = 7 * 24 * 60 * 60 * 1000;
    
    return (status === 'Nouveau' || !status) && 
           (maintenant.getTime() - dateCreation.getTime()) < septJoursEnMs;
  }


  // ===== MÉTHODES OPTIONNELLES POUR FONCTIONNALITÉS AVANCÉES =====

  /**
   *  Marque une candidature comme lue (si votre backend le supporte)
   */
  markAsRead(candidatureId: number): Observable<Candidature> {
    return this.updateCandidature(candidatureId, { 
      offreEmploiId: 0, // Valeur temporaire, sera écrasée par updateCandidature
      isLue: true 
    } as Candidature);
  }

  /**
   *  Obtient les statistiques basiques
   */
  getBasicStats(): Observable<{
    total: number;
    nouvelles: number;
    contactees: number;
    entretiens: number;
    embauches: number;
    refusees: number;
  }> {
    return this.getAllCandidatures().pipe(
      map(candidatures => {
        const stats = {
          total: candidatures.length,
          nouvelles: candidatures.filter(c => c.status === 'Nouveau' || !c.status).length,
          contactees: candidatures.filter(c => c.status === 'Contacté').length,
          entretiens: candidatures.filter(c => c.status === 'Entretien').length,
          embauches: candidatures.filter(c => c.status === 'Embauché').length,
          refusees: candidatures.filter(c => c.status === 'Refusé').length
        };
        return stats;
      }),
      catchError(error => {
        console.error('Error calculating stats', error);
        return of({
          total: 0,
          nouvelles: 0,
          contactees: 0,
          entretiens: 0,
          embauches: 0,
          refusees: 0
        });
      })
    );
  }

  /**
   *  Recherche simple dans les candidatures
   */
  searchCandidatures(query: string): Observable<Candidature[]> {
    return this.getAllCandidatures().pipe(
      map(candidatures => {
        if (!query || query.trim().length < 2) {
          return candidatures;
        }
        
        const searchTerm = query.toLowerCase();
        return candidatures.filter(candidature => {
          const nom = (candidature.nomCandidat || '').toLowerCase();
          const email = (candidature.emailCandidat || '').toLowerCase();
          const message = (candidature.message || '').toLowerCase();
          
          return nom.includes(searchTerm) || 
                 email.includes(searchTerm) || 
                 message.includes(searchTerm);
        });
      })
    );
  }

  /**
   *  Export simple des candidatures (côté client)
   */
  exportToCsv(candidatures: Candidature[]): void {
    const headers = [
      'ID',
      'Nom',
      'Email', 
      'Date de candidature',
      'Statut',
      'Tarif proposé',
      'Disponibilité',
      'Message'
    ];

    const csvContent = [
      headers.join(','),
      ...candidatures.map(c => [
        c.id || '',
        `"${c.nomCandidat || ''}"`,
        c.emailCandidat || '',
        c.dateCandidature ? new Date(c.dateCandidature).toLocaleDateString('fr-FR') : '',
        c.status || '',
        c.tarifPropose || '',
        `"${c.disponibilite || ''}"`,
        `"${(c.message || '').replace(/"/g, '""')}"`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `candidatures_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  }
}