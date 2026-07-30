import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, EMPTY } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { AuthService } from '../../../core/servces/auth.service';


export interface UserProfile {
  id?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone?: string;
  adresse?: string;
  ville?: string;
  sexe?: string;
  photoProfile?: string;
  role: string;
  
  
  // Champs spécifiques freelance
  competences?: string[];
  experiences?: string;
  disponibilites?: any;
  location?: any;
  
  // Champs spécifiques client
  preferences?: string;
  
  // Champs spécifiques employeur
  description?: string;
}

export interface PasswordUpdate {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// Interface pour la réponse d'upload de photo
export interface UploadPhotoResponse {
  photoUrl: string;
  filename: string;
  message: string;
  success: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ProfileManagementService {
  private readonly apiUrl = 'http://localhost:8081/api';
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  
  // Subject pour notifier les changements de profil
  private profileUpdated$ = new BehaviorSubject<UserProfile | null>(null);
  public profileChanges$ = this.profileUpdated$.asObservable();

  constructor() {}

  //  Récupérer le profil utilisateur actuel
  getCurrentUserProfile(): Observable<UserProfile> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || !currentUser?.role) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    const endpoint = this.getEndpointByRole(currentUser.role, currentUser.id);
    
    return this.http.get<UserProfile>(`${this.apiUrl}${endpoint}`).pipe(
      tap(profile => {
        this.profileUpdated$.next(profile);
      }),
      catchError(this.handleError)
    );
  }

  //  Mettre à jour le profil utilisateur
  updateProfile(profileData: Partial<UserProfile>): Observable<UserProfile> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || !currentUser?.role) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    const endpoint = this.getEndpointByRole(currentUser.role, currentUser.id);
    
    return this.http.put<UserProfile>(`${this.apiUrl}${endpoint}`, profileData).pipe(
      tap(updatedProfile => {
        // Préserver la photo si le backend ne la renvoie pas dans la réponse PUT
        const currentPhoto = this.authService.getCurrentUser()?.photoProfile;
        const merged = { ...updatedProfile, photoProfile: updatedProfile.photoProfile ?? currentPhoto };
        this.profileUpdated$.next(merged);
        this.authService.setCurrentUser(merged);

        if (profileData.nom || profileData.prenom || profileData.email) {
          this.syncWithKeycloak(profileData).subscribe();
        }
      }),
      catchError(this.handleError)
    );
  }

  //  Changer le mot de passe (via Keycloak)
  updatePassword(passwordData: PasswordUpdate): Observable<void> {
    // Pour Keycloak, le changement de mot de passe se fait via l'API Keycloak
    // ou via une redirection vers la page de gestion de compte Keycloak
    
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    // Option 1: API backend qui communique avec Keycloak
    return this.http.put<void>(`${this.apiUrl}/auth/change-password`, {
      keycloakId: currentUser.kcId,
      currentPassword: passwordData.currentPassword,
      newPassword: passwordData.newPassword
    }).pipe(
      tap(() => {
      }),
      catchError(this.handleError)
    );
  }

  //  Rediriger vers la page de gestion de compte Keycloak
  redirectToKeycloakAccountManagement(): void {
    // URL de la console de gestion de compte Keycloak
    const keycloakAccountUrl = 'http://localhost:8081/realms/memoireM2/account';
    window.open(keycloakAccountUrl, '_blank');
  }

  //  Upload photo de profil (universel pour tous les rôles)
  uploadProfilePhoto(file: File): Observable<string> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || !currentUser?.role) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    const formData = new FormData();
    formData.append('file', file);

    // Adapter l'endpoint selon le rôle
    let uploadEndpoint: string;
    switch (currentUser.role.toLowerCase()) {
      case 'freelance':
        uploadEndpoint = `/freelances/${currentUser.id}/upload-profile-photo`;
        break;
      case 'client':
        uploadEndpoint = `/clients/${currentUser.id}/upload-profile-photo`;
        break;
      case 'employeur':
        uploadEndpoint = `/employeurs/${currentUser.id}/upload-profile-photo`;
        break;
      default:
        return throwError(() => new Error('Rôle utilisateur non supporté'));
    }

    // -- LA CORRECTION EST ICI --
    // Nous retirons 'responseType: 'text'' et attendons un objet JSON.
    // L'interface UploadPhotoResponse a été ajoutée pour la sécurité de type.
    return this.http.post<UploadPhotoResponse>(`${this.apiUrl}${uploadEndpoint}`, formData).pipe(
      tap(response => {
        const photoUrl = response.photoUrl; 
        this.updateCurrentUserPhoto(photoUrl);
      }),
      // Ajout de map pour retourner uniquement photoUrl
      // Importez 'map' depuis 'rxjs/operators' si ce n'est pas déjà fait
      // import { catchError, tap, map } from 'rxjs/operators';
      map((response: { photoUrl: any; }) => response.photoUrl),
      catchError(this.handleError)
    );
  }

  //  Supprimer photo de profil
  deleteProfilePhoto(): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || !currentUser?.role) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    let deleteEndpoint: string;
    switch (currentUser.role.toLowerCase()) {
      case 'freelance':
        deleteEndpoint = `/freelances/${currentUser.id}/profile-photo`;
        break;
      case 'client':
        deleteEndpoint = `/clients/${currentUser.id}/profile-photo`;
        break;
      case 'employeur':
        deleteEndpoint = `/employeurs/${currentUser.id}/profile-photo`;
        break;
      default:
        return throwError(() => new Error('Rôle utilisateur non supporté'));
    }

    return this.http.delete<void>(`${this.apiUrl}${deleteEndpoint}`).pipe(
      tap(() => {
        this.updateCurrentUserPhoto(null);
      }),
      catchError(this.handleError)
    );
  }

  //  Valider un champ (email, téléphone, etc.)
  validateField(field: string, value: any): Observable<ValidationResult> {
    const currentUser = this.authService.getCurrentUser();
    
    return this.http.post<ValidationResult>(`${this.apiUrl}/utilisateurs/validate/${field}`, { 
      value,
      userId: currentUser?.id, // Exclure l'utilisateur actuel de la validation d'unicité
      keycloakId: currentUser?.kcId
    }).pipe(
      catchError(this.handleError)
    );
  }

  //  Synchroniser les données avec Keycloak après mise à jour
  private syncWithKeycloak(profileData: Partial<UserProfile>): Observable<void> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.kcId) {
      return throwError(() => new Error('ID Keycloak manquant'));
    }

    // Synchroniser certains champs avec Keycloak (nom, prénom, email)
    const keycloakUpdateData = {
      keycloakId: currentUser.kcId,
      firstName: profileData.prenom,
      lastName: profileData.nom,
      email: profileData.email
    };

    return this.http.put<void>(`${this.apiUrl}/auth/sync-keycloak-user`, keycloakUpdateData).pipe(
      tap(() => {
      }),
      catchError((error) => {
        console.warn(' Erreur synchronisation Keycloak (non bloquante):', error);
        // Ne pas bloquer la mise à jour si la sync Keycloak échoue
        return EMPTY;
      })
    );
  }

  //  Récupérer les informations de photo de profil
  getProfilePhotoInfo(): Observable<any> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser?.id || !currentUser?.role) {
      return throwError(() => new Error('Utilisateur non connecté'));
    }

    let infoEndpoint: string;
    switch (currentUser.role.toLowerCase()) {
      case 'freelance':
        infoEndpoint = `/freelances/${currentUser.id}/profile-photo-info`;
        break;
      case 'client':
        infoEndpoint = `/clients/${currentUser.id}/profile-photo-info`;
        break;
      case 'employeur':
        infoEndpoint = `/employeurs/${currentUser.id}/profile-photo-info`;
        break;
      default:
        return throwError(() => new Error('Rôle utilisateur non supporté'));
    }

    return this.http.get(`${this.apiUrl}${infoEndpoint}`).pipe(
      catchError(this.handleError)
    );
  }

  //  Méthodes utilitaires

  private getEndpointByRole(role: string, id: number): string {
    switch (role.toLowerCase()) {
      case 'freelance':
        return `/utilisateurs/freelance/${id}`;
      case 'client':
        return `/utilisateurs/client/${id}`;
      case 'employeur':
        return `/utilisateurs/employeur/${id}`;
      default:
        throw new Error(`Rôle non supporté: ${role}`);
    }
  }

  private updateCurrentUserPhoto(photoUrl: string | null): void {
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      const updatedUser = { ...currentUser, photoProfile: photoUrl };
      this.authService.setCurrentUser(updatedUser);
      this.profileUpdated$.next(updatedUser);
    }
  }

  private handleError = (error: any): Observable<never> => {
    console.error('Erreur ProfileManagementService [status=%d]:', error.status, error.error || error.message);
    let errorMessage = 'Une erreur est survenue';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.message) {
      errorMessage = error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Données invalides';
          break;
        case 401:
          errorMessage = 'Non autorisé';
          break;
        case 403:
          errorMessage = 'Accès refusé';
          break;
        case 404:
          errorMessage = 'Ressource non trouvée';
          break;
        case 500:
          errorMessage = 'Erreur serveur';
          break;
      }
    }
    
    const err: any = new Error(errorMessage);
    err.status = error.status;
    return throwError(() => err);
  };

  //  Méthodes de validation côté client
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  isValidPhone(phone: string): boolean {
    const phoneRegex = /^(\+33|0)[1-9](?:[0-9]{8})$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  }

  isValidPassword(password: string): boolean {
    // Au moins 8 caractères, une majuscule, une minuscule, un chiffre
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return passwordRegex.test(password);
  }

  getPasswordStrength(password: string): 'weak' | 'medium' | 'strong' {
    if (password.length < 6) return 'weak';
    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) return 'medium';
    if (/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/.test(password)) return 'strong';
    return 'medium';
  }
}