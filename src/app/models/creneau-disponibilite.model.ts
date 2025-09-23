export interface CreneauDisponibiliteDTO {
  heureDebut: string; // Format ISO string, ex: "2025-07-23T09:00:00"
  heureFin: string;   // Format ISO string, ex: "2025-07-23T09:30:00"
  estDisponible: boolean;
  raisonIndisponibilite?: string;
}