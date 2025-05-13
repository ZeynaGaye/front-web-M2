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
    console.log('Modal de connexion ouvert');
  }

  closeLoginModal() {
    this.showLoginModal = false;
    console.log('Modal de connexion fermé');
  }

  openRegisterModal() {
    this.showRegisterModal = true;
    this.showLoginModal = false; // Assure que le modal d'inscription est fermé
    console.log("Modal d'inscription ouvert");
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    console.log("Modal d'inscription fermé");
  }

  login(): void {
    // Ouvre simplement le modal de connexion
    this.openLoginModal();
    console.log(
      "Ouverture du modal de connexion depuis le bouton S'inscrire maintenant"
    );
  }

  // Méthode pour basculer du login vers l'inscription
  switchToRegister(): void {
    this.closeLoginModal();
    this.openRegisterModal();
    console.log(
      "Basculement du modal de connexion vers le modal d'inscription"
    );
  }

  // Méthode pour basculer de l'inscription vers le login
  switchToLogin(): void {
    this.closeRegisterModal();
    this.openLoginModal();
    console.log(
      "Basculement du modal d'inscription vers le modal de connexion"
    );
  }
}
