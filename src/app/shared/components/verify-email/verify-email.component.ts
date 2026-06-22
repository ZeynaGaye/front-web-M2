import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './verify-email.component.html',
  styleUrls: ['./verify-email.component.scss']
})
export class VerifyEmailComponent implements OnInit {
  state: 'loading' | 'success' | 'error' = 'loading';
  errorMessage = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.state = 'error';
      this.errorMessage = 'Lien de vérification invalide ou manquant.';
      return;
    }
    this.http.get(
      `${environment.apiUrl}/auth/verify-email?token=${encodeURIComponent(token)}`,
      { responseType: 'text' }
    ).subscribe({
      next: (body) => {
        try {
          const res = JSON.parse(body) as { success: boolean; message: string };
          this.state = res.success ? 'success' : 'error';
          if (!res.success) this.errorMessage = res.message;
        } catch {
          this.state = 'error';
          this.errorMessage = 'Lien expiré ou déjà utilisé.';
        }
      },
      error: (err) => {
        this.state = 'error';
        if (err.status === 0) {
          this.errorMessage = 'Impossible de contacter le serveur.';
          return;
        }
        try {
          const body = typeof err.error === 'string' ? JSON.parse(err.error) : err.error;
          this.errorMessage = body?.message || 'Lien expiré ou déjà utilisé.';
        } catch {
          this.errorMessage = 'Lien expiré ou déjà utilisé.';
        }
      }
    });
  }

  goToLogin(): void {
    this.router.navigate(['/accueil'], { queryParams: { openLogin: 'true' } });
  }

  goHome(): void {
    this.router.navigate(['/accueil']);
  }
}
