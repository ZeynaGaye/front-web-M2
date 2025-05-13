    import { Injectable } from '@angular/core';
    import { HttpClient } from '@angular/common/http';
    import { Observable } from 'rxjs';

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
        // Implémentez la logique pour récupérer l'ID du salon courant
        // Par exemple depuis le localStorage ou un état dans le service
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
        return this.http.get<any[]>(`${this.apiUrl}/salons/${salonId}/photos`);
      }
      
      uploadSalonPhotos(salonId: number, formData: FormData): Observable<any[]> {
        return this.http.post<any[]>(`${this.apiUrl}/salons/${salonId}/upload-photos`, formData);
      }
      
      deleteSalonPhoto(photoId: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/photos/${photoId}`);
      }
      
      updateSalonProfilePhotoUrl(salonId: number, data: { photoUrl: string }): Observable<any> {
        return this.http.put<any>(`${this.apiUrl}/salons/${salonId}/profile-photo-url`, data);
      }
    }