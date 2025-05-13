import { APP_INITIALIZER, ApplicationConfig, PLATFORM_ID, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { KeycloakService } from 'keycloak-angular';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { environment } from '../environments/environment'; 
import { isPlatformBrowser } from '@angular/common';
import { provideAnimations } from '@angular/platform-browser/animations';
import { AuthInterceptor } from './core/interceptors/auth.interceptor';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { TokenService } from './core/servces/token.service';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { SalonDetailsComponent } from './shared/components/salon-details/salon-details.component';


// Service de configuration Keycloak
export class ConfigService {
  keycloakConfig = environment.keycloak;
}

// Fonction d'initialisation de Keycloak
function initializeKeycloak(keycloak: KeycloakService, config: ConfigService, platformId: Object) {
  return () => {
    if (isPlatformBrowser(platformId)) {
      return keycloak.init({
        config: {
          url: config.keycloakConfig.url,
          realm: config.keycloakConfig.realm,
          clientId: config.keycloakConfig.clientId
        },
        initOptions: {
           onLoad: 'check-sso',
           silentCheckSsoRedirectUri:
           window.location.origin + '/assets/silent-check-sso.html',
           checkLoginIframe: false,
           flow: 'standard'
        }
      });
    }
    return Promise.resolve();
  };
}

// Configuration principale de l'application
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptorsFromDi(), withFetch()),
    provideClientHydration(),
    provideAnimations(),
    importProvidersFrom(MatSnackBarModule),
    ConfigService,
    KeycloakService,
    TokenService,
    {
      provide: MatDialogRef,
      useValue: null
    },
    {
      provide: MAT_DIALOG_DATA,
      useValue: null
    },
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true,
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeKeycloak,
      multi: true,
      deps: [KeycloakService, ConfigService, PLATFORM_ID],
    },
  ],
};