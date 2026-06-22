import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/servces/auth.service';

@Component({
  selector: 'app-salon-registration',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './salon-registration.component.html',
  styleUrls: ['./salon-registration.component.scss']
})
export class SalonRegistrationComponent {

  private isBrowser: boolean;

  constructor(
    @Inject(PLATFORM_ID) platformId: Object,
    private router: Router,
    private authService: AuthService
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  startJourney(): void {
    if (this.isLoggedIn) {
      this.router.navigate(['/home-employee']);
    } else {
      if (this.isBrowser) {
        sessionStorage.setItem('redirectAfterLogin', '/home-employee');
        sessionStorage.setItem('userType', 'employeur');
      }
      this.authService.triggerLoginModal();
    }
  }
}