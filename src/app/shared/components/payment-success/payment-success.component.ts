import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { PaymentService, DexPaymentResponse } from '../../../services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatProgressSpinnerModule, MatIconModule],
  template: `
    <div class="payment-result-container">
      <div class="payment-result-card" *ngIf="!isLoading">

        <div *ngIf="payment?.status === 'COMPLETED'" class="result success">
          <mat-icon class="result-icon">check_circle</mat-icon>
          <h2>Paiement réussi !</h2>
          <p>Votre réservation a été confirmée.</p>
          <p class="transaction-id">Réf : {{ payment?.transactionId }}</p>
          <button mat-raised-button color="primary" (click)="goHome()">Retour à l'accueil</button>
        </div>

        <div *ngIf="payment?.status !== 'COMPLETED' && payment" class="result pending">
          <mat-icon class="result-icon">hourglass_empty</mat-icon>
          <h2>Paiement en attente</h2>
          <p>Statut : {{ payment?.status }}</p>
          <p>{{ payment?.message }}</p>
          <button mat-raised-button (click)="goHome()">Retour à l'accueil</button>
        </div>

        <div *ngIf="error" class="result error">
          <mat-icon class="result-icon">error</mat-icon>
          <h2>Erreur de vérification</h2>
          <p>{{ error }}</p>
          <button mat-raised-button (click)="goHome()">Retour à l'accueil</button>
        </div>

      </div>

      <div *ngIf="isLoading" class="loading">
        <mat-spinner></mat-spinner>
        <p>Vérification du paiement...</p>
      </div>
    </div>
  `,
  styles: [`
    .payment-result-container {
      display: flex; justify-content: center; align-items: center;
      min-height: 60vh; padding: 2rem;
    }
    .payment-result-card {
      text-align: center; max-width: 420px; width: 100%;
      background: white; border-radius: 12px; padding: 2.5rem;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }
    .result-icon { font-size: 72px; height: 72px; width: 72px; margin-bottom: 1rem; }
    .success .result-icon { color: #4caf50; }
    .pending .result-icon { color: #ff9800; }
    .error .result-icon { color: #f44336; }
    h2 { margin: 0 0 0.5rem; }
    .transaction-id { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }
    .loading { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
  `]
})
export class PaymentSuccessComponent implements OnInit {
  payment: DexPaymentResponse | null = null;
  isLoading = true;
  error: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private paymentService: PaymentService
  ) {}

  ngOnInit(): void {
    const transactionId = this.route.snapshot.queryParamMap.get('transaction_id');
    if (!transactionId) {
      this.isLoading = false;
      this.error = 'Identifiant de transaction manquant.';
      return;
    }

    this.paymentService.checkPaymentStatus(transactionId).subscribe({
      next: (response) => {
        this.payment = response;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.error = 'Impossible de vérifier le statut du paiement.';
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
