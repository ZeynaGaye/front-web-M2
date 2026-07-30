import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';


export interface ServicePredefiniDto {
  id: number;
  nom: string;
  categorie: string;
  description?: string;
  actif: boolean;
  popularite?: number;
  motsCles?: string;
  createdAt?: string;
}

export interface ServicePredefiniGroupe {
  categorie: string;
  services: ServicePredefiniDto[];
  count: number;
}

export interface ServiceDetectionResponse {
  typeDetection: 'SERVICE_PREDEFINI' | 'NOUVEAU_SERVICE';
  servicePredefini?: ServicePredefiniDto;
  service?: ServicePredefiniDto; // Alias pour compatibilité
  message: string;
  scoreConfiance?: number;
  needsConfirmation?: boolean;
  suggestion?: ServicePredefiniDto;
  originalName?: string;
  actions?: {
    useStandard: string;
    createNew: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ServicePredefiniService {
  private readonly API_URL = `${environment.apiUrl}/services-predefinis`;
  
  // Cache des services
  private servicesCache = new BehaviorSubject<ServicePredefiniDto[]>([]);
  public services$ = this.servicesCache.asObservable();

  constructor(private http: HttpClient) {}

  /**
   *  Récupérer tous les services prédéfinis (universels)
   */
  getTousLesServices(categorie?: string): Observable<ServicePredefiniDto[]> {
    //  CORRECTION: Construire les params correctement
    let params: any = {};
    if (categorie) {
      params.categorie = categorie;
    }
    
    return this.http.get<any>(`${this.API_URL}/all`, { params })
      .pipe(
        map((response: any) => {

          const services = response.services || response; // Gérer les deux formats
          this.servicesCache.next(services);
          return services as ServicePredefiniDto[];
        }),
        catchError(error => {
          console.error(' Erreur récupération services prédéfinis:', error);
          return [];
        })
      );
  }

  /**
   *  Récupérer les services pour salon (alias - tous les services)
   */
  getServicesPourSalon(): Observable<ServicePredefiniDto[]> {
    return this.getTousLesServices(); // Tous les services sont disponibles pour salon
  }

  /**
   *  Récupérer les services pour freelance (alias - tous les services)
   */
  getServicesPourFreelance(): Observable<ServicePredefiniDto[]> {
    return this.getTousLesServices(); // Tous les services sont disponibles pour freelance
  }

  /**
   *  Rechercher des services
   */
  rechercherServices(query: string, limite: number = 10): Observable<ServicePredefiniDto[]> {
    //  CORRECTION: Params avec types corrects
    const params = { 
      query: query, 
      limit: limite.toString() 
    };
    
    return this.http.get<any>(`${this.API_URL}/search`, { params })
      .pipe(
        map((response: any) => {

          return (response.services || []) as ServicePredefiniDto[];
        }),
        catchError(error => {
          console.error(' Erreur recherche services:', error);
          return [];
        })
      );
  }

  /**
   *  Suggestion intelligente (utilise votre endpoint existant)
   */
  detecterService(nomService: string): Observable<ServiceDetectionResponse> {
    const payload = { nomService: nomService };
    
    return this.http.post<any>(`${this.API_URL}/suggest-alternative`, payload)
      .pipe(
        map((response: any) => {

          
          // Adapter la réponse à votre format
          if (response.hasAlternative) {
            return {
              typeDetection: 'SERVICE_PREDEFINI' as const,
              servicePredefini: response.serviceStandardise,
              service: response.serviceStandardise, // Alias pour compatibilité
              message: response.message,
              needsConfirmation: true,
              suggestion: response.serviceStandardise,
              originalName: response.nomSaisi
            } as ServiceDetectionResponse;
          } else {
            return {
              typeDetection: 'NOUVEAU_SERVICE' as const,
              message: response.message
            } as ServiceDetectionResponse;
          }
        }),
        catchError(error => {
          console.error(' Erreur détection service:', error);
          return [{
            typeDetection: 'NOUVEAU_SERVICE' as const,
            message: 'Service créé comme nouveau'
          } as ServiceDetectionResponse];
        })
      );
  }

  /**
   * Proposer un nouveau service absent de la liste.
   * Le backend normalise le nom, vérifie les doublons et crée l'entrée si vraiment nouveau.
   */
  proposerNouveauService(nom: string, categorie: string): Observable<{ service: ServicePredefiniDto; estNouveau: boolean; message: string }> {
    return this.http.post<any>(`${this.API_URL}/proposer`, { nom, categorie })
      .pipe(
        map((response: any) => ({
          service: response.service as ServicePredefiniDto,
          estNouveau: response.estNouveau as boolean,
          message: response.message as string
        }))
      );
  }

  /**
   *  Récupérer les statistiques
   */
  getStatistiques(): Observable<any> {
    return this.http.get<any>(`${this.API_URL}/statistics`)
      .pipe(
        map((response: any) => response),
        catchError(error => {
          console.error(' Erreur statistiques:', error);
          return [{}];
        })
      );
  }

  /**
   *  Grouper les services par catégorie
   */
  grouperParCategorie(services: ServicePredefiniDto[]): ServicePredefiniGroupe[] {
    const groupes = services.reduce((acc, service) => {
      const categorie = service.categorie;
      if (!acc[categorie]) {
        acc[categorie] = [];
      }
      acc[categorie].push(service);
      return acc;
    }, {} as { [key: string]: ServicePredefiniDto[] });

    return Object.keys(groupes)
      .sort()
      .map(categorie => ({
        categorie,
        services: groupes[categorie].sort((a, b) => 
          (b.popularite || 0) - (a.popularite || 0) || 
          a.nom.localeCompare(b.nom)
        ),
        count: groupes[categorie].length
      }));
  }

  /**
   *  Rafraîchir le cache
   */
  rafraichirCache(): void {
    this.getTousLesServices().subscribe();
  }
}