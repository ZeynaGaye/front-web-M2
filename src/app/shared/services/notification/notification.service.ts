import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';

export interface Notification {
  id: number;
  message: string;
  vue: boolean;
  dateNotif: string;
  reservation: {
    id: number;
    dateReservation: string;
    serviceSalon?: {
      nom: string;
    };
  };
}

export interface NotificationCount {
  count: number;
  hasUnread: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:8081/api/notifications';
  private unreadCountSubject = new BehaviorSubject<number>(0);
  public unreadCount$ = this.unreadCountSubject.asObservable();

  constructor(private http: HttpClient) {}

  getNotifications(): Observable<Notification[]> {
    // Les notifications sont filtrées côté backend selon l'utilisateur authentifié
    return this.http.get<Notification[]>(this.apiUrl);
  }

  getUnreadNotifications(): Observable<Notification[]> {
    // Les notifications non lues sont filtrées côté backend selon l'utilisateur authentifié
    return this.http.get<Notification[]>(`${this.apiUrl}/unread`);
  }

  getUnreadCount(): Observable<NotificationCount> {
    // Le compteur est calculé côté backend selon l'utilisateur authentifié
    return this.http.get<NotificationCount>(`${this.apiUrl}/unread/count`).pipe(
      tap(response => {
        this.unreadCountSubject.next(response.count);
      })
    );
  }

  // Méthode pour obtenir les notifications d'un client spécifique (si nécessaire)
  getClientNotifications(clientId: number): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}/client/${clientId}`);
  }

  // Méthode pour obtenir le compteur d'un client spécifique (si nécessaire)
  getClientUnreadCount(clientId: number): Observable<NotificationCount> {
    return this.http.get<NotificationCount>(`${this.apiUrl}/client/${clientId}/unread/count`).pipe(
      tap(response => this.unreadCountSubject.next(response.count))
    );
  }

  markAsRead(notificationId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${notificationId}/read`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  markAllAsRead(): Observable<any> {
    return this.http.put(`${this.apiUrl}/read-all`, {}).pipe(
      tap(() => this.refreshUnreadCount())
    );
  }

  // Créer une notification pour une nouvelle candidature (pour l'employeur)
  createNewCandidatureNotification(employeurId: number, candidatureData: any): Observable<any> {
    const message = `Nouvelle candidature de ${candidatureData.freelancePrenom || 'Un freelance'} ${candidatureData.freelanceNom || ''} pour votre offre "${candidatureData.offreTitre || 'Offre d\'emploi'}"`;
    
    const notificationData = {
      destinataireId: employeurId,
      message: message,
      type: 'NOUVELLE_CANDIDATURE',
      candidatureId: candidatureData.id,
      offreId: candidatureData.offreEmploiId
    };
    
    return this.http.post(`${this.apiUrl}/create`, notificationData).pipe(
    );
  }

  // Créer une notification pour un changement de statut de candidature (pour le freelance)
  createCandidatureStatusNotification(freelanceId: number, statusChange: string, candidatureData: any): Observable<any> {
    let message = '';
    if (statusChange === 'ACCEPTEE') {
      message = ` Bonne nouvelle ! Votre candidature pour "${candidatureData.offreTitre || 'l\'offre d\'emploi'}" a été acceptée !`;
    } else if (statusChange === 'REFUSEE') {
      message = `Votre candidature pour "${candidatureData.offreTitre || 'l\'offre d\'emploi'}" n'a pas été retenue cette fois.`;
    } else {
      message = `Statut de votre candidature mis à jour : ${statusChange} pour "${candidatureData.offreTitre || 'l\'offre d\'emploi'}"`;
    }
    
    const notificationData = {
      destinataireId: freelanceId,
      message: message,
      type: 'CANDIDATURE_STATUS',
      candidatureId: candidatureData.id,
      offreId: candidatureData.offreEmploiId,
      status: statusChange
    };
    
    return this.http.post(`${this.apiUrl}/create`, notificationData).pipe(
    );
  }

  private refreshUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  loadUnreadCount(): void {
    this.getUnreadCount().subscribe();
  }

  // Méthode de test pour charger des notifications factices
  getMockNotifications(): Notification[] {
    return [
      {
        id: 1,
        message: "Nouvelle réservation de Marie Dupont pour Coiffure",
        vue: false,
        dateNotif: new Date().toISOString(),
        reservation: {
          id: 1,
          dateReservation: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Coiffure"
          }
        }
      },
      {
        id: 2,
        message: "Réservation terminée avec Jean Martin pour Massage",
        vue: false,
        dateNotif: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        reservation: {
          id: 2,
          dateReservation: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Massage"
          }
        }
      },
      {
        id: 3,
        message: "Réservation annulée par Sophie Lambert pour Manucure",
        vue: true,
        dateNotif: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        reservation: {
          id: 3,
          dateReservation: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          serviceSalon: {
            nom: "Manucure"
          }
        }
      }
    ];
  }
}