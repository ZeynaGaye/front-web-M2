import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

import { PortfolioItem } from '../../models/PortfolioItem';
import { AuthService } from '../../core/servces/auth.service';

/**
 * Service pour gérer les autorisations et l'authentification liées au portfolio
 */
@Injectable({
  providedIn: 'root'
})
export class PortfolioAuthManagerService {
  private apiUrl = environment.apiUrl;

  constructor(
    private authService: AuthService,
    private http: HttpClient
  ) {}

  /**
   * Vérifie si l'utilisateur connecté est le propriétaire du freelance donné
   * @param freelanceId ID du freelance à vérifier
   */
  isOwnerOfPortfolio(freelanceId: number): boolean {
    const currentUser = this.authService.getCurrentUser();
    
    // Si l'utilisateur n'est pas connecté, il n'est pas propriétaire
    if (!currentUser) {
      console.log('Utilisateur non connecté, donc non propriétaire');
      return false;
    }
    
    // Si l'utilisateur n'est pas un freelance, il n'est pas propriétaire
    if (currentUser.role !== 'FREELANCE') {
      console.log('Utilisateur non freelance, donc non propriétaire');
      return false;
    }
    
    // Vérifier si l'ID de l'utilisateur correspond à l'ID du freelance
    const isOwner = currentUser.id === freelanceId;
    console.log(`Vérification propriétaire: ${currentUser.id} === ${freelanceId} = ${isOwner}`);
    return isOwner;
  }

  /**
   * Détermine si un objet portfolio appartient à l'utilisateur connecté
   * @param item L'élément du portfolio à vérifier
   */
  isPortfolioItemOwner(item: PortfolioItem): boolean {
    if (!item || !item.freelanceId) {
      return false;
    }
    
    return this.isOwnerOfPortfolio(item.freelanceId);
  }

  /**
   * Vérifie si l'utilisateur est authentifié
   */
  isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  /**
   * Vérifie si l'utilisateur connecté est un freelance
   */
  isFreelance(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser && currentUser.role === 'FREELANCE';
  }

  /**
   * Vérifie si l'utilisateur connecté est un client
   */
  isClient(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser && currentUser.role === 'CLIENT';
  }

  /**
   * Vérifie si l'utilisateur connecté est un employeur
   */
  isEmployeur(): boolean {
    const currentUser = this.authService.getCurrentUser();
    return currentUser && currentUser.role === 'EMPLOYEUR';
  }

  /**
   * Obtient l'ID de l'utilisateur connecté
   */
  getCurrentUserId(): number | null {
    const currentUser = this.authService.getCurrentUser();
    return currentUser ? currentUser.id : null;
  }

  /**
   * Obtient les informations de l'utilisateur connecté
   */
  getCurrentUser(): any {
    return this.authService.getCurrentUser();
  }

  /**
   * Obtient les en-têtes d'authentification pour les requêtes API
   */
  getAuthHeaders(): HttpHeaders {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && currentUser.accesToken) {
      return new HttpHeaders({
        'Authorization': `Bearer ${currentUser.accesToken}`
      });
    }
    
    return new HttpHeaders();
  }

  /**
   * Redirige l'utilisateur vers la page de connexion avec un retour à l'URL spécifiée
   * @param returnUrl URL de retour après connexion
   */
  // redirectToLogin(returnUrl: string): void {
  //   this.authService.redirectToLogin(returnUrl);
  // }

  /**
   * Détermine les items likés par l'utilisateur
   * @param likedItemIds IDs des items likés
   */
  updateUserLikes(likedItemIds: number[]): Set<number> {
    const likes = new Set<number>();
    likedItemIds.forEach(id => likes.add(id));
    return likes;
  }
}