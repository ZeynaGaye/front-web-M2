// src/app/models/service-models.ts

export enum TypeIntervention {
  DOMICILE = 'DOMICILE',
  SALON = 'SALON',
  MIXTE = 'MIXTE'
}

export interface ServiceFreelance {
  id: number;
  nom: string;
  description?: string;
  categorie: string;
  prixMin: number;
  prixMax: number;
  dureeEnMinutes?: number;
  freelanceId: number;
  typeIntervention?: TypeIntervention | string;
  materielInclus?: boolean;
  deplacementInclus?: boolean;
  supplementDeplacementKm?: number;
  horairesFlexibles?: boolean;
  disponibleWeekend?: boolean;
  disponibleSoir?: boolean;
}

export interface ServiceSalon {
  id: number;
  nom: string;
  description?: string;
  prix: number;
  dureeEnMinutes?: number;
  salonId: number;
}

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