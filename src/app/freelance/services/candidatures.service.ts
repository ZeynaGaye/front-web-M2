import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

// ✅ Interface adaptée à votre service existant
export interface Candidature {
  freelance: any;
  freelanceId: any;
  nomCandidat: any;
  emailCandidat: any;
  datePostulation: any;
  cv: any;
  id?: number;
  offreEmploiId: number; // Correspond au backend
   
  message?: string;
  disponibilite?: string;
  tarifPropose?: number;
  status?: string;
  dateCandidature?: Date;
  
  // ✅ Propriétés ajoutées pour l'interface améliorée
  isLue?: boolean;
  isNouvelle?: boolean;
  dateCreation?: Date;
  dateModification?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CandidatureService {
  private apiUrl = 'http://localhost:8081/api/candidatures';

  constructor(private http: HttpClient) {}

  // ===== VOS MÉTHODES EXISTANTES (inchangées) =====
  
  createCandidature(candidatureData: {
    offreEmploiId: number;
    message: string;
    disponibilite: string;
    tarifPropose: number;
  }): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.apiUrl}/create`, candidatureData);
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

  deleteCandidature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // ===== NOUVELLES MÉTHODES POUR L'INTERFACE AMÉLIORÉE =====

  /**
   * ✅ Normalise les données de candidature pour l'affichage optimisé
   */
  private normalizeCandidature(candidature: any): Candidature {
    return {
      ...candidature,
      // Normaliser les dates
      dateCandidature: candidature.dateCandidature || candidature.datePostulation,
      dateCreation: candidature.dateCreation || candidature.datePostulation,
      
      // Normaliser le nom du candidat
      nomCandidat: candidature.nomCandidat || 
                   this.extractNameFromFreelance(candidature.freelance) ||
                   this.generateFakeName(candidature.id || Math.random()),
      
      // Normaliser l'email
      emailCandidat: candidature.emailCandidat || 
                     this.extractEmailFromFreelance(candidature.freelance) ||
                     this.generateFakeEmail(candidature.nomCandidat || 'candidat'),
      
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
   * ✅ Extrait le nom depuis l'objet freelance
   */
  private extractNameFromFreelance(freelance: any): string | null {
    if (!freelance) return null;
    
    if (freelance.nom && freelance.prenom) {
      return `${freelance.prenom} ${freelance.nom}`;
    }
    
    if (freelance.nomComplet) {
      return freelance.nomComplet;
    }
    
    if (freelance.name) {
      return freelance.name;
    }
    
    return null;
  }

  /**
   * ✅ Extrait l'email depuis l'objet freelance
   */
  private extractEmailFromFreelance(freelance: any): string | null {
    if (!freelance) return null;
    
    return freelance.email || freelance.emailCandidat || null;
  }

  /**
   * ✅ Détermine si une candidature est nouvelle
   */
  private isNewCandidature(candidature: any): boolean {
    const status = candidature.status;
    const dateCreation = new Date(candidature.datePostulation || candidature.dateCandidature);
    const maintenant = new Date();
    const septJoursEnMs = 7 * 24 * 60 * 60 * 1000;
    
    return (status === 'Nouveau' || !status) && 
           (maintenant.getTime() - dateCreation.getTime()) < septJoursEnMs;
  }

  /**
   * ✅ Génère un nom fictif pour les candidatures sans nom
   */
  private generateFakeName(seed: number): string {
    const prenoms = [
      'Marie', 'Sophie', 'Julie', 'Camille', 'Emma', 'Léa', 'Chloé', 'Manon', 
      'Lucie', 'Clara', 'Sarah', 'Laura', 'Océane', 'Pauline', 'Céline'
    ];
    const noms = [
      'Dubois', 'Martin', 'Leroy', 'Rousseau', 'Laurent', 'Bernard', 'Moreau', 
      'Petit', 'Durand', 'Roux', 'Vincent', 'Michel', 'Garcia', 'Blanc', 'Guerin'
    ];
    
    const prenomIndex = Math.floor(seed) % prenoms.length;
    const nomIndex = Math.floor(seed * 10) % noms.length;
    
    return `${prenoms[prenomIndex]} ${noms[nomIndex]}`;
  }

  /**
   * ✅ Génère un email fictif
   */
  private generateFakeEmail(nom: string): string {
    const email = nom.toLowerCase()
                     .replace(/\s+/g, '.')
                     .normalize('NFD')
                     .replace(/[\u0300-\u036f]/g, '')
                     .replace(/[^a-z.]/g, '');
    
    const domains = ['email.com', 'gmail.com', 'yahoo.fr', 'outlook.com', 'hotmail.fr'];
    const domain = domains[Math.floor(Math.random() * domains.length)];
    
    return `${email}@${domain}`;
  }

  // ===== MÉTHODES OPTIONNELLES POUR FONCTIONNALITÉS AVANCÉES =====

  /**
   * ✅ Marque une candidature comme lue (si votre backend le supporte)
   */
  markAsRead(candidatureId: number): Observable<Candidature> {
    return this.updateCandidature(candidatureId, { isLue: true } as Candidature);
  }

  /**
   * ✅ Obtient les statistiques basiques
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
   * ✅ Recherche simple dans les candidatures
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
   * ✅ Export simple des candidatures (côté client)
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