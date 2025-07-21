import { Component, inject, OnInit, OnDestroy, Renderer2, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { NgIf, NgFor } from '@angular/common';
import { isPlatformBrowser } from '@angular/common';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatDialog } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

// ✅ Import des bons services et composants
import { AuthService } from '../../../core/servces/auth.service';
import { PortfolioComponent } from '../portfolio/portfolio.component';
import { OpportunitesEmploiComponent } from '../opportunites-emploi/opportunites-emploi.component';
import { MesServicesFreelanceComponent } from '../mes-service-freelance/mes-service-freelance.component';

@Component({
  selector: 'app-home-freelance',
  standalone: true,
  imports: [
    NgIf, NgFor, RouterModule,
    MatSidenavModule, MatToolbarModule, MatIconModule,
    MatListModule, MatButtonModule, MatCardModule,
    MatInputModule, MatFormFieldModule, MatMenuModule, MatDividerModule,
    PortfolioComponent,
    OpportunitesEmploiComponent,
    MesServicesFreelanceComponent
  ],
  templateUrl: './home-freelance.component.html',
  styleUrls: ['./home-freelance.component.scss']
})
export class HomeFreelanceComponent implements OnInit, OnDestroy {
  // États de navigation
  sidebarOpen = true;
  showPortfolio = false;
  showOpportunities = false;
  showServices = false;
  showAvailability = false;
  showReservations = false;
  showNotifications = false;

  // ✅ Données utilisateur
  currentUser: any = null;
  username = '';

  // ✅ Gestion des subscriptions
  private subscriptions = new Subscription();

  // Services
  private router = inject(Router);
  private authService = inject(AuthService);
  private renderer = inject(Renderer2);
  private dialog = inject(MatDialog);
  private platformId = inject(PLATFORM_ID); // ✅ Pour vérifier si on est côté browser

  // ✅ Propriété pour vérifier si on est côté browser
  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit() {
    this.loadUserData();
    this.subscribeToUserChanges();
    
    // ✅ Seulement côté browser
    if (this.isBrowser) {
      this.setupModalManagement();
      
      // Ajout des fonctions de debug au window (développement seulement)
      if (typeof window !== 'undefined') {
        (window as any).debugModal = {
          checkZIndex: this.debugZIndex.bind(this),
          forceOnTop: this.forceModalOnTop.bind(this),
          fixAllModals: this.fixAllModals.bind(this)
        };
      }
    }
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    
    // ✅ Nettoyer les classes du body seulement côté browser
    if (this.isBrowser && typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'modal-open');
    }
  }

  // ✅ Charger les données utilisateur
  loadUserData(): void {
    this.currentUser = this.authService.getCurrentUser();
    this.updateUsername();
  }

  // ✅ Écouter les changements d'authentification
  subscribeToUserChanges(): void {
    const userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.updateUsername();
    });
    
    this.subscriptions.add(userSub);
  }

  // ✅ Mettre à jour le nom d'affichage
  updateUsername(): void {
    if (this.currentUser) {
      this.username = `${this.currentUser.prenom} ${this.currentUser.nom}`;
    } else {
      this.username = 'Utilisateur';
    }
  }

  // ✅ Getters pour le template
  get isAuthenticated(): boolean {
    return this.authService.isAuthenticated();
  }

  get userFullName(): string {
    return this.currentUser ? 
      `${this.currentUser.prenom} ${this.currentUser.nom}` : 
      'Utilisateur';
  }

  get userEmail(): string {
    return this.currentUser?.email || '';
  }

  get userRole(): string {
    return this.currentUser?.role || '';
  }

  // Méthodes de navigation
  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  backToHome() {
    this.resetViews();
  }

  navigateToPortfolio() {
    this.resetViews();
    this.showPortfolio = true;
  }

  navigateToOpportunities() {
    this.resetViews();
    this.showOpportunities = true;
  }

  navigateToServices() {
    this.resetViews();
    this.showServices = true;
  }

  navigateToAvailability() {
    this.resetViews();
    this.showAvailability = true;
  }

  navigateToReservations() {
    this.resetViews();
    this.showReservations = true;
  }

  navigateToNotifications() {
    this.resetViews();
    this.showNotifications = true;
  }

  resetViews() {
    this.showPortfolio = false;
    this.showOpportunities = false;
    this.showServices = false;
    this.showAvailability = false;
    this.showReservations = false;
    this.showNotifications = false;
  }

  // ✅ Méthodes d'authentification
  forceLogin(): void {
    this.authService.triggerLoginModal();
    
    // ✅ Forcer le modal au-dessus après un délai - seulement côté browser
    if (this.isBrowser) {
      setTimeout(() => {
        this.forceModalOnTop();
      }, 100);
    }
  }

  logout(): void {
    this.authService.logout().subscribe(() => {
      console.log('Déconnexion réussie');
      this.router.navigate(['/accueil']);
    });
  }

  // ✅ === NOUVELLES MÉTHODES POUR GÉRER LES MODALS (SSR-SAFE) ===

  // ✅ Configuration de la gestion automatique des modals (seulement côté browser)
  private setupModalManagement(): void {
    if (!this.isBrowser) return;

    // Écouter l'ouverture des dialogs
    this.dialog.afterOpened.subscribe(() => {
      this.onModalOpen();
    });

    // Écouter la fermeture des dialogs
    this.dialog.afterAllClosed.subscribe(() => {
      this.onModalClose();
    });
  }

  // ✅ Appelé à l'ouverture d'un modal (SSR-safe)
  private onModalOpen(): void {
    if (!this.isBrowser) return;
    
    if (typeof document !== 'undefined') {
      this.renderer.addClass(document.body, 'modal-open');
    }
    
    // Forcer les z-index des modals
    setTimeout(() => {
      this.forceModalOnTop();
    }, 50);
  }

  // ✅ Appelé à la fermeture de tous les modals (SSR-safe)
  private onModalClose(): void {
    if (!this.isBrowser) return;
    
    
    
    // Retirer la classe
    if (typeof document !== 'undefined') {
      this.renderer.removeClass(document.body, 'modal-open');
    }
  }

  // ✅ Méthode utilitaire pour ouvrir un modal avec correction automatique
  openModalWithFix(component: any, config?: any): any {
    if (!this.isBrowser) {
      console.warn('⚠️ openModalWithFix called on server side - skipping');
      return null;
    }

    console.log('🎯 Ouverture modal avec correction automatique');
    
    // Ouvrir le modal
    const dialogRef = this.dialog.open(component, {
      ...config,
      panelClass: ['force-modal-top', ...(config?.panelClass || [])],
      disableClose: config?.disableClose || false
    });

    // Forcer au-dessus après ouverture
    dialogRef.afterOpened().subscribe(() => {
      setTimeout(() => {
        this.forceModalOnTop();
      }, 50);
    });

    return dialogRef;
  }

  // ✅ === MÉTHODES DE DEBUG ET CORRECTION (SSR-SAFE) ===

  // ✅ Méthode de debug pour vérifier tous les z-index (SSR-safe)
  private debugZIndex(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn('⚠️ debugZIndex called on server side - skipping');
      return;
    }

    const elements = [
      { name: 'Body', selector: 'body' },
      { name: 'Sidebar', selector: '.beauty-sidebar, .mat-sidenav' },
      { name: 'Sidebar Backdrop', selector: '.mat-sidenav-backdrop' },
      { name: 'Toolbar', selector: '.beauty-toolbar' },
      { name: 'Modal Container', selector: '.cdk-overlay-container' },
      { name: 'Modal Dialog', selector: '.mat-dialog-container' },
      { name: 'Modal Backdrop', selector: '.cdk-overlay-backdrop' },
      { name: 'Modal Pane', selector: '.cdk-overlay-pane' }
    ];
    
    console.log('=== 🔍 DEBUG Z-INDEX COMPLET ===');
    elements.forEach(({ name, selector }) => {
      const element = document.querySelector(selector);
      if (element) {
        const styles = window.getComputedStyle(element);
        const zIndex = styles.zIndex;
        const position = styles.position;
        const display = styles.display;
        
       
        
        if (selector === 'body') {
          console.log(`  ↳ Classes: ${element.className}`);
        }
      } else {
      
      }
    });
    
    // Compter les modals ouverts
    const openDialogs = document.querySelectorAll('.mat-dialog-container');
    
  }

  // ✅ Méthode pour forcer les modals au-dessus (SSR-safe)
  private forceModalOnTop(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn('⚠️ forceModalOnTop called on server side - skipping');
      return;
    }
    
    const overlayContainer = document.querySelector('.cdk-overlay-container');
    const dialogs = document.querySelectorAll('.mat-dialog-container');
    const backdrops = document.querySelectorAll('.cdk-overlay-backdrop');
    const overlayPanes = document.querySelectorAll('.cdk-overlay-pane');
    
    // Forcer le container overlay
    if (overlayContainer) {
      (overlayContainer as HTMLElement).style.zIndex = '99999';
      console.log('  ✅ Container overlay: 99999');
    }
    
    // Forcer tous les backdrops
    backdrops.forEach((backdrop, index) => {
      (backdrop as HTMLElement).style.zIndex = '99998';
      (backdrop as HTMLElement).style.position = 'fixed';
      console.log(`  ✅ Backdrop ${index + 1}: 99998`);
    });
    
    // Forcer tous les overlay panes
    overlayPanes.forEach((pane, index) => {
      (pane as HTMLElement).style.zIndex = '99999';
      console.log(`  ✅ Overlay pane ${index + 1}: 99999`);
    });
    
    // Forcer tous les dialogs
    dialogs.forEach((dialog, index) => {
      (dialog as HTMLElement).style.zIndex = '100000';
      (dialog as HTMLElement).style.position = 'relative';
      console.log(`  ✅ Dialog ${index + 1}: 100000`);
    });
    
    // Réduire le z-index de la sidebar
    const sidebars = document.querySelectorAll('.mat-sidenav, .beauty-sidebar');
    sidebars.forEach((sidebar, index) => {
      (sidebar as HTMLElement).style.zIndex = '50';
      console.log(`  ✅ Sidebar ${index + 1}: 50`);
    });
    
    // Réduire le z-index des backdrops de sidebar
    const sidebarBackdrops = document.querySelectorAll('.mat-sidenav-backdrop');
    sidebarBackdrops.forEach((backdrop, index) => {
      (backdrop as HTMLElement).style.zIndex = '49';
      console.log(`  ✅ Sidebar backdrop ${index + 1}: 49`);
    });
    
    console.log('✅ Modals forcés au-dessus de la sidebar !');
  }

  // ✅ Méthode pour corriger tous les modals ouverts (SSR-safe)
  private fixAllModals(): void {
    if (!this.isBrowser || typeof document === 'undefined') {
      console.warn('⚠️ fixAllModals called on server side - skipping');
      return;
    }

    // console.log('🔧 === CORRECTION COMPLÈTE DE TOUS LES MODALS ===');
    
    // Ajouter la classe au body
    this.renderer.addClass(document.body, 'modal-open');
    console.log('📌 Classe modal-open ajoutée au body');
    
    // Forcer tous les z-index
    this.forceModalOnTop();
    
    // Vérifier le résultat
    setTimeout(() => {
      console.log('🔍 Vérification après correction:');
      this.debugZIndex();
    }, 100);
  }

  // ✅ Méthode pour réinitialiser tous les z-index (SSR-safe)
  private resetAllZIndex(): void {
    if (!this.isBrowser || typeof document === 'undefined') {

      return;
    }

  
    const elements = document.querySelectorAll(
      '.cdk-overlay-container, .mat-dialog-container, .cdk-overlay-backdrop, ' +
      '.cdk-overlay-pane, .mat-sidenav, .beauty-sidebar, .mat-sidenav-backdrop'
    );
    
    elements.forEach(element => {
      (element as HTMLElement).style.zIndex = '';
    });
  
    this.renderer.removeClass(document.body, 'modal-open');

  }

  
}