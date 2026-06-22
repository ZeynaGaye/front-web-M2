import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DexPaymentRequest {
  bookingId: number;
  method: 'DEXPAY'; // doit correspondre à l'enum PaymentMethod.DEXPAY du backend
  phoneNumber: string;
  email?: string;
  customerName: string;
  amount?: number;
}

export interface DexPaymentResponse {
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
  private currentPayment = new BehaviorSubject<DexPaymentResponse | null>(null);

  constructor(private http: HttpClient) {}

  /**
   * Initialise une session de paiement DexPay
   */
  initiatePayment(request: DexPaymentRequest): Observable<DexPaymentResponse> {
    const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const backendRequest = { ...request, method: 'DEXPAY' };
    return this.http.post<DexPaymentResponse>(`${this.apiUrl}/initiate`, backendRequest, { headers });
  }

  /**
   * Vérifie le statut d'un paiement
   */
  checkPaymentStatus(transactionId: string): Observable<DexPaymentResponse> {
    return this.http.get<DexPaymentResponse>(`${this.apiUrl}/status/${transactionId}`);
  }

  /**
   * Surveille le statut d'un paiement avec polling
   */
  pollPaymentStatus(transactionId: string, intervalMs: number = 3000): Observable<DexPaymentResponse> {
    return new Observable(observer => {
      const poll = () => {
        this.checkPaymentStatus(transactionId).subscribe({
          next: (response) => {
            observer.next(response);

            if (['COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED'].includes(response.status)) {
              observer.complete();
              return;
            }

            setTimeout(poll, intervalMs);
          },
          error: (error) => {
            observer.error(error);
          }
        });
      };

      poll();
    });
  }

  /**
   * Ouvre la page DexPay dans une popup et surveille la fermeture
   */
  openPaymentWindow(paymentUrl: string, transactionId: string): Promise<DexPaymentResponse> {
    return new Promise((resolve, reject) => {
      const popup = window.open(
        paymentUrl,
        'DexPay',
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes,location=yes'
      );

      if (!popup) {
        reject(new Error('Impossible d\'ouvrir la fenêtre de paiement. Vérifiez que les popups sont autorisés.'));
        return;
      }

      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);

          this.checkPaymentStatus(transactionId).subscribe({
            next: (response: DexPaymentResponse) => resolve(response),
            error: (error) => reject(error)
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
   * Process complet de paiement DexPay
   */
  async processPayment(request: DexPaymentRequest): Promise<DexPaymentResponse> {
    try {
      const initResponse = await new Promise<DexPaymentResponse>((resolve, reject) => {
        this.initiatePayment(request).subscribe({
          next: (result) => resolve(result),
          error: (error) => reject(error)
        });
      });

      if (!initResponse || initResponse.status === 'FAILED') {
        throw new Error(initResponse?.message || 'Échec de l\'initialisation du paiement');
      }

      this.currentPayment.next(initResponse);

      // DexPay retourne une paymentUrl vers leur page de paiement hébergée
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
      const errorResponse: DexPaymentResponse = {
        transactionId: '',
        bookingId: request.bookingId,
        status: 'FAILED',
        message: error.message || 'Erreur lors du paiement'
      };

      this.currentPayment.next(errorResponse);
      throw error;
    }
  }

  getCurrentPayment(): Observable<DexPaymentResponse | null> {
    return this.currentPayment.asObservable();
  }

  resetPaymentState(): void {
    this.currentPayment.next(null);
  }

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

  canRetry(status: string): boolean {
    return ['FAILED', 'EXPIRED', 'CANCELLED'].includes(status);
  }
}
