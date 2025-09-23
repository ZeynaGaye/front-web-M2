import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

/**
 * Interface pour la réponse de l'API
 */
export interface HairstyleResponse {
  success: boolean;
  hairstyleNames: string[];
  error?: string;
}

@Injectable({
  providedIn: 'root'
})
export class HairstyleGeneratorService {
  private apiUrl = 'http://localhost:3000/generate-hairstyles';

  constructor(private http: HttpClient) { }

  /**
   * Génère des noms de coiffure à partir d'une image
   * @param imageFile Le fichier image à envoyer (JPG, PNG ou WEBP)
   * @returns Un Observable contenant la réponse de l'API
   */
  generateHairstyles(imageFile: File): Observable<HairstyleResponse> {
    // Vérification du type de fichier
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(imageFile.type)) {
      return throwError(() => new Error('Format de fichier non autorisé. Seuls les fichiers JPG, PNG et WEBP sont acceptés.'));
    }

    // Vérification de la taille du fichier (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB en octets
    if (imageFile.size > maxSize) {
      return throwError(() => new Error('Le fichier est trop grand (max 10MB).'));
    }

    // Création du FormData pour l'envoi du fichier
    const formData = new FormData();
    formData.append('image', imageFile);

    // Envoi de la requête POST
    return this.http.post<HairstyleResponse>(this.apiUrl, formData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Une erreur est survenue lors de la communication avec le serveur.';

    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else if (error.status) {
      // Erreur côté serveur
      errorMessage = `Statut: ${error.status}, Message: ${error.error.error || error.statusText}`;
    }

    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
