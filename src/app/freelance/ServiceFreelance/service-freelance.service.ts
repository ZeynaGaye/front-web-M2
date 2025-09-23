import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

// ===== INTERFACES DTOs =====

export interface ServiceFreelanceResponseDto {
  id: number;
  nom: string;
  description: string;
  categorie: string;
  prixMin: number;
  prixMax: number;
  prixMoyen?: number;
  dureeEnMinutes: number;
  dureeFormatee?: string;
  typeIntervention: TypeIntervention;
  typeInterventionLabel?: string;
  materielInclus: boolean;
  deplacementInclus: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles: boolean;
  disponibleWeekend: boolean;
  disponibleSoir: boolean;
  descriptionComplete?: string;
  prixFormatte?: string;
  freelanceId: number;
  freelanceNom?: string;
  freelancePrenom?: string;
  // ✅ AJOUT : Champ potentiellement manquant pour le service prédéfini
  servicePredefiniId?: number;
}

export interface ServiceFreelanceRequestDto {
  nom: string;
  description?: string;
  categorie: string;
  prixMin: number;
  prixMax: number;
  dureeEnMinutes: number;
  typeIntervention: TypeIntervention;
  materielInclus: boolean;
  deplacementInclus: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles: boolean;
  disponibleWeekend: boolean;
  disponibleSoir: boolean;
  // ✅ AJOUT : Champ pour le service prédéfini
  servicePredefiniId?: number;
}

export interface FreelanceServicesStatsDto {
  nombreServices: number;
  prixMoyenMin: number;
  prixMoyenMax: number;
  dureeMoyenne: number;
  categories: string[];
}

export interface ErrorResponse {
  message: string;
  timestamp: number;
}

// ✅ CORRIGÉ : Enum correspondant au backend Java
export enum TypeIntervention {
  DOMICILE = 'DOMICILE',
  SALON = 'SALON',  // ✅ Changé de STUDIO_PRIVE à SALON
  MIXTE = 'MIXTE'
  // ✅ Supprimé SALON_PARTENAIRE car pas dans le backend
}

// ✅ AJOUT : Interface pour la création intelligente
export interface CreateServiceFreelanceRequest {
  servicePredefiniId?: number;
  nomService?: string;
  description?: string;
  prixMin: number;
  prixMax: number;
  dureeEnMinutes?: number;
  typeIntervention?: TypeIntervention;
  materielInclus?: boolean;
  deplacementInclus?: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
}

// ✅ AJOUT : Interface pour la réponse de création intelligente
export interface ServiceCreationResponse {
  service?: ServiceFreelanceResponseDto;
  needsConfirmation?: boolean;
  suggestion?: any; // ServicePredefiniDto
  originalName?: string;
  type?: string;
  message?: string;
  actions?: {
    useStandard?: string;
    createNew?: string;
  };
}

// ===== INTERFACES POUR LES FILTRES =====

export interface ServiceSearchCriteria {
  nom?: string;
  categorie?: string;
  prixMax?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ServiceFreelanceService {
  
  private readonly API_URL = `${environment.apiUrl}/service-freelance`;

  constructor(private http: HttpClient) {
    console.log('🔧 ServiceFreelanceService API_URL:', this.API_URL);
  }

  // ===== GESTION DES SERVICES D'UN FREELANCE =====

  /**
   * Récupère tous les services d'un freelance
   */
  getServicesByFreelance(freelanceId: number): Observable<ServiceFreelanceResponseDto[]> {
    const url = `${this.API_URL}/freelance/${freelanceId}`;
    console.log('📡 Chargement services pour freelance:', url);
    
    return this.http.get<ServiceFreelanceResponseDto[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Crée un nouveau service pour un freelance
   */
  createService(freelanceId: number, serviceData: ServiceFreelanceRequestDto): Observable<ServiceFreelanceResponseDto> {
    const url = `${this.API_URL}/freelance/${freelanceId}`;
    console.log('🆕 Création service:', url, serviceData);
    
    return this.http.post<ServiceFreelanceResponseDto>(url, serviceData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * ✅ NOUVEAU : Création intelligente de service
   */
  createServiceIntelligent(freelanceId: number, serviceData: CreateServiceFreelanceRequest): Observable<ServiceCreationResponse> {
    const url = `${this.API_URL}/freelance/${freelanceId}/intelligent`;
    console.log('🧠 Création service intelligent:', url, serviceData);
    
    return this.http.post<ServiceCreationResponse>(url, serviceData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * ✅ NOUVEAU : Confirmation après suggestion
   */
  confirmServiceCreation(freelanceId: number, confirmationData: any): Observable<ServiceCreationResponse> {
    const url = `${this.API_URL}/freelance/${freelanceId}/confirm-creation`;
    console.log('✅ Confirmation création service:', url, confirmationData);
    
    return this.http.post<ServiceCreationResponse>(url, confirmationData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Met à jour un service existant
   */
  updateService(serviceId: number, serviceData: ServiceFreelanceRequestDto): Observable<ServiceFreelanceResponseDto> {
    const url = `${this.API_URL}/${serviceId}`;
    console.log('✏️ Mise à jour service:', url, serviceData);
    
    return this.http.put<ServiceFreelanceResponseDto>(url, serviceData)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère un service par ID
   */
  getServiceById(serviceId: number): Observable<ServiceFreelanceResponseDto> {
    const url = `${this.API_URL}/${serviceId}`;
    console.log('🔍 Récupération service:', url);
    
    return this.http.get<ServiceFreelanceResponseDto>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Supprime un service
   */
  deleteService(serviceId: number): Observable<void> {
    const url = `${this.API_URL}/${serviceId}`;
    console.log('🗑️ Suppression service:', url);
    
    return this.http.delete<void>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ===== RECHERCHE ET FILTRAGE =====

  /**
   * Recherche des services avec critères
   */
  searchServices(criteria: ServiceSearchCriteria): Observable<ServiceFreelanceResponseDto[]> {
    let params = new HttpParams();
    
    // ✅ Gestion sécurisée des valeurs nulles
    if (criteria.nom && criteria.nom.trim()) {
      params = params.set('nom', criteria.nom.trim());
    }
    if (criteria.categorie && criteria.categorie.trim()) {
      params = params.set('categorie', criteria.categorie.trim());
    }
    if (criteria.prixMax !== null && criteria.prixMax !== undefined) {
      params = params.set('prixMax', criteria.prixMax.toString());
    }

    const url = `${this.API_URL}/search`;
    console.log('🔎 Recherche services:', url, criteria);

    return this.http.get<ServiceFreelanceResponseDto[]>(url, { params })
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Récupère tous les services disponibles
   */
  getAllServices(): Observable<ServiceFreelanceResponseDto[]> {
    const url = `${this.API_URL}/all`;
    console.log('📋 Récupération tous les services:', url);
    
    return this.http.get<ServiceFreelanceResponseDto[]>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  /**
   * Filtre les services côté client
   */
  filterServices(services: ServiceFreelanceResponseDto[], criteria: ServiceSearchCriteria): ServiceFreelanceResponseDto[] {
    return services.filter(service => {
      // Filtre par nom
      if (criteria.nom && !service.nom.toLowerCase().includes(criteria.nom.toLowerCase())) {
        return false;
      }
      
      // Filtre par catégorie
      if (criteria.categorie && service.categorie !== criteria.categorie) {
        return false;
      }
      
      // Filtre par prix maximum
      if (criteria.prixMax && service.prixMin > criteria.prixMax) {
        return false;
      }
      
      return true;
    });
  }

  // ===== STATISTIQUES =====

  /**
   * Obtient les statistiques d'un freelance
   */
  getFreelanceStats(freelanceId: number): Observable<FreelanceServicesStatsDto> {
    const url = `${this.API_URL}/freelance/${freelanceId}/stats`;
    console.log('📊 Chargement statistiques:', url);
    
    return this.http.get<FreelanceServicesStatsDto>(url)
      .pipe(
        catchError(this.handleError)
      );
  }

  // ===== MÉTHODES UTILITAIRES =====

  /**
   * Obtient les catégories uniques
   */
  getUniqueCategories(services: ServiceFreelanceResponseDto[]): string[] {
    const categories = services.map(service => service.categorie);
    return [...new Set(categories)].sort();
  }

  /**
   * ✅ CORRIGÉ : Types d'intervention correspondant au backend
   */
  getTypesIntervention(): { value: TypeIntervention; label: string }[] {
    return [
      { value: TypeIntervention.DOMICILE, label: 'À domicile uniquement' },
      { value: TypeIntervention.SALON, label: 'En salon uniquement' },
      { value: TypeIntervention.MIXTE, label: 'Domicile et salon' }
    ];
  }

  /**
   * Obtient les catégories de services disponibles
   */
  getCategories(): string[] {
    return [
      'Coiffure',
      'Maquillage', 
      'Soins du visage',
      'Manucure/Pédicure',
      'Épilation',
      'Massage',
      'Extensions',
      'Coloration',
      'Tresses',
      'Locks'
    ];
  }

  /**
   * ✅ CORRIGÉ : Formate un prix en CFA (pas en euros)
   */
  formatPrice(price: number): string {
    if (!price || price === 0) {
      return '0 CFA';
    }
    
    // Formater avec des espaces pour les milliers
    const formattedNumber = new Intl.NumberFormat('fr-FR').format(price);
    return `${formattedNumber} CFA`;
  }

  /**
   * Formate une durée en minutes
   */
  formatDuration(minutes: number): string {
    if (!minutes || minutes === 0) {
      return '0 min';
    }
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
  }

  /**
   * ✅ CORRIGÉ : Types d'intervention correspondant au backend
   */
  getTypeInterventionLabel(type: TypeIntervention): string {
    const labels = {
      [TypeIntervention.DOMICILE]: 'À domicile',
      [TypeIntervention.SALON]: 'En salon',
      [TypeIntervention.MIXTE]: 'Domicile + Salon'
    };
    
    return labels[type] || type;
  }

  /**
   * Génère les tags d'un service
   */
  getServiceTags(service: ServiceFreelanceResponseDto): string[] {
    const tags: string[] = [];
    
    if (service.materielInclus) tags.push('Matériel inclus');
    if (service.deplacementInclus) tags.push('Déplacement inclus');
    if (service.horairesFlexibles) tags.push('Horaires flexibles');
    if (service.disponibleWeekend) tags.push('Weekend');
    if (service.disponibleSoir) tags.push('Soirée');
    
    return tags;
  }

  /**
   * Valide les données d'un service avant envoi
   */
  validateServiceData(serviceData: ServiceFreelanceRequestDto): string[] {
    const errors: string[] = [];
    
    if (!serviceData.nom?.trim()) {
      errors.push('Le nom du service est obligatoire');
    }
    
    if (!serviceData.categorie?.trim()) {
      errors.push('La catégorie est obligatoire');
    }
    
    if (!serviceData.prixMin || serviceData.prixMin <= 0) {
      errors.push('Le prix minimum doit être positif');
    }
    
    if (!serviceData.prixMax || serviceData.prixMax <= 0) {
      errors.push('Le prix maximum doit être positif');
    }
    
    if (serviceData.prixMin && serviceData.prixMax && serviceData.prixMin > serviceData.prixMax) {
      errors.push('Le prix minimum ne peut pas être supérieur au prix maximum');
    }
    
    if (!serviceData.dureeEnMinutes || serviceData.dureeEnMinutes <= 0) {
      errors.push('La durée doit être positive');
    }
    
    if (serviceData.supplementDeplacementKm && serviceData.supplementDeplacementKm < 0) {
      errors.push('Le supplément déplacement ne peut pas être négatif');
    }
    
    return errors;
  }

  // ===== GESTION DES ERREURS =====

  private handleError = (error: HttpErrorResponse): Observable<never> => {
    let errorMessage = 'Une erreur est survenue';
    
    console.error('🚨 ServiceFreelanceService Error Details:', {
      status: error.status,
      statusText: error.statusText,
      url: error.url,
      error: error.error
    });
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      if (error.error && error.error.message) {
        errorMessage = error.error.message;
      } else {
        switch (error.status) {
          case 400:
            errorMessage = 'Données invalides';
            break;
          case 404:
            errorMessage = 'Ressource non trouvée - Vérifiez l\'URL de l\'API';
            break;
          case 500:
            errorMessage = 'Erreur interne du serveur';
            break;
          default:
            errorMessage = `Erreur ${error.status}: ${error.message}`;
        }
      }
    }
    
    console.error('ServiceFreelanceService Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  }
}