import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceSalon } from '../../models/service-salon';


@Injectable({
  providedIn: 'root'
})
export class ServiceSalonService {
  private apiUrl = 'http://localhost:8081/api/services';

  constructor(private http: HttpClient) { }

  // Récupère tous les services d'un salon
  getServicesBySalon(salonId: number): Observable<ServiceSalon[]> {
    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/all/${salonId}`);
  }

  // Crée un nouveau service pour un salon
  createService(salonId: number, serviceData: any): Observable<ServiceSalon> {
    return this.http.post<ServiceSalon>(`${this.apiUrl}/${salonId}`, serviceData);
  }

  // Met à jour un service existant
  updateService(serviceId: number, serviceData: any): Observable<ServiceSalon> {
    return this.http.put<ServiceSalon>(`${this.apiUrl}/${serviceId}`, serviceData);
  }

  // Supprime un service
  deleteService(serviceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${serviceId}`);
  }

  // Récupère un service par son ID
  getServiceById(serviceId: number): Observable<ServiceSalon> {
    return this.http.get<ServiceSalon>(`${this.apiUrl}/${serviceId}`);
  }
  // Ajouter cette méthode à votre ServiceSalonService
getUserServices(): Observable<ServiceSalon[]> {
  return this.http.get<ServiceSalon[]>(`${this.apiUrl}/user`);
}
}