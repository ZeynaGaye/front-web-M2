// src/app/models/provider-data.ts

export interface SearchResponse {
  providers?: EnhancedProviderData[];
  total: number;
  searchType: 'EXACT' | 'RELAXED_CRCRITERIA' | 'GEOLOCATED_FALLBACK' | 'KEYWORD_FALLBACK' | 'COMBINED' | 'ERROR'; // Added 'ERROR'
  appliedGeolocation: boolean;
  criteria: any;
  matchReason?: string;
  searchLevel?: string;
  isPopularFallback?: boolean;
  relaxedCriteria?: string[];
  hasExactMatches?: boolean;
  meta?: any;
  error?: string;
}

export interface EnhancedProviderData {
  id: number;
  nom?: string;
  prenom?: string;
  nomEntreprise?: string;
  imageUrl?: string;
  adresse?: string;
  ville?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  services?: string[];
  specialite?: string;
  competences?: string;
  priceRange?: string;
  type: 'salon' | 'freelance'; // Indicateur crucial
  experience?: number;
  anneesExperience?: number;
  availability?: any;
  description?: string;
  telephone?: string;
  email?: string;
  website?: string;
  horaires?: any;
  profession?: string;
  distanceKm?: number;
  formattedNote?: string;
  prixRange?: string;
  isNearby?: boolean;
  isWellRated?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
  deplacementInclus?: boolean;
}

export interface FlexibleSearchCriteria {
  term: string;
  providerType: 'salon' | 'freelance' | 'both';
  ville?: string;
  lat?: number;
  lng?: number;
  geolocalized?: boolean;
  maxPrice?: number;
  date?: string;
  time?: string;
  weekend?: boolean;
  soir?: boolean;
  domicile?: boolean;
  deplacementInclus?: boolean;
  experienceMin?: number;
}

export interface ServiceStatsResponse {
  total: number;
  availableWeekend: number;
  byService: {
    [serviceName: string]: {
      salon: number;
      freelance: number;
      total: number;
    };
  };
}

export interface PhotosResponse {
  photos: any[];
  total: number;
  salonId: number;
}