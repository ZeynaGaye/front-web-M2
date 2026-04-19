import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';


//  INTERFACES POUR LES REQUÊTES
export interface CreateServiceSalonRequest {
  servicePredefiniId?: number;
  nomService?: string;
  categorieService?: string;
  description?: string;
  prix: number;
  dureeEnMinutes?: number;
}

export interface CreateServiceFreelanceRequest {
  servicePredefiniId?: number;
  nomService?: string;
  categorieService?: string;
  description?: string;
  prixMin: number;
  prixMax: number;
  dureeEnMinutes?: number;
  typeIntervention?: 'DOMICILE' | 'SALON' | 'MIXTE';
  materielInclus?: boolean;
  deplacementInclus?: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
}

//  INTERFACES POUR LES RÉPONSES
export interface ServiceCreationResponse {
  service?: any;
  type: 'SERVICE_PREDEFINI' | 'NOUVEAU_SERVICE';
  message: string;
  needsConfirmation?: boolean;
  suggestion?: any;
  originalName?: string;
  actions?: {
    useStandard: string;
    createNew: string;
  };
}

export interface ConfirmationRequest {
  action: 'useStandard' | 'createNew'; // <--- C'est la ligne clé pour la correction
  servicePredefiniId?: number;
  nomService?: string;
  description?: string;
  prix?: number; // Pour les services de salon
  prixMin?: number; // Pour les services de freelance
  prixMax?: number; // Pour les services de freelance
  dureeEnMinutes?: number;
  // Champs spécifiques aux freelances
  typeIntervention?: 'DOMICILE' | 'SALON' | 'MIXTE';
  materielInclus?: boolean;
  deplacementInclus?: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
 
  [key: string]: any;
}
@Injectable({
  providedIn: 'root'
})
export class ServiceCreationIntelligenteService {
  private readonly API_URL_SALON = `${environment.apiUrl}/services`;
  private readonly API_URL_FREELANCE = `${environment.apiUrl}/service-freelance`;

  constructor(private http: HttpClient) {}

  /**
   *  Créer un service pour salon avec détection intelligente
   */
  creerServiceSalonIntelligent(
    salonId: number, 
    request: CreateServiceSalonRequest
  ): Observable<ServiceCreationResponse> {
    return this.http.post<ServiceCreationResponse>(
      `${this.API_URL_SALON}/salon/${salonId}/intelligent`,
      request
    );
  }

  /**
   * ‍ Créer un service pour freelance avec détection intelligente
   */
  creerServiceFreelanceIntelligent(
    freelanceId: number,
    request: CreateServiceFreelanceRequest
  ): Observable<ServiceCreationResponse> {
    return this.http.post<ServiceCreationResponse>(
      `${this.API_URL_FREELANCE}/freelance/${freelanceId}/intelligent`,
      request
    );
  }

  /**
   *  Confirmer la création après suggestion
   */
  confirmerCreationServiceFreelance(
    freelanceId: number,
    confirmation: ConfirmationRequest
  ): Observable<ServiceCreationResponse> {
    return this.http.post<ServiceCreationResponse>(
      `${this.API_URL_FREELANCE}/freelance/${freelanceId}/confirm-creation`,
      confirmation
    );
  }

  /**
   *  Confirmer la création salon (si vous l'implémentez côté backend)
   */
  confirmerCreationServiceSalon(
    salonId: number,
    confirmation: ConfirmationRequest
  ): Observable<ServiceCreationResponse> {
    // À implémenter côté backend si nécessaire
    return this.http.post<ServiceCreationResponse>(
      `${this.API_URL_SALON}/salon/${salonId}/confirm-creation`,
      confirmation
    );
  }

  /**
   *  Prévisualiser la détection avant création (utilise votre endpoint)
   */
  previsualiserDetection(
    nomService: string, 
    type: 'salon' | 'freelance'
  ): Observable<any> {
    // Utilise votre endpoint suggest-alternative
    return this.http.post<any>(
      `${environment.apiUrl}/api/services-predefinis/suggest-alternative`,
      { nomService }
    ).pipe(
      map((response: { hasAlternative: any; serviceStandardise: any; message: any; nomSaisi: any; }) => {
        // Adapter votre format de réponse
        if (response.hasAlternative) {
          return {
            typeDetection: 'SERVICE_PREDEFINI',
            servicePredefini: response.serviceStandardise,
            service: response.serviceStandardise,
            message: response.message,
            needsConfirmation: true,
            suggestion: response.serviceStandardise,
            originalName: response.nomSaisi
          };
        } else {
          return {
            typeDetection: 'NOUVEAU_SERVICE',
            message: response.message
          };
        }
      })
    );
  }
}