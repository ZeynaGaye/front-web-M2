import { Injectable, inject, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, throwError, from, of } from 'rxjs';
import { catchError, tap, switchMap, share } from 'rxjs/operators';
import { KeycloakService } from 'keycloak-angular';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

import { environment } from '../../../environments/environment';
import { RoleRedirectService } from '../services/auth/role-redirect.service';
import { AuthUIService } from '../../shared/services/authUI/auth-ui.service';
import { UserProfile } from '../../shared/services/profile/profile-management.service';

export interface LoginCredentials {
  email: string;
  password: string; 
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
  setCurrentUser(updatedProfile: UserProfile): void {
    this.currentUserSubject.next(updatedProfile);
    if (this.isBrowser) {
      localStorage.setItem('currentUser', JSON.stringify(updatedProfile));
    }
  }
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
  
  //  NOUVELLES PROPRIÉTÉS pour éviter les appels multiples
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    

    
    // Charger l'utilisateur depuis le localStorage au démarrage (uniquement côté navigateur)
    if (this.isBrowser) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          this.currentUserSubject.next(user);
          this.setupRefreshTokenTimer(user);

        } catch (error) {
          console.error(' Error parsing stored user data:', error);
          // Nettoyer les données corrompues
          localStorage.removeItem('currentUser');
        }
      }
    }
  }

  login(credentials: LoginCredentials): Observable<any> {

    
    return this.http
      .post<AuthResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap((response) => {


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
          console.error(" Erreur d'authentification:", error);
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

    
    // Nettoyer le localStorage
    this.clearLocalStorage();
    
    // Rediriger l'utilisateur
    this.router.navigate(['/accueil']);
    

    
    // Retourner un Observable de succès
    return of({ message: 'Déconnexion réussie' });
  }

  private clearLocalStorage(): void {
    if (this.isBrowser) {

      
      // Liste de toutes les clés à supprimer
      const keysToRemove = [
        'currentUser',
        'auth_token',
        'refresh_token',
        'user_role',
        'user_id',
        'beautyHubSearchParams'
      ];
      
      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
      });
    }
    
    this.currentUserSubject.next(null);
    this.clearRefreshTokenTimer();
    
    //  Réinitialiser les flags de rafraîchissement
    this.isRefreshing = false;
    this.refreshTokenSubject.next(null);
  }

  //  MÉTHODE CORRIGÉE avec protection contre les appels multiples
  refreshToken(): Observable<any> {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) {
      console.error(' No current user found for token refresh');
      return throwError(() => new Error("Pas d'utilisateur connecté"));
    }

    //  Si un rafraîchissement est déjà en cours, retourner l'Observable existant
    if (this.isRefreshing) {

      return this.refreshTokenSubject.asObservable().pipe(
        switchMap((token) => {
          if (token) {
            return of(token);
          }
          return throwError(() => new Error('Token refresh failed'));
        })
      );
    }


    this.isRefreshing = true;

    return this.http
      .post<AuthResponse>(`${this.apiUrl}/refresh-token`, {
        refreshToken: currentUser.refreshToken,
      })
      .pipe(
        share(), //  Partager l'Observable pour éviter les appels multiples
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
          
          //  Notifier les observateurs en attente
          this.refreshTokenSubject.next(response);
          this.isRefreshing = false;
        }),
        catchError((error) => {
          console.error(' Erreur lors du rafraîchissement du token:', error);

          
          //  Réinitialiser les flags en cas d'erreur
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          
          this.logout();
          return throwError(() => error);
        })
      );
  }

  isAuthenticated(): boolean {
    const isAuth = !!this.currentUserSubject.value;
    return isAuth;
  }

  getCurrentUser(): any {
    return this.currentUserSubject.value;
  }

  redirectToAppropriateHomePage(): void {
    const currentUser = this.currentUserSubject.value;
    if (currentUser && currentUser.role) {
      const userRoles = [currentUser.role.toString()];


      const redirectUrl =
        this.roleRedirectService.getRedirectUrlForRole(userRoles);
      this.router.navigate([redirectUrl]);
    } else {

      this.router.navigate(['/accueil']);
    }
  }

  //  MÉTHODES MODALES CORRIGÉES - Avec logging et protection
  triggerLoginModal() {
    if (!this.isBrowser) {
      return;
    }
    
    //  Vérifier si l'utilisateur n'est pas déjà connecté
    if (this.isAuthenticated()) {
      return;
    }
    
    this.authUIService.triggerLoginModal();
  }

  triggerRegisterModal() {
    if (!this.isBrowser) {
      return;
    }
    
    //  Vérifier si l'utilisateur n'est pas déjà connecté
    if (this.isAuthenticated()) {
      return;
    }
    
    // Vérifier si le service a cette méthode
    if (this.authUIService.triggerRegisterModal) {
      this.authUIService.triggerRegisterModal();
    } else {
      // Fallback: ouvrir le modal de connexion avec un flag pour l'inscription
      if (this.isBrowser) {
        sessionStorage.setItem('preferRegister', 'true');
      }
      this.authUIService.triggerLoginModal();
    }
  }

  //  MÉTHODE UTILITAIRE: Vérifier si on doit afficher les modals d'auth
  shouldShowAuthModals(): boolean {
    return !this.isAuthenticated();
  }

  // Initialise Keycloak avec les tokens obtenus via l'API
  private initKeycloakWithToken(
    accessToken: string,
    refreshToken: string
  ): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      // Accéder à l'instance Keycloak directement
      const keycloakInstance = this.keycloakService.getKeycloakInstance();

      if (keycloakInstance) {
        try {
          // Définir manuellement les tokens sur l'instance Keycloak
          keycloakInstance.token = accessToken;
          keycloakInstance.refreshToken = refreshToken;
          keycloakInstance.authenticated = true;

          // Mettre à jour le tokenParsed à partir du JWT
          keycloakInstance.tokenParsed = this.parseJwtToken(accessToken);
          keycloakInstance.refreshTokenParsed = this.parseJwtToken(refreshToken);
          
          resolve(true);
        } catch (e) {
          console.error(' Erreur lors du parsing des tokens:', e);
          resolve(false);
        }
      } else {
        console.error(" Impossible d'accéder à l'instance Keycloak");
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
      console.error(' Erreur lors du parsing du token JWT:', error);
      throw new Error('Token JWT invalide');
    }
  }

  //  MÉTHODE CORRIGÉE avec timing plus approprié
  private setupRefreshTokenTimer(user: any): void {
    // Effacer tout timer existant
    this.clearRefreshTokenTimer();

    // Calculer l'expiration à partir du token JWT
    try {
      const jwtToken = this.parseJwtToken(user.accesToken);
      const expiresAt = jwtToken.exp * 1000; // Convertir en millisecondes
      const now = Date.now();
      
      //  Rafraîchir 2 minutes avant expiration (au lieu de 5)
      const refreshBufferMs = 2 * 60 * 1000; // 2 minutes
      const timeout = expiresAt - now - refreshBufferMs;





      if (timeout > 0) {
        this.refreshTokenTimeout = setTimeout(() => {

          this.refreshToken().subscribe({
            next: () => {

            },
            error: (error) => {
              console.error(' Automatic token refresh failed:', error);
            }
          });
        }, timeout);
      } else {
        console.warn(' Token déjà expiré ou expire très bientôt, rafraîchissement immédiat');
        //  Ajouter un délai pour éviter la boucle immédiate
        setTimeout(() => {
          this.refreshToken().subscribe();
        }, 1000); // Attendre 1 seconde
      }
    } catch (e) {
      console.error(
        ' Erreur lors de la configuration du timer de rafraîchissement:',
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

  //  MÉTHODE UTILITAIRE pour débugger les problèmes de token
  debugTokenInfo(): void {
    const user = this.currentUserSubject.value;
    if (!user) {

      return;
    }

    try {
      const jwtToken = this.parseJwtToken(user.accesToken);
      const expiresAt = jwtToken.exp * 1000;
      const now = Date.now();
      const timeLeft = expiresAt - now;

      //
      //
      //
      //
      //
      //
      //
    } catch (e) {
      console.error(' Error debugging token:', e);
    }
  }
}