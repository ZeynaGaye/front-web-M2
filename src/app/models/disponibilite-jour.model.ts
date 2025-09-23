import { CreneauDisponibiliteDTO } from "./creneau-disponibilite.model";

export interface DisponibiliteJourDTO {
  date: string; // Format ISO date, ex: "2025-07-23"
  nomJour: string; // Ex: "Mercredi"
  creneaux: CreneauDisponibiliteDTO[];
  nombreCreneaux: number;
  estFerme: boolean;
}