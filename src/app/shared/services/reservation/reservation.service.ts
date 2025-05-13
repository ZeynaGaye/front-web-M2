import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations`;

  constructor(private http: HttpClient) { }

  // Créer une nouvelle réservation
  createReservation(reservationData: any): Observable<any> {
    console.log('Création d\'une réservation avec les données:', reservationData);
    
    return this.http.post<any>(`${this.apiUrl}/create`, reservationData).pipe(
      tap(reservation => console.log('Réservation créée avec succès:', reservation)),
      catchError(this.handleError)
    );
  }

  // Récupérer les réservations de l'utilisateur connecté
  getUserReservations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user`).pipe(
      tap(reservations => console.log(`${reservations.length} réservations récupérées`)),
      catchError(this.handleError)
    );
  }

  // Annuler une réservation
  cancelReservation(reservationId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${reservationId}/cancel`, {}).pipe(
      tap(_ => console.log(`Réservation ${reservationId} annulée`)),
      catchError(this.handleError)
    );
  }

  // Récupérer les détails d'une réservation
  getReservationById(reservationId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${reservationId}`).pipe(
      tap(reservation => console.log('Réservation récupérée:', reservation)),
      catchError(this.handleError)
    );
  }

  // Mettre à jour une réservation
  updateReservation(reservationId: number, updateData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${reservationId}`, updateData).pipe(
      tap(updatedReservation => console.log('Réservation mise à jour:', updatedReservation)),
      catchError(this.handleError)
    );
  }

  // Gestionnaire d'erreurs
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
      
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}