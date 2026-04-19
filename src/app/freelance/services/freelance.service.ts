import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, map } from 'rxjs/operators';
import { Freelance } from '../../models/PortfolioItem';

/** Normalise les noms de champs backend (FR) vers l'interface Freelance (EN) */
function normalizeFreelance(data: any): Freelance {
  return {
    ...data,
    profileImage: data.profileImage || data.photoProfil || data.photoProfilUrl || data.imageUrl || data.avatar || null,
    rating:       data.rating       || data.noteMoyenne || data.note || 0,
    reviews:      data.reviews      || data.nombreAvis  || data.nbAvis || data.reviewCount || 0,
    profession:   data.profession   || data.specialite  || data.metier || null,
    competences:  data.competences  || data.services?.map((s: any) => s.nom || s).join(', ') || null,
    ville:        data.ville        || data.city        || null,
    adresse:      data.adresse      || data.address     || null,
  };
}


@Injectable({
  providedIn: 'root',
})
export class FreelanceService {
  private apiUrl = 'http://localhost:8081/api/utilisateurs/freelance';

  constructor(private http: HttpClient) {}

  /**
   * Récupère les informations d'un freelance spécifique par ID
   */
  getFreelanceById(freelanceId: number): Observable<Freelance> {
    return this.http.get<any>(`${this.apiUrl}/${freelanceId}`).pipe(
      retry(1),
      map(data => normalizeFreelance(data)),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les freelances par catégorie de service
   */
  getFreelancesByCategory(category: string): Observable<Freelance[]> {
    return this.http.get<Freelance[]>(`${this.apiUrl}/category/${category}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les freelances à proximité d'une localisation
   */
  getFreelancesByLocation(latitude: number, longitude: number, radius: number = 10): Observable<Freelance[]> {
    return this.http.get<Freelance[]>(
      `${this.apiUrl}/nearby?lat=${latitude}&lng=${longitude}&radius=${radius}`
    ).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Recherche des freelances par termes de recherche
   */
  searchFreelances(searchTerm: string): Observable<Freelance[]> {
    return this.http.get<Freelance[]>(`${this.apiUrl}/search?q=${searchTerm}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les freelances les mieux notés
   */
  getTopRatedFreelances(limit: number = 10): Observable<Freelance[]> {
    return this.http.get<Freelance[]>(`${this.apiUrl}/top-rated?limit=${limit}`).pipe(
      retry(1),
      catchError(this.handleError)
    );
  }

  /**
   * Gestion des erreurs HTTP
   */
 /**
 * Gestion des erreurs HTTP
 */
private handleError(error: HttpErrorResponse) {
  let errorMessage = '';
  
  if (error.status === 0) {
    // Une erreur s'est produite côté client ou il y a un problème réseau
    errorMessage = `Erreur réseau: ${error.message}`;
  } else {
    // Le backend a renvoyé un code d'état d'échec
    errorMessage = `Code d'erreur ${error.status}: ${error.message}`;
    if (error.error && typeof error.error === 'object') {
      errorMessage += ` - Détails: ${JSON.stringify(error.error)}`;
    }
  }
  
  console.error('Une erreur est survenue:', errorMessage);
  return throwError(() => new Error(errorMessage));
}
  getAllFreelances(): Observable<Freelance[]> {
    return this.http.get<Freelance[]>(`${this.apiUrl}/all`).pipe(
      retry(1),
      catchError((error) => {
        console.error('Erreur API, utilisation des données de test:', error);
        return this.getMockFreelances();
      })
    );
  }

  /**
   * Retourne des données de test en cas d'échec de l'API
   */
  private getMockFreelances(): Observable<Freelance[]> {
    return this.http.get<Freelance[]>('/assets/mock-freelances.json').pipe(
      catchError(() => {
        console.error('Impossible de charger les données de test');
        return of(this.getHardcodedFreelances());
      })
    );
  }

  /**
   * Données de secours codées en dur
   */
  private getHardcodedFreelances(): Freelance[] {
    return [
      {
        id: 1,
        nom: 'Diop',
        prenom: 'Fatou',
        email: 'fatou.diop@email.com',
        adresse: 'Dakar, Plateau',
        telephone: '77 123 45 67',
        competences: 'Coiffure, Tresses, Soins capillaires',
        profession: 'Coiffeuse',
        ville: 'Dakar',
        profileImage: '/assets/images/profile-placeholder.jpg',
        rating: 4.8,
        reviews: 25,
       
        
      },
      {
        id: 2,
        nom: 'Ndiaye',
        prenom: 'Aminata',
        email: 'aminata.ndiaye@email.com',
        adresse: 'Dakar, Sacré-Coeur',
        telephone: '76 987 65 43',
        competences: 'Maquillage, Soins du visage, Manucure',
        profession: 'Esthéticienne',
        ville: 'Dakar',
        profileImage: '/assets/images/profile-placeholder.jpg',
        rating: 4.6,
        reviews: 18,
       
       
      },
      {
        id: 3,
        nom: 'Fall',
        prenom: 'Moussa',
        email: 'moussa.fall@email.com',
        adresse: 'Dakar, Mermoz',
        telephone: '78 456 78 90',
        competences: 'Coiffure homme, Barbe, Massage crânien',
        profession: 'Barbier',
        ville: 'Dakar',
        profileImage: '/assets/images/profile-placeholder.jpg',
        rating: 4.9,
        reviews: 42,
       
      }
    ];
  }
}