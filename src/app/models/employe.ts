export enum StatutEmploye {
  ACTIF = 'ACTIF',
  INACTIF = 'INACTIF', 
  CONGE = 'CONGE',
  SUSPENDU = 'SUSPENDU'
}

export enum TypeContrat {
  CDI = 'CDI',
  CDD = 'CDD',
  TEMPS_PARTIEL = 'TEMPS_PARTIEL',
  STAGE = 'STAGE',
  INTERIM = 'INTERIM'
}

export enum Specialite {
  COIFFURE_FEMME = 'COIFFURE_FEMME',
  COIFFURE_HOMME = 'COIFFURE_HOMME',
  TRESSES_AFRICAINES = 'TRESSES_AFRICAINES',
  NATTES_COLLEES = 'NATTES_COLLEES',
  DEFRISAGE = 'DEFRISAGE',
  MANUCURE = 'MANUCURE',
  PEDICURE = 'PEDICURE',
  EXTENSION_CILS = 'EXTENSION_CILS',
  MAQUILLAGE = 'MAQUILLAGE',
  SOIN_VISAGE = 'SOIN_VISAGE'
}

export interface EmployeListItem {
  id: number;
  nomComplet: string;
  email: string;
  statut: StatutEmploye;
  specialites: Specialite[];
}

export interface EmployeResponse {
  id: number;
  nomComplet: string;
  email: string;
  telephone: string;
  statut: StatutEmploye;
  typeContrat: TypeContrat;
  specialites: Specialite[];
  dateEmbauche: string;
  horaires: string;
}

export interface EmployeCreateRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialites: Specialite[];
  typeContrat: TypeContrat;
  horaireDebut: string;
  horaireFin: string;
  salonId: number;
}

export interface EmployeUpdateRequest {
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  specialites: Specialite[];
  typeContrat: TypeContrat;
  horaireDebut: string;
  horaireFin: string;
  statut: StatutEmploye;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}