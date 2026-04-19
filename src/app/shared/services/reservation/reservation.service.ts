import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http'; 
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReservationService {
  private apiUrl = `${environment.apiUrl}/reservations`;
  private disponibilitesUrl = `${environment.apiUrl}/disponibilites`; 
  private avisUrl = `${environment.apiUrl}/avis`;
  constructor(private http: HttpClient) { }

  // ==========================================
  //  AUTHENTIFICATION ET ID CLIENT
  // ==========================================
  
  private getCurrentClientId(): number | null {
    try {
      const currentUser = this.getCurrentUserFromAuth();
      if (currentUser && currentUser.id) {
        return parseInt(currentUser.id.toString(), 10);
      }
      
      const token = this.getTokenFromLocalStorage();
      if (token) {
        const payload = this.parseJwtToken(token);
        return payload.sub ? parseInt(payload.sub, 10) : null;
      }
      
      return null;
    } catch (error) {
      console.error(' Erreur récupération ID client:', error);
      return null;
    }
  }

  private getCurrentUserFromAuth(): any {
    if (typeof localStorage !== 'undefined') {
      const userStr = localStorage.getItem('currentUser');
      return userStr ? JSON.parse(userStr) : null;
    }
    return null;
  }

  private getTokenFromLocalStorage(): string | null {
    if (typeof localStorage !== 'undefined') {
      const user = this.getCurrentUserFromAuth();
      return user?.accesToken || null;
    }
    return null;
  }

  private parseJwtToken(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error(' Erreur parsing JWT:', error);
      return {};
    }
  }

  // Créer une nouvelle réservation
  createReservation(reservationData: any): Observable<any> {


    return this.http.post<any>(`${this.apiUrl}/create`, reservationData).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer les réservations de l'utilisateur connecté
  getUserReservations(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/user`).pipe(
      catchError(this.handleError)
    );
  }

  // Annuler une réservation
  cancelReservation(reservationId: number, reason?: string): Observable<any> {
    const body = reason ? { raison: reason } : {};
    return this.http.put<any>(`${this.apiUrl}/${reservationId}/cancel`, body).pipe(
      catchError(this.handleError)
    );
  }

  // Récupérer les détails d'une réservation
  getReservationById(reservationId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${reservationId}`).pipe(
      catchError(this.handleError)
    );
  }

  // Mettre à jour une réservation
  updateReservation(reservationId: number, updateData: any): Observable<any> {

    return this.http.put<any>(`${this.apiUrl}/${reservationId}`, updateData).pipe(
      catchError(this.handleError)
    );
  }

  // ==========================================
  //  NOUVELLES MÉTHODES POUR CRÉNEAUX DYNAMIQUES
  // ==========================================

  /**
   *  NOUVEAU : Récupérer créneaux disponibles pour un salon
   * Utilisé par booking-dialog pour afficher créneaux réels
   */
  getCreneauxDisponibles(salonId: number, date: string, dureeService: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('date', date)
      .set('dureeService', dureeService.toString());



    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}`, { params }).pipe(
      tap(response => {
        const nbCreneaux = response?.creneaux?.length || 0;

      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVEAU : Récupérer créneaux pour une semaine
   * Optimisation pour afficher plusieurs jours d'un coup
   */
  getCreneauxSemaine(salonId: number, dateDebut: string, dureeService: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dureeService', dureeService.toString());



    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}/semaine`, { params }).pipe(
      tap(response => {
        const nbJours = response?.disponibilites?.length || 0;

      }),
      catchError(this.handleError)
    );
  }

  /**
   * Récupérer créneaux disponibles pour un freelance
   * Utilisé par booking-dialog pour afficher créneaux réels du freelance
   */
  getCreneauxDisponiblesFreelance(freelanceId: number, date: string, dureeService: number = 30): Observable<any> {
    const params = new HttpParams()
      .set('date', date)
      .set('dureeService', dureeService.toString());

    return this.http.get<any>(`${this.disponibilitesUrl}/freelance/${freelanceId}`, { params }).pipe(
      tap(response => {
        const nbCreneaux = response?.creneaux?.length || 0;
      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVEAU : Vérifier disponibilité d'un créneau spécifique
   * Utilisé avant création réservation pour éviter conflits
   */
  verifierDisponibilite(salonId: number, debut: string, fin: string, estSalon: boolean = true): Observable<any> {
    const params = new HttpParams()
      .set('prestataireId', salonId.toString())
      .set('estSalon', estSalon.toString())
      .set('debut', debut)
      .set('fin', fin);



    return this.http.get<any>(`${this.disponibilitesUrl}/verifier`, { params }).pipe(
      tap(response => {
        const disponible = response?.estDisponible ? 'disponible' : 'occupé';

      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVEAU : Récupérer créneaux par service ID
   * Alternative si vous préférez passer par service plutôt que salon
   */
  getCreneauxParService(serviceId: number, date: string): Observable<any> {
    const params = new HttpParams().set('date', date);



    return this.http.get<any>(`${environment.apiUrl}/creneaux/service/${serviceId}`, { params }).pipe(
      tap(response => {
        const nbCreneaux = Array.isArray(response) ? response.length : 0;

      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVEAU : Récupérer horaires d'un salon
   * Utile pour afficher infos horaires dans l'interface
   */
  getHorairesSalon(salonId: number): Observable<any> {


    return this.http.get<any>(`${this.disponibilitesUrl}/salon/${salonId}/horaires`).pipe(
      tap(response => {
        const nbHoraires = response?.horaires?.length || 0;

      }),
      catchError(this.handleError)
    );
  }

  // ==========================================
  //  MÉTHODES UTILITAIRES POUR CRÉNEAUX
  // ==========================================

  /**
   *  UTILITAIRE : Formater heure pour affichage
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
   *  UTILITAIRE : Vérifier si une date est aujourd'hui
   */
  isToday(dateStr: string): boolean {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  }

  /**
   *  UTILITAIRE : Obtenir prochaine date disponible
   */
  getProchaineDateDisponible(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  /**
   *  UTILITAIRE : Parser durée service
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

    if (error.error && typeof ErrorEvent !== 'undefined' && error.error instanceof ErrorEvent) {
      // Erreur côté client (browser uniquement)
      errorMessage = `Erreur: ${error.error.message}`;
    } else {
      // Erreur côté serveur


      // Gestion spéciale pour les erreurs de disponibilité
      if (error.status === 404 && error.error && typeof error.error === 'object') {
        if (error.error.error && error.error.error.includes('créneau')) {
          errorMessage = error.error.error; // Message spécifique du backend
        } else if (error.error.message && error.error.message.includes('créneau')) {
          errorMessage = error.error.message;
        } else {
          errorMessage = 'Le créneau sélectionné n\'est plus disponible. Veuillez choisir un autre horaire.';
        }
      } else {
        // Autres erreurs
        errorMessage = `Code: ${error.status}, Message: ${error.message}`;

        if (error.error && typeof error.error === 'string') {
          errorMessage = error.error;
        } else if (error.error && typeof error.error === 'object' && error.error.message) {
          errorMessage = error.error.message;
        } else if (error.error && typeof error.error === 'object' && error.error.error) {
          errorMessage = error.error.error;
        }
      }
    }

    console.error(`[Service Erreur] ${errorMessage}`);
    return throwError(() => new Error(errorMessage));
  }


  /**
  *  NOUVEAU : Récupérer toutes les réservations des salons de l'employeur
  * Utilisé dans le dashboard employeur pour afficher toutes les réservations
  */
  getEmployeurReservations(): Observable<any[]> {


    return this.http.get<any[]>(`${this.apiUrl}/employeur`).pipe(
      tap(reservations => {


      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer toutes les réservations du freelance connecté
  * Utilisé dans le dashboard freelance pour afficher toutes les réservations
  */
  getFreelanceReservations(): Observable<any[]> {


    return this.http.get<any[]>(`${this.apiUrl}/freelance`).pipe(
      tap(reservations => {


      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer les statistiques du freelance connecté
  * Utilisé dans le dashboard freelance pour afficher les stats
  */
  getFreelanceStats(): Observable<any> {


    return this.http.get<any>(`${this.apiUrl}/freelance/stats`).pipe(
      tap(stats => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer les réservations d'aujourd'hui pour le freelance
  * Utilisé pour afficher les réservations du jour
  */
  getFreelanceTodayReservations(): Observable<any[]> {


    return this.http.get<any[]>(`${this.apiUrl}/freelance/today`).pipe(
      tap(reservations => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer les réservations d'un salon spécifique
  * Utilisé pour filtrer par salon dans l'interface
  */
  getSalonReservations(salonId: number): Observable<any[]> {


    return this.http.get<any[]>(`${this.apiUrl}/salon/${salonId}`).pipe(
      tap(reservations => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Mettre à jour le statut d'une réservation (employeur)
  * Statuts possibles: 'confirmee', 'annulee', 'terminee'
  */
  updateReservationStatus(reservationId: number, newStatus: string): Observable<any> {
    const statusData = {
      statut: newStatus,
      updatedAt: new Date().toISOString()
    };


    return this.http.put<any>(`${this.apiUrl}/${reservationId}/status`, statusData).pipe(
      tap(updatedReservation => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Confirmer une réservation en attente
  * Raccourci pour updateReservationStatus avec statut 'confirmee'
  */
  confirmerReservation(reservationId: number): Observable<any> {

    return this.updateReservationStatus(reservationId, 'confirmee');
  }

 /**
 *  TERMINER une réservation 
 */
terminerReservation(reservationId: number): Observable<any> {

  
  if (!reservationId || reservationId === undefined) {
    console.error(' ID manquant dans terminerReservation');
    return throwError(() => new Error('ID de réservation manquant'));
  }
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/complete`, {}).pipe(
    tap(updatedReservation => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  REFUSER/ANNULER une réservation 
 */
refuserReservation(reservationId: number, motif?: string): Observable<any> {

  
  if (!reservationId || reservationId === undefined) {
    console.error(' ID manquant dans refuserReservation');
    return throwError(() => new Error('ID de réservation manquant'));
  }
  
  const statusData = {
    motif: motif || 'Annulée par le salon'
  };
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/refuse`, statusData).pipe(
    tap(updatedReservation => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  MARQUER NON PRÉSENTÉ
 */
marquerNonPresentee(reservationId: number, motif?: string): Observable<any> {

  
  if (!reservationId || reservationId === undefined) {
    console.error(' ID manquant dans marquerNonPresentee');
    return throwError(() => new Error('ID de réservation manquant'));
  }
  
  const statusData = {
    motif: motif || 'Client non présenté'
  };
  
  return this.http.put<any>(`${this.apiUrl}/${reservationId}/no-show`, statusData).pipe(
    tap(updatedReservation => {

    }),
    catchError(this.handleError)
  );
}


  /**
  *  NOUVEAU : Récupérer les statistiques des réservations employeur
  * Dashboard stats: total, en attente, confirmées, etc.
  */
  getReservationStats(): Observable<any> {


    return this.http.get<any>(`${this.apiUrl}/employeur/stats`).pipe(
      tap(stats => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer les réservations d'aujourd'hui
  * Pour le widget "Réservations du jour" du dashboard
  */
  getReservationsAujourdhui(): Observable<any[]> {
    const today = new Date().toISOString().split('T')[0];


    const params = new HttpParams().set('date', today);

    return this.http.get<any[]>(`${this.apiUrl}/employeur/today`, { params }).pipe(
      tap(reservations => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Récupérer réservations par période
  * Pour les filtres de date dans l'interface
  */
  getReservationsPeriode(dateDebut: string, dateFin: string, salonId?: number): Observable<any[]> {


    let params = new HttpParams()
      .set('dateDebut', dateDebut)
      .set('dateFin', dateFin);

    if (salonId) {
      params = params.set('salonId', salonId.toString());
    }

    return this.http.get<any[]>(`${this.apiUrl}/employeur/periode`, { params }).pipe(
      tap(reservations => {

      }),
      catchError(this.handleError)
    );
  }

  /**
  *  NOUVEAU : Rechercher réservations par critères
  * Pour la barre de recherche dans l'interface
  */
  rechercherReservations(terme: string, filtres?: {
    statut?: string;
    salonId?: number;
    dateDebut?: string;
    dateFin?: string;
  }): Observable<any[]> {


    let params = new HttpParams().set('q', terme);

    if (filtres) {
      if (filtres.statut) params = params.set('statut', filtres.statut);
      if (filtres.salonId) params = params.set('salonId', filtres.salonId.toString());
      if (filtres.dateDebut) params = params.set('dateDebut', filtres.dateDebut);
      if (filtres.dateFin) params = params.set('dateFin', filtres.dateFin);
    }

    return this.http.get<any[]>(`${this.apiUrl}/employeur/search`, { params }).pipe(
      tap(reservations => {

      }),
      catchError(this.handleError)
    );
  }

  // ==========================================
  //  MÉTHODES DE CALCUL CÔTÉ CLIENT
  // (Si les stats ne viennent pas du backend)
  // ==========================================

  /**
  *  UTILITAIRE : Calculer stats depuis liste de réservations
  * Utilisé si le backend ne fournit pas d'endpoint /stats
  */
  calculateStatsFromReservations(reservations: any[]): any {


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


    return stats;
  }

  /**
  *  UTILITAIRE : Filtrer réservations par statut
  */
  filterByStatus(reservations: any[], statut: string): any[] {
    return reservations.filter(r =>
      r.statut?.toLowerCase() === statut.toLowerCase() ||
      r.status?.toLowerCase() === statut.toLowerCase()
    );
  }

  /**
  *  UTILITAIRE : Filtrer réservations d'aujourd'hui
  */
  filterTodayReservations(reservations: any[]): any[] {
    const today = new Date().toISOString().split('T')[0];

    return reservations.filter(reservation => {
      const reservationDate = new Date(reservation.datePrestation || reservation.date);
      return reservationDate.toISOString().split('T')[0] === today;
    });
  }

  /**
  *  UTILITAIRE : Filtrer réservations par salon
  */
  filterBySalon(reservations: any[], salonId: number): any[] {
    return reservations.filter(r =>
      r.salonId === salonId || r.salon_id === salonId
    );
  }

  /**
  *  UTILITAIRE : Trier réservations par date
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
  //  MÉTHODES D'AFFICHAGE ET FORMATAGE
  // ==========================================

  /**
  *  UTILITAIRE : Formater statut pour affichage
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
  *  UTILITAIRE : Obtenir couleur du statut
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
  *  UTILITAIRE : Formater prix avec devise
  */
  formatPrix(prix: number, devise: string = 'CFA'): string {
    if (!prix || prix === 0) return `0 ${devise}`;

    return `${prix.toLocaleString('fr-FR')} ${devise}`;
  }

  /**
  *  UTILITAIRE : Formater date pour affichage français
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
  *  UTILITAIRE : Formater heure pour affichage
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
  *  UTILITAIRE : Calculer durée depuis création
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
  formatFreelanceStatus(status: string): string {
    const statusMap: { [key: string]: string } = {
      'confirmee': 'Confirmée',
      'confirmed': 'Confirmée',
      'terminee': 'Terminée par le client',
      'completed': 'Terminée par le client',
      'non_presentee': 'Client absent',
      'no_show': 'Client absent',
      'annulee_client': 'Annulée par le client',
      'annulee_prestataire': 'Annulée par vous' // Ne devrait pas arriver pour freelance
    };
    return statusMap[status?.toLowerCase()] || status || 'Inconnu';
  }

  calculateFreelanceStats(reservations: any[]): any {
    const stats = {
      total: reservations.length,
      confirmees: 0,
      termineesParClient: 0,
      clientsAbsents: 0,
      annuleesParClient: 0,
      chiffreAffaires: 0,
      tauxAbsence: 0,
      reservationsAujourdhui: 0,
      prochainRendezVous: null
    };

    const today = new Date().toISOString().split('T')[0];
    let prochainDate: Date | null = null;

    reservations.forEach(reservation => {
      const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
      
      switch (status) {
        case 'confirmee':
        case 'confirmed':
          stats.confirmees++;
          break;
        case 'terminee':
        case 'completed':
          stats.termineesParClient++;
          stats.chiffreAffaires += reservation.prixTotal || reservation.servicePrix || 0;
          break;
        case 'non_presentee':
        case 'no_show':
          stats.clientsAbsents++;
          break;
        case 'annulee_client':
          stats.annuleesParClient++;
          break;
      }

      // Réservations du jour
      const reservationDate = new Date(reservation.datePrestation);
      if (reservationDate.toISOString().split('T')[0] === today) {
        stats.reservationsAujourdhui++;
      }

      // Prochain RDV
      if ((status === 'confirmee' || status === 'confirmed') && 
          reservationDate > new Date() && 
          (!prochainDate || reservationDate < prochainDate)) {
        prochainDate = reservationDate;
        stats.prochainRendezVous = reservation;
      }
    });

    // Calculer taux d'absence
    const totalRealises = stats.termineesParClient + stats.clientsAbsents;
    stats.tauxAbsence = totalRealises > 0 ? 
      Math.round((stats.clientsAbsents / totalRealises) * 100) : 0;

    return stats;
  }

  // ===== MÉTHODES POUR NOTIFICATION ET RATING =====

  /**
   *  NOUVEAU : Envoyer notification de demande de notation
   */
  sendRatingRequest(reservationId: number, clientEmail?: string): Observable<any> {

    
    const requestBody = {
      reservationId: reservationId,
      clientEmail: clientEmail
    };
    
    return this.http.post<any>(`${this.apiUrl}/${reservationId}/request-rating`, requestBody).pipe(
      tap(response => {

      }),
      catchError(this.handleError)
    );
  }

  /**
   *  NOUVEAU : Soumettre une note/avis
   */
  submitRating(reservationId: number, ratingData: {
    note: number;
    commentaire?: string;
    recommande?: boolean;
  }): Observable<any> {

    
    return this.http.post<any>(`${this.apiUrl}/${reservationId}/rating`, ratingData).pipe(
      tap(response => {

      }),
      catchError(this.handleError)
    );
  }
 /**
   *  Vérifie si un freelance peut marquer un client comme absent
   */
  canMarkClientAbsent(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
    const now = new Date();
    const prestationDate = new Date(reservation.datePrestation);
    
    // Peut marquer absent si : confirmée ET date de prestation passée de plus de 15 min
    const delayMinutes = (now.getTime() - prestationDate.getTime()) / (1000 * 60);
    return (status === 'confirmee' || status === 'confirmed') && delayMinutes > 15;
  }
  /**
   *  Vérifie si un client peut terminer une réservation
   */
  canClientTerminateReservation(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
    const now = new Date();
    const prestationDate = new Date(reservation.datePrestation);
    
    // Le client peut terminer si : confirmée ET après l'heure du RDV
    return (status === 'confirmee' || status === 'confirmed') && prestationDate <= now;
  }

  /**
   *  Vérifie si un client peut annuler une réservation
   */
  canClientCancelReservation(reservation: any): boolean {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
    const now = new Date();
    const prestationDate = new Date(reservation.datePrestation);
    
    // Le client peut annuler si : confirmée ET au moins 2h avant le RDV
    const hoursUntil = (prestationDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return (status === 'confirmee' || status === 'confirmed') && hoursUntil >= 2;
  }

  /**
   *  Obtient les actions disponibles pour un freelance
   */
  getFreelanceAvailableActions(reservation: any): string[] {
    const actions: string[] = ['details', 'contact'];
    
    if (this.canMarkClientAbsent(reservation)) {
      actions.push('mark-absent');
    }
    
    return actions;
  }

  /**
   *  Obtient les actions disponibles pour un client
   */
  getClientAvailableActions(reservation: any): string[] {
    const actions: string[] = ['details'];
    
    if (this.canClientTerminateReservation(reservation)) {
      actions.push('terminate');
    }
    
    if (this.canClientCancelReservation(reservation)) {
      actions.push('cancel');
    }
    
    return actions;
  }
// ==========================================
//  MÉTHODES CLIENT (À AJOUTER AU SERVICE ANGULAR)
// ==========================================

/**
 *  NOUVEAU : Récupérer toutes les réservations du client connecté
 */
getClientReservations(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.apiUrl}/user`).pipe(
    tap(reservations => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les réservations à venir du client
 */
getClientUpcomingReservations(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.apiUrl}/user/upcoming`).pipe(
    tap(reservations => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer l'historique des réservations terminées du client
 */
getClientReservationHistory(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.apiUrl}/user/history`).pipe(
    tap(reservations => {

    }),
    catchError(this.handleError)
  );
}


/**
 *  NOUVEAU : Récupérer les réservations d'aujourd'hui pour le client
 */
getClientTodayReservations(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.apiUrl}/user/today`).pipe(
    tap(reservations => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les prestataires favoris du client
 */
getClientFavoriteProviders(): Observable<any[]> {

  
  return this.http.get<any[]>(`${environment.apiUrl}/client/stats/favorites`).pipe(
    tap(favorites => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Ajouter un prestataire aux favoris
 */
addToFavorites(favoriteData: any): Observable<any> {

  
  return this.http.post<any>(`${environment.apiUrl}/client/favorites`, favoriteData).pipe(
    tap(response => {

    }),
    catchError(error => {
      console.error(' Erreur lors de l\'ajout aux favoris:', error);
      return this.handleError(error);
    })
  );
}

/**
 *  NOUVEAU : Supprimer un prestataire des favoris
 */
removeFromFavorites(prestataireId: number, type: string): Observable<any> {

  
  return this.http.delete<any>(`${environment.apiUrl}/client/favorites/${prestataireId}?type=${type}`).pipe(
    tap(response => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer le montant dépensé par période
 */
getClientSpending(dateDebut: string, dateFin: string): Observable<any> {

  
  const params = new HttpParams()
    .set('dateDebut', dateDebut)
    .set('dateFin', dateFin);
  
  return this.http.get<any>(`${this.apiUrl}/client/spending`, { params }).pipe(
    tap(response => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Vérifier si le client peut annuler une réservation
 */
canClientCancelReservationCheck(reservationId: number, heuresAvantAnnulation: number = 24): Observable<any> {

  
  const params = new HttpParams().set('heuresAvantAnnulation', heuresAvantAnnulation.toString());
  
  return this.http.get<any>(`${this.apiUrl}/client/${reservationId}/can-cancel`, { params }).pipe(
    tap(response => {

    }),
    catchError(this.handleError)
  );
}

// ==========================================
//  MÉTHODES AVIS (NOUVEAU SYSTÈME)
// ==========================================



/**
 *  NOUVEAU : Créer un avis pour une réservation terminée
 */
createAvis(avisData: {
  reservationId: number;
  note: number;
  commentaire?: string;
}): Observable<any> {

  
  return this.http.post<any>(this.avisUrl, avisData).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Modifier un avis existant
 */
updateAvis(avisId: number, avisData: {
  note?: number;
  commentaire?: string;
}): Observable<any> {

  
  return this.http.put<any>(`${this.avisUrl}/${avisId}`, avisData).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Supprimer un avis
 */
deleteAvis(avisId: number): Observable<any> {

  
  return this.http.delete<any>(`${this.avisUrl}/${avisId}`).pipe(
    tap(() => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer tous les avis du client connecté
 */
getClientAvis(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.avisUrl}/user`).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer tous les avis du freelance connecté
 */
getFreelanceAvis(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.avisUrl}/freelance`).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer tous les avis des salons de l'employeur connecté
 */
getSalonAvis(): Observable<any[]> {

  
  return this.http.get<any[]>(`${this.avisUrl}/salon`).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les statistiques du client connecté
 */
getClientStats(): Observable<any> {

  
  return this.http.get<any>(`${environment.apiUrl}/client/stats`).pipe(
    tap(stats => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les notifications du client connecté
 */
getClientNotifications(): Observable<any> {

  
  return this.http.get<any>(`${environment.apiUrl}/client/stats/notifications`).pipe(
    tap(notifications => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Marquer une notification comme lue
 */
markNotificationAsRead(notificationId: number): Observable<any> {

  
  return this.http.put<any>(`${environment.apiUrl}/client/stats/notifications/${notificationId}/read`, {}).pipe(
    tap(() => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Marquer toutes les notifications comme lues
 */
markAllNotificationsAsRead(): Observable<any> {

  
  return this.http.put<any>(`${environment.apiUrl}/client/stats/notifications/read-all`, {}).pipe(
    tap(() => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer l'avis pour une réservation spécifique
 */
getAvisByReservation(reservationId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/reservation/${reservationId}`).pipe(
    tap(avis => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Vérifier si le client peut noter une réservation
 */
canRateReservation(reservationId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/can-rate/${reservationId}`).pipe(
    tap(response => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les réservations que le client peut noter
 */
getReservationsToRate(): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/user/to-rate`).pipe(
    tap(response => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les avis d'un salon
 */
getAvisBySalon(salonId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/salon/${salonId}`).pipe(
    tap(response => {
      const avisCount = response?.avis?.length || 0;

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les avis d'un freelance
 */
getAvisByFreelance(freelanceId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/freelance/${freelanceId}`).pipe(
    tap(response => {
      const avisCount = response?.avis?.length || 0;

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les statistiques d'un salon
 */
getSalonAvisStats(salonId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/stats/salon/${salonId}`).pipe(
    tap(stats => {

    }),
    catchError(this.handleError)
  );
}

/**
 *  NOUVEAU : Récupérer les statistiques d'un freelance
 */
getFreelanceAvisStats(freelanceId: number): Observable<any> {

  
  return this.http.get<any>(`${this.avisUrl}/stats/freelance/${freelanceId}`).pipe(
    tap(stats => {

    }),
    catchError(this.handleError)
  );
}

// ==========================================
//  MÉTHODES UTILITAIRES CLIENT
// ==========================================

/**
 *  NOUVEAU : Calculer statistiques client côté frontend
 */
calculateClientStats(reservations: any[]): any {

  
  const stats = {
    total: reservations.length,
    aVenir: 0,
    terminees: 0,
    annulees: 0,
    totalDepense: 0,
    moyenneDepenseParReservation: 0,
    servicesFavoris: new Map(),
    prestatairesFavoris: new Map()
  };
  
  const now = new Date();
  
  reservations.forEach(reservation => {
    const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
    const datePrestation = new Date(reservation.datePrestation);
    
    // Compter par statut
    switch (status) {
      case 'confirmee':
      case 'confirmed':
        if (datePrestation > now) {
          stats.aVenir++;
        }
        break;
      case 'terminee':
      case 'completed':
        stats.terminees++;
        // Ajouter au total dépensé
        const prix = reservation.servicePrix || reservation.prix || 0;
        stats.totalDepense += prix;
        break;
      case 'annulee':
      case 'cancelled':
      case 'annulee_client':
        stats.annulees++;
        break;
    }
    
    // Services favoris
    if (reservation.serviceNom) {
      const count = stats.servicesFavoris.get(reservation.serviceNom) || 0;
      stats.servicesFavoris.set(reservation.serviceNom, count + 1);
    }
    
    // Prestataires favoris
    const prestataire = reservation.salonNom || 
                       (reservation.freelancePrenom + ' ' + reservation.freelanceNom);
    if (prestataire) {
      const count = stats.prestatairesFavoris.get(prestataire) || 0;
      stats.prestatairesFavoris.set(prestataire, count + 1);
    }
  });
  
  // Moyenne dépense
  stats.moyenneDepenseParReservation = stats.terminees > 0 ? 
    Math.round(stats.totalDepense / stats.terminees) : 0;
  

  return stats;
}

/**
 *  NOUVEAU : Vérifier si une réservation peut être notée
 */
isReservationRatable(reservation: any): boolean {
  const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
  const datePrestation = new Date(reservation.datePrestation);
  const now = new Date();
  
  // Peut être notée si : terminée ET date passée
  return status === 'terminee' || status === 'completed' && datePrestation <= now;
}

/**
 *  NOUVEAU : Obtenir les actions disponibles pour un client
 * CORRECTION : Logique simplifiée et cohérente avec le component
 */
getClientAvailableActionsForReservation(reservation: any): string[] {
  const actions: string[] = ['details'];
  const status = reservation.status?.toLowerCase() || reservation.bookstatus?.toLowerCase();
  const datePrestation = new Date(reservation.datePrestation);
  const now = new Date();
  
  // Seulement pour les réservations confirmées
  if (status === 'confirmee' || status === 'confirmed') {
    const hoursUntil = (datePrestation.getTime() - now.getTime()) / (1000 * 60 * 60);
    const minutesUntil = (datePrestation.getTime() - now.getTime()) / (1000 * 60);
    
    // Peut annuler si au moins 2h avant OU si date passée (rattrapage)
    if (hoursUntil >= 2 || datePrestation <= now) {
      actions.push('cancel');
    }
    
    // Peut terminer si dans les 30 min avant/après l'heure prévue
    if (minutesUntil <= 30) {
      actions.push('complete');
    }
  }
  
  // Peut noter si terminée
  if (this.isReservationRatable(reservation)) {
    actions.push('rate');
  }
  
  return actions;
}

/**
 *  NOUVEAU : Formater statut pour client
 */
formatClientReservationStatus(status: string): string {
  const statusMap: { [key: string]: string } = {
    'confirmee': 'Confirmée',
    'confirmed': 'Confirmée',
    'terminee': 'Terminée',
    'completed': 'Terminée',
    'annulee_client': 'Annulée par vous',
    'annulee_prestataire': 'Annulée par le prestataire',
    'cancelled': 'Annulée',
    'non_presentee': 'Marquée comme absence'
  };
  
  return statusMap[status?.toLowerCase()] || status || 'Statut inconnu';
}

/**
 *  NOUVEAU : Obtenir la couleur du statut pour client
 */
getClientStatusColor(status: string): string {
  const colorMap: { [key: string]: string } = {
    'confirmee': '#2196F3',      // Bleu
    'confirmed': '#2196F3',
    'terminee': '#4CAF50',       // Vert
    'completed': '#4CAF50',
    'annulee_client': '#FF9800', // Orange
    'annulee_prestataire': '#F44336', // Rouge
    'cancelled': '#F44336',
    'non_presentee': '#9E9E9E'   // Gris
  };
  
  return colorMap[status?.toLowerCase()] || '#757575';
}

/**
 *  NOUVEAU : Formater note en étoiles
 */
formatRatingStars(note: number): string {
  if (!note || note < 1 || note > 5) return '';
  
  const fullStars = ''.repeat(Math.floor(note));
  const emptyStars = ''.repeat(5 - Math.floor(note));
  
  return fullStars + emptyStars;
}

/**
 *  NOUVEAU : Obtenir le prochain rendez-vous client
 */
getNextClientAppointment(reservations: any[]): any | null {
  const now = new Date();
  
  const upcomingReservations = reservations
    .filter(r => {
      const status = r.status?.toLowerCase() || r.bookstatus?.toLowerCase();
      const datePrestation = new Date(r.datePrestation);
      return (status === 'confirmee' || status === 'confirmed') && datePrestation > now;
    })
    .sort((a, b) => new Date(a.datePrestation).getTime() - new Date(b.datePrestation).getTime());
  
  return upcomingReservations.length > 0 ? upcomingReservations[0] : null;
}
  
}
