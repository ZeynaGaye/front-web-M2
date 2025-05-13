import { Component, OnInit, inject, ChangeDetectorRef, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { HeaderService } from '../../services/header/header.service';
import { FormsModule } from '@angular/forms';
import { RoleRedirectService } from '../../../core/services/auth/role-redirect.service';
import { SalonService } from '../../services/salons/salons.service';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ContactComponent } from '../contact/contact.component';
import { SalonDetailsComponent } from '../salon-details/salon-details.component';
import { AuthentComponent } from '../../../shared/components/authent/authent.component';
import { RegisterComponent } from '../../../shared/components/register/register.component';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    FormsModule, 
    MatDialogModule, 
    AuthentComponent, 
    RegisterComponent
  ],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent implements OnInit {
  private cdr = inject(ChangeDetectorRef);
  public headerService = inject(HeaderService);
  private roleRedirectService = inject(RoleRedirectService);
  private snackBar = inject(MatSnackBar);
  isFreelancePage: boolean = false;
  private dialog = inject(MatDialog);
  private router = inject(Router);
  showLoginModal: boolean = false;
  showRegisterModal: boolean = false;
  filteredSalons: any[] = [];
  selectedService: string | null = null;
  isLoading = false;
  Math = Math;
  salons: any[] = [];
  searchTerm: string = '';
  isBrowser: boolean;

  constructor(
    private salonService: SalonService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  get isLoggedIn() {
    return this.headerService.isLoggedIn();
  }

  get username() {
    return this.headerService.username();
  }

  get isClient() {
    return this.headerService.isClient();
  }

  get isEmployeur() {
    return this.headerService.isEmployeur();
  }

  get isFreelance() {
    return this.headerService.isFreelance();
  }

  ngOnInit(): void {
    this.headerService.checkAuthStatus().then(() => {
      this.cdr.detectChanges();
    });
    
    // Suivre la route active
    if (this.isBrowser) {
      this.router.events.subscribe(event => {
        if (event instanceof NavigationEnd) {
          this.isFreelancePage = event.url.includes('freelance-dashboard');
        }
      });
    }
  }

  logout(): void {
    this.headerService.logout();
    this.snackBar.open('Vous êtes déconnecté avec succès', 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
    
    // Rediriger vers la page d'accueil après déconnexion
    this.router.navigate(['/']);
  }

  async redirectUser() {
    await this.roleRedirectService.redirectBasedOnRoles();
  }

  openContactModal() {
    if (!this.isBrowser) return;
    
    this.dialog.open(ContactComponent, {
      width: '400px',
      height: '500px',
      disableClose: false,
    });
  }

  // Nouvelle méthode pour ouvrir le dialogue des détails du salon
  openSalonDetailDialog(salonId: number): void {
    if (!this.isBrowser) return;
    
    if (!salonId) {
      console.error('ID de salon invalide:', salonId);
      return;
    }
    
    this.dialog.open(SalonDetailsComponent, {
      width: '900px',
      height: '90vh',
      maxWidth: '90vw',
      data: { salonId: salonId },
      panelClass: 'salon-detail-dialog-container',
      autoFocus: false,
    });
  }

  // Méthode améliorée pour filterSalonsByService
  filterSalonsByService(service: string): void {
    // Si on clique sur le même service, désactiver le filtre
    if (this.selectedService === service) {
      this.selectedService = null;
      this.filteredSalons = [];
      return;
    }

    this.selectedService = service;
    this.isLoading = true;
    
    // Journalisation pour le débogage
    if (this.isBrowser) {
      console.log('Recherche de service:', service);
    }

    this.salonService.getSalonsByService(service).subscribe({
      next: (data) => {
        if (this.isBrowser) {
          console.log('Résultats récupérés:', data);
        }
        this.filteredSalons = this.processSalonData(data);
        this.isLoading = false;
      },
      error: (error) => {
        if (this.isBrowser) {
          console.error('Erreur lors du chargement des salons', error);
        }
        this.isLoading = false;
        this.filteredSalons = []; // Vider la liste en cas d'erreur
        
        // Notification d'erreur plus détaillée
        let errorMessage = 'Erreur lors de la recherche de salons';
        if (error.message) {
          errorMessage += `: ${error.message}`;
        }
        
        this.snackBar.open(errorMessage, 'Fermer', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      },
      complete: () => {
        if (this.isBrowser) {
          console.log('Requête terminée');
        }
      }
    });
  }

  // Process and normalize salon data from API
  private processSalonData(data: any[]): any[] {
    return data.map((salon) => {
      // Ensure consistent property names
      return {
        id: salon.id,
        nom: salon.nom || salon.name,
        imageUrl:
          salon.imageUrl || salon.photo || '/assets/images/salon.jpg',
        adresse: salon.adresse || salon.address,
        rating: salon.rating || salon.note || 0,
        reviewCount: salon.reviewCount || salon.nombreAvis || 0,
        services: Array.isArray(salon.services)
          ? salon.services
          : salon.serviceOfferts
          ? salon.serviceOfferts.split(',').map((s: string) => s.trim())
          : [],
        priceRange: salon.priceRange || salon.gammeDePrice || 'CFA',
      };
    });
  }

  // Search functionality
  searchSalons(): void {
    if (!this.isBrowser) return;
    
    if (!this.searchTerm.trim()) {
      return;
    }

    this.isLoading = true;
    // Implement search functionality when you have an endpoint
    // For now, let's assume we're searching by service
    this.filterSalonsByService(this.searchTerm);
  }

  getStarArray(rating: number): any[] {
    if (!rating || isNaN(rating)) return [];
    const stars = Math.min(Math.floor(rating), 5);
    return new Array(stars);
  }

  hasHalfStar(rating: number): boolean {
    if (!rating || isNaN(rating)) return false;
    return rating % 1 >= 0.5 && Math.floor(rating) < 5;
  }

  openLoginModal() {
    if (!this.isBrowser) return;
    
    this.showLoginModal = true;
    this.showRegisterModal = false; // Assure que le modal d'inscription est fermé
    console.log('Modal de connexion ouvert');
  }

  closeLoginModal() {
    this.showLoginModal = false;
    console.log('Modal de connexion fermé');
  }

  openRegisterModal() {
    if (!this.isBrowser) return;
    
    this.showRegisterModal = true;
    this.showLoginModal = false; // Assure que le modal de connexion est fermé
    console.log("Modal d'inscription ouvert");
  }

  closeRegisterModal() {
    this.showRegisterModal = false;
    console.log("Modal d'inscription fermé");
  }

  login(): void {
    if (!this.isBrowser) return;
    
    // Ouvre simplement le modal de connexion
    this.openLoginModal();
    console.log("Ouverture du modal de connexion depuis le bouton SIGN IN");
  }

  // Méthode pour basculer du login vers l'inscription
  switchToRegister(): void {
    this.closeLoginModal();
    this.openRegisterModal();
    console.log("Basculement du modal de connexion vers le modal d'inscription");
  }

  // Méthode pour basculer de l'inscription vers le login
  switchToLogin(): void {
    this.closeRegisterModal();
    this.openLoginModal();
    console.log("Basculement du modal d'inscription vers le modal de connexion");
  }

  navigateToFreelancePage(): void {
    if (!this.isBrowser) return;
    
    // Afficher une notification discrète
    this.snackBar.open('Bienvenue sur l\'espace Freelance', '', {
      duration: 2000,
      horizontalPosition: 'center',
      verticalPosition: 'bottom',
      panelClass: ['subtle-snackbar']
    });
    
    // Ajouter un effet de transition
    document.body.classList.add('page-transition');
    
    // Navigation avec un léger délai pour permettre à l'animation de commencer
    setTimeout(() => {
      // Naviguer vers la page freelance
      this.router.navigate(['/freelance-dashboard']).then(() => {
        // Une fois la navigation terminée, faire défiler vers le haut avec une animation
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        // Retirer la classe d'animation après un court délai
        setTimeout(() => {
          document.body.classList.remove('page-transition');
        }, 500);
      });
    }, 100);
  }
}