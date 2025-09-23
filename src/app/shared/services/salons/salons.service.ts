import { Injectable } from '@angular/core';
import {
  HttpClient,
  HttpErrorResponse,
  HttpParams,
} from '@angular/common/http';
import { Observable, of, from } from 'rxjs';
import { catchError, map, retry, tap, switchMap, mergeMap, reduce } from 'rxjs/operators';
import { ServiceSalon } from '../../../models/service-salon';

@Injectable({
  providedIn: 'root',
})
export class SalonService {
  [x: string]: any;
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
    searchType?: string;
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
    
    // ✅ AJOUT du paramètre searchType pour recherche stricte par ville
    if (searchCriteria.searchType) {
      params = params.set('searchType', searchCriteria.searchType);
    }

    const url = `${this.apiUrl}/freelances/search`;
    console.log(`📤 Nouveau endpoint recherche: ${url}?${params.toString()}`);

    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log('📥 Réponse brute backend:', response);
        
        // ✅ FIX: Extraire les freelances des objets complexes retournés par le backend
        let freelances = [];
        if (response && response.freelances && Array.isArray(response.freelances)) {
          freelances = response.freelances.map((item: any) => {
            // Le backend retourne {freelance: {...}, distance: "...", note: "..."}
            // On extrait l'objet freelance et on ajoute les métadonnées

            if (item.freelance) {
              return {
                ...item.freelance,
                distance: item.distance,
                formattedNote: item.note,
                prixRange: item.prix,
                isNearby: item.isNearby,
                isWellRated: item.isWellRated,
                availability: item.availability
              };
            } else {
              // Fallback si la structure est différente
              return item;
            }
          });
        }
        
        const processedResponse = {
          freelances: freelances,
          total: response.total || freelances.length,
          searchType: response.searchType,
          appliedGeolocation: response.appliedGeolocation,
          criteria: response.criteria,
          meta: response.meta
        };
        
        console.log(`✅ ${processedResponse.total} freelances traités correctement`);
        console.log('🎯 Premier freelance traité:', processedResponse.freelances[0]);
        
        return processedResponse;
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

    const url = `${this.apiUrl}/freelances/nearby`;
    console.log(`📤 Endpoint proximité: ${url}?${params.toString()}`);

    return this.http.get<any>(url, { params }).pipe(
      map(response => {
        console.log('📥 Réponse brute proximité:', response);
        
        // ✅ FIX: Même traitement que pour searchFreelances
        let freelances = [];
        if (response && response.freelances && Array.isArray(response.freelances)) {
          freelances = response.freelances.map((item: any) => {
            if (item.freelance) {
              return {
                ...item.freelance,
                distance: item.distance,
                formattedNote: item.note,
                prixRange: item.prix,
                isNearby: item.isNearby,
                isWellRated: item.isWellRated,
                availability: item.availability
              };
            } else {
              return item;
            }
          });
        }
        
        const processedResponse = {
          freelances: freelances,
          total: response.total || freelances.length,
          searchType: response.searchType,
          appliedGeolocation: response.appliedGeolocation
        };
        
        console.log(`✅ ${processedResponse.total} freelances à proximité traités`);
        return processedResponse;
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
      map(response => {
        console.log('📥 Réponse brute ville:', response);
        
        // ✅ FIX: Même traitement pour la recherche par ville
        let freelances = [];
        if (response && response.freelances && Array.isArray(response.freelances)) {
          freelances = response.freelances.map((item: any) => {
            if (item.freelance) {
              return {
                ...item.freelance,
                distance: item.distance,
                formattedNote: item.note,
                prixRange: item.prix,
                isNearby: item.isNearby,
                isWellRated: item.isWellRated,
                availability: item.availability
              };
            } else {
              return item;
            }
          });
        }
        
        const processedResponse = {
          freelances: freelances,
          total: response.total || freelances.length,
          searchType: response.searchType,
          appliedGeolocation: response.appliedGeolocation
        };
        
        console.log(`✅ ${processedResponse.total} freelances à ${ville} traités`);
        return processedResponse;
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
  getSalonsByService(serviceName: string, p0: string, ville: string | null, providerType: 'salon' | 'freelance' | 'both' = 'salon'): Observable<any[]> {
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
    console.log('🏪 SALON SEARCH - Données reçues:', searchData);
    
    let params = new HttpParams();
    
    params = params.set('query', searchData.term.trim());
    if (searchData.ville && typeof searchData.ville === 'string' && searchData.ville.trim()) {
      params = params.set('ville', searchData.ville.trim());
      console.log('🏪 SALON - Ville ajoutée:', searchData.ville.trim());
    }
    
    // Géolocalisation - prioriser les coordonnées directes
    if (searchData.lat !== undefined && searchData.lng !== undefined && 
        !isNaN(searchData.lat) && !isNaN(searchData.lng)) {
      params = params.set('userLat', searchData.lat.toString());
      params = params.set('userLng', searchData.lng.toString());
      console.log('🏪 SALON - Coordonnées directes:', searchData.lat, searchData.lng);
    } else if (searchData.location && typeof searchData.location === 'string') {
      const coords = this.extractCoordinates(searchData.location);
      if (!isNaN(coords[0]) && !isNaN(coords[1])) {
        params = params.set('userLat', coords[0].toString());
        params = params.set('userLng', coords[1].toString());
        console.log('🏪 SALON - Coordonnées extraites:', coords[0], coords[1]);
      }
    }
    
    if (searchData.budget && typeof searchData.budget === 'number' && searchData.budget > 0) {
      params = params.set('budget', searchData.budget.toString());
    }
    
    if (searchData.datetime && typeof searchData.datetime === 'string') {
      params = params.set('datetime', searchData.datetime);
    }
    
    // ✅ AJOUT du paramètre searchType pour recherche stricte par ville
    if (searchData.searchType && typeof searchData.searchType === 'string') {
      params = params.set('searchType', searchData.searchType);
      console.log('🏪 SALON - Type de recherche:', searchData.searchType);
    }
    
    const url = `${this.apiUrl}/salons/search`;
    console.log('📤 Recherche salon avancée (VRAIE API SALON):', url, '- Params:', params.toString());
    
    return this.http.get<any>(url, { params }).pipe(
      tap(response => console.log(`🏪 Réponse API salon brute:`, response)),
      map(response => {
        // ✅ Renvoyer la réponse complète pour préserver les métadonnées
        console.log(`🏪 ${response?.results?.length || 0} salons extraits de response.results`);
        return response;
      }),
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
    console.log('👤 FREELANCE SEARCH - Données reçues:', searchData);
    
    // Prioriser les coordonnées directes
    let lat, lng;
    if (searchData.lat !== undefined && searchData.lng !== undefined && 
        !isNaN(searchData.lat) && !isNaN(searchData.lng)) {
      lat = searchData.lat;
      lng = searchData.lng;
      console.log('👤 FREELANCE - Coordonnées directes:', lat, lng);
    } else if (searchData.location) {
      const coords = this.extractCoordinates(searchData.location);
      lat = !isNaN(coords[0]) ? coords[0] : undefined;
      lng = !isNaN(coords[1]) ? coords[1] : undefined;
      console.log('👤 FREELANCE - Coordonnées extraites:', lat, lng);
    }
    
    // ✅ FORCE CITY_STRICT pour recherche de proximité avec ville spécifique
    let searchType = searchData.searchType;
    if (searchData.ville && typeof searchData.ville === 'string' && searchData.ville.trim()) {
      searchType = 'CITY_STRICT';
      console.log('👤 FREELANCE - Mode CITY_STRICT activé pour ville:', searchData.ville);
    }
    
    const searchCriteria = {
      service: searchData.term.trim(),
      ville: searchData.ville,
      maxPrice: searchData.budget,
      date: searchData.datetime,
      time: searchData.time,
      domicile: searchData.domicile,
      weekend: searchData.disponibleWeekend,
      soir: searchData.disponibleSoir,
      lat: lat,
      lng: lng,
      deplacementInclus: searchData.deplacementInclus,
      searchType: searchType
    };
    
    console.log('👤 FREELANCE - Critères envoyés avec searchType:', searchCriteria);
    
    return this.searchFreelances(searchCriteria).pipe(
      map(response => {
        console.log('👤 FREELANCE - Réponse backend:', response);
        if (searchType === 'CITY_STRICT' && Array.isArray(response.freelances) && response.freelances.length === 0) {
          console.log(`👤 FREELANCE - Mode CITY_STRICT: Aucun freelance trouvé pour "${searchData.term}" dans "${searchData.ville}"`);
        }
        return response.freelances || [];
      }),
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
    console.log('🔄 RECHERCHE COMBINÉE - Recherche salons ET freelances pour:', searchData);
    
    const salonsData = { ...searchData, providerType: 'salon' };
    const freelancesData = { ...searchData, providerType: 'freelance' };
    
    const salons$ = this.searchSalonsAdvanced(salonsData);
    const freelances$ = this.searchFreelancesAdvanced(freelancesData);
    
    return salons$.pipe(
      tap(salons => console.log(`🏪 Réponse salon brute:`, salons)),
      switchMap(salons => {
        return freelances$.pipe(
          tap(freelances => console.log(`👤 Réponse freelance brute:`, freelances)),
          map(freelances => {
            // ✅ FIX: S'assurer que salons est un tableau
            const salonsArray = Array.isArray(salons) ? salons : [];
            const freelancesArray = Array.isArray(freelances) ? freelances : [];
            
            console.log(`🔄 Arrays vérifiés: ${salonsArray.length} salons + ${freelancesArray.length} freelances`);
            
            const markedSalons = salonsArray.map(salon => ({ ...salon, type: 'salon' }));
            const markedFreelances = freelancesArray.map(freelance => ({ ...freelance, type: 'freelance' }));
            const combined = [...markedSalons, ...markedFreelances];
            console.log(`🔄 COMBINÉ: ${markedSalons.length} salons + ${markedFreelances.length} freelances = ${combined.length} total`);
            return combined;
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
    return this.getSalonsByService(service, providerType, null);
  }

  getFreelancesByService(service: string): Observable<any[]> {
    return this.searchFreelancesByService(service);
  }

  getMixedProvidersByService(service: string): Observable<any[]> {
    return this.getSalonsByService(service, 'both', null);
  }

  getFreelanceDetails(freelanceId: number): Observable<any> {
    return this.getFreelanceById(freelanceId);
  }

  searchSalonsGlobal(searchData: any): Observable<any[]> {
    return this.searchSalons(searchData);
  }

  // ===============================================
  // ✅ NOUVELLE MÉTHODE : RECHERCHE MULTIPLE COIFFURES VIA BACKEND
  // ===============================================

  /**
   * ✅ RECHERCHE AVEC MULTIPLES NOMS DE COIFFURES (BACKEND)
   * Envoie tous les noms au backend pour une requête SQL optimisée
   */
  searchMultipleHairstyles(searchData: any): Observable<any[]> {
    console.log('🔍 searchMultipleHairstyles - Envoi au backend:', searchData);
    
    if (!searchData.multipleTerms || !Array.isArray(searchData.multipleTerms) || searchData.multipleTerms.length === 0) {
      console.error('❌ multipleTerms invalide:', searchData.multipleTerms);
      return of([]);
    }

    // Construire les paramètres HTTP
    let params = new HttpParams();
    
    // ✅ NOUVEAU : Passer tous les noms de coiffures
    searchData.multipleTerms.forEach((term: string) => {
      params = params.append('serviceNames', term.trim());
    });

    // Ajouter les autres critères
    if (searchData.ville) {
      params = params.set('ville', searchData.ville);
    }
    if (searchData.lat && searchData.lng) {
      params = params.set('userLat', searchData.lat.toString());
      params = params.set('userLng', searchData.lng.toString());
    }
    if (searchData.budget) {
      params = params.set('budget', searchData.budget.toString());
    }
    if (searchData.datetime) {
      params = params.set('datetime', searchData.datetime);
    }
    if (searchData.providerType) {
      params = params.set('providerType', searchData.providerType);
    }
    if (searchData.disponibleWeekend) {
      params = params.set('weekend', searchData.disponibleWeekend.toString());
    }
    if (searchData.disponibleSoir) {
      params = params.set('soir', searchData.disponibleSoir.toString());
    }
    if (searchData.experienceMin) {
      params = params.set('experienceMin', searchData.experienceMin.toString());
    }

    // ✅ NOUVEAU ENDPOINT pour recherche multiple
    const url = `${this.apiUrl}/salons/search-multiple-hairstyles`;
    
    console.log(`📤 Appel backend recherche multiple: ${url}?${params.toString()}`);
    
    return this.http.get<any>(url, { params }).pipe(
      tap(response => console.log('📥 Réponse backend recherche multiple:', response)),
      map(response => {
        // Extraire les résultats selon le format de réponse
        if (response && response.results && Array.isArray(response.results)) {
          return response.results;
        } else if (Array.isArray(response)) {
          return response;
        } else {
          return [];
        }
      }),
      catchError(error => {
        console.error('❌ Erreur recherche multiple backend:', error);
        return of([]);
      })
    );
  }
}