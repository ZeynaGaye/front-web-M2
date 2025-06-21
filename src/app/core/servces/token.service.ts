import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class TokenService {
  private isBrowser: boolean;
  private tokenSubject = new BehaviorSubject<string | null>(null);
  public token$ = this.tokenSubject.asObservable();

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.initializeToken();
  }

  private initializeToken(): void {
    if (this.isBrowser) {
      const token = this.getStoredToken();
      this.tokenSubject.next(token);
    }
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    
    try {
      const currentToken = this.tokenSubject.getValue();
      if (currentToken) {
        return currentToken;
      }
      
      // Fallback: récupérer depuis localStorage
      const storedToken = this.getStoredToken();
      if (storedToken) {
        this.tokenSubject.next(storedToken);
        return storedToken;
      }
      
      return null;
    } catch (error) {
      console.error('Erreur lors de la récupération du token:', error);
      return null;
    }
  }

  private getStoredToken(): string | null {
    try {
      const userStr = localStorage.getItem('currentUser');
      if (!userStr) return null;
      
      const user = JSON.parse(userStr);
      return user?.accesToken || null;
    } catch (error) {
      console.error('Erreur lors de la lecture du localStorage:', error);
      return null;
    }
  }

  setToken(token: string | null): void {
    if (this.isBrowser) {
      this.tokenSubject.next(token);
    }
  }

  clearToken(): void {
    if (this.isBrowser) {
      this.tokenSubject.next(null);
    }
  }

  isTokenValid(token?: string): boolean {
    const tokenToCheck = token || this.getToken();
    if (!tokenToCheck) return false;

    try {
      const payload = this.parseJwtPayload(tokenToCheck);
      const now = Math.floor(Date.now() / 1000);
      return payload.exp > now;
    } catch (error) {
      console.error('Erreur lors de la validation du token:', error);
      return false;
    }
  }

  private parseJwtPayload(token: string): any {
    const base64Url = token.split('.')[1];
    if (!base64Url) throw new Error('Token JWT invalide');
    
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    
    if (this.isBrowser) {
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } else {
      // Côté serveur avec Node.js
      const buffer = Buffer.from(base64, 'base64');
      return JSON.parse(buffer.toString('utf-8'));
    }
  }
}