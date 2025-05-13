// src/app/core/guards/auth.guard.ts
import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { KeycloakService } from 'keycloak-angular';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { AuthService } from '../servces/auth.service';
import { RoleRedirectService } from '../services/auth/role-redirect.service';

export const authGuard: CanActivateFn = async (route, state) => {
  const keycloakService = inject(KeycloakService);
  const customAuthService = inject(AuthService);
  const router = inject(Router);
  const roleRedirectService = inject(RoleRedirectService);
  const platformId = inject(PLATFORM_ID);

  if (!isPlatformBrowser(platformId)) {
    console.log('SSR : Accès autorisé');
    return true;
  }

  // Vérifier d'abord si l'utilisateur est authentifié via notre service personnalisé
  if (customAuthService.isAuthenticated()) {
    console.log('Utilisateur authentifié via service personnalisé');

    const currentUser = customAuthService.getCurrentUser();
    if (currentUser && currentUser.role) {
      const userRoles = [currentUser.role];
      console.log("Rôles de l'utilisateur:", userRoles);

      const requiredRoles = route.data['roles'];

      if (!requiredRoles || requiredRoles.length === 0) {
        console.log('Aucun rôle requis, accès autorisé');
        return true;
      }

      const hasRequiredRoles = requiredRoles.every((role: string) =>
        userRoles.includes(role)
      );

      if (hasRequiredRoles) {
        console.log('Utilisateur a les rôles requis');
        return true;
      }

      console.log(
        "Utilisateur n'a pas les rôles requis, redirection en fonction du rôle"
      );
      const redirectUrl =
        roleRedirectService.getRedirectUrlForRole(userRoles) || '/accueil';
      return router.parseUrl(redirectUrl);
    }
  }

  // Sinon, vérifier via Keycloak
  const isLoggedIn = await keycloakService.isLoggedIn();
  if (!isLoggedIn) {
    // Au lieu de rediriger vers Keycloak, rediriger vers notre page de connexion
    console.log(
      'Utilisateur non authentifié, redirection vers notre page de connexion'
    );
    return router.parseUrl('/login');
  }

  console.log(
    'Utilisateur authentifié via Keycloak, récupération des rôles...'
  );

  // Attendre que Keycloak ait bien récupéré le token
  await keycloakService.loadUserProfile();

  const requiredRoles = route.data['roles'];
  console.log('Rôles requis pour la route:', requiredRoles);

  if (!requiredRoles || requiredRoles.length === 0) {
    console.log('Aucun rôle requis, accès autorisé');
    return true;
  }

  const userRoles = keycloakService.getUserRoles();
  console.log("Rôles de l'utilisateur:", userRoles);

  const hasRequiredRoles = requiredRoles.every((role: string) =>
    userRoles.includes(role)
  );

  if (hasRequiredRoles) {
    console.log('Utilisateur a les rôles requis');
    return true;
  }

  console.log(
    "Utilisateur n'a pas les rôles requis, redirection en fonction du rôle"
  );
  const redirectUrl =
    roleRedirectService.getRedirectUrlForRole(userRoles) || '/home';
  return router.parseUrl(redirectUrl);
};
