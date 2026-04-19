import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { ServiceSalon } from '../../models/service-salon';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServiceSalonService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/services`;

  //  Récupère tous les services d'un salon
  getServicesBySalon(salonId: number): Observable<ServiceSalon[]> {

    const url = `${this.apiUrl}/all/${salonId}`;
    
    return this.http.get<any[]>(url).pipe(
      map(services => services.map(s => this.normalizeService(s))),
      tap(services => {


      })
    );
  }

  //  Crée un nouveau service pour un salon
  createService(salonId: number, serviceData: ServiceSalon): Observable<ServiceSalon> {

    const url = `${this.apiUrl}/${salonId}`;
    // Map nom→nomService for the backend DTO
    const payload = { ...serviceData, nomService: serviceData.nom, categorieService: serviceData.categorie };
    return this.http.post<any>(url, payload).pipe(
      map(response => this.normalizeService(response)),
    );
  }

  //  Met à jour un service existant
  updateService(serviceId: number, serviceData: ServiceSalon): Observable<ServiceSalon> {

    const url = `${this.apiUrl}/${serviceId}`;
    // Map nom→nomService for the backend DTO
    const payload = { ...serviceData, nomService: serviceData.nom, categorieService: serviceData.categorie };
    return this.http.put<any>(url, payload).pipe(
      map(response => this.normalizeService(response)),
    );
  }

  /** Normalise la réponse backend : nomService → nom, categorieService → categorie */
  private normalizeService(s: any): ServiceSalon {
    return {
      ...s,
      nom: s.nom || s.nomService || '',
      categorie: s.categorie || s.categorieService || '',
      description: s.description || s.descriptionService || ''
    } as ServiceSalon;
  }

  //  Supprime un service
  deleteService(serviceId: number): Observable<void> {

    const url = `${this.apiUrl}/${serviceId}`;
    
    return this.http.delete<void>(url).pipe(
      tap(() => {

      })
    );
  }

  //  Récupère un service par son ID
  getServiceById(serviceId: number): Observable<ServiceSalon> {

    const url = `${this.apiUrl}/${serviceId}`;
    
    return this.http.get<ServiceSalon>(url).pipe(
      tap(service => {

      })
    );
  }

  //  Récupère les services de l'utilisateur connecté
  getUserServices(): Observable<ServiceSalon[]> {

    const url = `${this.apiUrl}/user`;
    
    return this.http.get<ServiceSalon[]>(url).pipe(
      tap(services => {


      })
    );
  }

  //  Validation des données de service (en français)
  private validateServiceData(serviceData: ServiceSalon): void {

    
    const errors: string[] = [];
    
    if (!serviceData.nom || serviceData.nom.trim().length === 0) {
      errors.push('Le nom du service est requis');
    }
    
    if (!serviceData.description || serviceData.description.trim().length === 0) {
      errors.push('La description du service est requise');
    }
    
    if (serviceData.prix === null || serviceData.prix === undefined || serviceData.prix < 0) {
      errors.push('Le prix doit être un nombre positif');
    }
    
    if (!serviceData.dureeEnMinutes || serviceData.dureeEnMinutes < 1) {
      errors.push('La durée doit être d\'au moins 1 minute');
    }
    
    if (errors.length > 0) {
      console.error(' Erreurs de validation:', errors);
      throw new Error('Données de service invalides: ' + errors.join(', '));
    }
    

  }
}