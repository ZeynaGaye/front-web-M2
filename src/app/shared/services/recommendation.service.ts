// ==================== recommendation.service.ts ====================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface RecommendationData {
  id: number;
  nom: string;
  prenom?: string; // Spécifique aux freelances
  description?: string;
  adresse: string;
  photoProfil?: string;
  photoProfilUrl?: string; // Alias pour photoProfil
  imageUrl?: string; // Alias pour photoProfil
  note?: number;
  nombreAvis?: number;
  services: string[];
  distance?: number;
  latitude?: number;
  longitude?: number;
  type?: 'salon' | 'freelance';
  rating?: number;
  reviewCount?: number;
  experience?: number; // Années d'expérience pour freelances
  availability?: string;
  specialite?: string; // Spécifique aux freelances
  
  // Nouvelles propriétés pour la disponibilité
  availableSlots?: string[];
  isAvailableNow?: boolean;
  nextSlot?: string;
  openUntil?: string;
  
  // Nouvelles propriétés pour la section unifiée
  isNearby?: boolean;
}

export interface HomepageRecommendations {
  sections: {
    [key: string]: RecommendationData[];
  };
  totalSections: number;
  totalRecommendations: number;
  userConnected: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RecommendationService {
  private apiUrl = `${environment.apiUrl}/salons/recommendations`;
  private freelanceApiUrl = `${environment.apiUrl}/freelances`;
  
  // Subject pour partager l'état des recommandations
  private recommendationsState = new BehaviorSubject<{
    loading: boolean;
    homepage: HomepageRecommendations | null;
    lastUpdate: Date | null;
  }>({
    loading: false,
    homepage: null,
    lastUpdate: null
  });

  public recommendationsState$ = this.recommendationsState.asObservable();

  constructor(private http: HttpClient) {

  }

  // ==================== MÉTHODES PRINCIPALES ====================

  /**
   *  Obtenir les recommandations pour la page d'accueil (salons + freelancers)
   */
  getHomepageRecommendations(lat?: number, lon?: number, type?: 'salon' | 'freelance' | 'both'): Observable<HomepageRecommendations> {

    
    this.updateLoadingState(true);

    let params = new HttpParams();
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }
    if (type) {
      params = params.set('type', type);
    } else {
      params = params.set('type', 'both'); // Par défaut, inclure les deux
    }

    return this.http.get<HomepageRecommendations>(`${this.apiUrl}/homepage`, { params }).pipe(
      tap(data => {

        // Enrichir les données avec des freelances si nécessaire
        this.enrichWithFreelancers(data, lat, lon);
        this.updateHomepageData(data);
        this.updateLoadingState(false);
      }),
      catchError(error => {
        console.error('Erreur recommandations homepage:', error);
        this.updateLoadingState(false);
        return of({
          sections: {},
          totalSections: 0,
          totalRecommendations: 0,
          userConnected: false
        });
      })
    );
  }

  /**
   *  Obtenir les recommandations de freelancers populaires
   */
  getPopularFreelancers(limit: number = 6): Observable<RecommendationData[]> {


    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any[]>(`${this.freelanceApiUrl}/popular`, { params }).pipe(
      tap(data => {

      }),
      catchError(error => {
        console.error('Erreur freelancers populaires:', error);
        return of([]);
      })
    );
  }

  /**
   *  Obtenir les freelancers proches avec distance réelle
   */
  getNearbyFreelancers(lat: number, lon: number, radius: number = 5, limit: number = 6): Observable<RecommendationData[]> {


    let params = new HttpParams()
      .set('service', 'tous')
      .set('lat', lat.toString())
      .set('lng', lon.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.freelanceApiUrl}/nearby`, { params }).pipe(
      map(response => {
        const freelances = response?.freelances || response || [];
        return Array.isArray(freelances) ? freelances.map((item: any) => {
          const f = item.freelance ? { ...item.freelance, distance: item.distance } : item;
          return this.processFreelancerData([f])[0];
        }) : [];
      }),
      catchError(error => {
        console.error('Erreur freelancers proximité:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir des freelancers par service
   */
  getFreelancersByService(serviceName: string, lat?: number, lon?: number, limit: number = 6): Observable<RecommendationData[]> {


    let params = new HttpParams().set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any[]>(`${this.freelanceApiUrl}/by-service/${encodeURIComponent(serviceName)}`, { params }).pipe(
      tap(data => {

      }),
      catchError(error => {
        console.error('Erreur freelancers par service:', error);
        return of([]);
      })
    );
  }

  /**
   * Obtenir des recommandations rapides pour un service
   */
  getQuickRecommendations(service: string, lat?: number, lon?: number, limit: number = 6): Observable<any> {


    let params = new HttpParams()
      .set('service', service)
      .set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/quick`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur recommandations rapides:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  /**
   * Obtenir des salons similaires
   */
  getSimilarSalons(salonId: number, limit: number = 5): Observable<any> {


    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/similar/${salonId}`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur salons similaires:', error);
        return of({ similarSalons: [], total: 0 });
      })
    );
  }

  // ==================== NOUVELLES MÉTHODES DISPONIBILITÉ TEMPS RÉEL ====================

  /**
   * Obtenir les professionnels disponibles maintenant
   */
  getAvailableNow(lat?: number, lon?: number, radius: number = 10, limit: number = 8): Observable<any> {


    let params = new HttpParams()
      .set('radius', radius.toString())
      .set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/available-now`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur disponibilités temps réel:', error);
        return of({ 
          availableNow: [], 
          availableCount: 0, 
          message: 'Erreur lors du chargement des disponibilités' 
        });
      })
    );
  }

  /**
   * Obtenir la disponibilité d'aujourd'hui pour un salon
   */
  getSalonAvailabilityToday(salonId: number, dureeService: number = 30): Observable<any> {


    let params = new HttpParams().set('dureeService', dureeService.toString());

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/salon/${salonId}/today`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur disponibilité salon aujourd\'hui:', error);
        return of({ error: true, message: error.message });
      })
    );
  }

  /**
   * Obtenir la disponibilité d'aujourd'hui pour un freelance
   */
  getFreelanceAvailabilityToday(freelanceId: number, dureeService: number = 30): Observable<any> {


    let params = new HttpParams().set('dureeService', dureeService.toString());

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/freelance/${freelanceId}/today`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur disponibilité freelance aujourd\'hui:', error);
        return of({ error: true, message: error.message });
      })
    );
  }

  /**
   * Obtenir le prochain créneau disponible pour un salon
   */
  getSalonNextSlot(salonId: number, dureeService: number = 30): Observable<any> {


    let params = new HttpParams().set('dureeService', dureeService.toString());

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/salon/${salonId}/next-slot`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur prochain créneau salon:', error);
        return of({ hasSlot: false, error: true, message: error.message });
      })
    );
  }

  /**
   * Obtenir le prochain créneau disponible pour un freelance
   */
  getFreelanceNextSlot(freelanceId: number, dureeService: number = 30): Observable<any> {


    let params = new HttpParams().set('dureeService', dureeService.toString());

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/freelance/${freelanceId}/next-slot`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error('Erreur prochain créneau freelance:', error);
        return of({ hasSlot: false, error: true, message: error.message });
      })
    );
  }

  /**
   *  Vérifier le statut temps réel d'un professionnel
   */
  getCurrentStatus(prestataireId: number, estSalon: boolean): Observable<any> {


    let params = new HttpParams()
      .set('prestataireId', prestataireId.toString())
      .set('estSalon', estSalon.toString());

    return this.http.get<any>(`${environment.apiUrl}/disponibilites/status`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error(' Erreur statut temps réel:', error);
        return of({ isOpenNow: false, error: true, message: error.message });
      })
    );
  }

  /**
   *  Obtenir des recommandations par proximité
   */
  getNearbyRecommendations(lat: number, lon: number, radius: number = 5, limit: number = 10): Observable<any> {


    let params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('radius', radius.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/nearby`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error(' Erreur recommandations proximité:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  /**
   *  Obtenir des recommandations par service spécifique
   */
  getRecommendationsByService(serviceName: string, lat?: number, lon?: number, limit: number = 8): Observable<any> {


    let params = new HttpParams().set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/by-service/${encodeURIComponent(serviceName)}`, { params }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error(' Erreur recommandations par service:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  // ==================== MÉTHODES D'INTERACTION ====================

  /**
   *  Marquer/démarquer un salon comme favori
   */
  updateFavorite(salonId: number, action: 'add' | 'remove'): Observable<any> {


    return this.http.post(`${this.apiUrl}/favorite`, { salonId, action }).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error(' Erreur mise à jour favori:', error);
        return of({ error: error.message });
      })
    );
  }

  /**
   *  Enregistrer une interaction utilisateur
   */
  recordInteraction(salonId: number, type: string, duration?: number): Observable<any> {


    const data: any = { salonId, type };
    if (duration) {
      data.duration = duration;
    }

    return this.http.post(`${this.apiUrl}/interaction`, data).pipe(
      tap(response => {

      }),
      catchError(error => {
        console.error(' Erreur enregistrement interaction:', error);
        return of({ error: error.message });
      })
    );
  }

  /**
   *  Rafraîchir les recommandations
   */
  refreshRecommendations(): Observable<any> {


    return this.http.post(`${this.apiUrl}/refresh`, {}).pipe(
      tap(response => {

        // Réinitialiser l'état local
        this.resetState();
      }),
      catchError(error => {
        console.error(' Erreur rafraîchissement:', error);
        return of({ error: error.message });
      })
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   *  Obtenir l'état actuel des recommandations
   */
  getCurrentState() {
    return this.recommendationsState.value;
  }

  /**
   *  Vérifier si des recommandations sont disponibles
   */
  hasRecommendations(): boolean {
    const state = this.getCurrentState();
    return state.homepage !== null && state.homepage.totalRecommendations > 0;
  }

  /**
   *  Obtenir le nombre total de recommandations
   */
  getTotalRecommendations(): number {
    const state = this.getCurrentState();
    return state.homepage?.totalRecommendations || 0;
  }

  /**
   *  Obtenir les recommandations d'une section spécifique
   */
  getSectionRecommendations(sectionName: string): RecommendationData[] {
    const state = this.getCurrentState();
    return state.homepage?.sections[sectionName] || [];
  }

  /**
   *  Obtenir toutes les sections disponibles
   */
  getAvailableSections(): string[] {
    const state = this.getCurrentState();
    return state.homepage ? Object.keys(state.homepage.sections) : [];
  }

  /**
   *  Obtenir la géolocalisation de l'utilisateur
   */
  getCurrentLocation(): Promise<{ lat: number, lon: number }> {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              lat: position.coords.latitude,
              lon: position.coords.longitude
            });
          },
          (error) => {
            console.warn('Géolocalisation échouée:', error);
            reject(error);
          },
          {
            timeout: 5000,
            enableHighAccuracy: false
          }
        );
      } else {
        reject('Géolocalisation non supportée');
      }
    });
  }

  /**
   *  Traiter les données de salon brutes
   */
  processSalonData(data: any[]): RecommendationData[] {
    if (!Array.isArray(data)) {
      console.warn('Données de salon invalides:', data);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      nom: item.nom || item.name,
      description: item.description,
      adresse: item.adresse || item.address,
      photoProfil: item.photoProfil || item.photoProfilUrl || item.imageUrl,
      note: item.note || item.rating || item.noteMoyenne,
      nombreAvis: item.nombreAvis || item.reviewCount,
      services: Array.isArray(item.services) ? item.services : 
                item.serviceNoms ? item.serviceNoms : [],
      distance: item.distance,
      latitude: item.latitude,
      longitude: item.longitude,
      type: item.type || 'salon',
      rating: item.rating || item.note,
      reviewCount: item.reviewCount || item.nombreAvis,
      experience: item.experience,
      availability: item.availability
    }));
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   *  Enrichir les recommandations avec des freelances
   */
  private enrichWithFreelancers(data: HomepageRecommendations, lat?: number, lon?: number): void {

    
    // Ajouter les freelances populaires
    this.getPopularFreelancers(3).subscribe(freelances => {
      if (freelances && freelances.length > 0) {
        const processedFreelances = this.processFreelancerData(freelances as any[]);
        
        // Créer une section freelances populaires ou l'enrichir
        if (!data.sections['freelances_populaires']) {
          data.sections['freelances_populaires'] = [];
        }
        data.sections['freelances_populaires'].push(...processedFreelances);
        
        // Mélanger avec les salons populaires
        if (data.sections['populaires'] && processedFreelances.length > 0) {
          data.sections['populaires'].push(...processedFreelances.slice(0, 2));
          data.totalRecommendations += 2;
        }
        

      }
    });

    // Ajouter les freelances par proximité si géolocalisation disponible
    if (lat && lon) {
      this.getNearbyFreelancers(lat, lon, 5, 3).subscribe(nearbyFreelances => {
        if (nearbyFreelances && nearbyFreelances.length > 0) {
          const processedNearbyFreelances = nearbyFreelances; // déjà traités par getNearbyFreelancers
          
          // Créer une section freelances proches ou l'enrichir
          if (!data.sections['freelances_proches']) {
            data.sections['freelances_proches'] = [];
          }
          data.sections['freelances_proches'].push(...processedNearbyFreelances);
          
          // Mélanger avec les salons proches
          if (data.sections['proches'] && processedNearbyFreelances.length > 0) {
            data.sections['proches'].push(...processedNearbyFreelances.slice(0, 2));
            data.totalRecommendations += 2;
          }
          

        }
      });
    }

    // Ajouter les freelances par service
    ['coiffure', 'manucure', 'barbier'].forEach(service => {
      this.getFreelancersByService(service, lat, lon, 2).subscribe(serviceFreelances => {
        if (serviceFreelances && serviceFreelances.length > 0) {
          const processedServiceFreelances = this.processFreelancerData(serviceFreelances);
          
          // Mélanger avec les salons du même service
          if (data.sections[service]) {
            data.sections[service].push(...processedServiceFreelances);
            data.totalRecommendations += processedServiceFreelances.length;
          }
          

        }
      });
    });
  }

  /**
   *  Traiter les données de freelancer brutes
   */
  private processFreelancerData(data: any[]): RecommendationData[] {
    if (!Array.isArray(data)) {
      console.warn('Données de freelancer invalides:', data);
      return [];
    }

    return data.map(item => ({
      id: item.id,
      nom: item.prenom ? `${item.prenom} ${item.nom || ''}`.trim() : item.nom || item.name || 'Freelancer',
      description: item.description || item.specialite || 'Professionnel indépendant',
      adresse: item.adresse || item.address || 'Adresse non spécifiée',
      photoProfil: item.photoProfil || item.photoProfilUrl || item.imageUrl || item.avatar,
      note: item.note || item.rating || item.noteMoyenne || 0,
      nombreAvis: item.nombreAvis || item.reviewCount || item.reviews || item.nbAvis || 0,
      services: this.extractServiceNames(item.services || item.serviceNoms || item.specialites || (item.specialite ? [item.specialite] : [])),
      distance: item.distance,
      latitude: item.latitude,
      longitude: item.longitude,
      type: 'freelance',
      rating: item.rating || item.note,
      reviewCount: item.reviewCount || item.nombreAvis,
      experience: item.experience || item.anneesExperience,
      availability: item.availability || item.disponibilite,
      specialite: item.specialite || item.description || 'Freelance'
    }));
  }

  /**
   * Extraire les noms de services (gérer objets et chaînes)
   */
  private extractServiceNames(services: any): string[] {
    if (!services) return [];
    
    if (Array.isArray(services)) {
      return services.map(service => {
        if (typeof service === 'string') {
          return service;
        } else if (typeof service === 'object' && service !== null) {
          return service.nom || service.name || service.title || 'Service';
        }
        return 'Service';
      });
    }
    
    if (typeof services === 'string') {
      return [services];
    }
    
    return [];
  }

  /**
   * Mettre à jour l'état de chargement
   */
  private updateLoadingState(loading: boolean): void {
    const currentState = this.recommendationsState.value;
    this.recommendationsState.next({
      ...currentState,
      loading
    });
  }

  /**
   * Mettre à jour les données de la homepage
   */
  private updateHomepageData(data: HomepageRecommendations): void {
    const currentState = this.recommendationsState.value;
    this.recommendationsState.next({
      ...currentState,
      homepage: data,
      lastUpdate: new Date()
    });
  }

  /**
   * Réinitialiser l'état
   */
  private resetState(): void {
    this.recommendationsState.next({
      loading: false,
      homepage: null,
      lastUpdate: null
    });
  }

  // ==================== MÉTHODES DE CACHE ====================

  /**
   *  Vérifier si les données sont récentes (moins de 5 minutes)
   */
  isDataFresh(): boolean {
    const state = this.getCurrentState();
    if (!state.lastUpdate) return false;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return state.lastUpdate > fiveMinutesAgo;
  }

  /**
   *  Charger les recommandations avec cache
   */
  loadRecommendationsWithCache(lat?: number, lon?: number): Observable<HomepageRecommendations> {
    const state = this.getCurrentState();

    // Si les données sont récentes ET qu'on n'a pas de nouvelles coordonnées non encore utilisées, utiliser le cache
    const hasNewLocation = lat != null && lon != null;
    const cacheHasNearby = (state.homepage?.sections['proches']?.length ?? 0) > 0 ||
                           (state.homepage?.sections['freelances_proches']?.length ?? 0) > 0;

    if (this.isDataFresh() && this.hasRecommendations() && (!hasNewLocation || cacheHasNearby)) {

      return of(state.homepage!);
    }

    // Sinon, charger depuis l'API

    return this.getHomepageRecommendations(lat, lon);
  }

  // ==================== MÉTHODES DE DEBUG ====================

  /**
   *  Afficher l'état de debug
   */
  debugState(): void {
    const state = this.getCurrentState();






  }
}