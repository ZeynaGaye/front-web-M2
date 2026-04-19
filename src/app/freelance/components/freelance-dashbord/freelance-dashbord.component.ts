import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { RegisterComponent } from '../../../shared/components/register/register.component';
import { SalonService } from '../../../shared/services/salons/salons.service';
import { RoleRedirectService } from '../../../core/services/auth/role-redirect.service';
import { HeaderService } from '../../../shared/services/header/header.service';
import { AuthentComponent } from '../../../shared/components/authent/authent.component';

@Component({
  selector: 'app-freelance-dashbord',
  standalone: true,
  imports: [
    RouterModule,
    CommonModule,
    FormsModule,
    RegisterComponent,
    AuthentComponent,
  ],
  templateUrl: './freelance-dashbord.component.html',
  styleUrl: './freelance-dashbord.component.scss',
})
export class FreelanceDashbordComponent {
  showLoginModal: boolean = false;
  showRegisterModal: boolean = false;

  public headerService = inject(HeaderService);
  private roleRedirectService = inject(RoleRedirectService);

  constructor(private salonService: SalonService) {}

  get isLoggedIn() {
    return this.headerService.isLoggedIn();
  }

  openLoginModal() {
    this.showLoginModal = true;
    this.showRegisterModal = false; // Assure que le modal d'inscription est fermé

  }

  closeLoginModal() {
    this.showLoginModal = false;

  }

  openRegisterModal() {
    this.showRegisterModal = true;
    this.showLoginModal = false; // Assure que le modal d'inscription est fermé

  }

  closeRegisterModal() {
    this.showRegisterModal = false;

  }

  login(): void {
    // Ouvre simplement le modal de connexion
    this.openLoginModal();

  }

  // Méthode pour basculer du login vers l'inscription
  switchToRegister(): void {
    this.closeLoginModal();
    this.openRegisterModal();

  }

  // Méthode pour basculer de l'inscription vers le login
  switchToLogin(): void {
    this.closeRegisterModal();
    this.openLoginModal();

  }
}
