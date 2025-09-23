import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {

  constructor(private http: HttpClient) {}

  getCoordinates(address: string): Observable<{lat: number, lon: number} | null> {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;

    return this.http.get<any[]>(url).pipe(
      map(results => {
        if (results.length > 0) {
          return {
            lat: parseFloat(results[0].lat),
            lon: parseFloat(results[0].lon)
          };
        }
        return null;
      })
    );
  }
}
