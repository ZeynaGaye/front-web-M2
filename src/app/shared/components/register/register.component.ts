import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RegisterService, SignupRequest } from '../../services/register.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GeocodingService } from '../../../core/servces/GeocodingService/geocoding-service.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule]
})
export class RegisterComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLoginEvent = new EventEmitter<void>();

  registerForm!: FormGroup;
  currentStep = 1;
  errorMessage = '';
  isLoading = false;

  roles = ['CLIENT', 'FREELANCE', 'EMPLOYEUR'];
  sexeOptions = [
    { value: 'MASCULIN', label: 'Homme' },
    { value: 'FEMININ', label: 'Femme' }
  ];

  constructor(
    private fb: FormBuilder,
    private authService: RegisterService,
    private router: Router,
    private snackBar: MatSnackBar,
    private geocodingService: GeocodingService
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.pattern(/^\d{9}$/)]],
      adresse: [''],
      role: ['', Validators.required],
      sexe: ['', Validators.required],
      motDePasse: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*\d).+$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, {
      validators: this.checkPasswords
    });

    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      if (role) {
        this.updateFormFields(role);
      }
    });
  }

  checkPasswords(group: AbstractControl): { [key: string]: boolean } | null {
    const password = group.get('motDePasse')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { notMatching: true };
  }

  updateFormFields(role: string | null): void {
    if (!role) return;

    ['description', 'preferences', 'competences', 'experiences', 'portfolio'].forEach(field => {
      if (this.registerForm.contains(field)) {
        this.registerForm.removeControl(field);
      }
    });

    switch (role) {
      case 'EMPLOYEUR':
        this.registerForm.addControl('description', this.fb.control('', Validators.required));
        break;
      case 'CLIENT':
        this.registerForm.addControl('preferences', this.fb.control('', Validators.required));
        break;
      case 'FREELANCE':
        this.registerForm.addControl('competences', this.fb.control('', Validators.required));
        this.registerForm.addControl('experiences', this.fb.control('', Validators.required));
        this.registerForm.addControl('portfolio', this.fb.control(''));
        break;
    }
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.validateStep1()) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.validateStep2()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    this.currentStep--;
  }

  validateStep1(): boolean {
    return this.validateControls(['nom', 'prenom', 'email']);
  }

  validateStep2(): boolean {
    return this.validateControls(['telephone', 'role', 'sexe']);
  }

  validateControls(controlNames: string[]): boolean {
    let valid = true;

    controlNames.forEach(controlName => {
      const control = this.registerForm.get(controlName);
      if (control && control.invalid) {
        control.markAsTouched();
        valid = false;
      }
    });

    return valid;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const signupRequest: SignupRequest = {
      email: this.registerForm.value.email,
      motDePasse: this.registerForm.value.motDePasse,
      nom: this.registerForm.value.nom,
      prenom: this.registerForm.value.prenom,
      telephone: this.registerForm.value.telephone || '',
      adresse: this.registerForm.value.adresse || '',
      role: this.registerForm.value.role,
      sexe: this.registerForm.value.sexe
    };

    if (this.registerForm.value.description) signupRequest.description = this.registerForm.value.description;
    if (this.registerForm.value.preferences) signupRequest.preferences = this.registerForm.value.preferences;
    if (this.registerForm.value.competences) signupRequest.competences = this.registerForm.value.competences;
    if (this.registerForm.value.experiences) signupRequest.experiences = this.registerForm.value.experiences;
    if (this.registerForm.value.portfolio) signupRequest.portfolio = this.registerForm.value.portfolio;

    if (signupRequest.adresse) {
      this.geocodingService.getCoordinates(signupRequest.adresse).subscribe({
        next: coords => {
          if (coords) {
            signupRequest.latitude = coords.lat;
            signupRequest.longitude = coords.lon;
            console.log('Coordonnées trouvées:', coords);
          } else {
            console.warn('Adresse non trouvée par le géocodage');
          }
          this.sendSignupRequest(signupRequest);
        },
        error: err => {
          console.error('Erreur géocodage:', err);
          this.sendSignupRequest(signupRequest);
        }
      });
    } else {
      this.sendSignupRequest(signupRequest);
    }
  }

  private sendSignupRequest(signupRequest: SignupRequest) {
    this.authService.signup(signupRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.snackBar.open('Inscription réussie! Bienvenue!', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        this.closeModal();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.message || 'Une erreur est survenue lors de l\'inscription';
        this.snackBar.open(this.errorMessage, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  closeModal(): void {
    this.close.emit();
  }

  switchToLogin(): void {
    this.switchToLoginEvent.emit();
  }
}
