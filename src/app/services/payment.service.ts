import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface BeautyPaymentRequest {
  bookingId: number;
  method: 'PAYDUNYA';
  phoneNumber: string;
  email?: string;
  customerName: string;
  preferredOperator?: string; // orange_money, wave, free_money, mix_by_yas, carte_bancaire
  amount?: number; // Montant calculé côté frontend
}

export interface BeautyPaymentResponse {
  transactionId: string;
  bookingId: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  message: string;
  paymentUrl?: string;
  expiresAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/payments`;
  private currentPayment = new BehaviorSubject<BeautyPaymentResponse | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Initialise un paiement PayDunya
   */
  initiatePayment(request: BeautyPaymentRequest): Observable<BeautyPaymentResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    

    // Mapper les données pour le backend
    const backendRequest = this.mapToBackendRequest(request);
    
    return this.http.post<BeautyPaymentResponse>(`${this.apiUrl}/initiate`, backendRequest, { headers });
  }

  /**
   * Mappe la requête frontend vers le format backend
   */
  private mapToBackendRequest(request: BeautyPaymentRequest): any {
    const backendRequest: any = {
      bookingId: request.bookingId || 0, // 0 si nouveau paiement
      method: 'PAYDUNYA',
      phoneNumber: request.phoneNumber,
      email: request.email,
      customerName: request.customerName,
      preferredOperator: request.preferredOperator,
      amount: request.amount // Montant calculé côté frontend
    };

    return backendRequest;
  }

  /**
   * Vérifie le statut d'un paiement
   */
  checkPaymentStatus(transactionId: string): Observable<BeautyPaymentResponse> {
    
    return this.http.get<BeautyPaymentResponse>(`${this.apiUrl}/status/${transactionId}`);
  }

  /**
   * Surveille le statut d'un paiement avec polling
   */
  pollPaymentStatus(transactionId: string, intervalMs: number = 3000): Observable<BeautyPaymentResponse> {
    return new Observable(observer => {
      const poll = () => {
        this.checkPaymentStatus(transactionId).subscribe({
          next: (response) => {
            
            observer.next(response);
            
            // Arrêter le polling si le paiement est terminé
            if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(response.status)) {
              observer.complete();
              return;
            }
            
            // Continuer le polling
            setTimeout(poll, intervalMs);
          },
          error: (error) => {
            console.error(' Erreur lors de la vérification:', error);
            observer.error(error);
          }
        });
      };
      
      // Démarrer le premier poll
      poll();
    });
  }

  /**
   * Ouvre PayDunya dans une nouvelle fenêtre et surveille la fermeture
   */
  openPaymentWindow(paymentUrl: string, transactionId: string): Promise<BeautyPaymentResponse> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        paymentUrl, 
        'PayDunya',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      );

      if (!popup) {
        reject(new Error('Impossible d\'ouvrir la fenêtre de paiement. Vérifiez que les popups sont autorisés.'));
        return;
      }

      // Vérifier périodiquement si la popup est fermée
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          
          // Vérifier le statut final du paiement
          this.checkPaymentStatus(transactionId).subscribe({
            next: (response: BeautyPaymentResponse) => {
              resolve(response);
            },
            error: (error) => {
              console.error(' Erreur vérification statut final:', error);
              reject(error);
            }
          });
        }
      }, 1000);

      // Timeout de sécurité (15 minutes)
      setTimeout(() => {
        if (!popup.closed) {
          popup.close();
          clearInterval(checkClosed);
          reject(new Error('Timeout: La fenêtre de paiement a été fermée automatiquement après 15 minutes.'));
        }
      }, 15 * 60 * 1000);
    });
  }

  /**
   * Process complet de paiement avec gestion d'erreurs
   */
  async processPayment(request: BeautyPaymentRequest): Promise<BeautyPaymentResponse> {
    try {
      
      // 1. Initialiser le paiement
      const initResponse = await new Promise<BeautyPaymentResponse>((resolve, reject) => {
        this.initiatePayment(request).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(error)
        });
      });
      
      if (!initResponse || initResponse.status === 'FAILED') {
        throw new Error(initResponse?.message || 'Échec de l\'initialisation du paiement');
      }

      this.currentPayment.next(initResponse);

      // 2. Ouvrir PayDunya si URL disponible
      if (initResponse.paymentUrl && initResponse.transactionId) {
        const finalResponse = await this.openPaymentWindow(
          initResponse.paymentUrl, 
          initResponse.transactionId
        );
        
        this.currentPayment.next(finalResponse);
        return finalResponse;
      }

      return initResponse;

    } catch (error: any) {
      console.error(' Erreur processus paiement:', error);
      
      const errorResponse: BeautyPaymentResponse = {
        transactionId: '',
        bookingId: request.bookingId,
        status: 'FAILED',
        message: error.message || 'Erreur lors du paiement'
      };
      
      this.currentPayment.next(errorResponse);
      throw error;
    }
  }

  /**
   * Observable pour suivre l'état du paiement actuel
   */
  getCurrentPayment(): Observable<BeautyPaymentResponse | null> {
    return this.currentPayment.asObservable();
  }

  /**
   * Réinitialise l'état du paiement
   */
  resetPaymentState(): void {
    this.currentPayment.next(null);
  }

  /**
   * Formate le message d'erreur selon le statut
   */
  getStatusMessage(status: string): string {
    switch (status) {
      case 'PENDING': return 'Paiement en attente d\'initialisation';
      case 'PROCESSING': return 'Paiement en cours de traitement';
      case 'COMPLETED': return 'Paiement effectué avec succès';
      case 'FAILED': return 'Échec du paiement';
      case 'CANCELLED': return 'Paiement annulé';
      case 'EXPIRED': return 'Paiement expiré';
      default: return 'Statut inconnu';
    }
  }

  /**
   * Détermine si un paiement peut être retenté
   */
  canRetry(status: string): boolean {
    return ['FAILED', 'EXPIRED', 'CANCELLED'].includes(status);
  }
}