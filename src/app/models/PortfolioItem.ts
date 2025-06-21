import { PortfolioImage } from "./PortfolioImage";

// Interface Freelance pour contenir toutes les informations du freelance
export interface Freelance {
note: any;
nombreAvis: any;
  competences: any;
  id: number;
  nom: string;
  prenom: string;
  profession?: string;
  telephone?: string;
  adresse?: string;
  email?: string;
  ville?: string;
  codePostal?: string;
  rating?: number;
  reviews?: number;
  profileImage?: string;
}

// Interface PortfolioItem mise à jour
export interface PortfolioItem {
  isExpanded?: boolean;
  id: number;
  titre: string;
  description: string;
  freelanceId: number;
  dateCreation: Date;
  nombreVues?: number;
  nombreLikes?: number;
  isDeleting?: boolean;
  categories: string[];
  tags: string[];
  images?: PortfolioImage[];
  freelance: Freelance;
  isOwner?: boolean; // Indique si l'utilisateur connecté est le propriétaire
  liked?: boolean;  
}

export interface PortfolioItemResponse {
  id: number;
  titre: string;
  description: string;
  freelanceId: number;
  dateCreation: Date;
  nombreVues: number;
  nombreLikes: number;
  categories: string[];
  tags: string[];
  images: PortfolioImage[];
  freelance: Freelance;
}