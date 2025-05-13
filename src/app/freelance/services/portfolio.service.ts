import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { PortfolioItem } from '../../models/PortfolioItem';

@Injectable({
  providedIn: 'root',
})
export class PortfolioService {

  private apiUrl = 'http://localhost:8081/api/portfolio';

  constructor(private http: HttpClient) {}

  /**
   * Récupère le portfolio du freelance actuellement connecté
   */
  getCurrentUserPortfolio(): Observable<PortfolioItem[]> {
    return this.http.get<PortfolioItem[]>(`${this.apiUrl}/freelance/me`).pipe(
      retry(1),
      tap((items) =>
        console.log(
          `Current user portfolio items fetched, count: ${items.length}`
        )
      ),
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
    return this.http
      .get<PortfolioItem[]>(`${this.apiUrl}/freelance/${freelanceId}`)
      .pipe(
        retry(1),
        tap((items) =>
          console.log(
            `Portfolio items fetched for freelance ${freelanceId}, count: ${items.length}`
          )
        ),
        catchError(this.handleError)
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
   */ updatePortfolioItem(
    id: number,
    itemData: any
  ): Observable<PortfolioItem> {
    return this.http
      .put<PortfolioItem>(`${this.apiUrl}/${id}`, itemData)
      .pipe(catchError(this.handleError));
  }

  /**
   * Supprime un élément du portfolio
   */// Ajout de logs pour déboguer la suppression
deletePortfolioItem(itemId: number): Observable<void> {
  return this.http.delete<void>(`${this.apiUrl}/${itemId}`)
    .pipe(
      tap(() => console.log(`Élément ${itemId} supprimé avec succès`)),
      catchError(this.handleError)
    );
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

    console.log("Envoi de l'image:", imageFile.name, 'taille:', imageFile.size);
    console.log('Légende:', legende);

    return this.http.post(`${this.apiUrl}/${itemId}/images`, formData).pipe(
      tap((response) => console.log('Image ajoutée avec succès:', response)),
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
      tap((response) => console.log('Création réussie:', response)),
      catchError(this.handleError)
    );
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
    }
    console.error('Une erreur est survenue:', errorMessage);
    return throwError(() => new Error(errorMessage));
  }

  getImageUrl(filename: string): string {
    if (!filename) return 'assets/images/client souriante.jpg';

    // Ajouter un log pour voir le chemin construit et le nom de fichier
    console.log('Nom du fichier image reçu:', filename);
    const imageUrl = `http://localhost:8081/api/portfolio/images/${filename}`;
    console.log("URL d'image construite:", imageUrl);

    return imageUrl;
  }

  /**
 * Met à jour la légende d'une image
 */
updateImageCaption(imageId: number, legende: string): Observable<any> {
  return this.http.patch(`${this.apiUrl}/images/${imageId}`, { legende })
    .pipe(
      catchError(this.handleError)
    );
  }

  /**
 * Récupère la liste des IDs des éléments likés par l'utilisateur
 */
getUserLikes(): Observable<number[]> {
  const url = `${this.apiUrl}/portfolio/user-likes`;
  return this.http.get<number[]>(url)
    .pipe(
      catchError(this.handleError)
    );
}



/**
 * Retire un like d'un élément du portfolio
 */
unlikeItem(itemId: number): Observable<PortfolioItem> {
  const url = `${this.apiUrl}/portfolio/${itemId}/unlike`;
  return this.http.post<PortfolioItem>(url, {})
    .pipe(
      catchError(this.handleError)
    );
}
}

