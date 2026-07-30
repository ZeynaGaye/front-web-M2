import { Injectable, Optional } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { KeycloakService } from 'keycloak-angular';
import { Observable, from, throwError, of, BehaviorSubject } from 'rxjs';
import { mergeMap, catchError, switchMap, filter, take, timeout } from 'rxjs/operators';
import { TokenService } from '../servces/token.service';
import { AuthService } from '../servces/auth.service';


@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  //  Protection contre les refresh multiples
  private isRefreshing = false;
  private refreshTokenSubject = new BehaviorSubject<any>(null);

  constructor(
    private keycloakService: KeycloakService,
    private tokenService: TokenService,
    @Optional() private authService: AuthService //  Injection optionnelle via @Optional()
  ) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    
    //  Vérifier si l'endpoint est public (avec méthode HTTP)
    if (this.isPublicEndpoint(request.url, request.method)) {

      return next.handle(request);
    }



    //  PRIORITÉ 1: AuthService (si disponible)
    if (this.authService) {
      const currentUser = this.authService.getCurrentUser();
      if (currentUser && currentUser.accesToken) {

        request = this.addToken(request, currentUser.accesToken);
        
        return next.handle(request).pipe(
          catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {

              return this.handle401ErrorWithAuthService(request, next);
            }
            return throwError(() => error);
          })
        );
      }
    }

    //  PRIORITÉ 2: TokenService
    const token = this.tokenService.getToken();
    if (token) {

      request = this.addToken(request, token);
      return next.handle(request);
    }

    //  PRIORITÉ 3: Keycloak (dernier recours)

    
    if (!this.isKeycloakReady()) {
      return next.handle(request);
    }
    
    return from(this.getKeycloakTokenSafely()).pipe(
      mergeMap(keycloakToken => {
        if (keycloakToken) {

          request = this.addToken(request, keycloakToken);
        } else {
          console.warn(' Aucun token disponible pour:', request.url);
        }
        return next.handle(request);
      }),
      catchError(error => {
        console.warn(' Erreur récupération token Keycloak:', error);
        return next.handle(request);
      })
    );
  }

  //  MÉTHODE CORRIGÉE: Gestion des erreurs 401 avec AuthService
  private handle401ErrorWithAuthService(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!this.authService) {
      console.error(' AuthService not available for token refresh');
      return throwError(() => new Error('AuthService not available'));
    }

    if (!this.isRefreshing) {
      this.isRefreshing = true;
      this.refreshTokenSubject.next(null);



      return this.authService.refreshToken().pipe(
        switchMap((response: any) => {
          this.isRefreshing = false;
          
          const newUser = this.authService!.getCurrentUser();
          if (newUser && newUser.accesToken) {
            this.refreshTokenSubject.next(newUser.accesToken);
            

            const newAuthReq = this.addToken(request, newUser.accesToken);
            return next.handle(newAuthReq);
          }
          
          return throwError(() => new Error('No token after refresh'));
        }),
        catchError((error) => {
          console.error(' Token refresh failed in interceptor:', error);
          this.isRefreshing = false;
          this.refreshTokenSubject.next(null);
          return throwError(() => error);
        })
      );
    } else {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1),
        timeout(10000),
        switchMap((token) => {
          const newAuthReq = this.addToken(request, token);
          return next.handle(newAuthReq);
        }),
        catchError(() => throwError(() => new Error('Session expirée — veuillez vous reconnecter')))
      );
    }
  }

  //  MÉTHODE CORRIGÉE: Distinction entre méthodes HTTP
  private isPublicEndpoint(url: string, method: string): boolean {

    
    //  Extraire le path de l'URL complète
    let path: string;
    try {
      if (url.startsWith('http')) {
        const urlObj = new URL(url);
        path = urlObj.pathname;
      } else {
        path = url;
      }
    } catch (error) {
      path = url;
    }
    

    
    const isPublic = (
      //  Auth endpoints (toujours publics)
      path.includes('/api/auth/') ||
      
      //  Salons accessibles publiquement (GET uniquement)
      (method === 'GET' && path.includes('/api/salons') && (
        path.includes('/by-service') ||
        path.includes('/all') ||
        path.includes('/recommendations') ||
        path.includes('/search') ||
        path.includes('/nearby')
      )) ||

      //  Freelances search accessible publiquement (GET uniquement)
      (method === 'GET' && path.includes('/api/freelances/search')) ||

      //  CORRECTION PRINCIPALE: Services en lecture seule (GET uniquement)
      (method === 'GET' && path.includes('/api/services/') && !path.includes('/api/service-freelance')) ||

      //  Portfolio public (GET uniquement)
      (method === 'GET' && this.isPublicPortfolioEndpoint(path)) ||

      //  Offres consultables (GET uniquement)
      (method === 'GET' && (
        path === '/api/offres-emplois/all' ||
        path.includes('/api/offres-emplois/all')
      )) ||

      //  Disponibilités publiques (GET uniquement)
      (method === 'GET' && path.includes('/api/disponibilites/')) ||

      //  Réservation (POST autorisé)
  

      //  Fichiers statiques (toujours publics)
      path.includes('/uploads/') ||
      path.includes('/assets/') ||
      path.includes('.jpg') || path.includes('.png') || 
      path.includes('.css') || path.includes('.js')
    );
    
    //  VÉRIFICATION SPÉCIALE: Services avec logging détaillé
    if (path.includes('/api/services/')) {
      if (method === 'GET') {

      } else if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {

      }
    }
    
    //  service-freelance est TOUJOURS protégé
    if (path.includes('/api/service-freelance')) {

      return false;
    }
    

    return isPublic;
  }

  //  MÉTHODE CORRIGÉE: Portfolio avec GET uniquement
  private isPublicPortfolioEndpoint(path: string): boolean {
    const publicPortfolioPatterns = [
      /^\/api\/portfolio\/freelance\/\d+$/,
      /^\/api\/portfolio\/freelance\/\d+\/images$/,
      /^\/api\/portfolio\/freelance\/\d+\/stats$/,
      /^\/api\/portfolio\/images\//,
      /^\/api\/portfolio\/public\//,
      /^\/api\/portfolio\/all$/,
      /^\/api\/portfolio\/debug/
    ];

    const isPublicPortfolio = publicPortfolioPatterns.some(pattern => pattern.test(path));
    
    if (isPublicPortfolio) {

      return true;
    }


    return false;
  }

  private isKeycloakReady(): boolean {
    try {
      const keycloakInstance = this.keycloakService.getKeycloakInstance();
      if (!keycloakInstance) {
          return false;
      }

      const isLoggedIn = this.keycloakService.isLoggedIn();
      if (!isLoggedIn) {

        return false;
      }

      return true;
    } catch (error) {
      console.error(' Erreur lors de la vérification de l\'état Keycloak:', error);
      return false;
    }
  }

  private async getKeycloakTokenSafely(): Promise<string | null> {
    try {
      try {
        const token = await this.keycloakService.getToken();
        if (token && typeof token === 'string' && token.length > 0) {
          return token;
        }
      } catch (getTokenError) {
        console.warn(' Erreur avec getToken(), essai avec l\'instance directe:', getTokenError);
      }

      const keycloakInstance = this.keycloakService.getKeycloakInstance();
      if (keycloakInstance && keycloakInstance.token) {

        return keycloakInstance.token;
      }

      if (keycloakInstance && this.keycloakService.isTokenExpired()) {

        try {
          const refreshed = await this.keycloakService.updateToken(30);
          if (refreshed && keycloakInstance.token) {

            return keycloakInstance.token;
          }
        } catch (refreshError) {
          console.error(' Échec du rafraîchissement:', refreshError);
        }
      }

      console.warn(' Aucun token valide trouvé dans Keycloak');
      return null;

    } catch (error) {
      console.error(' Erreur lors de la récupération sécurisée du token:', error);
      return null;
    }
  }

  private addToken(request: HttpRequest<any>, token: string): HttpRequest<any> {

    return request.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
}