// ==================== recommendation.service.ts ====================
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
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
    console.log('🎯 RecommendationService initialisé avec URL:', this.apiUrl);
  }

  // ==================== MÉTHODES PRINCIPALES ====================

  /**
   * 🏠 Obtenir les recommandations pour la page d'accueil (salons + freelancers)
   */
  getHomepageRecommendations(lat?: number, lon?: number, type?: 'salon' | 'freelance' | 'both'): Observable<HomepageRecommendations> {
    console.log('🏠 Chargement recommandations homepage...', { lat, lon, type });
    
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
        console.log('✅ Recommandations homepage reçues:', data);
        // Enrichir les données avec des freelances si nécessaire
        this.enrichWithFreelancers(data, lat, lon);
        this.updateHomepageData(data);
        this.updateLoadingState(false);
      }),
      catchError(error => {
        console.error('❌ Erreur recommandations homepage:', error);
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
   * 👤 Obtenir les recommandations de freelancers populaires
   */
  getPopularFreelancers(limit: number = 6): Observable<RecommendationData[]> {
    console.log('👤 Chargement freelancers populaires...');

    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any[]>(`${this.freelanceApiUrl}/popular`, { params }).pipe(
      tap(data => {
        console.log('✅ Freelancers populaires reçus:', data);
      }),
      catchError(error => {
        console.error('❌ Erreur freelancers populaires:', error);
        return of([]);
      })
    );
  }

  /**
   * 📍 Obtenir les freelancers à proximité
   */
  getNearbyFreelancers(lat: number, lon: number, radius: number = 5, limit: number = 6): Observable<RecommendationData[]> {
    console.log(`📍 Freelancers proximité: ${lat}, ${lon} (${radius}km)`);

    let params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('radius', radius.toString())
      .set('limit', limit.toString());

    return this.http.get<any[]>(`${this.freelanceApiUrl}/nearby`, { params }).pipe(
      tap(data => {
        console.log('✅ Freelancers proximité reçus:', data);
      }),
      catchError(error => {
        console.error('❌ Erreur freelancers proximité:', error);
        return of([]);
      })
    );
  }

  /**
   * 🎯 Obtenir des freelancers par service
   */
  getFreelancersByService(serviceName: string, lat?: number, lon?: number, limit: number = 6): Observable<RecommendationData[]> {
    console.log(`🎯 Freelancers pour service: ${serviceName}`);

    let params = new HttpParams().set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any[]>(`${this.freelanceApiUrl}/by-service/${encodeURIComponent(serviceName)}`, { params }).pipe(
      tap(data => {
        console.log('✅ Freelancers par service reçus:', data);
      }),
      catchError(error => {
        console.error('❌ Erreur freelancers par service:', error);
        return of([]);
      })
    );
  }

  /**
   * 🎯 Obtenir des recommandations rapides pour un service
   */
  getQuickRecommendations(service: string, lat?: number, lon?: number, limit: number = 6): Observable<any> {
    console.log(`🎯 Recommandations rapides pour: ${service}`);

    let params = new HttpParams()
      .set('service', service)
      .set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/quick`, { params }).pipe(
      tap(response => {
        console.log('✅ Recommandations rapides reçues:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur recommandations rapides:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  /**
   * 🔍 Obtenir des salons similaires
   */
  getSimilarSalons(salonId: number, limit: number = 5): Observable<any> {
    console.log(`🔍 Recherche salons similaires à: ${salonId}`);

    let params = new HttpParams().set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/similar/${salonId}`, { params }).pipe(
      tap(response => {
        console.log('✅ Salons similaires reçus:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur salons similaires:', error);
        return of({ similarSalons: [], total: 0 });
      })
    );
  }

  /**
   * 📍 Obtenir des recommandations par proximité
   */
  getNearbyRecommendations(lat: number, lon: number, radius: number = 5, limit: number = 10): Observable<any> {
    console.log(`📍 Recommandations proximité: ${lat}, ${lon} (${radius}km)`);

    let params = new HttpParams()
      .set('lat', lat.toString())
      .set('lon', lon.toString())
      .set('radius', radius.toString())
      .set('limit', limit.toString());

    return this.http.get<any>(`${this.apiUrl}/nearby`, { params }).pipe(
      tap(response => {
        console.log('✅ Recommandations proximité reçues:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur recommandations proximité:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  /**
   * 🎯 Obtenir des recommandations par service spécifique
   */
  getRecommendationsByService(serviceName: string, lat?: number, lon?: number, limit: number = 8): Observable<any> {
    console.log(`🎯 Recommandations pour service: ${serviceName}`);

    let params = new HttpParams().set('limit', limit.toString());
    
    if (lat && lon) {
      params = params.set('lat', lat.toString()).set('lon', lon.toString());
    }

    return this.http.get<any>(`${this.apiUrl}/by-service/${encodeURIComponent(serviceName)}`, { params }).pipe(
      tap(response => {
        console.log('✅ Recommandations par service reçues:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur recommandations par service:', error);
        return of({ recommendations: [], total: 0 });
      })
    );
  }

  // ==================== MÉTHODES D'INTERACTION ====================

  /**
   * ❤️ Marquer/démarquer un salon comme favori
   */
  updateFavorite(salonId: number, action: 'add' | 'remove'): Observable<any> {
    console.log(`❤️ Mise à jour favori: salon ${salonId}, action: ${action}`);

    return this.http.post(`${this.apiUrl}/favorite`, { salonId, action }).pipe(
      tap(response => {
        console.log('✅ Favori mis à jour:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur mise à jour favori:', error);
        return of({ error: error.message });
      })
    );
  }

  /**
   * 📝 Enregistrer une interaction utilisateur
   */
  recordInteraction(salonId: number, type: string, duration?: number): Observable<any> {
    console.log(`📝 Enregistrement interaction: salon ${salonId}, type: ${type}`);

    const data: any = { salonId, type };
    if (duration) {
      data.duration = duration;
    }

    return this.http.post(`${this.apiUrl}/interaction`, data).pipe(
      tap(response => {
        console.log('✅ Interaction enregistrée:', response);
      }),
      catchError(error => {
        console.error('❌ Erreur enregistrement interaction:', error);
        return of({ error: error.message });
      })
    );
  }

  /**
   * 🔄 Rafraîchir les recommandations
   */
  refreshRecommendations(): Observable<any> {
    console.log('🔄 Rafraîchissement des recommandations...');

    return this.http.post(`${this.apiUrl}/refresh`, {}).pipe(
      tap(response => {
        console.log('✅ Recommandations rafraîchies:', response);
        // Réinitialiser l'état local
        this.resetState();
      }),
      catchError(error => {
        console.error('❌ Erreur rafraîchissement:', error);
        return of({ error: error.message });
      })
    );
  }

  // ==================== MÉTHODES UTILITAIRES ====================

  /**
   * 📊 Obtenir l'état actuel des recommandations
   */
  getCurrentState() {
    return this.recommendationsState.value;
  }

  /**
   * 📊 Vérifier si des recommandations sont disponibles
   */
  hasRecommendations(): boolean {
    const state = this.getCurrentState();
    return state.homepage !== null && state.homepage.totalRecommendations > 0;
  }

  /**
   * 📊 Obtenir le nombre total de recommandations
   */
  getTotalRecommendations(): number {
    const state = this.getCurrentState();
    return state.homepage?.totalRecommendations || 0;
  }

  /**
   * 📊 Obtenir les recommandations d'une section spécifique
   */
  getSectionRecommendations(sectionName: string): RecommendationData[] {
    const state = this.getCurrentState();
    return state.homepage?.sections[sectionName] || [];
  }

  /**
   * 📊 Obtenir toutes les sections disponibles
   */
  getAvailableSections(): string[] {
    const state = this.getCurrentState();
    return state.homepage ? Object.keys(state.homepage.sections) : [];
  }

  /**
   * 🌍 Obtenir la géolocalisation de l'utilisateur
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
   * 📦 Traiter les données de salon brutes
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
   * 🔄 Enrichir les recommandations avec des freelances
   */
  private enrichWithFreelancers(data: HomepageRecommendations, lat?: number, lon?: number): void {
    console.log('🔄 Enrichissement des données avec freelances...');
    
    // Ajouter les freelances populaires
    this.getPopularFreelancers(3).subscribe(freelances => {
      if (freelances && freelances.length > 0) {
        const processedFreelances = this.processFreelancerData(freelances);
        
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
        
        console.log('✅ Freelances populaires ajoutés:', processedFreelances.length);
      }
    });

    // Ajouter les freelances par proximité si géolocalisation disponible
    if (lat && lon) {
      this.getNearbyFreelancers(lat, lon, 5, 3).subscribe(nearbyFreelances => {
        if (nearbyFreelances && nearbyFreelances.length > 0) {
          const processedNearbyFreelances = this.processFreelancerData(nearbyFreelances);
          
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
          
          console.log('✅ Freelances proximité ajoutés:', processedNearbyFreelances.length);
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
          
          console.log(`✅ Freelances ${service} ajoutés:`, processedServiceFreelances.length);
        }
      });
    });
  }

  /**
   * 📦 Traiter les données de freelancer brutes
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
      nombreAvis: item.nombreAvis || item.reviewCount || 0,
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
   * 💾 Vérifier si les données sont récentes (moins de 5 minutes)
   */
  isDataFresh(): boolean {
    const state = this.getCurrentState();
    if (!state.lastUpdate) return false;
    
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return state.lastUpdate > fiveMinutesAgo;
  }

  /**
   * 💾 Charger les recommandations avec cache
   */
  loadRecommendationsWithCache(lat?: number, lon?: number): Observable<HomepageRecommendations> {
    // Si les données sont récentes, les retourner
    if (this.isDataFresh() && this.hasRecommendations()) {
      console.log('📦 Utilisation du cache pour les recommandations');
      return of(this.getCurrentState().homepage!);
    }

    // Sinon, charger depuis l'API
`    console.log('🌐 Chargement des recommandations depuis l'API');`
    return this.getHomepageRecommendations(lat, lon);
  }

  // ==================== MÉTHODES DE DEBUG ====================

  /**
   * 🐛 Afficher l'état de debug
   */
  debugState(): void {
    const state = this.getCurrentState();
    console.group('🐛 Recommendation Service Debug');
    console.log('État actuel:', state);
    console.log('Sections disponibles:', this.getAvailableSections());
    console.log('Total recommandations:', this.getTotalRecommendations());
    console.log('Données fraîches:', this.isDataFresh());
    console.groupEnd();
  }
}