import { Component, OnInit } from '@angular/core';
import { GoogleMap, MapMarker } from '@angular/google-maps';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [GoogleMap, MapMarker],
  templateUrl: './map.component.html',
  styleUrls: ['./map.component.scss'],
})
export class MapComponent implements OnInit {
  infoWindows: google.maps.InfoWindow[] = [];
  center: google.maps.LatLngLiteral = { lat: 0, lng: 0 }; // Centre de la carte
  zoom = 12; // Niveau de zoom
  markers: google.maps.LatLngLiteral[] = []; // Marqueurs pour les salons
  error: string | null = null;
  map: google.maps.Map | null = null; // Message d'erreur

  ngOnInit(): void {
    this.getUserLocation();
  }

  // Obtenir la position de l'utilisateur
  getUserLocation(): void {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.center = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          this.findNearbySalons();
        },
        (error) => {
          this.error = 'Erreur de géolocalisation : ' + error.message;
        }
      );
    } else {
      this.error = 'La géolocalisation n\'est pas supportée par ce navigateur.';
    }
  }

  // Rechercher des salons de beauté à proximité
  findNearbySalons(): void {
    const request = {
      location: this.center,
      radius: 5000,
      type: 'beauty_salon',
    };
  
    const service = new google.maps.places.PlacesService(
      document.createElement('div')
    );
  
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results) {
        this.markers = results.map((place) => ({
          lat: place.geometry?.location?.lat() || 0,
          lng: place.geometry?.location?.lng() || 0,
        }));
  
        // Ajouter des info-windows
        results.forEach((place, index) => {
          const infoWindow = new google.maps.InfoWindow({
            content: `<strong>${place.name}</strong><br>${place.vicinity}`,
          });
          this.infoWindows.push(infoWindow);
        });
      } else {
        this.error = 'Aucun salon de beauté trouvé à proximité.';
      }
    });
  }

  // Ajoutez cette méthode dans MapComponent
openInfoWindow(infoWindow: google.maps.InfoWindow, marker: google.maps.LatLngLiteral): void {
  infoWindow.open(this.map, new google.maps.Marker({ position: marker }));
}

onMapInitialized(map: google.maps.Map): void {
  this.map = map; // Stocker la référence de la carte
}
}