import { Component, OnInit, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RegisterService, SignupRequest } from '../../services/register.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule]
})
export class RegisterComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLoginEvent = new EventEmitter<void>(); // Nouvel événement pour basculer vers la connexion
  
  registerForm!: FormGroup;
  currentStep = 1;
  errorMessage = '';
  isLoading = false;
  
  // Types d'utilisateurs
  roles = ['CLIENT', 'FREELANCE', 'EMPLOYEUR'];
  sexeOptions = [
  { value: 'MASCULIN', label: 'Homme' },
  { value: 'FEMININ', label: 'Femme' }
];
  
  constructor(
    private fb: FormBuilder,
    private authService: RegisterService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      // Étape 1 - Informations de base
      nom: ['', Validators.required],
      prenom: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],

      // Étape 2 - Informations complémentaires
      telephone: ['', [Validators.pattern(/^\d{9}$/)]],
      adresse: [''],
      role: ['', Validators.required],
      sexe: ['', Validators.required],

      // Étape 3 - Mot de passe et sécurité
      motDePasse: ['', [
        Validators.required, 
        Validators.minLength(6),
        Validators.pattern(/^(?=.*\d).+$/)
      ]],
      confirmPassword: ['', Validators.required],
      
    }, { 
      validators: this.checkPasswords 
    });

    // Écouter les changements de rôle pour ajuster le formulaire dynamiquement
    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      if (role) {
        this.updateFormFields(role);
      }
    });
  }

  // Validateur personnalisé pour la concordance des mots de passe
  checkPasswords(group: AbstractControl): { [key: string]: boolean } | null {
    const password = group.get('motDePasse')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { notMatching: true };
  }

  // Mise à jour des champs du formulaire selon le rôle
  updateFormFields(role: string | null): void {
    if (!role) return;

    // Suppression des champs spécifiques existants
    ['description', 'preferences', 'competences', 'experiences', 'portfolio'].forEach(field => {
      if (this.registerForm.contains(field)) {
        this.registerForm.removeControl(field);
      }
    });

    // Ajout des champs spécifiques selon le rôle
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

  // Navigation entre les étapes
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

  // Validation par étape
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

  // Soumission du formulaire
  onSubmit(): void {
    if (this.registerForm.invalid) {
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

  // Création de l'objet de requête à partir du formulaire
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
    // Ajouter les champs spécifiques s'ils existent
    if (this.registerForm.value.description) signupRequest.description = this.registerForm.value.description;
    if (this.registerForm.value.preferences) signupRequest.preferences = this.registerForm.value.preferences;
    if (this.registerForm.value.competences) signupRequest.competences = this.registerForm.value.competences;
    if (this.registerForm.value.experiences) signupRequest.experiences = this.registerForm.value.experiences;
    if (this.registerForm.value.portfolio) signupRequest.portfolio = this.registerForm.value.portfolio;

    console.log('Envoi de la demande d\'inscription:', signupRequest);

    this.authService.signup(signupRequest).subscribe({
      next: (response) => {
        this.isLoading = false;
        console.log('Inscription réussie:', response);
        
        this.snackBar.open('Inscription réussie! Bienvenue!', 'Fermer', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
        
        this.closeModal();
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        console.error('Erreur d\'inscription:', error);
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
  
  // Méthode pour basculer vers le formulaire de connexion
  switchToLogin(): void {
    console.log('Demande de basculement vers le formulaire de connexion');
    this.switchToLoginEvent.emit();
  }
}