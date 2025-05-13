import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry, tap } from 'rxjs/operators';
import { ServiceSalon } from '../../../models/service-salon';

@Injectable({
  providedIn: 'root'
})
export class SalonService {

  private apiUrl = 'http://localhost:8081/api'; 

  constructor(private http: HttpClient) {
    // console.log('SalonService initialisé avec URL de base:', this.apiUrl);
  }

  // Get services of the connected employer
  getEmployeurServices(): Observable<ServiceSalon[]> {
    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/salons/employeur/services`)
      .pipe(
        catchError(error => {
          console.error('Error fetching employer services', error);
          return of([]);
        })
      );
  }
  
  // Get services of a specific salon
  getServicesBySalon(salonId: number): Observable<ServiceSalon[]> {
    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/salons/${salonId}/services/all`)
      .pipe(
        catchError(error => {
          console.error(`Error fetching services for salon ${salonId}`, error);
          return of([]);
        })
      );
  }

  getAllSalons(): Observable<any[]> {
    // Correction de l'URL
    return this.http.get<any[]>(`${this.apiUrl}/salons/all`)
      .pipe(
        catchError(error => {
          console.error('Error fetching all salons', error);
          return of([]);
        })
      );
  }
  
  // Get salon by ID
  getSalonById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/salons/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Error fetching salon with ID ${id}`, error);
          return of(null);
        })
      );
  }

  createSalon(salon: any): Observable<any> {
    // Correction de l'URL
    return this.http.post<any>(`${this.apiUrl}/salons/create`, salon);
  }

  // Save salon as draft
  saveSalonDraft(salonData: any): Observable<any> {
    const draftData = { ...salonData, status: 'DRAFT' };
    // Correction de l'URL
    return this.http.post(`${this.apiUrl}/salons/create`, draftData);
  }

  // Update existing salon
  updateSalon(id: number, salonData: any): Observable<any> {
    // Correction de l'URL
    return this.http.put(`${this.apiUrl}/salons/update/${id}`, salonData);
  }

  // Delete salon
  deleteSalon(id: number): Observable<any> {
    // Correction de l'URL
    return this.http.delete(`${this.apiUrl}/salons/delete/${id}`);
  }

  // Get all salons of an owner
  getSalonsByProprietaire(proprietaireId: number): Observable<any[]> {
    // Correction de l'URL
    return this.http.get<any[]>(`${this.apiUrl}/salons/proprietaire/${proprietaireId}`);
  }

  // Search salons by service - CORRECTION IMPORTANTE ICI
  getSalonsByService(serviceName: string): Observable<any[]> {
    console.log(`Recherche de salons pour le service: ${serviceName}`);
    
    // Vérifier si le nom du service est valide
    if (!serviceName || !serviceName.trim()) {
      console.warn('Nom de service invalide');
      return of([]);
    }
    
    // URL avec encodage pour éviter les problèmes avec les caractères spéciaux
    const encodedService = encodeURIComponent(serviceName.trim());
    
    // CORRECTION DU CHEMIN D'URL
    const url = `${this.apiUrl}/salons/by-service?serviceNom=${encodedService}`;
    
    console.log(`Appel API: ${url}`);
    
    return this.http.get<any[]>(url).pipe(
      // Réessayer la requête en cas d'échec (jusqu'à 2 fois)
      retry(2),
      
      tap(salons => {
        console.log(`${salons?.length || 0} salons trouvés pour le service: ${serviceName}`);
      }),
      
      catchError((error: HttpErrorResponse) => {
        console.error(`Erreur lors de la recherche de salons pour le service: ${serviceName}`, error);
        
        if (error.status === 0) {
          console.error('Problème de connexion réseau. Vérifiez votre connexion internet.');
        } else if (error.status === 401) {
          console.error(`Erreur d'authentification (401). Vérifiez si l'endpoint nécessite une authentification.`);
        } else {
          console.error(`Le serveur a retourné le code ${error.status}: ${error.message}`);
          
          if (error.error) {
            console.error('Détails de l\'erreur:', error.error);
          }
        }
        
        // Retourner un tableau vide plutôt que de propager l'erreur
        return of([]);
      })
    );
  }

  // Create salon with file
  createSalonWithFile(formData: FormData): Observable<any> {
    // Correction de l'URL
    return this.http.post<any>(`${this.apiUrl}/salons/with-file`, formData);
  }
  
  // Search salons by keyword
  searchSalons(keyword: string): Observable<any[]> {
    let params = new HttpParams().set('keyword', keyword);
    // Correction de l'URL
    return this.http.get<any[]>(`${this.apiUrl}/salons/search`, { params })
      .pipe(
        catchError(error => {
          console.error(`Error searching salons with keyword ${keyword}`, error);
          return of([]);
        })
      );
  }

  // Ajoutez cette méthode au SalonService
  getSalonPhotos(salonId: number): Observable<any[]> {
    // Correction de l'URL
    return this.http.get<any[]>(`${this.apiUrl}/salons/${salonId}/photos`)
      .pipe(
        catchError(error => {
          console.error(`Error fetching photos for salon ${salonId}`, error);
          return of([]);
        })
      );
  }
}