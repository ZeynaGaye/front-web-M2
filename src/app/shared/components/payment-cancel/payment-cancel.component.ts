import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-payment-cancel',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="payment-result-container">
      <div class="payment-result-card">
        <mat-icon class="result-icon">cancel</mat-icon>
        <h2>Paiement annulé</h2>
        <p>Vous avez annulé le paiement. Votre réservation n'a pas été confirmée.</p>
        <p class="transaction-id" *ngIf="transactionId">Réf : {{ transactionId }}</p>
        <div class="actions">
          <button mat-raised-button color="primary" (click)="goHome()">Retour à l'accueil</button>
        </div>
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
    .result-icon { font-size: 72px; height: 72px; width: 72px; color: #f44336; margin-bottom: 1rem; }
    h2 { margin: 0 0 0.5rem; }
    .transaction-id { font-size: 0.85rem; color: #666; }
    .actions { margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: center; }
  `]
})
export class PaymentCancelComponent implements OnInit {
  transactionId: string | null = null;

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.transactionId = this.route.snapshot.queryParamMap.get('transaction_id');
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
}
