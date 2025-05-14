
import { Injectable } from '@angular/core';
import { Observable, from, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface UserLocation {
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  
  // Méthode principale pour obtenir la position de l'utilisateur
  getUserLocation(): Observable<UserLocation> {
    // Vérifier si la géolocalisation est disponible
    if (!navigator.geolocation) {
      console.log('Géolocalisation non disponible, utilisation des coordonnées par défaut');
      return of({ latitude: 14.6937, longitude: -17.4441 }); // Coordonnées de Dakar par défaut
    }
    
    // Utiliser l'API de géolocalisation du navigateur
    return from(
      new Promise<UserLocation>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            console.log('Position obtenue:', position.coords);
            resolve({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude
            });
          },
          (error) => {
            console.error('Erreur de géolocalisation:', error);
            // Utiliser des coordonnées par défaut en cas d'erreur
            resolve({ latitude: 14.6937, longitude: -17.4441 });
          },
          { 
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0
          }
        );
      })
    ).pipe(
      catchError(error => {
        console.error('Erreur lors de la géolocalisation:', error);
        return of({ latitude: 14.6937, longitude: -17.4441 });
      })
    );
  }
  
  // Calcule la distance entre deux points géographiques en km (formule de Haversine)
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Rayon de la Terre en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const d = R * c; // Distance en km
    return d;
  }
  
  // Convertit les degrés en radians
  private toRad(value: number): number {
    return value * Math.PI / 180;
  }
}