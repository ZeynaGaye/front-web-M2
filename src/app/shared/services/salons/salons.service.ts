import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry, tap } from 'rxjs/operators';
import { ServiceSalon } from '../../../models/service-salon';

@Injectable({
  providedIn: 'root',
})
export class SalonService {
  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {
    // console.log('SalonService initialisé avec URL de base:', this.apiUrl);
  }

  // ===============================================
  // MÉTHODES EXISTANTES (CONSERVÉES)
  // ===============================================

  // MISE À JOUR: Implémentation de la méthode getEmployeurSalons
  getEmployeurSalons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/employeur/mes-salons`).pipe(
      tap(salons => console.log('Salons récupérés pour l\'employeur:', salons)),
      catchError(error => {
        console.error('Erreur lors de la récupération des salons de l\'employeur', error);
        return of([]);
      })
    );
  }

  // Get services of the connected employer
  getEmployeurServices(): Observable<ServiceSalon[]> {
    return this.http
      .get<ServiceSalon[]>(`${this.apiUrl}/salons/employeur/services`)
      .pipe(
        catchError((error) => {
          console.error('Error fetching employer services', error);
          return of([]);
        })
      );
  }

  // Get services of a specific salon
  getServicesBySalon(salonId: number): Observable<ServiceSalon[]> {
    return this.http
      .get<ServiceSalon[]>(`${this.apiUrl}/salons/${salonId}/services/all`)
      .pipe(
        catchError((error) => {
          console.error(`Error fetching services for salon ${salonId}`, error);
          return of([]);
        })
      );
  }

  getAllSalons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/all`).pipe(
      catchError((error) => {
        console.error('Error fetching all salons', error);
        return of([]);
      })
    );
  }

  // Get salon by ID
  getSalonById(id: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/salons/${id}`).pipe(
      catchError((error) => {
        console.error(`Error fetching salon with ID ${id}`, error);
        return of(null);
      })
    );
  }

  createSalon(salon: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/create`, salon);
  }

  // Save salon as draft
  saveSalonDraft(salonData: any): Observable<any> {
    const draftData = { ...salonData, status: 'DRAFT' };
    return this.http.post(`${this.apiUrl}/salons/create`, draftData);
  }

  // Update existing salon
  updateSalon(id: number, salonData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/salons/update/${id}`, salonData);
  }

  // Delete salon
  deleteSalon(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/salons/delete/${id}`);
  }

  // Get all salons of an owner
  getSalonsByProprietaire(proprietaireId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/salons/proprietaire/${proprietaireId}`
    );
  }

  // Create salon with file
  createSalonWithFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/with-file`, formData);
  }

  // Ajoutez cette méthode au SalonService
  getSalonPhotos(salonId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/${salonId}/photos`).pipe(
      catchError((error) => {
        console.error(`Error fetching photos for salon ${salonId}`, error);
        return of([]);
      })
    );
  }

  // Service de géocodage inversé
  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/location/reverse-geocode?lat=${latitude}&lng=${longitude}`);
  }

  // ===============================================
  // NOUVELLES MÉTHODES POUR L'INTÉGRATION FREELANCES
  // ===============================================

  /**
   * MÉTHODE MISE À JOUR: Recherche par service avec support du type de professionnel
   */
  getSalonsByService(serviceName: string, providerType: 'salon' | 'freelance' | 'both' = 'salon'): Observable<any[]> {
    console.log(`Recherche de salons pour le service: ${serviceName}, type: ${providerType}`);

    // Vérifier si le nom du service est valide
    if (!serviceName || !serviceName.trim()) {
      console.warn('Nom de service invalide');
      return of([]);
    }

    // Construire les paramètres
    let params = new HttpParams();
    params = params.set('serviceNom', serviceName.trim());
    
    // Ajouter le type de professionnel si différent de 'salon' (défaut backend)
    if (providerType && providerType !== 'salon') {
      params = params.set('providerType', providerType);
    }

    const url = `${this.apiUrl}/salons/by-service`;
    console.log(`Appel API: ${url}?${params.toString()}`);

    return this.http.get<any[]>(url, { params }).pipe(
      retry(2),
      tap((salons) => {
        console.log(`${salons?.length || 0} salons trouvés pour le service: ${serviceName} (${providerType})`);
      }),
      catchError((error: HttpErrorResponse) => {
        console.error(`Erreur lors de la recherche de salons pour le service: ${serviceName}`, error);
        return this.handleError('getSalonsByService', [])(error);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche par service et type de professionnel (alias)
   */
  getSalonsByServiceAndType(service: string, providerType: 'salon' | 'freelance' | 'both'): Observable<any[]> {
    return this.getSalonsByService(service, providerType);
  }

  /**
   * MÉTHODE MISE À JOUR: Recherche avancée avec objet de données
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

    // Utiliser l'endpoint /search existant
    let params = new HttpParams();
    params = params.set('query', searchData.term.trim());
    
    // Ajouter le type de professionnel si spécifié
    if (searchData.providerType && searchData.providerType !== 'salon') {
      params = params.set('providerType', searchData.providerType);
    }
    
    // Ajouter les coordonnées utilisateur si disponibles
    if (searchData.location && typeof searchData.location === 'string') {
      const coords = this.extractCoordinates(searchData.location);
      if (!isNaN(coords[0]) && !isNaN(coords[1])) {
        params = params.set('userLat', coords[0].toString());
        params = params.set('userLng', coords[1].toString());
      }
    }
    
    // Ajouter le budget si spécifié
    if (searchData.budget && typeof searchData.budget === 'number' && searchData.budget > 0) {
      params = params.set('budget', searchData.budget.toString());
    }
    
    // Ajouter la date/heure si spécifiée
    if (searchData.datetime && typeof searchData.datetime === 'string') {
      params = params.set('datetime', searchData.datetime);
    }
    
    const url = `${this.apiUrl}/salons/search`;
    console.log('📤 URL:', url);
    console.log('📤 Paramètres:', params.toString());
    
    return this.http.get<any[]>(url, { params }).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la recherche avancée:', error);
        return of([]);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche par mot-clé simple (pour compatibilité)
   */
  searchSalonsByKeyword(keyword: string): Observable<any[]> {
    if (!keyword || !keyword.trim()) {
      return of([]);
    }

    let params = new HttpParams().set('query', keyword.trim());
    
    return this.http.get<any[]>(`${this.apiUrl}/salons/search`, { params }).pipe(
      catchError((error) => {
        console.error(`Error searching salons with keyword ${keyword}`, error);
        return of([]);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche avec photo
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
   * NOUVELLE MÉTHODE: Recherche de salons à proximité
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
   * NOUVELLE MÉTHODE: Obtenir les statistiques de services
   */
  getServiceStatistics(): Observable<any> {
    // Essayer d'abord l'endpoint réel (si implémenté)
    return this.http.get<any>(`${this.apiUrl}/salons/statistics`).pipe(
      catchError(error => {
        console.warn('Endpoint /statistics non disponible, utilisation de données mockées');
        // Retourner des données mockées en cas d'erreur
        const mockStats = {
          'Coiffure': { salon: 42, freelance: 28, total: 70 },
          'Pedicure,Manucure': { salon: 18, freelance: 35, total: 53 },
          'Barber': { salon: 25, freelance: 15, total: 40 },
          'Maquillage': { salon: 12, freelance: 22, total: 34 },
          'Soins de la peau': { salon: 31, freelance: 8, total: 39 }
        };
        return of(mockStats);
      })
    );
  }

  /**
   * NOUVELLE MÉTHODE: Recherche de freelances uniquement
   */
  getFreelancesByService(service: string): Observable<any[]> {
    return this.getSalonsByService(service, 'freelance');
  }

  /**
   * NOUVELLE MÉTHODE: Recherche mixte (salons + freelances)
   */
  getMixedProvidersByService(service: string): Observable<any[]> {
    return this.getSalonsByService(service, 'both');
  }

  /**
   * NOUVELLE MÉTHODE: Obtenir les détails d'un freelance
   */
  getFreelanceDetails(freelanceId: number): Observable<any> {
    // Pour l'instant, utiliser l'endpoint salon existant
    return this.getSalonById(freelanceId).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération du freelance:', error);
        return of(null);
      })
    );
  }

  // ===============================================
  // MÉTHODES UTILITAIRES
  // ===============================================

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

  /**
   * Gestionnaire d'erreur générique
   */
  private handleError<T>(operation = 'opération', result?: T) {
    return (error: any): Observable<T> => {
      console.error(`${operation} a échoué: ${error.message}`);
      
      if (error.status === 0) {
        console.error('Problème de connexion réseau. Vérifiez votre connexion internet.');
      } else if (error.status === 401) {
        console.error('Erreur d\'authentification (401). Vérifiez si l\'endpoint nécessite une authentification.');
      } else if (error.status === 404) {
        console.error('Endpoint non trouvé (404). Vérifiez l\'URL de l\'API.');
      } else {
        console.error(`Le serveur a retourné le code ${error.status}: ${error.message}`);
        if (error.error) {
          console.error("Détails de l'erreur:", error.error);
        }
      }

      return of(result as T);
    };
  }

  // ===============================================
  // MÉTHODES DE MIGRATION (pour compatibilité)
  // ===============================================

  /**
   * Méthode de recherche globale (utilise searchSalons en interne)
   */
  searchSalonsGlobal(searchData: any): Observable<any[]> {
    return this.searchSalons(searchData);
  }

  /**
   * Méthode de recherche avancée (alias pour searchSalons)
   */
  searchSalonsAdvanced(searchData: any): Observable<any[]> {
    return this.searchSalons(searchData);
  }
}