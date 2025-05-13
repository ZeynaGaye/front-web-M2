
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root'
})
export class BrowserStorageService {
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  getItem(key: string): string | null {
    return this.isBrowser ? localStorage.getItem(key) : null;
  }

  setItem(key: string, value: string): void {
    if (this.isBrowser) {
      localStorage.setItem(key, value);
    }
  }

  removeItem(key: string): void {
    if (this.isBrowser) {
      localStorage.removeItem(key);
    }
  }

  clear(): void {
    if (this.isBrowser) {
      localStorage.clear();
    }
  }
  
  // Méthode utilitaire pour obtenir un objet JSON stocké
  getObject<T>(key: string): T | null {
    const item = this.getItem(key);
    if (!item) return null;
    
    try {
      return JSON.parse(item) as T;
    } catch (e) {
      console.error('Erreur lors du parsing JSON:', e);
      return null;
    }
  }
  
  // Méthode utilitaire pour stocker un objet JSON
  setObject<T>(key: string, value: T): void {
    if (!this.isBrowser) return;
    
    try {
      const serialized = JSON.stringify(value);
      this.setItem(key, serialized);
    } catch (e) {
      console.error('Erreur lors de la sérialisation JSON:', e);
    }
  }
}