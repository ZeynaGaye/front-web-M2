
interface FlexibleSearchCriteria {
  term: any;
  ville: any;
  maxPrice: any;
  date: any;
  time: any;
  domicile: undefined;
  weekend: undefined;
  soir: undefined;
  lat: any;
  lng: any;
  deplacementInclus: undefined;
  experienceMin: undefined;
  // Critères textuels
  serviceName?: string;
  providerName?: string;
  generalSearch?: string;
  
  // Critères de localisation
  location?: {
    coordinates?: { lat: number; lng: number };
    address?: string;
    district?: string;
    city?: string;
    radius?: number; // en km
  };
  
  // Critères temporels
  schedule?: {
    date?: string;
    time?: string;
    timeRange?: { start: string; end: string };
    flexible?: boolean; // Si le client est flexible sur l'horaire
  };
  
  // Critères financiers
  budget?: {
    min?: number;
    max?: number;
    exact?: number;
    flexible?: boolean;
  };
  
  // Critères de type
  providerType?: 'salon' | 'freelance' | 'both';
  
  // Critères de qualité
  minRating?: number;
  verified?: boolean;
  
  // Préférences
  sortBy?: 'price' | 'rating' | 'distance' | 'availability' | 'popularity';
  sortOrder?: 'asc' | 'desc';
  
  // ✅ NOUVEAUX CRITÈRES SPÉCIFIQUES AUX FREELANCES
  freelancePreferences?: {
    disponibleWeekend?: boolean;
    disponibleSoir?: boolean;
    experienceMin?: number;
    typeIntervention?: 'DOMICILE' | 'SALON' | 'STUDIO_PRIVE' | 'MIXTE';
    deplacementInclus?: boolean;
  };
}