import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { EmployeCreateRequest, EmployeListItem, EmployeResponse, EmployeUpdateRequest, PageResponse } from '../../models/employe';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class EmployeService {
  private apiUrl = `${environment.apiUrl}/employes`;

  constructor(private http: HttpClient) {}

  // Lister les employés avec pagination
  listerEmployes(salonId: number, page: number = 0, size: number = 10): Observable<PageResponse<EmployeListItem>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString())
      .set('sort', 'nom');
    
    return this.http.get<PageResponse<EmployeListItem>>(`${this.apiUrl}/salon/${salonId}`, { params });
  }

  // Lister les employés actifs
  listerEmployesActifs(salonId: number, page: number = 0, size: number = 20): Observable<PageResponse<EmployeListItem>> {
    const params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());
    
    return this.http.get<PageResponse<EmployeListItem>>(`${this.apiUrl}/salon/${salonId}/actifs`, { params });
  }

  // Obtenir un employé par ID
  obtenirEmploye(employeId: number): Observable<EmployeResponse> {
    return this.http.get<EmployeResponse>(`${this.apiUrl}/${employeId}`);
  }

  // Créer un nouvel employé
  creerEmploye(employe: EmployeCreateRequest): Observable<EmployeResponse> {
    return this.http.post<EmployeResponse>(this.apiUrl, employe);
  }

  // Modifier un employé
  modifierEmploye(employeId: number, employe: EmployeUpdateRequest): Observable<EmployeResponse> {
    return this.http.put<EmployeResponse>(`${this.apiUrl}/${employeId}`, employe);
  }

  // Supprimer un employé
  supprimerEmploye(employeId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${employeId}`);
  }

  // Réactiver un employé
  reactiverEmploye(employeId: number): Observable<EmployeResponse> {
    return this.http.patch<EmployeResponse>(`${this.apiUrl}/${employeId}/reactiver`, {});
  }

  // Rechercher des employés
  rechercherEmployes(salonId: number, recherche: string): Observable<EmployeListItem[]> {
    const params = new HttpParams().set('q', recherche);
    return this.http.get<EmployeListItem[]>(`${this.apiUrl}/salon/${salonId}/rechercher`, { params });
  }

  // Obtenir la liste des spécialités
  obtenirSpecialites(): Observable<{code: string, libelle: string}[]> {
    return this.http.get<{code: string, libelle: string}[]>(`${this.apiUrl}/specialites`);
  }
}