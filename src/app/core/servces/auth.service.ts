import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, from } from 'rxjs';
import { catchError, tap, switchMap } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { RoleRedirectService } from '../services/auth/role-redirect.service';
import { AuthUIService } from '../../shared/services/authUI/auth-ui.service';

export interface LoginCredentials {
  email: string; // IMPORTANT: Utiliser "password" et non "motDePasse" pour le backend
}

export interface AuthResponse {
  id: number;
  email: string;
  nom: string;
  prenom: string;
  role: string;
  accesToken: string;
  refreshToken: string;
  expiresIn: string;
  
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  // Injection des dépendances
  private http = inject(HttpClient);
  private keycloakService = inject(KeycloakService);
  private router = inject(Router);
  private roleRedirectService = inject(RoleRedirectService);
  private isBrowser: boolean;
  private authUIService = inject(AuthUIService);

  private apiUrl = `${environment.apiUrl}/auth`;
  private currentUserSubject = new BehaviorSubject<any>(null);
  private refreshTokenTimeout: any;

  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Charger l'utilisateur depuis le localStorage au démarrage (uniquement côté navigateur)
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
        this.setupRefreshTokenTimer(user);
      }
    }
  }

  login(credentials: LoginCredentials): Observable<any> {
    console.log('Tentative de connexion avec:', credentials);
    
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {
          console.log('Authentification réussie via API:', response);

          if (!response || !response.accesToken) {
            throw new Error('Token non reçu dans la réponse');
          }

          // Stocker les informations de l'utilisateur et le token (uniquement côté navigateur)
          if (this.isBrowser) {
            localStorage.setItem('currentUser', JSON.stringify(response));
          }
          
          this.currentUserSubject.next(response);

          // Configurer le timer de rafraîchissement de token
          this.setupRefreshTokenTimer(response);

          // Initialiser Keycloak avec le token obtenu
          return this.initKeycloakWithToken(
            response.accesToken,
            response.refreshToken
          );
        }),
        catchError((error) => {
          console.error("Erreur d'authentification:", error);
          return throwError(
            () =>
              error.error?.message || 
              error.message || 
              'Échec de la connexion. Veuillez vérifier vos identifiants.'
          );
        })
      );
  }

  logout(): Observable<any> {
    // Supprimer les informations d'utilisateur du stockage local (uniquement côté navigateur)
    if (this.isBrowser) {
      localStorage.removeItem('currentUser');
    }
    
    this.currentUserSubject.next(null);
    this.clearRefreshTokenTimer();

    // Déconnexion de Keycloak
    return from(
      this.keycloakService.logout(window.location.origin + '/login')
    ).pipe(
      tap(() => {
        this.router.navigate(['/login']);
      })
    );
  }

  refreshToken(): Observable<any> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      return throwError(() => new Error("Pas d'utilisateur connecté"));
    }

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, {
        refreshToken: currentUser.refreshToken,
      })
      .pipe(
        tap((response) => {
          // Mettre à jour l'utilisateur avec les nouveaux tokens
          const updatedUser = {
            ...currentUser,
            accesToken: response.accesToken,
            refreshToken: response.refreshToken,
          };

          // Mise à jour dans localStorage (uniquement côté navigateur)
          if (this.isBrowser) {
            localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          }
          
          this.currentUserSubject.next(updatedUser);

          // Mettre à jour Keycloak avec le nouveau token
          this.initKeycloakWithToken(
            response.accesToken,
            response.refreshToken
          );

          // Réinitialiser le timer de rafraîchissement
          this.setupRefreshTokenTimer(updatedUser);
        }),
        catchError((error) => {
          console.error('Erreur lors du rafraîchissement du token:', error);
          this.logout();
          return throwError(() => error);
        })
      );
  }

  isAuthenticated(): boolean {
    return !!this.currentUserSubject.value;
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  redirectToAppropriateHomePage(): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser && currentUser.role) {
      const userRoles = [currentUser.role.toString()];
      console.log('Redirection basée sur le rôle:', userRoles);

      const redirectUrl =
        this.roleRedirectService.getRedirectUrlForRole(userRoles);
      this.router.navigate([redirectUrl]);
    } else {
      this.router.navigate(['/accueil']);
    }
  }

  // Initialise Keycloak avec les tokens obtenus via l'API
  private initKeycloakWithToken(
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Accéder à l'instance Keycloak directement
      const keycloakInstance = (this.keycloakService as any).instance;

      if (keycloakInstance) {
        // Définir manuellement les tokens sur l'instance Keycloak
        keycloakInstance.token = accessToken;
        keycloakInstance.refreshToken = refreshToken;
        keycloakInstance.authenticated = true;

        // Mettre à jour le tokenParsed à partir du JWT
        try {
          keycloakInstance.tokenParsed = this.parseJwtToken(accessToken);
          keycloakInstance.refreshTokenParsed = this.parseJwtToken(refreshToken);
          console.log('Keycloak initialisé avec tokens obtenus via API');
          resolve(true);
        } catch (e) {
          console.error('Erreur lors du parsing des tokens:', e);
          resolve(false);
        }
      } else {
        console.error("Impossible d'accéder à l'instance Keycloak");
        resolve(false);
      }
    });
  }

  // Parse un token JWT pour extraire ses données
  private parseJwtToken(token: string): any {
    if (!token) {
      throw new Error('Token invalide');
    }
    
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      // Cette partie doit être modifiée pour l'exécution SSR
      let jsonPayload: string;
      
      if (this.isBrowser) {
        // Exécution dans le navigateur
        jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
      } else {
        // Exécution côté serveur
        const buffer = Buffer.from(base64, 'base64');
        jsonPayload = buffer.toString('utf-8');
      }
      
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Erreur lors du parsing du token JWT:', error);
      throw new Error('Token JWT invalide');
    }
  }

  private setupRefreshTokenTimer(user: any): void {
    // Effacer tout timer existant
    this.clearRefreshTokenTimer();

    // Calculer l'expiration à partir du token JWT
    try {
      const jwtToken = this.parseJwtToken(user.accesToken);
      const expiresAt = jwtToken.exp * 1000; // Convertir en millisecondes
      const timeout = expiresAt - Date.now() - 60 * 1000; // Rafraîchir 1 minute avant expiration

      if (timeout > 0) {
        this.refreshTokenTimeout = setTimeout(() => {
          console.log('Rafraîchissement automatique du token');
          this.refreshToken().subscribe();
        }, timeout);
      } else {
        console.warn('Token déjà expiré, rafraîchissement immédiat');
        this.refreshToken().subscribe();
      }
    } catch (e) {
      console.error(
        'Erreur lors de la configuration du timer de rafraîchissement:',
        e
      );
    }
  }

  private clearRefreshTokenTimer(): void {
    if (this.refreshTokenTimeout) {
      clearTimeout(this.refreshTokenTimeout);
      this.refreshTokenTimeout = null;
    }
  }

  triggerLoginModal() {
  if (this.isBrowser) {
    this.authUIService.triggerLoginModal();
  }
}
}