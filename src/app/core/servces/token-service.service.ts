// import { isPlatformBrowser } from '@angular/common';
// import { Inject, Injectable, PLATFORM_ID } from '@angular/core';

// @Injectable({
//   providedIn: 'root'
// })
// export class tokenService {

//   private isBrowser: boolean;

//   constructor(@Inject(PLATFORM_ID) platformId: Object) {
//     this.isBrowser = isPlatformBrowser(platformId);
//   }

//   getToken(): string | null {
//     if (!this.isBrowser) {
//       return null; // Si on est côté serveur, pas de token
//     }
    
//     try {
//       const userStr = localStorage.getItem('currentUser');
//       if (!userStr) return null;
      
//       const user = JSON.parse(userStr);
//       return user?.accesToken || null;
//     } catch (e) {
//       console.error('Erreur lors de la récupération du token:', e);
//       return null;
//     }
//   }
// }
