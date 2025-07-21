import { Component, inject, OnInit } from '@angular/core';
// import { AccueilComponent } from './shared/components/accueil/accueil.component';
  import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { filter } from 'rxjs';
import { RoleRedirectService } from './core/services/auth/role-redirect.service';
import { HeaderService } from './shared/services/header/header.service';

@Component({
  selector: 'app-root',
  imports: [HeaderComponent, FooterComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private keycloakService = inject(KeycloakService);
  private roleRedirectService = inject(RoleRedirectService);
  private router = inject(Router);
  private headerService = inject(HeaderService);
  title: any;

  ngOnInit() {
    this.headerService.checkAuthStatus();

    // Vérifier l'authentification à chaque changement de route
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async () => {
        const isLoggedIn = await this.keycloakService.isLoggedIn();

        // Si on est sur la page d'accueil et que l'utilisateur est connecté, rediriger selon le rôle
        if (isLoggedIn && this.router.url === '/accueil') {
          console.log(
            "Utilisateur connecté sur la page d'accueil, redirection selon le rôle"
          );
          await this.roleRedirectService.redirectBasedOnRoles();
        }
      });
  }
}
