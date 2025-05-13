import { Component, OnInit, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/servces/auth.service';


@Component({
  selector: 'app-authent',
  templateUrl: './authent.component.html',
  styleUrls: ['./authent.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ]
})
export class AuthentComponent implements OnInit {
  @Output() switchToRegisterEvent = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  
  loginForm!: FormGroup;
  isLoading = false;
  hidePassword = true;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    // Si l'utilisateur est déjà connecté, rediriger vers la page appropriée
    if (this.authService.isAuthenticated()) {
      this.authService.redirectToAppropriateHomePage();
    }

    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      motDePasse: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    
    // Pas besoin de convertir ici - le service s'en charge
    const credentials = {
      email: this.loginForm.value.email,
      password: this.loginForm.value.motDePasse
    };

    console.log('Tentative de connexion avec:', credentials);

    this.authService.login(credentials).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Connexion réussie:', response);
        
        this.snackBar.open('Connexion réussie !', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        // Fermer le modal
        this.close.emit();
        
        // Rediriger l'utilisateur vers la page correspondant à son rôle
        this.authService.redirectToAppropriateHomePage();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error || 'Échec de la connexion. Veuillez réessayer.';
        console.error('Erreur de connexion:', error, this.errorMessage);
        
        this.snackBar.open(this.errorMessage, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  navigateToForgotPassword(): void {
    this.router.navigate(['/forgot-password']);
  }
  
  // Méthode pour basculer vers le modal d'inscription
  switchToRegister(): void {
    this.switchToRegisterEvent.emit();
    console.log('Demande de basculement vers le formulaire d\'inscription émise');
  }
  
  // Fermer le modal
  closeModal(): void {
    this.close.emit();
  }
}