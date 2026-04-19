import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { Candidature } from '../../../freelance/interfaces/candidatures.interface';

export interface OffreEmploi {
  datePublication?: Date;
  dateCreation?: Date;
  candidatures: any;
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
  candidaturesCount?: number;
  // NOUVEAU : Informations salon
  salonId?: number;
  salonNom?: string;
  salonAdresse?: string;
  salonDescription?: string;
  salonPhotoProfil?: string;
  // Informations employeur
  employeurId?: number;
  employeurNom?: string;
}

export interface Salon {
  id: number;
  nom: string;
  adresse: string;
  ville: string;
  telephone?: string;
  description?: string;
  status?: string;
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

  // NOUVELLE MÉTHODE : Créer une offre avec salon spécifique
  createOffreEmploiWithSalon(offreEmploi: OffreEmploi, salonId: number): Observable<OffreEmploi> {
    return this.http.post<OffreEmploi>(`${this.apiUrl}/create-with-salon?salonId=${salonId}`, offreEmploi);
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

  // NOUVELLE MÉTHODE : Récupérer les offres par salon
  getOffresEmploisBySalon(salonId: number): Observable<OffreEmploi[]> {
    return this.http.get<OffreEmploi[]>(`${this.apiUrl}/salon/${salonId}`).pipe(
      catchError(error => {
        console.error('Error fetching offers by salon', salonId, error);
        return of([]);
      })
    );
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

  // Count my job offers
  countMyOffresEmplois(): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/count`).pipe(
      catchError(error => {
        console.error('Error counting offers', error);
        return of(0); // Retourne 0 en cas d'erreur
      })
    );
  }

  // NOUVELLE MÉTHODE : Compter les offres par salon
  countOffresBySalon(salonId: number): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/salon/${salonId}/count`).pipe(
      catchError(error => {
        console.error('Error counting offers by salon', salonId, error);
        return of(0);
      })
    );
  }

  // NOUVELLE MÉTHODE : Récupérer mes salons (utilise l'endpoint salon)
  getMySalons(): Observable<Salon[]> {
    return this.http.get<Salon[]>('http://localhost:8081/api/salons/employeur/mes-salons').pipe(
      catchError(error => {
        console.error('Error fetching my salons', error);
        return of([]);
      })
    );
  }

  //  NOUVELLE MÉTHODE : Récupérer les candidatures d'une offre
  getCandidaturesByOffreId(offreId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/${offreId}/candidatures`).pipe(
      catchError(error => {
        console.error('Error fetching candidatures for offre', offreId, error);
        return of([]); // Retourne un tableau vide en cas d'erreur
      })
    );
  }

  //  NOUVELLE MÉTHODE : Récupérer une candidature spécifique
  getCandidatureById(offreId: number, candidatureId: number): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.apiUrl}/${offreId}/candidatures/${candidatureId}`).pipe(
      catchError(error => {
        console.error('Error fetching candidature details', candidatureId, error);
        throw error;
      })
    );
  }

  //  NOUVELLE MÉTHODE : Mettre à jour le statut d'une candidature
  updateCandidatureStatus(offreId: number, candidatureId: number, status: string): Observable<Candidature> {
    return this.http.put<Candidature>(
      `${this.apiUrl}/${offreId}/candidatures/${candidatureId}/status`, 
      { status }
    ).pipe(
      catchError(error => {
        console.error('Error updating candidature status', candidatureId, error);
        throw error;
      })
    );
  }
}