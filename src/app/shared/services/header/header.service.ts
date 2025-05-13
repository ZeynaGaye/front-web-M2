import { Injectable, inject, PLATFORM_ID, Inject, signal } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { isPlatformBrowser } from '@angular/common';
import { RoleRedirectService } from '../../../core/services/auth/role-redirect.service';

@Injectable({
  providedIn: 'root',
})
export class HeaderService {
  private keycloakService = inject(KeycloakService);
  private roleRedirectService = inject(RoleRedirectService); // Injecter le service
  isLoggedIn = signal(false);
  username = signal('');
  userRoles = signal<string[]>([]); // Ajouter un signal pour les rôles

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.initMessageListener();
    this.checkAuthStatus();
  }

  private initMessageListener(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.addEventListener('message', async (event) => {
        if (event.origin === window.location.origin) {
          if (event.data && event.data.type === 'authentication-complete') {
            console.log('Authentification complétée dans la popup');
            await this.keycloakService.updateToken(10);
            await this.checkAuthStatus();
            this.roleRedirectService.redirectBasedOnRoles(); // Rediriger après l'authentification
          }
        }
      });
    }
  }

  async checkAuthStatus(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      const isLogged = await this.keycloakService.isLoggedIn();
      this.isLoggedIn.set(isLogged);

      if (isLogged) {
        const userProfile = await this.keycloakService.loadUserProfile();
        this.username.set(userProfile.firstName || userProfile.username || '');

        // Récupérer les rôles de l'utilisateur
        const roles = this.keycloakService.getUserRoles();
        this.userRoles.set(roles);
      } else {
        this.username.set('');
        this.userRoles.set([]);
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification de l'authentification:",
        error
      );
    }
  }

  async login(): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) return;

    try {
      // Au lieu d'utiliser une popup, essayez la redirection directe
      await this.keycloakService.login({
        redirectUri: window.location.origin + '/assets/auth-callback.html',
      });

      // Cette partie ne sera exécutée qu'après le retour de l'authentification
      await this.checkAuthStatus();
      await this.roleRedirectService.redirectBasedOnRoles();
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
    }
  }

  logout(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.keycloakService.logout(window.location.origin);
  }

  // Méthodes pour vérifier les rôles
  isClient(): boolean {
    return this.userRoles().includes('CLIENT');
  }

  isEmployeur(): boolean {
    return this.userRoles().includes('EMPLOYEUR');
  }

  isFreelance(): boolean {
    return this.userRoles().includes('FREELANCE');
  }
}
