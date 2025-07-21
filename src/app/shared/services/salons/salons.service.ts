import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, retry, tap, switchMap } from 'rxjs/operators';
import { ServiceSalon } from '../../../models/service-salon';

@Injectable({
  providedIn: 'root',
})
export class SalonService {
  private apiUrl = 'http://localhost:8081/api';

  constructor(private http: HttpClient) {
    console.log('🔧 SalonService initialisé avec nouveaux endpoints Freelance');
  }

  // ===============================================
  // MÉTHODES EXISTANTES SALON (CONSERVÉES)
  // ===============================================

  getEmployeurSalons(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/employeur/mes-salons`).pipe(
      tap(salons => console.log('Salons récupérés pour l\'employeur:', salons)),
      catchError(error => {
        console.error('Erreur lors de la récupération des salons de l\'employeur', error);
        return of([]);
      })
    );
  }

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

  saveSalonDraft(salonData: any): Observable<any> {
    const draftData = { ...salonData, status: 'DRAFT' };
    return this.http.post(`${this.apiUrl}/salons/create`, draftData);
  }

  updateSalon(id: number, salonData: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/salons/update/${id}`, salonData);
  }

  deleteSalon(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/salons/delete/${id}`);
  }

  getSalonsByProprietaire(proprietaireId: number): Observable<any[]> {
    return this.http.get<any[]>(
      `${this.apiUrl}/salons/proprietaire/${proprietaireId}`
    );
  }

  createSalonWithFile(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salons/with-file`, formData);
  }

  getSalonPhotos(salonId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/salons/${salonId}/photos`).pipe(
      catchError((error) => {
        console.error(`Error fetching photos for salon ${salonId}`, error);
        return of([]);
      })
    );
  }

  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    return this.http.get<string>(`${this.apiUrl}/location/reverse-geocode?lat=${latitude}&lng=${longitude}`);
  }

  // ===============================================
  // NOUVEAUX ENDPOINTS FREELANCE (ALIGNÉS SUR LE BACKEND)
  // ===============================================

  /**
   * 🔍 RECHERCHE PRINCIPALE FREELANCE - ENDPOINT UNIFIÉ
   * Utilise le nouveau endpoint /api/search du FreelanceController
   */
  searchFreelances(searchCriteria: {
    service: string;
    ville?: string;
    maxPrice?: number;
    date?: string;
    time?: string;
    domicile?: boolean;
    weekend?: boolean;
    soir?: boolean;
    lat?: number;
    lng?: number;
    deplacementInclus?: boolean;
  }): Observable<any> {
    console.log('🔍 Recherche freelances avec nouveaux critères:', searchCriteria);

    if (!searchCriteria.service?.trim()) {
      console.warn('Service requis pour la recherche');
      return of({ freelances: [], total: 0 });
    }

    let params = new HttpParams();
    params = params.set('service', searchCriteria.service.trim());

    // Ajouter les paramètres optionnels
    if (searchCriteria.ville) {
      params = params.set('ville', searchCriteria.ville);
    }
    if (searchCriteria.maxPrice) {
      params = params.set('maxPrice', searchCriteria.maxPrice.toString());
    }
    if (searchCriteria.date) {
      params = params.set('date', searchCriteria.date);
    }
    if (searchCriteria.time) {
      params = params.set('time', searchCriteria.time);
    }
    if (searchCriteria.domicile !== undefined) {
      params = params.set('domicile', searchCriteria.domicile.toString());
    }
    if (searchCriteria.weekend !== undefined) {
      params = params.set('weekend', searchCriteria.weekend.toString());
    }
    if (searchCriteria.soir !== undefined) {
      params = params.set('soir', searchCriteria.soir.toString());
    }
    if (searchCriteria.lat && searchCriteria.lng) {
      params = params.set('lat', searchCriteria.lat.toString());
      params = params.set('lng', searchCriteria.lng.toString());
    }
    if (searchCriteria.deplacementInclus !== undefined) {
      params = params.set('deplacementInclus', searchCriteria.deplacementInclus.toString());
    }

    const url = `${this.apiUrl}/search`;
    console.log(`📤 Nouveau endpoint recherche: ${url}?${params.toString()}`);

    return this.http.get<any>(url, { params }).pipe(
      tap(response => {
        console.log('📥 Réponse nouveau endpoint:', response);
        console.log(`✅ ${response.total || 0} freelances trouvés`);
      }),
      catchError(error => {
        console.error('❌ Erreur recherche freelances:', error);
        return of({ freelances: [], total: 0, error: error.message });
      })
    );
  }

  /**
   * 📍 RECHERCHE GÉOLOCALISÉE RAPIDE
   * Utilise le nouveau endpoint /api/search/nearby
   */
  searchFreelancesNearby(service: string, lat: number, lng: number): Observable<any> {
    console.log(`📍 Recherche freelances à proximité: ${service} [${lat}, ${lng}]`);

    if (!service?.trim()) {
      return of({ freelances: [], total: 0 });
    }

    let params = new HttpParams()
      .set('service', service.trim())
      .set('lat', lat.toString())
      .set('lng', lng.toString());

    const url = `${this.apiUrl}/search/nearby`;
    console.log(`📤 Endpoint proximité: ${url}?${params.toString()}`);

    return this.http.get<any>(url, { params }).pipe(
      tap(response => {
        console.log('📥 Freelances proximité:', response);
        console.log(`✅ ${response.total || 0} freelances à proximité`);
      }),
      catchError(error => {
        console.error('❌ Erreur recherche proximité:', error);
        return of({ freelances: [], total: 0, error: error.message });
      })
    );
  }

  /**
   * 🏙️ RECHERCHE PAR VILLE
   * Utilise le nouveau endpoint /api/search/city
   */
  searchFreelancesByCity(service: string, ville: string, maxPrice?: number): Observable<any> {
    console.log(`🏙️ Recherche freelances par ville: ${service} à ${ville}`);

    if (!service?.trim() || !ville?.trim()) {
      return of({ freelances: [], total: 0 });
    }

    let params = new HttpParams()
      .set('service', service.trim())
      .set('ville', ville.trim());

    if (maxPrice) {
      params = params.set('maxPrice', maxPrice.toString());
    }

    const url = `${this.apiUrl}/search/city`;
    console.log(`📤 Endpoint ville: ${url}?${params.toString()}`);

    return this.http.get<any>(url, { params }).pipe(
      tap(response => {
        console.log('📥 Freelances par ville:', response);
        console.log(`✅ ${response.total || 0} freelances trouvés à ${ville}`);
      }),
      catchError(error => {
        console.error('❌ Erreur recherche par ville:', error);
        return of({ freelances: [], total: 0, error: error.message });
      })
    );
  }

  // ===============================================
  // MÉTHODES SIMPLIFIÉES POUR COMPATIBILITÉ
  // ===============================================

  /**
   * 👤 RECHERCHE FREELANCES PAR SERVICE (SIMPLIFIED)
   * Utilise la nouvelle méthode searchFreelances
   */
  searchFreelancesByService(serviceName: string): Observable<any[]> {
    console.log(`👤 Recherche freelances pour service: ${serviceName}`);
    
    return this.searchFreelances({ service: serviceName }).pipe(
      map(response => response.freelances || []),
      catchError(error => {
        console.error(`❌ Erreur recherche service ${serviceName}:`, error);
        return of([]);
      })
    );
  }

  /**
   * 👤 RECHERCHE AVEC CRITÈRES AVANCÉS
   */
  searchFreelancesWithCriteria(params: {
    query: string;
    userLat?: number;
    userLng?: number;
    disponibleWeekend?: boolean;
    disponibleSoir?: boolean;
  }): Observable<any[]> {
    console.log('👤 Recherche freelances avec critères avancés:', params);

    const searchCriteria = {
      service: params.query,
      lat: params.userLat,
      lng: params.userLng,
      weekend: params.disponibleWeekend,
      soir: params.disponibleSoir
    };

    return this.searchFreelances(searchCriteria).pipe(
      map(response => response.freelances || []),
      catchError(error => {
        console.error('❌ Erreur recherche avec critères:', error);
        return of([]);
      })
    );
  }

  /**
   * 👤 RECHERCHE FREELANCES PAR TEXTE
   */
  searchFreelancesByText(query: string): Observable<any[]> {
    console.log(`👤 Recherche freelances par texte: ${query}`);
    
    return this.searchFreelancesByService(query);
  }

  /**
   * 👤 FREELANCES À PROXIMITÉ (WRAPPER)
   */
  getFreelancesNearby(latitude: number, longitude: number, radius: number = 15): Observable<any[]> {
    console.log(`👤 Freelances à proximité: ${latitude}, ${longitude} (${radius}km)`);
    
    // Note: Le nouveau endpoint ne prend pas radius, mais on peut l'adapter
    return this.searchFreelancesNearby('tous', latitude, longitude).pipe(
      map(response => response.freelances || []),
      catchError(error => {
        console.error('❌ Erreur freelances proximité:', error);
        return of([]);
      })
    );
  }

  // ===============================================
  // MÉTHODES UNIFIÉES - ROUTAGE INTELLIGENT
  // ===============================================

  /**
   * ✅ MÉTHODE PRINCIPALE: Recherche par service avec routage automatique
   */
  getSalonsByService(serviceName: string, providerType: 'salon' | 'freelance' | 'both' = 'salon'): Observable<any[]> {
    console.log(`🔄 getSalonsByService - Service: ${serviceName}, Type: ${providerType}`);

    if (!serviceName || !serviceName.trim()) {
      console.warn('Nom de service invalide');
      return of([]);
    }

    // ✅ ROUTAGE SELON LE TYPE
    switch (providerType) {
      case 'salon':
        console.log('🏪 Route vers méthode salon existante');
        return this.searchSalonsOnly(serviceName);

      case 'freelance':
        console.log('👤 Route vers nouveaux endpoints freelances');
        return this.searchFreelancesByService(serviceName);

      case 'both':
        console.log('🔄 Combinaison salon + freelance');
        return this.getCombinedProviders(serviceName);

      default:
        return of([]);
    }
  }

  /**
   * 🏪 RECHERCHE SALONS SEULEMENT
   */
  private searchSalonsOnly(serviceName: string): Observable<any[]> {
    let params = new HttpParams();
    params = params.set('serviceNom', serviceName.trim());
    
    return this.http.get<any[]>(`${this.apiUrl}/salons/by-service`, { params }).pipe(
      tap(salons => console.log(`🏪 ${salons?.length || 0} salons trouvés`)),
      catchError(error => {
        console.error('❌ Erreur salons', error);
        return of([]);
      })
    );
  }

  /**
   * 🔄 COMBINE SALONS + FREELANCES
   */
  private getCombinedProviders(serviceName: string): Observable<any[]> {
    console.log(`🔄 Combinaison providers pour: ${serviceName}`);
    
    const salons$ = this.searchSalonsOnly(serviceName);
    const freelances$ = this.searchFreelancesByService(serviceName);
    
    return salons$.pipe(
      switchMap(salons => {
        return freelances$.pipe(
          map(freelances => {
            // Marquer le type de chaque élément
            const markedSalons = salons.map(salon => ({ ...salon, type: 'salon' }));
            const markedFreelances = freelances.map(freelance => ({ ...freelance, type: 'freelance' }));
            
            // Combiner les résultats
            const combined = [...markedSalons, ...markedFreelances];
            console.log(`🔄 Combiné: ${markedSalons.length} salons + ${markedFreelances.length} freelances = ${combined.length} total`);
            
            return combined;
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur combinaison', error);
        return of([]);
      })
    );
  }

  /**
   * ✅ RECHERCHE AVANCÉE UNIFIÉE
   */
  searchSalons(searchData: any): Observable<any[]> {
    console.log('🔍 searchSalons unifié appelé avec:', searchData);
    
    if (!searchData || typeof searchData !== 'object') {
      console.error('❌ searchData invalide:', searchData);
      return of([]);
    }

    if (!searchData.term || typeof searchData.term !== 'string' || !searchData.term.trim()) {
      console.error('❌ Terme de recherche invalide:', searchData.term);
      return of([]);
    }

    const providerType = searchData.providerType || 'salon';
    console.log(`🔄 Recherche avancée pour type: ${providerType}`);

    // Router selon le type
    if (providerType === 'salon') {
      return this.searchSalonsAdvanced(searchData);
    } else if (providerType === 'freelance') {
      return this.searchFreelancesAdvanced(searchData);
    } else {
      return this.searchCombinedAdvanced(searchData);
    }
  }

  /**
   * 🏪 RECHERCHE SALONS AVANCÉE
   */
  private searchSalonsAdvanced(searchData: any): Observable<any[]> {
    let params = new HttpParams();
    params = params.set('query', searchData.term.trim());
    
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
    
    const url = `${this.apiUrl}/salons/search`;
    console.log('📤 Recherche salon avancée:', url);
    
    return this.http.get<any[]>(url, { params }).pipe(
      catchError(error => {
        console.error('❌ Erreur recherche salon avancée:', error);
        return of([]);
      })
    );
  }

  /**
   * 👤 RECHERCHE FREELANCES AVANCÉE (NOUVELLE VERSION)
   */
  private searchFreelancesAdvanced(searchData: any): Observable<any[]> {
    console.log('👤 Recherche freelances avancée avec nouveaux endpoints:', searchData);
    
    const coords = searchData.location ? this.extractCoordinates(searchData.location) : [NaN, NaN];
    
    const searchCriteria = {
      service: searchData.term.trim(),
      ville: searchData.ville,
      maxPrice: searchData.budget,
      date: searchData.datetime,
      time: searchData.time,
      domicile: searchData.domicile,
      weekend: searchData.disponibleWeekend,
      soir: searchData.disponibleSoir,
      lat: !isNaN(coords[0]) ? coords[0] : undefined,
      lng: !isNaN(coords[1]) ? coords[1] : undefined,
      deplacementInclus: searchData.deplacementInclus
    };
    
    return this.searchFreelances(searchCriteria).pipe(
      map(response => response.freelances || []),
      catchError(error => {
        console.error('❌ Erreur recherche freelances avancée:', error);
        return of([]);
      })
    );
  }

  /**
   * 🔄 RECHERCHE COMBINÉE AVANCÉE
   */
  private searchCombinedAdvanced(searchData: any): Observable<any[]> {
    const salonsData = { ...searchData, providerType: 'salon' };
    const freelancesData = { ...searchData, providerType: 'freelance' };
    
    const salons$ = this.searchSalonsAdvanced(salonsData);
    const freelances$ = this.searchFreelancesAdvanced(freelancesData);
    
    return salons$.pipe(
      switchMap(salons => {
        return freelances$.pipe(
          map(freelances => {
            const markedSalons = salons.map(salon => ({ ...salon, type: 'salon' }));
            const markedFreelances = freelances.map(freelance => ({ ...freelance, type: 'freelance' }));
            return [...markedSalons, ...markedFreelances];
          })
        );
      }),
      catchError(error => {
        console.error('❌ Erreur recherche combinée avancée:', error);
        return of([]);
      })
    );
  }

  // ===============================================
  // MÉTHODES UTILITAIRES (CONSERVÉES)
  // ===============================================

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

  // ===============================================
  // MÉTHODES ADDITIONNELLES (CONSERVÉES)
  // ===============================================

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

  searchSalonsWithPhoto(formData: FormData): Observable<any[]> {
    const url = `${this.apiUrl}/salons/search-with-photo`;
    
    return this.http.post<any[]>(url, formData).pipe(
      catchError(error => {
        console.error('Erreur lors de la recherche avec photo:', error);
        return of([]);
      })
    );
  }

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

  // ===============================================
  // MÉTHODES LEGACY ADAPTÉES
  // ===============================================

  getFreelanceById(id: number): Observable<any> {
    console.log(`👤 Récupération freelance ID: ${id}`);
    
    const url = `${this.apiUrl}/freelances/${id}`;
    
    return this.http.get<any>(url).pipe(
      tap(freelance => console.log('👤 Freelance récupéré:', freelance.nom || freelance.name)),
      catchError((error) => {
        console.error(`❌ Freelance non trouvé ID: ${id}`, error);
        return of(null);
      })
    );
  }

  getAllFreelances(): Observable<any[]> {
    console.log('📋 Récupération tous freelances');
    
    const url = `${this.apiUrl}/freelances/all`;
    
    return this.http.get<any[]>(url).pipe(
      tap(freelances => console.log(`📋 ${freelances.length} freelances récupérés`)),
      catchError((error) => {
        console.error('❌ Erreur récupération freelances', error);
        return of([]);
      })
    );
  }

  getFreelanceStatistics(): Observable<any> {
    console.log('📊 Récupération statistiques freelances');
    
    const url = `${this.apiUrl}/freelances/statistics`;
    
    return this.http.get<any>(url).pipe(
      tap(stats => console.log('📊 Stats freelances reçues:', stats)),
      catchError((error) => {
        console.error('❌ Erreur stats freelances', error);
        return of({
          total: 0,
          availableWeekend: 0,
          byService: {
            'Coiffure': 0,
            'Manucure': 0,
            'Barber': 0,
            'Maquillage': 0
          }
        });
      })
    );
  }

  // ===============================================
  // MÉTHODES LEGACY POUR COMPATIBILITÉ
  // ===============================================

  getSalonsByServiceAndType(service: string, providerType: 'salon' | 'freelance' | 'both'): Observable<any[]> {
    return this.getSalonsByService(service, providerType);
  }

  getFreelancesByService(service: string): Observable<any[]> {
    return this.searchFreelancesByService(service);
  }

  getMixedProvidersByService(service: string): Observable<any[]> {
    return this.getSalonsByService(service, 'both');
  }

  getFreelanceDetails(freelanceId: number): Observable<any> {
    return this.getFreelanceById(freelanceId);
  }

  searchSalonsGlobal(searchData: any): Observable<any[]> {
    return this.searchSalons(searchData);
  }
}