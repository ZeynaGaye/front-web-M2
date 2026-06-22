import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef, Inject, PLATFORM_ID, HostListener } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthentComponent } from '../../../shared/components/authent/authent.component';
import { RegisterComponent } from '../../../shared/components/register/register.component';
import { AuthUIService } from '../../services/authUI/auth-ui.service';
import { AuthService } from '../../../core/servces/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ContactComponent } from '../../components/contact/contact.component';


@Component({
  selector: 'app-navigation',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatDialogModule
  ],
 templateUrl: './nav-bar.component.html',

  styleUrls: ['./nav-bar.component.scss']
})
export class NavBarComponent  implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private router = inject(Router);
  private dialog = inject(MatDialog);
  private authService = inject(AuthService);
  private authUIService = inject(AuthUIService);
  private snackBar = inject(MatSnackBar);
  
  isMobileMenuOpen = false;
  isProfileMenuOpen = false;
  isLoggedIn: boolean = false;
  isClient: boolean = false;
  isEmployeur: boolean = false;
  isFreelance: boolean = false;
  clientName: string | null = null;
  searchTerm: string = '';
  
  private destroy$ = new Subject<void>();
  isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.isBrowser) {
      this.authService.currentUser$
        .pipe(takeUntil(this.destroy$))
        .subscribe(user => {
          this.isLoggedIn = !!user;
          this.isClient = user && user.role === 'CLIENT';
          this.isFreelance = user && user.role === 'FREELANCE';
          this.isEmployeur = user && user.role === 'EMPLOYEUR';
          this.clientName = this.isClient ? (user?.prenom || '') : null;
          this.cdr.detectChanges();
        });
      this.setupModalSubscriptions();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('document:click', ['$event'])
  onClick(event: MouseEvent) {
    if (!this.isProfileMenuOpen) return;
    const target = event.target as HTMLElement;
    const isInsideDropdown = target.closest('.user-dropdown');
    if (!isInsideDropdown) {
      this.isProfileMenuOpen = false;
      this.cdr.detectChanges();
    }
  }

  toggleMobileMenu(): void {
    this.isMobileMenuOpen = !this.isMobileMenuOpen;
    this.cdr.detectChanges();
  }

  toggleProfileMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.isProfileMenuOpen = !this.isProfileMenuOpen;
    this.cdr.detectChanges();
  }

  closeAllMenus(): void {
    this.isProfileMenuOpen = false;
    this.isMobileMenuOpen = false;
    this.cdr.detectChanges();
  }

  login(): void {
    this.dialog.open(AuthentComponent, {
      panelClass: 'custom-dialog-container',
      width: '500px',
      height: '600px',
      autoFocus: false,
      hasBackdrop: true,
      data: { isFreelance: false }
    }).afterClosed().subscribe(() => {
      this.cdr.detectChanges();
    });
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      this.isLoggedIn = false;
      this.isClient = false;
      this.isFreelance = false;
      this.isEmployeur = false;
      this.clientName = null;
      this.router.navigate(['/']);
      this.snackBar.open('Déconnexion réussie !', 'Fermer', { duration: 3000 });
      this.cdr.detectChanges();
    });
  }

  private scrollToSection(sectionId: string): void {
    const onAccueil = this.router.url === '/' || this.router.url === '/accueil' || this.router.url.startsWith('/?');
    const scroll = () => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
    if (onAccueil) {
      scroll();
    } else {
      this.router.navigate(['/']).then(() => setTimeout(scroll, 300));
    }
  }

  navigateToFreelancePage(): void {
    this.scrollToSection('pro-section');
  }

  navigateToHiring(): void {
    this.scrollToSection('hiring-section');
  }

  navigateToSalonRegistration(): void {
    this.scrollToSection('salon-section');
  }

  openContactModal(): void {
    this.dialog.open(ContactComponent, {
      width: '500px'
    });
  }

  searchSalonsAdvanced(): void {
    if (this.searchTerm.trim()) {
      this.router.navigate(['/search-results'], { queryParams: { q: this.searchTerm } });
    }
  }

  private setupModalSubscriptions(): void {
    this.authUIService.showLoginModal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {
        if (shouldShow === true) {
          this.login();
        }
      });
    this.authUIService.showRegisterModal$
      .pipe(takeUntil(this.destroy$))
      .subscribe(shouldShow => {
        if (shouldShow === true) {
          this.dialog.open(RegisterComponent, {
            panelClass: 'custom-dialog-container',
            width: '500px',
            height: '600px',
            autoFocus: false,
            hasBackdrop: true
          });
        }
      });
  }
}