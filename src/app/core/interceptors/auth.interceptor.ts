
  import { Injectable } from '@angular/core';
  import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
  import { KeycloakService } from 'keycloak-angular';
  import { Observable, from, throwError } from 'rxjs';
  import { mergeMap, catchError } from 'rxjs/operators';
  import { TokenService } from '../servces/token.service';



  @Injectable()
  export class AuthInterceptor implements HttpInterceptor {
    constructor(
      private keycloakService: KeycloakService,
      private tokenService: TokenService 
    ) {}

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      const token = this.tokenService.getToken();
      
      if (token) {
        // Utiliser le token de notre service
        request = this.addToken(request, token);
        return next.handle(request);
      } else {
        // Fallback sur Keycloak
        return from(this.keycloakService.getToken()).pipe(
          mergeMap(keycloakToken => {
            if (keycloakToken) {
              request = this.addToken(request, keycloakToken);
            }
            return next.handle(request);
          })
        );
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