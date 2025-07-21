import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { catchError, Observable, of, map, tap } from 'rxjs';
import { ServiceSalon } from '../../models/service-salon';

// ✅ INTERFACES POUR LE TYPAGE
interface PhotosResponse {
  photos: any[];
  total: number;
  salonId: number;
}

interface UploadResponse {
  photos: any[];
  total: number;
  message: string;
}

interface DeleteResponse {
  success: boolean;
  photoId: number;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SalonService {
  private apiUrl = 'http://localhost:8081/api';
  
  constructor(private http: HttpClient) {}

  // ✅ TYPAGE CORRIGÉ - Récupération des photos
  getSalonPhotos(salonId: number): Observable<any[]> {
    const url = `${this.apiUrl}/salons/${salonId}/photos`;
    console.log(`🔍 Service - Requête GET vers: ${url}`);
    
    // Le backend peut retourner soit PhotosResponse soit any[]
    return this.http.get<PhotosResponse | any[]>(url).pipe(
      tap(response => {
        console.log('📥 Service - Réponse brute reçue:', response);
        console.log('📥 Service - Type de réponse:', typeof response);
        console.log('📥 Service - Est un tableau:', Array.isArray(response));
      }),
      map((response: PhotosResponse | any[]) => {
        console.log('🔄 Service - Traitement de la réponse...');
        
        // Vérifier si c'est un objet avec propriété photos
        if (response && !Array.isArray(response) && 'photos' in response) {
          const photosResponse = response as PhotosResponse;
          console.log(`✅ Service - Format objet détecté: ${photosResponse.photos.length} photos`);
          
          // Valider chaque photo
          const validPhotos = photosResponse.photos.filter(photo => {
            const isValid = photo && photo.id && photo.url;
            if (!isValid) {
              console.warn('⚠️ Service - Photo invalide détectée:', photo);
            }
            return isValid;
          });
          
          console.log(`📊 Service - ${validPhotos.length}/${photosResponse.photos.length} photos valides`);
          return validPhotos;
        }
        
        // Si c'est directement un tableau
        if (Array.isArray(response)) {
          console.log(`✅ Service - Format tableau direct détecté: ${response.length} photos`);
          return response.filter(photo => photo && photo.id && photo.url);
        }
        
        // Cas d'erreur: format non reconnu
        console.warn('⚠️ Service - Format de réponse non reconnu:', response);
        return [];
      }),
      catchError(error => {
        console.error('❌ Service - Erreur lors de la récupération des photos:', error);
        console.error('❌ Service - Status HTTP:', error.status);
        console.error('❌ Service - Message:', error.message);
        console.error('❌ Service - URL problématique:', url);
        
        // Log détaillé de l'erreur
        if (error.error) {
          console.error('❌ Service - Détails erreur backend:', error.error);
        }
        
        // Retourner un tableau vide au lieu de propager l'erreur
        return of([]);
      })
    );
  }

  // ✅ TYPAGE CORRIGÉ - Upload de photos
  uploadSalonPhotos(salonId: number, formData: FormData): Observable<UploadResponse> {
    const url = `${this.apiUrl}/salons/${salonId}/upload-photos`;
    console.log(`📤 Service - Upload photos vers: ${url}`);
    
    // Log du contenu du FormData
    console.log('📤 Service - Contenu FormData:');
    for (let pair of formData.entries()) {
      console.log(`  - ${pair[0]}: ${pair[1]}`);
    }
    
    return this.http.post<UploadResponse | any[]>(url, formData).pipe(
      tap(response => {
        console.log('📥 Service - Réponse upload brute:', response);
      }),
      map((response: UploadResponse | any[]): UploadResponse => {
        console.log('🔄 Service - Traitement réponse upload...');
        
        // Format objet avec propriété photos
        if (response && !Array.isArray(response) && 'photos' in response) {
          const uploadResponse = response as UploadResponse;
          console.log(`✅ Service - Upload réussi: ${uploadResponse.photos.length} photos`);
          return uploadResponse;
        }
        
        // Fallback: si c'est directement un tableau
        if (Array.isArray(response)) {
          console.log(`✅ Service - Upload réussi (format tableau): ${response.length} photos`);
          return { 
            photos: response, 
            total: response.length, 
            message: `${response.length} photos uploadées` 
          };
        }
        
        // Format inconnu
        console.warn('⚠️ Service - Format réponse upload non reconnu:', response);
        return { photos: [], total: 0, message: 'Format de réponse invalide' };
      }),
      catchError(error => {
        console.error('❌ Service - Erreur upload photos:', error);
        console.error('❌ Service - Status:', error.status);
        console.error('❌ Service - Message:', error.message);
        
        // Retourner un objet d'erreur structuré
        return of({ 
          photos: [], 
          total: 0, 
          message: error.message || 'Erreur d\'upload inconnue'
        });
      })
    );
  }

  // ✅ TYPAGE CORRIGÉ - Suppression de photo
  deleteSalonPhoto(photoId: number): Observable<DeleteResponse> {
    const url = `${this.apiUrl}/salons/photos/${photoId}`;
    console.log(`🗑️ Service - Suppression photo: ${url}`);
    
    return this.http.delete<any>(url).pipe(
      tap(response => {
        console.log('📥 Service - Réponse suppression:', response);
      }),
      map((response: any): DeleteResponse => {
        console.log('✅ Service - Photo supprimée avec succès');
        return { 
          success: true, 
          photoId: photoId,
          message: 'Photo supprimée avec succès'
        };
      }),
      catchError(error => {
        console.error('❌ Service - Erreur suppression photo:', error);
        console.error('❌ Service - Status:', error.status);
        console.error('❌ Service - Photo ID:', photoId);
        
        return of({ 
          success: false, 
          error: error.message || 'Erreur de suppression',
          photoId: photoId 
        });
      })
    );
  }

  // ✅ NOUVELLE MÉTHODE - Debug des photos
  debugSalonPhotos(salonId: number): Observable<any> {
    const url = `${this.apiUrl}/salons/${salonId}/photos/debug`;
    console.log(`🔍 Service - Debug photos: ${url}`);
    
    return this.http.get<any>(url).pipe(
      tap(response => {
        console.log('🔍 Service - Informations debug:', response);
      }),
      catchError(error => {
        console.error('❌ Service - Erreur debug photos:', error);
        return of({ error: error.message, salonId });
      })
    );
  }

  // ✅ NOUVELLE MÉTHODE - Test de connectivité API
  testApiConnectivity(): Observable<boolean> {
    const url = `${this.apiUrl}/salons/all`;
    console.log(`🧪 Service - Test connectivité: ${url}`);
    
    return this.http.get<any[]>(url).pipe(
      map(response => {
        console.log('✅ Service - API accessible, nombre de salons:', response?.length || 0);
        return true;
      }),
      catchError(error => {
        console.error('❌ Service - API non accessible:', error);
        return of(false);
      })
    );
  }

  // ✅ MÉTHODES EXISTANTES INCHANGÉES
  
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
  
  updateSalonProfilePhotoUrl(salonId: number, data: { photoUrl: string }): Observable<any> {
    console.log(`🖼️ Service - Mise à jour photo de profil: ${this.apiUrl}/salons/${salonId}/profile-photo-url`);
    return this.http.put<any>(`${this.apiUrl}/salons/${salonId}/profile-photo-url`, data).pipe(
      catchError(error => {
        console.error('❌ Service - Erreur mise à jour photo de profil:', error);
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

  getSalonsByService(service: string): Observable<any[]> {
    let params = new HttpParams().set('serviceNom', service);
    
    return this.http.get<any[]>(`${this.apiUrl}/salons/by-service`, { params }).pipe(
      catchError(error => {
        console.error('Erreur lors de la récupération des salons par service:', error);
        return of([]);
      })
    );
  }

  searchSalons(searchData: any): Observable<any[]> {
    console.log('🔍 searchSalons appelé avec:', searchData);
    
    if (!searchData || typeof searchData !== 'object') {
      console.error('❌ searchData invalide:', searchData);
      return of([]);
    }

    if (!searchData.term || typeof searchData.term !== 'string' || !searchData.term.trim()) {
      console.error('❌ Terme de recherche invalide:', searchData.term);
      return of([]);
    }

    let url = `${this.apiUrl}/salons/search`;
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
    
    console.log('📤 URL:', url);
    console.log('📤 Paramètres:', params.toString());
    
    return this.http.get<any[]>(url, { params }).pipe(
      catchError(error => {
        console.error('❌ Erreur lors de la recherche:', error);
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

  reverseGeocode(latitude: number, longitude: number): Observable<string> {
    return of(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
  }

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