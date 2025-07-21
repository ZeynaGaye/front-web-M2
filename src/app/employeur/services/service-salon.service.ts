import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ServiceSalon } from '../../models/service-salon';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ServiceSalonService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/services`;

  // ✅ Récupère tous les services d'un salon
  getServicesBySalon(salonId: number): Observable<ServiceSalon[]> {
    console.log('📋 Récupération des services pour salon:', salonId);
    const url = `${this.apiUrl}/all/${salonId}`;
    
    return this.http.get<ServiceSalon[]>(url).pipe(
      tap(services => {
        console.log('✅ Services récupérés:', services);
        console.log('📊 Nombre de services:', services.length);
      })
    );
  }

  // ✅ Crée un nouveau service pour un salon (pas de mapping nécessaire)
  createService(salonId: number, serviceData: ServiceSalon): Observable<ServiceSalon> {
    console.log('🛠️ Création service pour salon:', salonId);
    console.log('📤 Données envoyées au backend:', serviceData);
    
    const url = `${this.apiUrl}/${salonId}`;
    
    // ✅ Validation simple
    this.validateServiceData(serviceData);
    
    return this.http.post<ServiceSalon>(url, serviceData).pipe(
      tap(response => {
        console.log('✅ Service créé avec succès:', response);
      })
    );
  }

  // ✅ Met à jour un service existant (pas de mapping nécessaire)
  updateService(serviceId: number, serviceData: ServiceSalon): Observable<ServiceSalon> {
    console.log('✏️ Mise à jour service:', serviceId);
    console.log('📤 Données de mise à jour:', serviceData);
    
    const url = `${this.apiUrl}/${serviceId}`;
    
    // ✅ Validation simple
    this.validateServiceData(serviceData);
    
    return this.http.put<ServiceSalon>(url, serviceData).pipe(
      tap(response => {
        console.log('✅ Service mis à jour avec succès:', response);
      })
    );
  }

  // ✅ Supprime un service
  deleteService(serviceId: number): Observable<void> {
    console.log('🗑️ Suppression service:', serviceId);
    const url = `${this.apiUrl}/${serviceId}`;
    
    return this.http.delete<void>(url).pipe(
      tap(() => {
        console.log('✅ Service supprimé avec succès');
      })
    );
  }

  // ✅ Récupère un service par son ID
  getServiceById(serviceId: number): Observable<ServiceSalon> {
    console.log('🔍 Récupération service par ID:', serviceId);
    const url = `${this.apiUrl}/${serviceId}`;
    
    return this.http.get<ServiceSalon>(url).pipe(
      tap(service => {
        console.log('✅ Service récupéré:', service);
      })
    );
  }

  // ✅ Récupère les services de l'utilisateur connecté
  getUserServices(): Observable<ServiceSalon[]> {
    console.log('👤 Récupération des services de l\'utilisateur connecté');
    const url = `${this.apiUrl}/user`;
    
    return this.http.get<ServiceSalon[]>(url).pipe(
      tap(services => {
        console.log('✅ Services utilisateur récupérés:', services);
        console.log('📊 Nombre de services:', services.length);
      })
    );
  }

  // ✅ Validation des données de service (en français)
  private validateServiceData(serviceData: ServiceSalon): void {
    console.log('🔍 Validation des données service:', serviceData);
    
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
      console.error('❌ Erreurs de validation:', errors);
      throw new Error('Données de service invalides: ' + errors.join(', '));
    }
    
    console.log('✅ Validation réussie');
  }
}