import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap, map } from 'rxjs/operators';
import { PortfolioItem } from '../../models/PortfolioItem';


interface UploadResponse {
  photos: any[];
  total: number;
  message: string;
}

interface DeleteResponse {
  success: boolean;
  photoId: number;
  message?: string;
  error?: string;
}

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {

  private apiUrl = 'http://localhost:8081/api/portfolio';
  private videoApiUrl = 'http://localhost:8081/api/portfolio-videos';
  private imageBaseUrl = 'http://localhost:8081/uploads';
  constructor(private http: HttpClient) {}

  /**
   * Récupère le portfolio du freelance actuellement connecté
   */
  getCurrentUserPortfolio(): Observable<PortfolioItem[]> {

    
    // Ajouter un paramètre timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    return this.http.get<PortfolioItem[]>(`${this.apiUrl}/freelance/me?_t=${timestamp}`).pipe(
      retry(1),
      tap((items) => {

        //  DEBUG : Log des images reçues (comme dans votre salon)
        items.forEach(item => {

        });
      }),
      catchError(this.handleError)
    );
  }

  /**
   * Récupère les statistiques du portfolio du freelance actuellement connecté
   */
  getCurrentUserPortfolioStats(): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/freelance/me/stats`)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Récupère le portfolio d'un freelance spécifique par ID
   */
  getFreelancePortfolio(freelanceId: number): Observable<PortfolioItem[]> {

    
    // Ajouter un paramètre timestamp pour éviter le cache
    const timestamp = new Date().getTime();
    
    return this.http
      .get<PortfolioItem[]>(`${this.apiUrl}/freelance/${freelanceId}?_t=${timestamp}`)
      .pipe(
        retry(1),
        tap((items) => {

          //  DEBUG : Log des images reçues (comme dans votre salon)
          items.forEach(item => {

          });
        }),
        catchError(this.handleError)
      );
  }

  /**
   *  NOUVELLE : Récupérer les images d'un élément de portfolio (comme getSalonPhotos)
   */
  getPortfolioItemImages(itemId: number): Observable<any[]> {
    return this.http.get<any>(`${this.apiUrl}/${itemId}/images`).pipe(
      map((response: any) => {

        
        // Traiter la réponse comme dans votre salon
        if (response && typeof response === 'object' && 'photos' in response) {
          return response.photos || [];
        } else if (Array.isArray(response)) {
          return response;
        } else {
          return [];
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVELLE : Upload d'images pour un élément de portfolio (comme uploadSalonPhotos)
   */
  uploadPortfolioItemImages(itemId: number, formData: FormData): Observable<UploadResponse> {
    return this.http.post<any>(`${this.apiUrl}/${itemId}/images`, formData).pipe(
      map((response: any) => {

        
        // Normaliser la réponse comme dans votre salon
        if (response && response.photos && Array.isArray(response.photos)) {
          return {
            photos: response.photos,
            total: response.total || response.photos.length,
            message: response.message || 'Images uploadées avec succès'
          };
        } else {
          return {
            photos: [],
            total: 0,
            message: 'Upload terminé'
          };
        }
      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVELLE : Supprimer une image de portfolio (comme deleteSalonPhoto)
   */
  deletePortfolioItemImage(imageId: number): Observable<DeleteResponse> {
    return this.http.delete<any>(`${this.apiUrl}/images/${imageId}`).pipe(
      map((response: any) => {

        
        // Normaliser la réponse comme dans votre salon
        return {
          success: true,
          photoId: imageId,
          message: 'Image supprimée avec succès'
        };
      }),
      catchError((error) => {
        console.error(' Erreur suppression portfolio image:', error);
        return throwError(() => ({
          success: false,
          photoId: imageId,
          error: error.message || 'Erreur de suppression'
        }));
      })
    );
  }

  /**
   * Récupère un élément spécifique du portfolio
   */
  getPortfolioItem(itemId: number): Observable<PortfolioItem> {
    return this.http
      .get<PortfolioItem>(`${this.apiUrl}/${itemId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Crée un nouvel élément de portfolio
   */
  createPortfolioItem(
    freelanceId: number,
    item: PortfolioItem,
    images: File[]
  ): Observable<PortfolioItem> {
    const formData = new FormData();
    const itemBlob = new Blob([JSON.stringify(item)], {
      type: 'application/json',
    });

    formData.append('item', itemBlob);

    if (images && images.length) {
      images.forEach((image) => {
        formData.append('images', image);
      });
    }

    return this.http
      .post<PortfolioItem>(`${this.apiUrl}/freelance/${freelanceId}`, formData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Met à jour un élément du portfolio
   */
  updatePortfolioItem(id: number, itemData: any): Observable<PortfolioItem> {
    return this.http
      .put<PortfolioItem>(`${this.apiUrl}/${id}`, itemData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprime un élément du portfolio
   */
  deletePortfolioItem(itemId: number): Observable<void> {

    
    return this.http.delete<void>(`${this.apiUrl}/${itemId}`)
      .pipe(
        tap(() => {

        }),
        catchError((error) => {
          console.error(` Erreur suppression élément ${itemId}:`, error);
          return this.handleError(error);
        })
      );
  }

  /**
   * Enregistre une vue sur un élément (appelé par l'IntersectionObserver)
   */
  recordView(itemId: number): Observable<void> {
    return this.http
      .post<void>(`${this.apiUrl}/${itemId}/view`, {})
      .pipe(catchError(() => {
        return new Observable<void>(obs => obs.complete());
      }));
  }

  /**
   * Ajoute un "j'aime" à un élément du portfolio
   */
  likeItem(itemId: number): Observable<PortfolioItem> {
    return this.http
      .post<PortfolioItem>(`${this.apiUrl}/${itemId}/like`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Retire un like d'un élément du portfolio
   */
  unlikeItem(itemId: number): Observable<PortfolioItem> {
    return this.http
      .post<PortfolioItem>(`${this.apiUrl}/${itemId}/unlike`, {})
      .pipe(catchError(this.handleError));
  }

  /**
   * Ajoute une image à un élément du portfolio
   */
  addImageToItem(
    itemId: number,
    imageFile: File,
    legende?: string
  ): Observable<any> {
    const formData = new FormData();
    formData.append('image', imageFile);

    if (legende) {
      formData.append('legende', legende);
    }




    return this.http.post(`${this.apiUrl}/${itemId}/images`, formData).pipe(
      catchError((error) => {
        console.error("Erreur lors de l'ajout de l'image:", error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Supprime une image
   */
  deleteImage(imageId: number): Observable<void> {
    return this.http
      .delete<void>(`${this.apiUrl}/images/${imageId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère les statistiques du portfolio
   */
  getPortfolioStats(freelanceId: number): Observable<any> {
    return this.http
      .get<any>(`${this.apiUrl}/freelance/${freelanceId}/stats`)
      .pipe(retry(1), catchError(this.handleError));
  }

  /**
   * Ajout d'un nouvel élément au portfolio avec l'API mise à jour
   */
  addPortfolioItem(formData: FormData): Observable<PortfolioItem> {
    // Récupérer les données du formulaire
    const titre = formData.get('titre');
    const description = formData.get('description');
    const categories = formData.getAll('categories[]');
    const tags = formData.getAll('tags[]');

    // Créer l'objet item
    const itemData = {
      titre: titre,
      description: description,
      categories: categories,
      tags: tags,
    };

    // Créer un nouveau FormData pour la requête
    const apiFormData = new FormData();

    // Ajouter l'item sous forme de Blob JSON
    const itemBlob = new Blob([JSON.stringify(itemData)], {
      type: 'application/json',
    });
    apiFormData.append('item', itemBlob);

    // Ajouter les images
    const images = formData.getAll('images[]');
    if (images && images.length) {
      images.forEach((image) => {
        apiFormData.append('images', image);
      });
    }

    // Faire la requête au endpoint qui utilise l'utilisateur connecté
    return this.http.post<PortfolioItem>(this.apiUrl, apiFormData).pipe(
      catchError(this.handleError)
    );
  }

  /**
   *  CORRIGÉE : Construction de l'URL des images
   */
  getImageUrl(filename: string): string {
    if (!filename) {

      return 'assets/images/client souriante.jpg';
    }

    // Nettoyer le nom de fichier
    let cleanFilename = filename;
    
    //  CORRECTION : Gérer les chemins Windows et Unix
    if (filename.includes('\\') || filename.includes('/')) {
      // Remplacer les backslashes par des forward slashes
      const normalizedPath = filename.replace(/\\/g, '/');
      const parts = normalizedPath.split('/');
      cleanFilename = parts[parts.length - 1]; // Prendre le dernier élément (nom du fichier)
    }
    
    // Si le filename commence par http, c'est déjà une URL complète
    if (filename.startsWith('http')) {

      return filename;
    }

    //  CORRECTION : Gérer le préfixe "uploads/"
    if (cleanFilename.startsWith('uploads/')) {
      cleanFilename = cleanFilename.replace('uploads/', '');
    }

    // Construire l'URL complète
    const imageUrl = `${this.imageBaseUrl}/${cleanFilename}`;
    




    return imageUrl;
  }

  /**
   *  NOUVELLE : Test de connectivité avec le serveur d'images
   */
  async testImageServer(): Promise<boolean> {
    try {
      const response = await fetch(`${this.imageBaseUrl}`);

      return response.status === 200;
    } catch (error) {
      console.error(' Erreur test serveur d\'images:', error);
      return false;
    }
  }

  /**
   *  NOUVELLE : Vérification si une image existe
   */
  async checkImageExists(filename: string): Promise<boolean> {
    try {
      const imageUrl = this.getImageUrl(filename);
      const response = await fetch(imageUrl, { method: 'HEAD' });
      const exists = response.ok;

      return exists;
    } catch (error) {
      console.error(` Erreur vérification image ${filename}:`, error);
      return false;
    }
  }

  // ── Vidéos portfolio ─────────────────────────────────────

  getPortfolioItemVideos(itemId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.videoApiUrl}/portfolio-item/${itemId}`)
      .pipe(catchError(this.handleError));
  }

  uploadPortfolioItemVideo(formData: FormData): Observable<any> {
    return this.http.post<any>(`${this.videoApiUrl}/upload`, formData)
      .pipe(catchError(this.handleError));
  }

  deletePortfolioItemVideo(videoId: number): Observable<any> {
    return this.http.delete<any>(`${this.videoApiUrl}/${videoId}`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Met à jour la légende d'une image
   */
  updateImageCaption(imageId: number, legende: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/images/${imageId}`, { legende })
      .pipe(catchError(this.handleError));
  }

  /**
   * Récupère la liste des IDs des éléments likés par l'utilisateur
   */
  getUserLikes(): Observable<number[]> {
    return this.http.get<number[]>(`${this.apiUrl}/user-likes`)
      .pipe(catchError(this.handleError));
  }

  /**
   * Gestion des erreurs HTTP
   */
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
      console.error('Détails de l\'erreur serveur:', error);
    }
    console.error('Une erreur est survenue:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}