import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; // ← AJOUTER HttpParams
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations`;
  private disponibilitesUrl = `${environment.apiUrl}/disponibilites`; // ← AJOUTER

  constructor(private http: HttpClient) { }



  // Créer une nouvelle réservation
  createReservation(reservationData: any): Observable<any> {
    console.log('Création d\'une réservation avec les données:', reservationData);
    
    return this.http.post<any>(`${this.apiUrl}/create`, reservationData).pipe(
      tap(reservation => console.log('Réservation créée avec succès:', reservation)),
      catchError(this.handleError)
    );
  }

  // Récupérer les réservations de l'utilisateur connecté
  getUserReservations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user`).pipe(
      tap(reservations => console.log(`${reservations.length} réservations récupérées`)),
      catchError(this.handleError)
    );
  }

  // Annuler une réservation
  cancelReservation(reservationId: number): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${reservationId}/cancel`, {}).pipe(
      tap(_ => console.log(`Réservation ${reservationId} annulée`)),
      catchError(this.handleError)
    );
  }

  // Récupérer les détails d'une réservation
  getReservationById(reservationId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${reservationId}`).pipe(
      tap(reservation => console.log('Réservation récupérée:', reservation)),
      catchError(this.handleError)
    );
  }

  // Mettre à jour une réservation
  updateReservation(reservationId: number, updateData: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/${reservationId}`, updateData).pipe(
      tap(updatedReservation => console.log('Réservation mise à jour:', updatedReservation)),
      catchError(this.handleError)
    );
  }

  // ==========================================
  // 🚀 NOUVELLES MÉTHODES POUR CRÉNEAUX DYNAMIQUES
  // ==========================================

  /**
   * ✅ NOUVEAU : Récupérer créneaux disponibles pour un salon
   * Utilisé par booking-dialog pour afficher créneaux réels
   */
  getCreneauxDisponibles(salonId: number, date: string, dureeService: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('date', date)
      .set('dureeService', dureeService.toString());

    console.log(`Récupération créneaux salon ${salonId} pour ${date} (${dureeService}min)`);

    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}`, { params }).pipe(
      tap(response => {
        const nbCreneaux = response?.creneaux?.length || 0;
        console.log(`${nbCreneaux} créneaux disponibles récupérés`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NOUVEAU : Récupérer créneaux pour une semaine
   * Optimisation pour afficher plusieurs jours d'un coup
   */
  getCreneauxSemaine(salonId: number, dateDebut: string, dureeService: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dureeService', dureeService.toString());

    console.log(`Récupération créneaux semaine salon ${salonId} depuis ${dateDebut}`);

    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}/semaine`, { params }).pipe(
      tap(response => {
        const nbJours = response?.disponibilites?.length || 0;
        console.log(`Créneaux pour ${nbJours} jours récupérés`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NOUVEAU : Vérifier disponibilité d'un créneau spécifique
   * Utilisé avant création réservation pour éviter conflits
   */
  verifierDisponibilite(salonId: number, debut: string, fin: string): Observable<any> {
    const params = new HttpParams()
      .set('prestataireId', salonId.toString())
      .set('estSalon', 'true')
      .set('debut', debut)
      .set('fin', fin);

    console.log(`Vérification disponibilité salon ${salonId} : ${debut} → ${fin}`);

    return this.http.get<any>(`${this.disponibilitesUrl}/verifier`, { params }).pipe(
      tap(response => {
        const disponible = response?.estDisponible ? 'disponible' : 'occupé';
        console.log(`Créneau ${disponible}`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NOUVEAU : Récupérer créneaux par service ID
   * Alternative si vous préférez passer par service plutôt que salon
   */
  getCreneauxParService(serviceId: number, date: string): Observable<any> {
    const params = new HttpParams().set('date', date);

    console.log(`Récupération créneaux service ${serviceId} pour ${date}`);

    return this.http.get<any>(`${environment.apiUrl}/creneaux/service/${serviceId}`, { params }).pipe(
      tap(response => {
        const nbCreneaux = Array.isArray(response) ? response.length : 0;
        console.log(`${nbCreneaux} créneaux service récupérés`);
      }),
      catchError(this.handleError)
    );
  }

  /**
   * ✅ NOUVEAU : Récupérer horaires d'un salon
   * Utile pour afficher infos horaires dans l'interface
   */
  getHorairesSalon(salonId: number): Observable<any> {
    console.log(`Récupération horaires salon ${salonId}`);

    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}/horaires`).pipe(
      tap(response => {
        const nbHoraires = response?.horaires?.length || 0;
        console.log(`${nbHoraires} horaires récupérés`);
      }),
      catchError(this.handleError)
    );
  }

  // ==========================================
  // 🛠️ MÉTHODES UTILITAIRES POUR CRÉNEAUX
  // ==========================================

  /**
   * ✅ UTILITAIRE : Formater heure pour affichage
   * "2025-06-16T14:30:00" → "14h30"
   */
  formatHeurePourAffichage(dateTime: string): string {
    try {
      const date = new Date(dateTime);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }).replace(':', 'h');
    } catch (error) {
      console.warn('Erreur formatage heure:', error);
      return dateTime;
    }
  }

  /**
   * ✅ UTILITAIRE : Vérifier si une date est aujourd'hui
   */
  isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  /**
   * ✅ UTILITAIRE : Obtenir prochaine date disponible
   */
  getProchaineDateDisponible(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   * ✅ UTILITAIRE : Parser durée service
   * "1h30" → 90, "45min" → 45, "2h" → 120
   */
  parseServiceDuration(duree: string): number {
    if (!duree) return 30; // Défaut 30min

    try {
      const d = duree.toLowerCase().trim();
      
      if (d.includes('h')) {
        const parts = d.split('h');
        const heures = parseInt(parts[0]) || 0;
        const minutes = parts[1] ? parseInt(parts[1].replace(/\D/g, '')) || 0 : 0;
        return heures * 60 + minutes;
      } else {
        return parseInt(d.replace(/\D/g, '')) || 30;
      }
    } catch (error) {
      console.warn('Erreur parsing durée:', error);
      return 30;
    }
  }

 

  // Gestionnaire d'erreurs
  private handleError(error: HttpErrorResponse) {
    let errorMessage = '';
    
    if (error.error instanceof ErrorEvent) {
      // Erreur côté client
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur
      errorMessage = `Code: ${error.status}, Message: ${error.message}`;
      
      if (error.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
    }
    
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }


  /**
 * ✅ NOUVEAU : Récupérer toutes les réservations des salons de l'employeur
 * Utilisé dans le dashboard employeur pour afficher toutes les réservations
 */
getEmployeurReservations(): Observable<any[]> {
  console.log('Récupération des réservations employeur');
  
  return this.http.get<any[]>(`${this.apiUrl}/employeur`).pipe(
    tap(reservations => {
      console.log(`${reservations.length} réservations employeur récupérées`);
      console.log('Premières réservations:', reservations.slice(0, 3));
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Récupérer les réservations d'un salon spécifique
 * Utilisé pour filtrer par salon dans l'interface
 */
getSalonReservations(salonId: number): Observable<any[]> {
  console.log(`Récupération réservations salon ${salonId}`);
  
  return this.http.get<any[]>(`${this.apiUrl}/salon/${salonId}`).pipe(
    tap(reservations => {
      console.log(`${reservations.length} réservations salon ${salonId} récupérées`);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Mettre à jour le statut d'une réservation (employeur)
 * Statuts possibles: 'confirmee', 'annulee', 'terminee'
 */
updateReservationStatus(reservationId: number, newStatus: string): Observable<any> {
  console.log(`Mise à jour statut réservation ${reservationId} vers: ${newStatus}`);
  
  const statusData = {
    statut: newStatus,
    updatedAt: new Date().toISOString()
  };
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/status`, statusData).pipe(
    tap(updatedReservation => {
      console.log(`Réservation ${reservationId} mise à jour:`, updatedReservation);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Confirmer une réservation en attente
 * Raccourci pour updateReservationStatus avec statut 'confirmee'
 */
confirmerReservation(reservationId: number): Observable<any> {
  console.log(`Confirmation réservation ${reservationId}`);
  return this.updateReservationStatus(reservationId, 'confirmee');
}

/**
 * ✅ NOUVEAU : Refuser une réservation en attente
 * Raccourci pour updateReservationStatus avec statut 'annulee'
 */
refuserReservation(reservationId: number, motif?: string): Observable<any> {
  console.log(`Refus réservation ${reservationId}`, motif ? `- Motif: ${motif}` : '');
  
  const statusData = {
    statut: 'annulee',
    motifAnnulation: motif || 'Refusée par le salon',
    updatedAt: new Date().toISOString()
  };
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/status`, statusData).pipe(
    tap(updatedReservation => {
      console.log(`Réservation ${reservationId} refusée:`, updatedReservation);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Terminer une réservation confirmée
 * Marque la prestation comme terminée
 */
terminerReservation(reservationId: number): Observable<any> {
  console.log(`Finalisation réservation ${reservationId}`);
  return this.updateReservationStatus(reservationId, 'terminee');
}

/**
 * ✅ NOUVEAU : Récupérer les statistiques des réservations employeur
 * Dashboard stats: total, en attente, confirmées, etc.
 */
getReservationStats(): Observable<any> {
  console.log('Récupération statistiques réservations employeur');
  
  return this.http.get<any>(`${this.apiUrl}/employeur/stats`).pipe(
    tap(stats => {
      console.log('Statistiques récupérées:', stats);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Récupérer les réservations d'aujourd'hui
 * Pour le widget "Réservations du jour" du dashboard
 */
getReservationsAujourdhui(): Observable<any[]> {
  const today = new Date().toISOString().split('T')[0];
  console.log(`Récupération réservations du jour: ${today}`);
  
  const params = new HttpParams().set('date', today);
  
  return this.http.get<any[]>(`${this.apiUrl}/employeur/today`, { params }).pipe(
    tap(reservations => {
      console.log(`${reservations.length} réservations aujourd'hui`);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Récupérer réservations par période
 * Pour les filtres de date dans l'interface
 */
getReservationsPeriode(dateDebut: string, dateFin: string, salonId?: number): Observable<any[]> {
  console.log(`Récupération réservations période: ${dateDebut} → ${dateFin}`);
  
  let params = new HttpParams()
    .set('dateDebut', dateDebut)
    .set('dateFin', dateFin);
    
  if (salonId) {
    params = params.set('salonId', salonId.toString());
  }
  
  return this.http.get<any[]>(`${this.apiUrl}/employeur/periode`, { params }).pipe(
    tap(reservations => {
      console.log(`${reservations.length} réservations trouvées pour la période`);
    }),
    catchError(this.handleError)
  );
}

/**
 * ✅ NOUVEAU : Rechercher réservations par critères
 * Pour la barre de recherche dans l'interface
 */
rechercherReservations(terme: string, filtres?: {
  statut?: string;
  salonId?: number;
  dateDebut?: string;
  dateFin?: string;
}): Observable<any[]> {
  console.log(`Recherche réservations: "${terme}"`, filtres);
  
  let params = new HttpParams().set('q', terme);
  
  if (filtres) {
    if (filtres.statut) params = params.set('statut', filtres.statut);
    if (filtres.salonId) params = params.set('salonId', filtres.salonId.toString());
    if (filtres.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
    if (filtres.dateFin) params = params.set('dateFin', filtres.dateFin);
  }
  
  return this.http.get<any[]>(`${this.apiUrl}/employeur/search`, { params }).pipe(
    tap(reservations => {
      console.log(`${reservations.length} réservations trouvées pour "${terme}"`);
    }),
    catchError(this.handleError)
  );
}

// ==========================================
// 📊 MÉTHODES DE CALCUL CÔTÉ CLIENT
// (Si les stats ne viennent pas du backend)
// ==========================================

/**
 * ✅ UTILITAIRE : Calculer stats depuis liste de réservations
 * Utilisé si le backend ne fournit pas d'endpoint /stats
 */
calculateStatsFromReservations(reservations: any[]): any {
  console.log(`Calcul statistiques pour ${reservations.length} réservations`);
  
  const stats = {
    total: reservations.length,
    enAttente: 0,
    confirmees: 0,
    annulees: 0,
    terminees: 0,
    chiffreAffaires: 0,
    reservationsAujourdhui: 0
  };
  
  const today = new Date().toISOString().split('T')[0];
  
  reservations.forEach(reservation => {
    // Compter par statut
    switch (reservation.statut?.toLowerCase()) {
      case 'en_attente':
      case 'pending':
        stats.enAttente++;
        break;
      case 'confirmee':
      case 'confirmed':
        stats.confirmees++;
        break;
      case 'annulee':
      case 'cancelled':
        stats.annulees++;
        break;
      case 'terminee':
      case 'completed':
        stats.terminees++;
        // Ajouter au chiffre d'affaires
        stats.chiffreAffaires += reservation.servicePrix || reservation.prix || 0;
        break;
    }
    
    // Compter réservations du jour
    const reservationDate = new Date(reservation.datePrestation || reservation.date);
    if (reservationDate.toISOString().split('T')[0] === today) {
      stats.reservationsAujourdhui++;
    }
  });
  
  console.log('Statistiques calculées:', stats);
  return stats;
}

/**
 * ✅ UTILITAIRE : Filtrer réservations par statut
 */
filterByStatus(reservations: any[], statut: string): any[] {
  return reservations.filter(r => 
    r.statut?.toLowerCase() === statut.toLowerCase() ||
    r.status?.toLowerCase() === statut.toLowerCase()
  );
}

/**
 * ✅ UTILITAIRE : Filtrer réservations d'aujourd'hui
 */
filterTodayReservations(reservations: any[]): any[] {
  const today = new Date().toISOString().split('T')[0];
  
  return reservations.filter(reservation => {
    const reservationDate = new Date(reservation.datePrestation || reservation.date);
    return reservationDate.toISOString().split('T')[0] === today;
  });
}

/**
 * ✅ UTILITAIRE : Filtrer réservations par salon
 */
filterBySalon(reservations: any[], salonId: number): any[] {
  return reservations.filter(r => 
    r.salonId === salonId || r.salon_id === salonId
  );
}

/**
 * ✅ UTILITAIRE : Trier réservations par date
 */
sortByDate(reservations: any[], ordre: 'asc' | 'desc' = 'desc'): any[] {
  return [...reservations].sort((a, b) => {
    const dateA = new Date(a.datePrestation || a.date);
    const dateB = new Date(b.datePrestation || b.date);
    
    return ordre === 'desc' 
      ? dateB.getTime() - dateA.getTime()
      : dateA.getTime() - dateB.getTime();
  });
}

// ==========================================
// 🎨 MÉTHODES D'AFFICHAGE ET FORMATAGE
// ==========================================

/**
 * ✅ UTILITAIRE : Formater statut pour affichage
 */
formatStatutPourAffichage(statut: string): string {
  const statutsMap: { [key: string]: string } = {
    'confirmee': 'Confirmée',
    'confirmed': 'Confirmée',
    'terminee': 'Terminée',
    'completed': 'Terminée',
    'annulee': 'Annulée',
    'cancelled': 'Annulée',
    'non_presentee': 'Non présenté',
    'no_show': 'Non présenté'
  };
  
  return statutsMap[statut?.toLowerCase()] || statut || 'Inconnu';
}

/**
 * ✅ UTILITAIRE : Obtenir couleur du statut
 */
getStatutColor(statut: string): string {
  const colorsMap: { [key: string]: string } = {
    'en_attente': '#ff9800',
    'pending': '#ff9800',
    'confirmee': '#4caf50',
    'confirmed': '#4caf50',
    'annulee': '#f44336',
    'cancelled': '#f44336',
    'terminee': '#9c27b0',
    'completed': '#9c27b0'
  };
  
  return colorsMap[statut?.toLowerCase()] || '#757575';
}

/**
 * ✅ UTILITAIRE : Formater prix avec devise
 */
formatPrix(prix: number, devise: string = 'CFA'): string {
  if (!prix || prix === 0) return `0 ${devise}`;
  
  return `${prix.toLocaleString('fr-FR')} ${devise}`;
}

/**
 * ✅ UTILITAIRE : Formater date pour affichage français
 */
formatDateFrancaise(date: string | Date): string {
  try {
    const d = new Date(date);
    return d.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.warn('Erreur formatage date:', error);
    return date.toString();
  }
}

/**
 * ✅ UTILITAIRE : Formater heure pour affichage
 */
formatHeureComplete(date: string | Date): string {
  try {
    const d = new Date(date);
    return d.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (error) {
    console.warn('Erreur formatage heure:', error);
    return date.toString();
  }
}

/**
 * ✅ UTILITAIRE : Calculer durée depuis création
 */
getTempsDepuisCreation(dateCreation: string | Date): string {
  try {
    const creation = new Date(dateCreation);
    const maintenant = new Date();
    const diffMs = maintenant.getTime() - creation.getTime();
    
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHeures = Math.floor(diffMinutes / 60);
    const diffJours = Math.floor(diffHeures / 24);
    
    if (diffJours > 0) {
      return `il y a ${diffJours} jour${diffJours > 1 ? 's' : ''}`;
    } else if (diffHeures > 0) {
      return `il y a ${diffHeures} heure${diffHeures > 1 ? 's' : ''}`;
    } else if (diffMinutes > 0) {
      return `il y a ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`;
    } else {
      return 'à l\'instant';
    }
  } catch (error) {
    console.warn('Erreur calcul temps:', error);
    return 'récemment';
  }
}
/**
 * ✅ NOUVEAU : Marquer client comme non présenté
 */
marquerNonPresentee(reservationId: number, motif?: string): Observable<any> {
  console.log(`Marquage non présenté réservation ${reservationId}`);
  
  const statusData = {
    statut: 'non_presentee',
    motifAnnulation: motif || 'Client non présenté',
    updatedAt: new Date().toISOString()
  };
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/no-show`, statusData).pipe(
    tap(updatedReservation => {
      console.log(`Réservation ${reservationId} marquée non présentée:`, updatedReservation);
    }),
    catchError(this.handleError)
  );
}
}
