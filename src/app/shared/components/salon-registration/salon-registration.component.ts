import { Component, Inject, OnInit, PLATFORM_ID, inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/servces/auth.service';

@Component({
  selector: 'app-salon-registration',
  standalone: true,
  imports: [CommonModule,],
  templateUrl: './salon-registration.component.html',
  styleUrls: ['./salon-registration.component.scss']
})
export class SalonRegistrationComponent implements OnInit {

  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private authService = inject(AuthService);

  // Plans tarifaires pour l'affichage
  plans = [
    {
      id: 'free',
      name: 'Formule Découverte',
      price: 'Gratuite',
      features: [
        'Profil salon basique',
        '2 offres d\'emploi par mois',
        'Support par email'
      ]
    },
    {
      id: 'pro',
      name: 'Formule Professionnelle',
      price: '15,000 CFA/mois',
      popular: true,
      features: [
        'Profil salon complet',
        'Offres d\'emploi illimitées',
        'Mise en avant sur la plateforme',
        'Statistiques avancées',
        'Support prioritaire'
      ]
    },
    {
      id: 'premium',
      name: 'Formule Premium',
      price: '25,000 CFA/mois',
      features: [
        'Tous les avantages Professionnel',
        'Référencement prioritaire',
        'Promotions spéciales',
        'Accompagnement personnalisé',
        'Accès aux outils marketing avancés'
      ]
    }
  ];

  selectedPlan = 'pro';
  isBrowser: boolean;
  showLoginModal: boolean;
  showRegisterModal: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // S'assurer que les modals sont fermés dès la construction
    this.showLoginModal = false;
    this.showRegisterModal = false;
    
    console.log('Construction salon-registration component - Modals initialisés à false');
  }

  ngOnInit() {
    // Scroll vers le haut (uniquement côté navigateur)
    if (this.isBrowser) {
      window.scrollTo(0, 0);
    }
    
    // S'assurer que les modals sont fermés au démarrage
    this.showLoginModal = false;
    this.showRegisterModal = false;
    
    console.log('Initialisation salon-registration - Modals fermés:', {
      showLoginModal: this.showLoginModal,
      showRegisterModal: this.showRegisterModal
    });
    
    // Vérifier si l'utilisateur vient de se connecter
    setTimeout(() => {
      this.checkForSuccessfulLogin();
    }, 100);
  }

  // Vérifier si l'utilisateur vient de se connecter avec succès
  private checkForSuccessfulLogin() {
    console.log('🔍 Vérification de la connexion réussie...');
    
    if (this.isBrowser && this.isLoggedIn) {
      console.log('✅ Utilisateur connecté détecté');
      const redirectAfterLogin = sessionStorage.getItem('redirectAfterLogin');
      const selectedPlan = sessionStorage.getItem('selectedPlan');
      
      if (redirectAfterLogin) {
        console.log('📍 Redirection prévue vers:', redirectAfterLogin);
        
        // Afficher un message de succès avec le plan sélectionné
        if (selectedPlan) {
          const planName = this.getSelectedPlanName();
          this.snackBar.open(
            `Connexion réussie ! Plan ${planName} sélectionné. Redirection vers votre tableau de bord...`,
            'OK',
            { duration: 4000 }
          );
        }
        
        // Rediriger après un court délai
        setTimeout(() => {
          this.router.navigate([redirectAfterLogin]);
          // Nettoyer le sessionStorage
          this.clearSessionData();
        }, 2000);
      }
    } else {
      console.log('ℹ️ Aucune connexion active ou pas côté navigateur');
    }
  }
  clearSessionData() {
    throw new Error('Method not implemented.');
  }

  // Sélectionner un plan (pour l'affichage visuel)
  selectPlan(planId: string) {
    this.selectedPlan = planId;
    this.snackBar.open(
      `Plan ${this.getSelectedPlanName()} sélectionné. Connectez-vous pour continuer !`,
      'OK',
      { duration: 3000 }
    );
  }

  // Obtenir le nom du plan sélectionné
  getSelectedPlanName(): string {
    // D'abord essayer de récupérer depuis sessionStorage (uniquement côté navigateur)
    let planId = this.selectedPlan;
    
    if (this.isBrowser) {
      const storedPlan = sessionStorage.getItem('selectedPlan');
      if (storedPlan) {
        planId = storedPlan;
      }
    }
    
    const plan = this.plans.find(p => p.id === planId);
    return plan ? plan.name : 'Formule Professionnelle';
  }

  // Navigation
  goBack() {
    if (this.isBrowser) {
      window.history.back();
    } else {
      // Fallback pour SSR
      this.router.navigate(['/']);
    }
  }

  // Démo
  requestDemo() {
    this.snackBar.open(
      'Un conseiller vous contactera dans les 24h pour une démonstration personnalisée', 
      'OK', 
      { duration: 4000 }
    );
  }

  // Scroll vers la section tarification
  scrollToPricingSection() {
    if (this.isBrowser) {
      const pricingSection = document.querySelector('.pricing-section');
      if (pricingSection) {
        pricingSection.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }

  // Ouvrir le modal de connexion
  openLoginModal() {
    // Stocker le plan sélectionné pour après la connexion
    sessionStorage.setItem('selectedPlan', this.selectedPlan);
    sessionStorage.setItem('redirectAfterLogin', '/employer-dashboard');
    
    // Déclencher l'ouverture du modal via le service
    this.authService.triggerLoginModal();
    
    this.snackBar.open(
      'Connectez-vous pour accéder à votre tableau de bord employeur',
      'OK',
      { duration: 3000 }
    );
  }

  // Ouvrir le modal d'inscription
  openRegisterModal() {
    // Stocker le plan sélectionné pour après l'inscription
    sessionStorage.setItem('selectedPlan', this.selectedPlan);
    sessionStorage.setItem('redirectAfterLogin', '/employer-dashboard');
    sessionStorage.setItem('userType', 'employeur');
    
    // Note: Vous devrez ajouter cette méthode à votre AuthService si elle n'existe pas
    // ou utiliser la méthode appropriée de votre système
    if (this.authService.triggerRegisterModal) {
      this.authService.triggerRegisterModal();
    } else {
      // Fallback: rediriger vers une page d'inscription ou ouvrir le modal de connexion
      this.authService.triggerLoginModal();
    }
    
    this.snackBar.open(
      'Créez votre compte employeur pour commencer',
      'OK',
      { duration: 3000 }
    );
  }

  // Vérifier si l'utilisateur est connecté
  get isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  // Accéder au dashboard (si déjà connecté)
  goToDashboard() {
    if (this.isLoggedIn) {
      this.router.navigate(['/employer-dashboard']);
    } else {
      this.openLoginModal();
    }
  }

  // Démarrer l'aventure - Action principale
  startJourney() {
    if (this.isLoggedIn) {
      // Si déjà connecté, aller directement au dashboard
      this.goToDashboard();
    } else {
      // Sinon, ouvrir le modal de connexion (qui a l'option "créer un compte")
      this.openLoginModal();
    }
  }
}