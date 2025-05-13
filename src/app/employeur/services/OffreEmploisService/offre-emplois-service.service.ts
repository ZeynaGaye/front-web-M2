import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';

export interface OffreEmploi {
  status: string;
  experienceRequise: string;
  id?: number;
  titre: string;
  description: string;
  competences: string;
  lieu: string;
  typeContrat: string;
  salaire: string;
  dateLimite: string;
}

@Injectable({
  providedIn: 'root'
})
export class OffreEmploisService {
  private apiUrl = 'http://localhost:8081/api/offres-emplois';

  constructor(private http: HttpClient) { }

  // Create a new job offer
  createOffreEmploi(offreEmploi: OffreEmploi): Observable<OffreEmploi> {
    return this.http.post<OffreEmploi>(`${this.apiUrl}/create`, offreEmploi);
  }

  // Get all job offers
  getAllOffresEmplois(): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/all`);
  }

  // Get a job offer by ID
  getOffreEmploiById(id: number): Observable<OffreEmploi> {
    return this.http.get<OffreEmploi>(`${this.apiUrl}/${id}`);
  }

  // Get job offers by employer ID
  getOffresEmploisByEmployeur(employeurId: number): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/employeur/${employeurId}`);
  }

  // Get my job offers (for logged-in employer)
  getMyOffresEmplois(): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/my-offres`).pipe(
      catchError(error => {
        console.error('Error fetching offers', error);
        return of([]); // Retourne un tableau vide en cas d'erreur
      })
    );
  }

  // Search job offers by title
  searchOffresEmplois(titre: string): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/search?titre=${titre}`);
  }

  // Get job offers by status
  getOffresEmploisByStatus(status: string): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/status/${status}`);
  }

  // Update a job offer
  updateOffreEmploi(id: number, offreDetails: OffreEmploi): Observable<OffreEmploi> {
    return this.http.put<OffreEmploi>(`${this.apiUrl}/${id}`, offreDetails);
  }

  // Delete a job offer
  deleteOffreEmploi(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  // Ajouter cette méthode au service OffreEmploisService
  countMyOffresEmplois(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`).pipe(
      catchError(error => {
        console.error('Error counting offers', error);
        return of(0); // Retourne 0 en cas d'erreur
      })
    );
  }
}