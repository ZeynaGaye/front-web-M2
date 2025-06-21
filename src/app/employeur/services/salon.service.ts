import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of } from 'rxjs';
import { ServiceSalon } from '../../models/service-salon';

@Injectable({
  providedIn: 'root'
})
export class SalonService {
  private apiUrl = 'http://localhost:8081/api';
  constructor(private http: HttpClient) {}

  createSalon(salon: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/create`, salon);
  }
  
  getCurrentSalonId(): number | null {
    const salonId = localStorage.getItem('currentSalonId');
    return salonId ? parseInt(salonId) : null;
  }
  
  setCurrentSalonId(salonId: number): void {
    localStorage.setItem('currentSalonId', salonId.toString());
  }

  getAllSalons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/all`);
  }
  
  getSalonById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/salons/${id}`);
  }

  createSalonWithFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/with-file`, formData);
  }
  
  getMesSalons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/employeur/mes-salons`);
  }

  getServicesBySalon(salonId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/services/all/${salonId}`);
  }

  updateSalonProfilePhoto(salonId: number, formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/${salonId}/update-profile-photo`, formData);
  }
  
  getSalonPhotos(salonId: number): Observable<any[]> {
    console.log(`🔍 Requête GET vers: ${this.apiUrl}/salons/${salonId}/photos`);
    return this.http.get<any[]>(`${this.apiUrl}/salons/${salonId}/photos`).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la récupération des photos du salon:', error);
        return of([]);
      })
    );
  }
  
  uploadSalonPhotos(salonId: number, formData: FormData): Observable<any[]> {
    console.log(`📤 Upload photos vers: ${this.apiUrl}/salons/${salonId}/upload-photos`);
    return this.http.post<any[]>(`${this.apiUrl}/salons/${salonId}/upload-photos`, formData).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de l\'upload des photos:', error);
        return of([]);
      })
    );
  }
  
  deleteSalonPhoto(photoId: number): Observable<void> {
    console.log(`🗑️ Suppression photo: ${this.apiUrl}/salons/photos/${photoId}`);
    return this.http.delete<void>(`${this.apiUrl}/salons/photos/${photoId}`).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la suppression de la photo:', error);
        return of(undefined);
      })
    );
  }
  
  updateSalonProfilePhotoUrl(salonId: number, data: { photoUrl: string }): Observable<any> {
    console.log(`🖼️ Mise à jour photo de profil: ${this.apiUrl}/salons/${salonId}/profile-photo-url`);
    return this.http.put<any>(`${this.apiUrl}/salons/${salonId}/profile-photo-url`, data).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la mise à jour de la photo de profil:', error);
        return of(null);
      })
    );
  }

  getEmployeurServices(): Observable<ServiceSalon[]> {
    return this.getMesSalons().pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des salons:', error);
        return of([]);
      })
    );
  }

  getEmployeurSalons(): Observable<any[]> {
    return this.getMesSalons().pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des salons:', error);
        return of([]);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche par service spécifique (pour les boutons)
   */
  getSalonsByService(service: string): Observable<any[]> {
    // Utiliser l'endpoint spécifique pour les services prédéfinis
    let params = new HttpParams().set('serviceNom', service);
    
    return this.http.get<any[]>(`${this.apiUrl}/salons/by-service`, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des salons par service:', error);
        return of([]);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche globale flexible (pour la barre de recherche)
   */
  searchSalonsGlobal(searchData: any): Observable<any[]> {
    let url = `${this.apiUrl}/salons/search-global`;
    let params = new HttpParams();
    
    // Le terme de recherche est obligatoire
    if (!searchData.term || !searchData.term.trim()) {
      return of([]);
    }
    
    params = params.set('query', searchData.term.trim());
    
    // Ajouter les coordonnées utilisateur si disponibles
    if (searchData.location) {
      const coords = this.extractCoordinates(searchData.location);
      if (coords[0] !== null && !isNaN(coords[0])) {
        params = params.set('userLat', coords[0].toString());
        params = params.set('userLng', coords[1].toString());
      }
    }
    
    // Ajouter le budget si disponible
    if (searchData.budget) {
      params = params.set('budget', searchData.budget.toString());
    }
    
    // Ajouter la date/heure si disponible
    if (searchData.datetime) {
      params = params.set('datetime', searchData.datetime);
    }
    
    return this.http.get<any[]>(url, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la recherche globale:', error);
        return of([]);
      })
    );
  }

  /**
   * Méthode unifiée pour la recherche avancée
   */
/**
 * Recherche globale flexible - CORRIGÉE COMPLÈTEMENT
 */
searchSalons(searchData: any): Observable<any[]> {
  console.log('🔍 searchSalons appelé avec:', searchData);
  
  // Vérifications de sécurité
  if (!searchData || typeof searchData !== 'object') {
    console.error('❌ searchData invalide:', searchData);
    return of([]);
  }

  if (!searchData.term || typeof searchData.term !== 'string' || !searchData.term.trim()) {
    console.error('❌ Terme de recherche invalide:', searchData.term);
    return of([]);
  }

  // Utiliser l'endpoint /search (pas /search-global)
  let url = `${this.apiUrl}/salons/search`;
  let params = new HttpParams();
  
  // IMPORTANT: Utiliser 'query' comme attendu par le backend
  params = params.set('query', searchData.term.trim());
  
  // Ajouter les autres paramètres seulement s'ils sont valides
  if (searchData.location && typeof searchData.location === 'string') {
    const coords = this.extractCoordinates(searchData.location);
    if (!isNaN(coords[0]) && !isNaN(coords[1])) {
      params = params.set('userLat', coords[0].toString());
      params = params.set('userLng', coords[1].toString());
    }
  }
  
  if (searchData.budget && typeof searchData.budget === 'number' && searchData.budget > 0) {
    params = params.set('budget', searchData.budget.toString());
  }
  
  if (searchData.datetime && typeof searchData.datetime === 'string') {
    params = params.set('datetime', searchData.datetime);
  }
  
  console.log('📤 URL:', url);
  console.log('📤 Paramètres:', params.toString());
  
  return this.http.get<any[]>(url, { params }).pipe(
    catchError(error => {
      console.error('❌ Erreur lors de la recherche:', error);
      return of([]);
    })
  );
}
  /**
   * Recherche avec photo
   */
  searchSalonsWithPhoto(formData: FormData): Observable<any[]> {
    const url = `${this.apiUrl}/salons/search-with-photo`;
    return this.http.post<any[]>(url, formData).pipe(
      catchError(error => {
        console.error('Erreur lors de la recherche avec photo:', error);
        return of([]);
      })
    );
  }

  /**
   * Recherche de salons à proximité
   */
  getSalonsNearby(latitude: number, longitude: number, radius: number = 10): Observable<any[]> {
    const url = `${this.apiUrl}/salons/nearby`;
    let params = new HttpParams()
      .set('latitude', latitude.toString())
      .set('longitude', longitude.toString())
      .set('radius', radius.toString());
    
    return this.http.get<any[]>(url, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la recherche de salons à proximité:', error);
        return of([]);
      })
    );
  }

  /**
   * Service de géocodage inversé
   */
  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    return of(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
  }

  /**
   * Extraire des coordonnées depuis une chaîne de texte
   */
  private extractCoordinates(location: string): [number, number] {
    if (!location) return [NaN, NaN];
    
    if (location.includes(',')) {
      try {
        const [lat, lng] = location.split(',').map(s => parseFloat(s.trim()));
        if (!isNaN(lat) && !isNaN(lng)) {
          return [lat, lng];
        }
      } catch (e) {
        console.error("Erreur lors de l'extraction des coordonnées", e);
      }
    }
    
    return [NaN, NaN];
  }

  private handleError<T>(operation = 'opération', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} a échoué: ${error.message}`);
      return of(result as T);
    };
  }
}