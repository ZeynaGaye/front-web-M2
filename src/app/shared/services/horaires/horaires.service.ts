// horaires.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, forkJoin } from 'rxjs';
import { map } from 'rxjs/operators';

import { HoraireJour, Conge, Creneau } from '../../components/horaires-manager/horaires-manager.component';
import { environment } from '../../../../environments/environment';


@Injectable({
  providedIn: 'root'
})
export class HorairesService {

  private baseUrl = `${environment.apiUrl}/disponibilites`;

  constructor(private http: HttpClient) { }

  /**
   * Récupère les horaires d'ouverture pour un salon ou un freelance.
   * Utilise les endpoints /salon/{id}/horaires ou /freelance/{id}/horaires
   */
  getHoraires(entityId: number, isSalon: boolean): Observable<HoraireJour[]> {
    const entityType = isSalon ? 'salon' : 'freelance';
    const url = `${this.baseUrl}/${entityType}/${entityId}/horaires`;

    return this.http.get<any>(url).pipe(
      map(response => {
        // Le backend retourne un Map.of("horaires", List<HorairesOuvertureDTO>)
        return response.horaires.map((h: any) => ({
          id: h.id,
          jourSemaine: h.jourSemaine, // Le code d'énumération (e.g., 'MONDAY')
          jourSemaineLibelle: h.jourSemaineLibelle, // Le libellé en français (e.g., 'Lundi')
          estOuvert: h.estOuvert,
          heureOuverture: h.heureOuverture,
          heureFermeture: h.heureFermeture,
          dureeCreneauMinutes: h.dureeCreneauMinutes,
          pauseEntreCreneauxMinutes: h.pauseEntreCreneauxMinutes, // Assurez-vous que le DTO côté Angular a cette propriété
          salonId: h.salonId,
          freelanceId: h.freelanceId
        })) as HoraireJour[];
      })
    );
  }

  /**
   * Sauvegarde les horaires pour un salon ou un freelance.
   * Fait un appel PUT pour chaque jour.
   */
  saveHoraires(entityId: number, isSalon: boolean, horairesToSave: HoraireJour[]): Observable<any> {
    const observables: Observable<any>[] = [];
    const entityType = isSalon ? 'salon' : 'freelance';

    horairesToSave.forEach(horaire => {
      // Utilisez le code du jourSemaine pour le paramètre de l'URL du backend
      const jourParam = horaire.jourSemaine; // Ex: 'MONDAY'
      const url = `${this.baseUrl}/${entityType}/${entityId}/horaires/${jourParam}`;

      // Le backend s'attend à un Map<String, Object> pour le corps de la requête
      const data = {
        estOuvert: horaire.estOuvert,
        heureOuverture: horaire.heureOuverture,
        heureFermeture: horaire.heureFermeture,
        dureeCreneauMinutes: horaire.dureeCreneauMinutes,
        // Pas besoin d'envoyer id, jourSemaine ou les IDs d'entité ici car ils sont dans l'URL ou gérés par le backend.
        // Si pauseEntreCreneauxMinutes est modifiable via le frontend, ajoutez-le ici.
        // pauseEntreCreneauxMinutes: horaire.pauseEntreCreneauxMinutes // Décommenter si pertinent
      };

      observables.push(this.http.put(url, data));
    });

    return forkJoin(observables);
  }

  /**
   * Crée les horaires par défaut pour un salon ou un freelance.
   * POST /api/disponibilites/salon/{id}/horaires/defaut ou /api/disponibilites/freelance/{id}/horaires/defaut
   */
  createDefaultHoraires(entityId: number, isSalon: boolean): Observable<any> {
    const entityType = isSalon ? 'salon' : 'freelance';
    const url = `${this.baseUrl}/${entityType}/${entityId}/horaires/defaut`;
    return this.http.post(url, {}); // Le corps de la requête peut être vide
  }


  /**
   * Récupère les créneaux disponibles pour une date donnée.
   * Utilise les endpoints /salon/{id}?date=... ou /freelance/{id}?date=...
   */
  getPlanning(entityId: number, isSalon: boolean, dateStr: string): Observable<Creneau[]> {
    const entityType = isSalon ? 'salon' : 'freelance';
    // Utiliser le paramètre `dureeService` par défaut de 30, comme dans le contrôleur backend
    const url = `${this.baseUrl}/${entityType}/${entityId}?date=${dateStr}&dureeService=30`;

    return this.http.get<any>(url).pipe(
      map(response => {
        // Le backend retourne un Map.of("creneaux", List<CreneauDisponibiliteDTO>)
        return response.creneaux.map((c: any) => ({
          heureDebut: c.heureDebut,
          heureFin: c.heureFin
        })) as Creneau[];
      })
    );
  }

  // --- Gestion des Congés (Maintenant implémentée côté BACKEND Spring) ---

  /**
   * Récupère les congés pour une entité spécifique.
   * GET /api/disponibilites/salon/{id}/conges ou /api/disponibilites/freelance/{id}/conges
   */
  getConges(entityId: number, isSalon: boolean): Observable<Conge[]> {
    const entityType = isSalon ? 'salon' : 'freelance';
    const url = `${this.baseUrl}/${entityType}/${entityId}/conges`;
    return this.http.get<any>(url).pipe(
      map(response => {
        // Le backend retourne un Map.of("conges", List<CongeDTO>)
        return response.conges as Conge[];
      })
    );
  }

  /**
   * Ajoute un congé pour une entité spécifique.
   * POST /api/disponibilites/salon/{id}/conges ou /api/disponibilites/freelance/{id}/conges
   */
  addConge(entityId: number, isSalon: boolean, newConge: Conge): Observable<Conge> {
    const entityType = isSalon ? 'salon' : 'freelance';
    const url = `${this.baseUrl}/${entityType}/${entityId}/conges`;
    return this.http.post<any>(url, newConge).pipe(
      map(response => {
        // Le backend retourne un Map.of("conge", createdConge)
        return response.conge as Conge;
      })
    );
  }

  /**
   * Supprime un congé pour une entité spécifique.
   * DELETE /api/disponibilites/{entityType}/{entityId}/conges/{congeId}
   */
  deleteConge(entityId: number, isSalon: boolean, congeId: number): Observable<any> { // Change to 'any' if backend returns a Map
    const entityType = isSalon ? 'salon' : 'freelance';
    const url = `${this.baseUrl}/${entityType}/${entityId}/conges/${congeId}`;
    return this.http.delete(url);
  }
}