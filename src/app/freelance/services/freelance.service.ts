import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, retry, tap, map } from 'rxjs/operators';
import { Freelance } from '../../models/PortfolioItem';


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
    return this.http.get<Freelance>(`${this.apiUrl}/${freelanceId}`).pipe(
      retry(1),
      tap((freelance) => console.log(`Freelance récupéré:`, freelance)),
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
      tap(freelances => console.log('Tous les freelances récupérés:', freelances)),
      catchError(this.handleError)
    );
  }
}