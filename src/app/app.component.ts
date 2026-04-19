import { Component, inject, OnInit } from '@angular/core';
import { HeaderComponent } from './shared/components/header/header.component';
import { FooterComponent } from './shared/components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { KeycloakService } from 'keycloak-angular';
import { filter } from 'rxjs';
import { RoleRedirectService } from './core/services/auth/role-redirect.service';
import { HeaderService } from './shared/services/header/header.service';

// Routes qui ont leur propre layout complet (pas de header/footer global)
const FULLSCREEN_ROUTES = [
  '/client-dashboard',
  '/freelance-dashboard',
  '/home-freelance',
  '/home-employee',
  '/dashboard',
];

@Component({
  selector: 'app-root',
  imports: [CommonModule, FooterComponent, RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  private keycloakService = inject(KeycloakService);
  private roleRedirectService = inject(RoleRedirectService);
  private router = inject(Router);
  private headerService = inject(HeaderService);
  title: any;
  showFooter = true;

  ngOnInit() {
    this.headerService.checkAuthStatus();

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(async (event: any) => {
        // Cacher le footer sur les pages avec layout complet
        this.showFooter = !FULLSCREEN_ROUTES.some(r => event.url?.startsWith(r));

        const isLoggedIn = await this.keycloakService.isLoggedIn();
        if (isLoggedIn && this.router.url === '/accueil') {
          await this.roleRedirectService.redirectBasedOnRoles();
        }
      });
  }
}
