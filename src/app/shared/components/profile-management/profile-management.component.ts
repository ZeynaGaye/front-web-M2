import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/servces/auth.service';
import { ProfileManagementService, UserProfile, PasswordUpdate } from '../../services/profile/profile-management.service';
import { ProfilePhotoManagerComponent } from '../profile-photo-manager/profile-photo-manager.component';
import { AvisRecusComponent } from '../avis-recus/avis-recus.component';


@Component({
  selector: 'app-profile-management',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatChipsModule,
    MatTabsModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    ProfilePhotoManagerComponent,
    // AvisRecusComponent
],
  templateUrl: './profile-management.component.html',
  styleUrls: ['./profile-management.component.scss']
})
export class ProfileManagementComponent implements OnInit, OnDestroy {
  // Services
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileManagementService);
  private authService = inject(AuthService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Formulaires
  profileForm!: FormGroup;
  passwordForm!: FormGroup;

  // États
  currentUser: UserProfile | null = null;
  isLoading = false;
  isSaving = false;
  isChangingPassword = false;

  // Gestion des onglets
  selectedTabIndex = 0;

  // Subscriptions
  private subscriptions = new Subscription();

  // Options pour les sélecteurs
  sexeOptions = [
    { value: 'M', label: 'Masculin' },
    { value: 'F', label: 'Féminin' },
    { value: 'Autre', label: 'Autre' }
  ];

  ngOnInit(): void {
    this.initializeForms();
    this.loadUserProfile();
    this.subscribeToProfileChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  // ✅ Initialisation des formulaires
  private initializeForms(): void {
    this.profileForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      prenom: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.pattern(/^(\+33|0)[1-9](?:[0-9]{8})$/)]],
      adresse: [''],
      ville: [''],
      sexe: [''],
      
      // Champs spécifiques freelance
      competences: [''],
      experiences: [''],
      
      // Champs spécifiques client
      preferences: [''],
      
      // Champs spécifiques employeur
      description: ['']
    });

    this.passwordForm = this.fb.group({
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, { validators: this.passwordMatchValidator });
  }

  // ✅ Validation des mots de passe
  private passwordMatchValidator(group: FormGroup) {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    
    if (newPassword !== confirmPassword) {
      group.get('confirmPassword')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    
    return null;
  }

  // ✅ Charger le profil utilisateur
  loadUserProfile(): void {
    this.isLoading = true;
    
    this.subscriptions.add(
      this.profileService.getCurrentUserProfile().subscribe({
        next: (profile) => {
          console.log('✅ Profil chargé:', profile);
          this.currentUser = profile;
          this.populateForm(profile);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement profil:', error);
          this.showError('Impossible de charger le profil');
          this.isLoading = false;
        }
      })
    );
  }

  // ✅ Remplir le formulaire avec les données du profil
  private populateForm(profile: UserProfile): void {
    this.profileForm.patchValue({
      nom: profile.nom,
      prenom: profile.prenom,
      email: profile.email,
      telephone: profile.telephone || '',
      adresse: profile.adresse || '',
      ville: profile.ville || '',
      sexe: profile.sexe || '',
      competences: Array.isArray(profile.competences) ? profile.competences.join(', ') : (profile.competences || ''),
      experiences: profile.experiences || '',
      preferences: profile.preferences || '',
      description: profile.description || ''
    });
  }

  // ✅ Écouter les changements de profil
  private subscribeToProfileChanges(): void {
    this.subscriptions.add(
      this.profileService.profileChanges$.subscribe(profile => {
        if (profile) {
          this.currentUser = profile;
        }
      })
    );
  }

  // ✅ Sauvegarder le profil
  onSaveProfile(): void {
    if (this.profileForm.invalid) {
      this.markFormGroupTouched(this.profileForm);
      return;
    }

    this.isSaving = true;
    const formValue = this.profileForm.value;
    
    // Préparer les données selon le rôle
    const profileData: Partial<UserProfile> = {
      nom: formValue.nom,
      prenom: formValue.prenom,
      email: formValue.email,
      telephone: formValue.telephone || null,
      adresse: formValue.adresse || null,
      ville: formValue.ville || null,
      sexe: formValue.sexe || null
    };

    // Ajouter les champs spécifiques selon le rôle
    if (this.currentUser?.role === 'FREELANCE') {
      profileData.competences = formValue.competences ? 
        formValue.competences.split(',').map((c: string) => c.trim()) : [];
      profileData.experiences = formValue.experiences || null;
    } else if (this.currentUser?.role === 'CLIENT') {
      profileData.preferences = formValue.preferences || null;
    } else if (this.currentUser?.role === 'EMPLOYEUR') {
      profileData.description = formValue.description || null;
    }

    this.subscriptions.add(
      this.profileService.updateProfile(profileData).subscribe({
        next: (updatedProfile) => {
          console.log('✅ Profil mis à jour:', updatedProfile);
          this.currentUser = updatedProfile;
          this.isSaving = false;
          this.showSuccess('Profil mis à jour avec succès');
        },
        error: (error) => {
          console.error('❌ Erreur mise à jour profil:', error);
          this.isSaving = false;
          this.showError('Erreur lors de la mise à jour du profil');
        }
      })
    );
  }

  // ✅ Changer le mot de passe (avec options Keycloak)
  onChangePassword(): void {
    if (this.passwordForm.invalid) {
      this.markFormGroupTouched(this.passwordForm);
      return;
    }

    this.isChangingPassword = true;
    const passwordData: PasswordUpdate = this.passwordForm.value;

    this.subscriptions.add(
      this.profileService.updatePassword(passwordData).subscribe({
        next: () => {
          console.log('✅ Mot de passe mis à jour via Keycloak');
          this.isChangingPassword = false;
          this.passwordForm.reset();
          this.showSuccess('Mot de passe mis à jour avec succès');
        },
        error: (error) => {
          console.error('❌ Erreur changement mot de passe:', error);
          this.isChangingPassword = false;
          this.showError('Erreur lors du changement de mot de passe. Vous pouvez aussi utiliser la console Keycloak.');
        }
      })
    );
  }

  // ✅ Ouvrir la console de gestion de compte Keycloak
  openKeycloakAccountManagement(): void {
    this.profileService.redirectToKeycloakAccountManagement();
    this.showSuccess('Console de gestion de compte Keycloak ouverte dans un nouvel onglet');
  }

  // ✅ Callback pour la mise à jour de la photo
  onProfilePhotoUpdated(photoUrl: string): void {
    if (this.currentUser) {
      this.currentUser.photoProfile = photoUrl;
      this.showSuccess('Photo de profil mise à jour');
    }
  }

  // ✅ Callback pour la suppression de la photo
  onProfilePhotoDeleted(): void {
    if (this.currentUser) {
      this.currentUser.photoProfile = undefined;
      this.showSuccess('Photo de profil supprimée');
    }
  }

  // ✅ Getters pour le template
  get isFreelance(): boolean {
    return this.currentUser?.role === 'FREELANCE';
  }

  get isClient(): boolean {
    return this.currentUser?.role === 'CLIENT';
  }

  get isEmployeur(): boolean {
    return this.currentUser?.role === 'EMPLOYEUR';
  }

  get userDisplayName(): string {
    return this.currentUser ? 
      `${this.currentUser.prenom} ${this.currentUser.nom}` : 
      'Utilisateur';
  }

  get passwordStrength(): 'weak' | 'medium' | 'strong' {
    const password = this.passwordForm.get('newPassword')?.value || '';
    return this.profileService.getPasswordStrength(password);
  }

  // ✅ Utilitaires
  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ✅ Méthodes pour les messages d'erreur
  getFieldError(fieldName: string): string {
    const control = this.profileForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
      if (control.errors['email']) {
        return 'Email invalide';
      }
      if (control.errors['minlength']) {
        return `Minimum ${control.errors['minlength'].requiredLength} caractères`;
      }
      if (control.errors['pattern']) {
        return 'Format invalide';
      }
    }
    return '';
  }

  getPasswordError(fieldName: string): string {
    const control = this.passwordForm.get(fieldName);
    if (control?.errors && control.touched) {
      if (control.errors['required']) {
        return 'Ce champ est requis';
      }
      if (control.errors['minlength']) {
        return 'Minimum 8 caractères';
      }
      if (control.errors['mismatch']) {
        return 'Les mots de passe ne correspondent pas';
      }
    }
    return '';
  }
}