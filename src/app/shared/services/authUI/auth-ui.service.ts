// auth-ui.service.ts
import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthUIService {
  // Subject pour déclencher l'ouverture du modal de connexion
  private loginModalSubject = new Subject<void>();
  
  // Observable que le HeaderComponent peut écouter
  loginModal$ = this.loginModalSubject.asObservable();

  constructor() {}

  // Méthode appelée pour déclencher l'ouverture du modal
  triggerLoginModal() {
    this.loginModalSubject.next();
  }
}