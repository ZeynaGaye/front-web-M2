import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Candidature {
  id?: number;
  offreEmploiId: number; // Correspond au backend
   
  message?: string;
  disponibilite?: string;
  tarifPropose?: number;
  status?: string;
  dateCandidature?: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CandidatureService {
  private apiUrl = 'http://localhost:8081/api/candidatures';

  constructor(private http: HttpClient) {}

  createCandidature(candidatureData: {
    offreEmploiId: number;
    message: string;
    disponibilite: string;
    tarifPropose: number;
  }): Observable<Candidature> {
    return this.http.post<Candidature>(`${this.apiUrl}/create`, candidatureData);
  }
  getAllCandidatures(): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/all`);
  }

  getCandidatureById(id: number): Observable<Candidature> {
    return this.http.get<Candidature>(`${this.apiUrl}/${id}`);
  }

  getCandidaturesByFreelance(freelanceId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/freelance/${freelanceId}`);
  }

  getCandidaturesByOffre(offreId: number): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/offre/${offreId}`);
  }

  getCandidaturesByStatus(status: string): Observable<Candidature[]> {
    return this.http.get<Candidature[]>(`${this.apiUrl}/status/${status}`);
  }

  /**
   * Méthode pour vérifier si un freelance a déjà postulé à une offre
   */
  aDejaPostule(offreId: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.apiUrl}/a-deja-postule`, {
      params: { offreId: offreId.toString() }
    });
  }

  updateCandidature(id: number, candidature: Candidature): Observable<Candidature> {
    return this.http.put<Candidature>(`${this.apiUrl}/${id}`, candidature);
  }

  deleteCandidature(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
