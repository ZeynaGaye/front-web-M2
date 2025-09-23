import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthUIService {
  closeRegisterModal() {
    throw new Error('Method not implemented.');
  }
  // ✅ Utilisez Subject au lieu de BehaviorSubject pour éviter l'émission automatique
  private showLoginModalSubject = new Subject<boolean>();
  private showRegisterModalSubject = new Subject<boolean>();
  
  // États internes pour tracking et éviter les doublons
  private _loginModalOpen = false;
  private _registerModalOpen = false;
  
  // Observables que les composants peuvent écouter
  showLoginModal$ = this.showLoginModalSubject.asObservable();
  showRegisterModal$ = this.showRegisterModalSubject.asObservable();
  
  constructor() {
    console.log('AuthUIService initialized - no automatic modal triggers');
  }

  // ✅ Méthodes avec logging et protection contre les doublons
  triggerLoginModal() {
    console.log('triggerLoginModal called - current state:', {
      loginOpen: this._loginModalOpen,
      registerOpen: this._registerModalOpen
    });
    
    // Éviter de déclencher si déjà ouvert
    if (this._loginModalOpen) {
      console.log('Login modal already open, ignoring trigger');
      return;
    }

    // Fermer le modal d'inscription s'il est ouvert
    if (this._registerModalOpen) {
      this._registerModalOpen = false;
      this.showRegisterModalSubject.next(false);
    }
    
    // Ouvrir le modal de connexion
    this._loginModalOpen = true;
    this.showLoginModalSubject.next(true);
    
    console.log('Login modal triggered - new state:', {
      loginOpen: this._loginModalOpen,
      registerOpen: this._registerModalOpen
    });
  }

  triggerRegisterModal() {
    console.log('triggerRegisterModal called - current state:', {
      loginOpen: this._loginModalOpen,
      registerOpen: this._registerModalOpen
    });
    
    // Éviter de déclencher si déjà ouvert
    if (this._registerModalOpen) {
      console.log('Register modal already open, ignoring trigger');
      return;
    }

    // Fermer le modal de connexion s'il est ouvert
    if (this._loginModalOpen) {
      this._loginModalOpen = false;
      this.showLoginModalSubject.next(false);
    }
    
    // Ouvrir le modal d'inscription
    this._registerModalOpen = true;
    this.showRegisterModalSubject.next(true);
    
    console.log('Register modal triggered - new state:', {
      loginOpen: this._loginModalOpen,
      registerOpen: this._registerModalOpen
    });
  }

  closeModals() {
    console.log('closeModals called - current state:', {
      loginOpen: this._loginModalOpen,
      registerOpen: this._registerModalOpen
    });
    
    // Ne fermer que si l'un des modals est effectivement ouvert
    const hasOpenModal = this._loginModalOpen || this._registerModalOpen;
    
    if (hasOpenModal) {
      this._loginModalOpen = false;
      this._registerModalOpen = false;
      
      // Envoyer les signaux de fermeture
      this.showLoginModalSubject.next(false);
      this.showRegisterModalSubject.next(false);
      
      console.log('Modals closed - new state:', {
        loginOpen: this._loginModalOpen,
        registerOpen: this._registerModalOpen
      });
    } else {
      console.log('No modals were open, ignoring close request');
    }
  }

  switchToRegister() {
    console.log('switchToRegister called');
    this.triggerRegisterModal();
  }

  switchToLogin() {
    console.log('switchToLogin called');
    this.triggerLoginModal();
  }

  // ✅ Getters pour vérifier l'état (utile pour le debugging)
  get isLoginModalOpen(): boolean {
    return this._loginModalOpen;
  }

  get isRegisterModalOpen(): boolean {
    return this._registerModalOpen;
  }

  // ✅ Méthode pour reset complet (utile en cas de problème)
  resetAllStates() {
    console.log('resetAllStates called - forcing all modals closed');
    this._loginModalOpen = false;
    this._registerModalOpen = false;
    
    // Force la fermeture de tous les modals
    this.showLoginModalSubject.next(false);
    this.showRegisterModalSubject.next(false);
  }

  // ✅ Méthode pour debugging - à supprimer en production
  getDebugInfo() {
    return {
      loginModalOpen: this._loginModalOpen,
      registerModalOpen: this._registerModalOpen,
      timestamp: new Date().toISOString()
    };
  }
}