// src/app/core/services/auth/role-redirect.service.ts
import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';

@Injectable({
  providedIn: 'root'
})
export class RoleRedirectService {
  private keycloakService = inject(KeycloakService);
  private router = inject(Router);

  /**
   * Redirige l'utilisateur en fonction de ses rôles
   * @returns Une promesse qui se résout lorsque la redirection est terminée
   */
  async redirectBasedOnRoles(): Promise<void> {
    try {
      // Attendre que Keycloak ait bien chargé les informations utilisateur
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const isLoggedIn = await this.keycloakService.isLoggedIn();

      
      if (!isLoggedIn) {

        return;
      }
  
      // Tenter de rafraîchir le token pour s'assurer d'avoir les informations à jour
      try {
        await this.keycloakService.updateToken(30);
      } catch (error) {
        console.warn('Erreur de rafraîchissement du token, utilisation du token actuel.');
      }
      
      const userRoles = this.keycloakService.getUserRoles(true);

      
      const redirectUrl = this.getRedirectUrlForRole(userRoles);

      
      // Ne rediriger que si on n'est pas déjà sur cette URL
      if (redirectUrl && this.router.url !== redirectUrl) {
        await this.router.navigate([redirectUrl]);
      }
    } catch (error) {
      console.error('Erreur lors de la redirection:', error);
    }
  }

  /**
   * Retourne l'URL de redirection en fonction des rôles de l'utilisateur
   * @param userRoles Liste des rôles de l'utilisateur
   * @returns L'URL de redirection appropriée
   */
  getRedirectUrlForRole(userRoles: string[]): string {
    // Utilisation d'un Set pour optimiser la vérification des rôles
    const rolesSet = new Set(userRoles);

    if (rolesSet.has('FREELANCE')) {
      return '/home-freelance';
    } else if (rolesSet.has('CLIENT')) {
      return '/home-client';
    } else if (rolesSet.has('EMPLOYEUR')) {
      return '/home-employee';
    } else {

      console.warn('Aucun rôle correspondant, redirection vers /accueil');
      return '/accueil';
    }
  }

  /**
   * Vérifie si l'utilisateur a au moins un des rôles spécifiés
   * @param requiredRoles Liste des rôles à vérifier
   * @returns true si l'utilisateur a au moins un des rôles, false sinon
   */
  hasAnyRole(requiredRoles: string[]): boolean {
    const userRoles = new Set(this.keycloakService.getUserRoles(true)); // Utilisation d'un Set pour optimisation
    return requiredRoles.some(role => userRoles.has(role));
  }

  /**
   * Vérifie si l'utilisateur a tous les rôles spécifiés
   * @param requiredRoles Liste des rôles à vérifier
   * @returns true si l'utilisateur a tous les rôles, false sinon
   */
  hasAllRoles(requiredRoles: string[]): boolean {
    const userRoles = new Set(this.keycloakService.getUserRoles(true));
    return requiredRoles.every(role => userRoles.has(role));
  }
}