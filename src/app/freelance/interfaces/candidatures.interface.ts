
export enum StatusCandidature {
    NOUVEAU = 'NOUVEAU',
    CONTACTE = 'CONTACTE', 
    ENTRETIEN = 'ENTRETIEN',
    EMBAUCHE = 'EMBAUCHE',
    REFUSE = 'REFUSE'
  }
  
  // Interface principale Candidature (alignée avec le backend)
  export interface Candidature {
    // Champs principaux
    id?: number;
    titre?: string;                    // Titre du poste recherché
    message?: string;                  // Message de candidature
    description?: string;              // Description complémentaire
    disponibilite?: string;            // Disponibilité du candidat
    tarifPropose?: number;             // Tarif horaire proposé
    dateCandidature?: Date;            // Date de création de la candidature
    status?: StatusCandidature | string; // Statut de la candidature
    
    // Relations (IDs uniquement côté frontend)
    freelanceId?: any;                 // ID du freelance candidat
    offreEmploiId: number;            // ID de l'offre d'emploi (obligatoire)
    
    // Champs pour compatibilité avec l'ancien service
    nomCandidat?: any;                 // Nom du candidat (pour affichage)
    emailCandidat?: any;               // Email du candidat (pour affichage)
    telCandidat?: any;                 // Téléphone du candidat (pour affichage)
    datePostulation?: any;             // Date de postulation (alias de dateCandidature)
    cv?: any;                          // CV du candidat
    
    // Nouvelles propriétés du backend
    freelanceNom?: string;             // Nom du freelance
    freelancePrenom?: string;          // Prénom du freelance
    freelanceEmail?: string;           // Email du freelance
    freelanceTelephone?: string;       // Téléphone du freelance
    freelanceCompetences?: string;     // Compétences du freelance
    freelanceExperience?: string;      // Expérience du freelance
    
    // Données du freelance (dénormalisées pour l'affichage)
    freelance?: {
      id: number;
      nom?: string;
      prenom?: string;
      email?: string;
      telephone?: string;
      photo?: string;
      specialite?: string;
      experience?: string;
      ville?: string;
    };
    
    // Données de l'offre (dénormalisées pour l'affichage) 
    offre?: {
      id: number;
      titre?: string;
      lieu?: string;
      datePublication?: Date;
      dateExpiration?: Date;
      salaire?: number;
      typeContrat?: string;
    };
    
    // Champs calculés côté frontend
    isNew?: boolean;                   // Candidature récente (< 24h)
    responseTime?: string;             // Temps de réponse formaté
    
    // Propriétés pour l'interface améliorée (compatibilité avec l'ancien service)
    isLue?: boolean;                   // Candidature lue ou non
    isNouvelle?: boolean;              // Candidature nouvelle
    
    // Métadonnées
    dateCreation?: Date;               // Date de création
    dateModification?: Date;           // Date de dernière modification
    
    // Pour l'extensibilité
    [key: string]: any;
  }
  
  // DTO pour la création d'une candidature
  export interface CreateCandidatureDto {
    titre: string;                     // Titre du poste
    message: string;                   // Message de motivation
    description?: string;              // Description complémentaire
    disponibilite: string;             // Disponibilité
    tarifPropose: number;              // Tarif proposé
    offreEmploiId: number;            // ID de l'offre ciblée
    freelanceId?: number;             // ID du freelance (optionnel si récupéré du token)
  }
  
  // DTO pour la mise à jour d'une candidature
  export interface UpdateCandidatureDto {
    id: number;
    titre?: string;
    message?: string;
    description?: string;
    disponibilite?: string;
    tarifPropose?: number;
    status?: StatusCandidature | string;
  }
  
  // Interface pour les statistiques de candidatures
  export interface CandidatureStats {
    total: number;                     // Nombre total de candidatures
    nouveau: number;                   // Candidatures avec statut NOUVEAU
    contacte: number;                  // Candidatures avec statut CONTACTE
    entretien: number;                 // Candidatures avec statut ENTRETIEN
    embauche: number;                  // Candidatures avec statut EMBAUCHE
    refuse: number;                    // Candidatures avec statut REFUSE
    tauxReponse: number;              // Pourcentage de candidatures traitées
    tempsMoyenReponse: number;        // Temps moyen de réponse en heures
    candidaturesRecentes: number;     // Candidatures des dernières 24h
    tendance: 'hausse' | 'baisse' | 'stable'; // Tendance par rapport à la période précédente
  }
  
  // Interface pour les filtres de candidatures
  export interface CandidatureFilters {
    status?: StatusCandidature | string;  // Filtrer par statut
    offreId?: number;                     // Filtrer par offre d'emploi
    freelanceId?: number;                 // Filtrer par freelance
    dateDebut?: Date;                     // Date de début de la période
    dateFin?: Date;                       // Date de fin de la période
    tarifMin?: number;                    // Tarif minimum
    tarifMax?: number;                    // Tarif maximum
    disponibilite?: string;               // Filtrer par disponibilité
    searchTerm?: string;                  // Terme de recherche libre
    ville?: string;                       // Filtrer par ville
    specialite?: string;                  // Filtrer par spécialité
    experienceMin?: number;               // Expérience minimum en années
  }
  
  // Interface pour la réponse paginée du backend
  export interface CandidaturePageResponse {
    candidatures: Candidature[];         // Liste des candidatures
    totalElements: number;               // Nombre total d'éléments
    totalPages: number;                  // Nombre total de pages
    currentPage: number;                 // Page actuelle (0-indexed)
    size: number;                        // Taille de la page
    hasNext: boolean;                    // Y a-t-il une page suivante
    hasPrevious: boolean;                // Y a-t-il une page précédente
    sortBy?: string;                     // Critère de tri
    sortDirection?: 'ASC' | 'DESC';      // Direction du tri
  }
  
  // Interface pour les métriques de performance
  export interface CandidatureMetrics {
    offreId: number;                     // ID de l'offre
    offreTitre: string;                  // Titre de l'offre
    candidaturesCount: number;           // Nombre de candidatures
    vuesCount: number;                   // Nombre de vues de l'offre
    tauxConversion: number;              // Taux de conversion (candidatures/vues)
    tempsMoyenReponse: number;           // Temps moyen de première réponse
    qualiteScore: number;                // Score de qualité (0-100)
    recommandations: string[];           // Recommandations d'amélioration
  }
  
  // Interface pour l'export des données
  export interface CandidatureExportData {
    candidatureId: number;
    candidatNom: string;
    candidatPrenom: string;
    candidatEmail: string;
    candidatTelephone?: string;
    offreTitre: string;
    dateCandidature: string;
    statut: string;
    tarifPropose?: number;
    disponibilite?: string;
    message?: string;
    dateContact?: string;
    dateEntretien?: string;
    dateDecision?: string;
  }
  
  // Interface pour les notifications de candidatures
  export interface CandidatureNotification {
    id: number;
    type: 'nouvelle_candidature' | 'changement_statut' | 'rappel';
    candidatureId: number;
    offreId: number;
    titre: string;
    message: string;
    dateCreation: Date;
    lue: boolean;
    priorite: 'basse' | 'normale' | 'haute';
  }
  
  // Interface pour les actions en lot
  export interface CandidatureBulkAction {
    candidatureIds: number[];           // IDs des candidatures sélectionnées
    action: 'changer_statut' | 'supprimer' | 'exporter' | 'contacter';
    parametres?: {
      nouveauStatut?: StatusCandidature;
      messageType?: string;
      templateId?: number;
    };
  }
  
  // Interface pour l'historique des actions
  export interface CandidatureHistorique {
    id: number;
    candidatureId: number;
    action: string;                      // Type d'action effectuée
    ancienneValeur?: string;             // Ancienne valeur (pour les modifications)
    nouvelleValeur?: string;             // Nouvelle valeur
    utilisateurId: number;               // Qui a effectué l'action
    utilisateurNom: string;              // Nom de l'utilisateur
    dateAction: Date;                    // Quand l'action a été effectuée
    commentaire?: string;                // Commentaire optionnel
  }
  
  // Type helper pour les statuts avec leurs couleurs
  export type StatusWithColor = {
    value: StatusCandidature;
    label: string;
    color: string;
    description: string;
  };
  
  // Type pour les options de tri
  export type CandidatureSortOption = 
    | 'date-desc' 
    | 'date-asc' 
    | 'tarif-desc' 
    | 'tarif-asc' 
    | 'status' 
    | 'nom';
  
  // Type pour les périodes de filtre prédéfinies
  export type CandidaturePeriod = 
    | 'aujourdhui' 
    | 'hier' 
    | 'cette-semaine' 
    | 'ce-mois' 
    | 'ce-trimestre' 
    | 'cette-annee' 
    | 'personnalisee';
  
  // Interface pour les paramètres de recherche avancée
  export interface CandidatureSearchParams {
    query?: string;                      // Terme de recherche principal
    filters: CandidatureFilters;         // Filtres appliqués
    sort: {
      field: string;
      direction: 'ASC' | 'DESC';
    };
    pagination: {
      page: number;
      size: number;
    };
    highlight?: boolean;                 // Mettre en surbrillance les résultats
  }
  
  // Interface pour les suggestions de candidats
  export interface CandidatSuggestion {
    freelanceId: number;
    nom: string;
    prenom: string;
    photo?: string;
    specialite: string;
    scoreCompatibilite: number;          // Score de 0 à 100
    raisonsRecommandation: string[];     // Pourquoi ce candidat est recommandé
    disponible: boolean;
    tarifMoyen: number;
  }
  
  // Interface pour les templates de messages
  export interface MessageTemplate {
    id: number;
    nom: string;
    objet: string;
    contenu: string;
    type: 'contact_initial' | 'invitation_entretien' | 'acceptation' | 'refus';
    variables: string[];                 // Variables disponibles dans le template
    actif: boolean;
  }
  
  // Interface pour la configuration du module candidatures
  export interface CandidatureConfig {
    autoNotifications: boolean;          // Notifications automatiques
    delaiRappel: number;                // Délai de rappel en heures
    limiteCandidaturesParOffre: number; // Limite de candidatures par offre
    moderationActive: boolean;          // Modération des candidatures
    exportFormats: string[];            // Formats d'export disponibles
    integrationsCRM: boolean;           // Intégrations CRM actives
  }