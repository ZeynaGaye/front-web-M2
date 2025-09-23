export interface HorairesOuvertureDTO {
  id?: number;
  jourSemaine: string; // Ex: "MONDAY"
  jourSemaineLibelle: string; // Ex: "Lundi"
  heureOuverture: string; // Ex: "09:00"
  heureFermeture: string; // Ex: "18:00"
  estOuvert: boolean;
  dureeCreneauMinutes: number;
  pauseEntreCreneauxMinutes: number;
  salonId?: number;
  freelanceId?: number;
}
