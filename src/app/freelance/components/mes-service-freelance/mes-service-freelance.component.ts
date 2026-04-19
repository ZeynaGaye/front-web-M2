import { Component, EventEmitter, OnInit, Output, OnDestroy, Input } from '@angular/core';
import { CommonModule, NgFor, NgIf } from '@angular/common';
import { MatCardActions, MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { Subscription } from 'rxjs';
import { ServiceFreelanceResponseDto, FreelanceServicesStatsDto, ServiceFreelanceService, ServiceFreelanceRequestDto } from '../../ServiceFreelance/service-freelance.service';
import { AddServiceFreelanceDialogComponent } from '../add-service-freelance-dialog/add-service-freelance-dialog.component';
import { AuthService } from '../../../core/servces/auth.service';

@Component({
  selector: 'app-mes-services-freelance',
  standalone: true,
  imports: [
    CommonModule, NgFor, NgIf, MatButtonModule,
    MatCardModule, MatIconModule, MatProgressSpinnerModule, MatChipsModule,
    AddServiceFreelanceDialogComponent
],
  templateUrl: './mes-service-freelance.component.html',
  styleUrls: ['./mes-service-freelance.component.scss']
})
export class MesServicesFreelanceComponent implements OnInit, OnDestroy {

  
  @Output() closeModalEvent = new EventEmitter<void>();
  @Input() modalData: any = null; 

  services: ServiceFreelanceResponseDto[] = [];
  stats: FreelanceServicesStatsDto | null = null;
  loading = false;
  error: string | null = null;
  freelanceId: number | null = null;
  showAddServiceDialog = false;

  //  Gestion des subscriptions pour éviter les fuites mémoire
  private subscriptions: Subscription = new Subscription();

  constructor(
    private serviceFreelanceService: ServiceFreelanceService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    this.loadFreelanceId();
  }

  ngOnDestroy(): void {
    //  Nettoyer toutes les subscriptions
    this.subscriptions.unsubscribe();
  }

  loadFreelanceId(): void {
    const currentUser = this.authService.getCurrentUser();
    
    if (currentUser && currentUser.id) {
      this.freelanceId = currentUser.id;
      this.loadServices();
      this.loadStats();

    } else {
      this.error = "Aucun utilisateur connecté. Veuillez vous connecter.";
      this.services = [];
      
      //  Si pas d'utilisateur connecté, déclencher le modal de connexion
      this.authService.triggerLoginModal();
      
      //  Écouter les changements d'authentification avec gestion des subscriptions
      const userSub = this.authService.currentUser$.subscribe(user => {
        if (user && user.id) {
          this.freelanceId = user.id;
          this.error = null;
          this.loadServices();
          this.loadStats();

        }
      });
      
      this.subscriptions.add(userSub);
    }
  }

  //  Méthode helper pour vérifier si l'utilisateur est connecté
  private isUserAuthenticated(): boolean {
    return this.authService.isAuthenticated() && this.freelanceId !== null;
  }

  loadServices(): void {
    if (!this.freelanceId) {
      console.warn('Pas de freelanceId disponible pour charger les services');
      return;
    }
    
    this.loading = true;
    this.error = null;
    
    const servicesSub = this.serviceFreelanceService.getServicesByFreelance(this.freelanceId)
      .subscribe({
        next: (data: ServiceFreelanceResponseDto[]) => {
          this.services = data ?? [];
          this.loading = false;

        },
        error: (error: any) => {
          const errorMessage = error?.message ?? 'Erreur lors du chargement des services';
          this.error = errorMessage;
          this.loading = false;
          console.error('Erreur:', error);
          this.showErrorMessage(errorMessage);
        }
      });
      
    this.subscriptions.add(servicesSub);
  }

  loadStats(): void {
    if (!this.freelanceId) {
      console.warn('Pas de freelanceId disponible pour charger les stats');
      return;
    }
    
    const statsSub = this.serviceFreelanceService.getFreelanceStats(this.freelanceId)
      .subscribe({
        next: (stats: FreelanceServicesStatsDto) => {
          this.stats = stats;

        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des statistiques:', error);
        }
      });
      
    this.subscriptions.add(statsSub);
  }

  openAddServiceDialog(): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour ajouter un service');
      this.authService.triggerLoginModal();
      return;
    }



    //  Configuration des données du modal (mode création)
    this.modalData = {
      freelanceId: this.freelanceId,
      service: null // null = mode création
    };

    //  Afficher le modal
    this.showAddServiceDialog = true;
  }

  //  Fermer le modal
  closeAddServiceDialog(): void {

    this.showAddServiceDialog = false;
    this.modalData = null;
  }

  //  CORRIGÉ: Méthodes qui reçoivent les événements du composant enfant
  onServiceCreated(serviceData: ServiceFreelanceRequestDto): void {

    this.createService(serviceData);
    this.closeAddServiceDialog();
  }

  onServiceUpdated(data: { serviceId: number, serviceData: ServiceFreelanceRequestDto }): void {

    this.updateService(data.serviceId, data.serviceData);
    this.closeAddServiceDialog();
  }

  createService(serviceData: ServiceFreelanceRequestDto): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour créer un service');
      return;
    }

    const errors = this.serviceFreelanceService.validateServiceData(serviceData);
    if (errors.length > 0) {
      this.showErrorMessage(errors.join(', '));
      return;
    }

    this.serviceFreelanceService.createService(this.freelanceId!, serviceData)
      .subscribe({
        next: (createdService: ServiceFreelanceResponseDto) => {
          this.services.push(createdService);
          this.loadStats(); // Recharger les stats
          this.showSuccessMessage('Service créé avec succès');
        },
        error: (error: any) => {
          const errorMessage = error?.message ?? 'Erreur lors de la création du service';
          this.showErrorMessage(errorMessage);
        }
      });
  }

  //  Ouvrir en mode édition
  editService(service: ServiceFreelanceResponseDto): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour modifier un service');
      this.authService.triggerLoginModal();
      return;
    }



    //  Configuration des données du modal (mode édition)
    this.modalData = {
      freelanceId: this.freelanceId,
      service: service // service existant = mode édition
    };

    //  Afficher le modal
    this.showAddServiceDialog = true;
  }

  updateService(serviceId: number, serviceData: ServiceFreelanceRequestDto): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour modifier un service');
      return;
    }

    const errors = this.serviceFreelanceService.validateServiceData(serviceData);
    if (errors.length > 0) {
      this.showErrorMessage(errors.join(', '));
      return;
    }

    this.serviceFreelanceService.updateService(serviceId, serviceData)
      .subscribe({
        next: (updatedService: ServiceFreelanceResponseDto) => {
          const index = this.services.findIndex(s => s.id === serviceId);
          if (index !== -1) {
            this.services[index] = updatedService;
          }
          this.loadStats(); // Recharger les stats
          this.showSuccessMessage('Service modifié avec succès');
        },
        error: (error: any) => {
          const errorMessage = error?.message ?? 'Erreur lors de la modification du service';
          this.showErrorMessage(errorMessage);
        }
      });
  }

  deleteService(serviceId: number): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour supprimer un service');
      this.authService.triggerLoginModal();
      return;
    }

    const service = this.services.find(s => s.id === serviceId);
    const serviceName = service?.nom ?? 'ce service';
    
    if (confirm(`Êtes-vous sûr de vouloir supprimer "${serviceName}" ?`)) {
      this.serviceFreelanceService.deleteService(serviceId)
        .subscribe({
          next: () => {
            this.services = this.services.filter(s => s.id !== serviceId);
            this.loadStats(); // Recharger les stats
            this.showSuccessMessage('Service supprimé avec succès');
          },
          error: (error: any) => {
            const errorMessage = error?.message ?? 'Erreur lors de la suppression du service';
            this.showErrorMessage(errorMessage);
          }
        });
    }
  }

  closeModal(): void {
    this.closeModalEvent.emit();
  }

  //  CORRIGÉ: Implémentation de shareServices
  shareServices(): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour partager');
      this.authService.triggerLoginModal();
      return;
    }

    if (this.services.length === 0) {
      this.showErrorMessage('Aucun service à partager');
      return;
    }

    // TODO: Implémenter le partage des services

    this.showSuccessMessage('Fonctionnalité de partage à implémenter');
  }

  // ===== MÉTHODES UTILITAIRES POUR L'AFFICHAGE =====

  getServiceTags(service: ServiceFreelanceResponseDto): string[] {
    return this.serviceFreelanceService.getServiceTags(service);
  }

  //  Formatage des prix en CFA
  formatPrice(price: number): string {
    if (!price || price === 0) {
      return '0 CFA';
    }
    
    // Formater le nombre avec des espaces pour les milliers
    const formattedNumber = new Intl.NumberFormat('fr-FR').format(price);
    return `${formattedNumber} CFA`;
  }

  //  Formatage de la durée
  formatDuration(minutes: number): string {
    if (!minutes || minutes === 0) {
      return '0 min';
    }
    
    if (minutes < 60) {
      return `${minutes} min`;
    }
    
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    
    if (remainingMinutes === 0) {
      return `${hours}h`;
    }
    
    return `${hours}h${remainingMinutes.toString().padStart(2, '0')}`;
  }

  getTypeInterventionIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'DOMICILE': 'home',
      'STUDIO_PRIVE': 'business',
      'SALON_PARTENAIRE': 'store',
      'MIXTE': 'swap_horiz'
    };
    return icons[type] || 'location_on';
  }

  getCategorieIcon(categorie: string): string {
    const icons: { [key: string]: string } = {
      'Coiffure': 'content_cut',
      'Maquillage': 'palette',
      'Soins du visage': 'spa',
      'Manucure/Pédicure': 'back_hand',
      'Épilation': 'remove',
      'Massage': 'healing',
      'Extensions': 'extension',
      'Coloration': 'colorize',
      'Tresses': 'waves',
      'Locks': 'lock'
    };
    return icons[categorie] || 'spa';
  }

  //  Message des stats en CFA
  getStatsMessage(): string {
    if (!this.stats || (this.stats.nombreServices ?? 0) === 0) {
      return '';
    }
    
    const prixMoyenMin = this.stats.prixMoyenMin ?? 0;
    const prixMoyenMax = this.stats.prixMoyenMax ?? 0;
    const prixMoyen = (prixMoyenMin + prixMoyenMax) / 2;
    const nombreServices = this.stats.nombreServices ?? 0;
    
    return `${nombreServices} service${nombreServices > 1 ? 's' : ''} • Prix moyen: ${this.formatPrice(prixMoyen)}`;
  }

  hasDeplacementCost(service: ServiceFreelanceResponseDto): boolean {
    return !service.deplacementInclus && (service.supplementDeplacementKm ?? 0) > 0;
  }

  // ===== MÉTHODES POUR LES MESSAGES =====

  private showSuccessMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 3000,
      panelClass: ['success-snackbar']
    });
  }

  private showErrorMessage(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  // ===== MÉTHODES POUR LES ACTIONS RAPIDES =====

  refreshServices(): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour actualiser');
      this.authService.triggerLoginModal();
      return;
    }
    
    this.loadServices();
    this.loadStats();
  }

  exportServices(): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour exporter');
      this.authService.triggerLoginModal();
      return;
    }

    if (this.services.length === 0) {
      this.showErrorMessage('Aucun service à exporter');
      return;
    }

    // TODO: Implémenter l'export en CSV ou PDF

    this.showSuccessMessage('Export à implémenter');
  }

  duplicateService(service: ServiceFreelanceResponseDto): void {
    if (!this.isUserAuthenticated()) {
      this.showErrorMessage('Vous devez être connecté pour dupliquer un service');
      this.authService.triggerLoginModal();
      return;
    }

    const duplicatedService = {
      nom: `${service.nom} (copie)`,
      description: service.description,
      categorie: service.categorie,
      prixMin: service.prixMin,
      prixMax: service.prixMax,
      dureeEnMinutes: service.dureeEnMinutes,
      typeIntervention: service.typeIntervention,
      materielInclus: service.materielInclus,
      deplacementInclus: service.deplacementInclus,
      supplementDeplacementKm: service.supplementDeplacementKm,
      horairesFlexibles: service.horairesFlexibles,
      disponibleWeekend: service.disponibleWeekend,
      disponibleSoir: service.disponibleSoir
    };

    this.createService(duplicatedService);
  }

  // ===== TRACKBY POUR OPTIMISATION =====
  
  trackByServiceId(index: number, service: ServiceFreelanceResponseDto): number {
    return service.id;
  }

  //  Méthode pour forcer la reconnexion
  forceLogin(): void {
    this.authService.triggerLoginModal();
  }

  //  Getter pour l'état d'authentification (utile dans le template)
  get isAuthenticated(): boolean {
    return this.isUserAuthenticated();
  }

  //  Getter pour l'utilisateur actuel (utile dans le template)
  get currentUser(): any {
    return this.authService.getCurrentUser();
  }
}