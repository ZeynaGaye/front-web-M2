import { Component, OnInit, NgZone, inject } from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';
import { PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [GoogleMap, MapMarker],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  infoWindows: google.maps.InfoWindow[] = [];
  center: google.maps.LatLngLiteral = { lat: 14.6937, lng: -17.4441 }; // Dakar, Sénégal par défaut
  zoom = 12;
  markers: { position: google.maps.LatLngLiteral, title: string, address: string }[] = [];
  error: string | null = null;
  map: google.maps.Map | null = null;
  mapOptions: google.maps.MapOptions = {
    mapTypeId: 'roadmap',
    zoomControl: true,
    scrollwheel: true,
    disableDoubleClickZoom: false,
    maxZoom: 20,
    minZoom: 8,
  };
  
  private ngZone = inject(NgZone);
  private platformId = inject(PLATFORM_ID);

  ngOnInit(): void {
    // Vérifier si nous sommes dans un navigateur
    if (isPlatformBrowser(this.platformId)) {
      this.ngZone.runOutsideAngular(() => {
        this.getUserLocation();
      });
    }
  }

  getUserLocation(): void {
    // Utiliser Dakar comme position par défaut (pour le Sénégal)
    this.center = { lat: 14.6937, lng: -17.4441 };
    
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.ngZone.run(() => {
            this.center = {
              lat: position.coords.latitude,
              lng: position.coords.longitude,
            };
          });
        },
        (error) => {
          this.ngZone.run(() => {
            // Géolocalisation échouée, on utilise Dakar par défaut
            console.log('Erreur de géolocalisation : ' + error.message);
            // Continuons avec la position par défaut (Dakar)
          });
        }
      );
    }
  }

  onMapInitialized(map: google.maps.Map): void {
    this.map = map;
    this.ngZone.runOutsideAngular(() => {
      // Attendons que la carte soit complètement chargée
      google.maps.event.addListenerOnce(map, 'idle', () => {
        this.findNearbySalons();
      });
    });
  }

  findNearbySalons(): void {
    if (!this.map) return;
    
    try {
      const request = {
        location: new google.maps.LatLng(this.center.lat, this.center.lng),
        radius: 5000,
        type: 'beauty_salon'
      };
    
      // Créer le service Places avec la référence de carte réelle
      const service = new google.maps.places.PlacesService(this.map);
    
      service.nearbySearch(request, (results, status) => {
        this.ngZone.run(() => {
          if (status === google.maps.places.PlacesServiceStatus.OK && results) {
            this.markers = results.map((place) => ({
              position: {
                lat: place.geometry?.location?.lat() || 0,
                lng: place.geometry?.location?.lng() || 0,
              },
              title: place.name || 'Salon de beauté',
              address: place.vicinity || 'Adresse non disponible'
            }));
            
            // Créer des InfoWindows
            this.infoWindows = this.markers.map(marker => 
              new google.maps.InfoWindow({
                content: `<strong>${marker.title}</strong><br>${marker.address}`
              })
            );
          } else {
            this.error = 'Aucun salon de beauté trouvé à proximité.';
            // Ajouter des marqueurs fictifs pour tester au Sénégal
            this.addFallbackMarkers();
          }
        });
      });
    } catch (error) {
      this.ngZone.run(() => {
        console.error('Erreur lors de la recherche des salons:', error);
        this.error = 'Erreur lors de la recherche des salons. Affichage des emplacements populaires.';
        this.addFallbackMarkers();
      });
    }
  }
  
  // Ajouter des marqueurs de secours spécifiques au Sénégal
  addFallbackMarkers(): void {
    const senegalSalons = [
      { lat: 14.6937, lng: -17.4441, title: 'Institut de Beauté Dakar', address: 'Centre-ville, Dakar' },
      { lat: 14.7021, lng: -17.4539, title: 'Salon Élégance', address: 'Almadies, Dakar' },
      { lat: 14.6778, lng: -17.4372, title: 'Beauty & Spa Sénégal', address: 'Plateau, Dakar' },
      { lat: 14.7247, lng: -17.4439, title: 'Coiffure & Esthétique', address: 'Ouakam, Dakar' },
      { lat: 14.6664, lng: -17.4228, title: 'Salon Moderne', address: 'Médina, Dakar' }
    ];
    
    this.markers = senegalSalons.map(salon => ({
      position: { lat: salon.lat, lng: salon.lng },
      title: salon.title,
      address: salon.address
    }));
    
    this.infoWindows = this.markers.map(marker => 
      new google.maps.InfoWindow({
        content: `<strong>${marker.title}</strong><br>${marker.address}`
      })
    );
  }

  openInfoWindow(index: number): void {
    if (this.map && this.infoWindows[index] && this.markers[index]) {
      // Fermer toutes les fenêtres d'info ouvertes
      this.infoWindows.forEach(window => window.close());
      
      // Créer un marqueur temporaire pour l'InfoWindow
      const marker = new google.maps.Marker({
        position: this.markers[index].position,
        map: this.map
      });
      
      this.infoWindows[index].open(this.map, marker);
    }
  }
}