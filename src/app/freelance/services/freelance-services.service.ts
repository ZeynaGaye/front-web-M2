import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ServiceSalon } from '../../models/service-salon';

@Injectable({
  providedIn: 'root'
})
export class FreelanceService {
  private apiUrl = 'http://localhost:8081/api/freelance/services';

  constructor(private http: HttpClient) { }

  /**
   * Récupère tous les services du freelance connecté
   */
  getMyServices(): Observable<ServiceSalon[]> {
    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/my-services`);
  }

  /**
   * Crée un nouveau service pour le freelance
   */
  createService(serviceData: any): Observable<ServiceSalon> {
    return this.http.post<ServiceSalon>(`${this.apiUrl}/create`, serviceData);
  }

  /**
   * Met à jour un service existant
   */
  updateService(serviceId: number, serviceData: any): Observable<ServiceSalon> {
    return this.http.put<ServiceSalon>(`${this.apiUrl}/${serviceId}`, serviceData);
  }

  /**
   * Supprime un service
   */
  deleteService(serviceId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${serviceId}`);
  }

  /**
   * Récupère un service par son ID
   */
  getServiceById(serviceId: number): Observable<ServiceSalon> {
    return this.http.get<ServiceSalon>(`${this.apiUrl}/${serviceId}`);
  }

  /**
   * Récupère les statistiques des services du freelance
   */
  getServiceStatistics(): Observable<any> {
    return this.http.get(`${this.apiUrl}/statistics`);
  }

  /**
   * Active/désactive un service
   */
  toggleServiceStatus(serviceId: number): Observable<ServiceSalon> {
    return this.http.patch<ServiceSalon>(`${this.apiUrl}/${serviceId}/toggle-status`, {});
  }

  /**
   * Recherche de services par freelance avec filtres
   */
  searchFreelanceServices(
    query?: string,
    category?: string,
    minPrice?: number,
    maxPrice?: number,
    userLat?: number,
    userLng?: number,
    radius?: number
  ): Observable<ServiceSalon[]> {
    let params: any = {};
    
    if (query) params.query = query;
    if (category) params.category = category;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    if (userLat) params.userLat = userLat;
    if (userLng) params.userLng = userLng;
    if (radius) params.radius = radius;

    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/search`, { params });
  }
}