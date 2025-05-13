import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ServiceSalon } from '../../models/service-salon';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ServiceSalonService {
  private apiUrl = 'http://localhost:8081/api/'; 

  constructor(private http: HttpClient) { }

  // Récupérer les services de l'utilisateur connecté
  getUserServices(): Observable<ServiceSalon[]> {
    return this.http.get<ServiceSalon[]>(`${this.apiUrl}/salons/services`);
  }
}
