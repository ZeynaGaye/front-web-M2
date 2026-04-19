import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SalonService } from '../../services/salon.service';
import { ServiceSalonService } from '../../services/service-salon.service';
import { EmployeService } from '../../services/employe';
import { EmployeListItem } from '../../../models/employe';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatSpinner } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoDataDialogComponent } from '../no-data-dialog/no-data-dialog.component';
import { AddServiceDialogComponent } from '../add-service-dialog/add-service-dialog.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';


import { HorairesManagerComponent } from '../../../shared/components/horaires-manager/horaires-manager.component';

import { SalonComponent } from '../salon/salon.component';
import { EmployeFormComponent } from '../employe-form/employe-form.component';
import { EmployeListComponent } from "../employe-list/employe-list.component";



interface UploadResponse {
  photos: any[];
  total: number;
  message: string;
}

interface DeleteResponse {
  success: boolean;
  photoId: number;
  message?: string;
  error?: string;
}




@Component({
  selector: 'app-mes-salons',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatInputModule,
    MatFormFieldModule,
    MatButtonModule,
    MatSpinner,
    MatDialogModule,
    MatExpansionModule,
    MatMenuModule,
    MatTooltipModule,
    HorairesManagerComponent,
    SalonComponent,
    EmployeListComponent
],
  templateUrl: './mes-salons.component.html',
  styleUrl: './mes-salons.component.scss',
  animations: [
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('expandAnimation', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('300ms ease-out', style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        style({ opacity: 1, height: '*', overflow: 'hidden' }),
        animate('300ms ease-in', style({ opacity: 0, height: '0px' }))
      ])
    ]),
    trigger('tabAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(10px)' }),
        animate('200ms 100ms ease-out', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(10px)' }))
      ])
    ]),
    trigger('serviceAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('250ms 50ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ]),
    trigger('photoAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'scale(0.8)' }))
      ])
    ]),
  ]
})
export class MesSalonsComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();

  salons: any[] = [];
  expandedSalonId: number | null = null;
  services: { [salonId: number]: any[] } = {};
  salonPhotos: { [salonId: number]: any[] } = {};
  salonEmployes: { [salonId: number]: EmployeListItem[] } = {};


  isLoading = false;
  errorMessage = '';
  activeTab: { [salonId: number]: string } = {};

  // États de chargement spécifiques
  loadingStates: { [key: string]: boolean } = {};


  horairesErrors: { [salonId: number]: string } = {};

  // États spécifiques pour les photos
  photosInitialized: { [salonId: number]: boolean } = {};
  photosErrors: { [salonId: number]: string } = {};

  // États spécifiques pour les employés
  employesInitialized: { [salonId: number]: boolean } = {};
  employesErrors: { [salonId: number]: string } = {};

  //  NOUVELLES PROPRIÉTÉS POUR LE MODE ÉDITION
  showModal = false;
  isEditMode = false;
  salonToEdit: any = null;

  constructor(
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private employeService: EmployeService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSalons();
  }

  loadSalons() {
    this.isLoading = true;
    this.salonService.getMesSalons().subscribe({
      next: (data: any[]) => {

        this.salons = data;
        this.isLoading = false;

        // Initialiser les tabs et les états pour chaque salon
        this.salons.forEach(salon => {
          this.activeTab[salon.id] = 'info';
          this.photosInitialized[salon.id] = false;
          this.salonPhotos[salon.id] = [];
          this.photosErrors[salon.id] = '';
          // Initialiser les états des employés
          this.employesInitialized[salon.id] = false;
          this.salonEmployes[salon.id] = [];
          this.employesErrors[salon.id] = '';
          
          this.horairesErrors[salon.id] = ''; 
        });

        // Afficher le popup si aucun salon n'est disponible
        if (data.length === 0) {
          this.openNoDataDialog({
            title: 'Gérer vos Salons',
            message: 'Vous n\'avez pas encore de salon.',
            buttonText: 'Créer un salon',
            icon: 'add_business'
          });
        }
      },
      error: (error: { message: string }) => {
        console.error(' Erreur chargement salons:', error);
        this.errorMessage = 'Erreur lors du chargement des salons: ' + error.message;
        this.isLoading = false;
      }
    });
  }

  toggleSalonExpansion(salonId: number) {
    if (this.expandedSalonId === salonId) {
      this.expandedSalonId = null;
    } else {
      this.expandedSalonId = salonId;
      // Charger les services par défaut ou le premier onglet actif
      this.loadServices(salonId); // Garder le comportement actuel si désiré
    }
  }

  loadServices(salonId: number) {
    if (!this.services[salonId]) {
      this.setLoadingState(`services-${salonId}`, true);
      this.serviceSalonService.getServicesBySalon(salonId).subscribe({
        next: (data: any[]) => {
          this.services[salonId] = data;
          this.setLoadingState(`services-${salonId}`, false);

          if (data.length === 0 && this.activeTab[salonId] === 'services') {
            this.openNoDataDialog({
              title: 'Services du Salon',
              message: 'Ce salon n\'a pas encore de services.',
              buttonText: 'Ajouter un service',
              icon: 'add'
            });
          }
        },
        error: (error: { message: string }) => {
          this.errorMessage = 'Erreur lors du chargement des services: ' + error.message;
          this.setLoadingState(`services-${salonId}`, false);
        }
      });
    }
  }

  //  Simplification de loadSalonHoraires
  loadSalonHoraires(salonId: number) {
    // Le HorairesManagerComponent chargera ses propres données.
    // Cette méthode peut être utilisée pour réinitialiser un état d'erreur ou de chargement
    // si vous aviez des indicateurs spécifiques au parent.
    // Pour l'instant, elle ne fait rien de spécifique ici car le child gère le chargement.

    this.horairesErrors[salonId] = ''; // Réinitialise l'erreur si l'utilisateur change d'onglet
  }

  loadSalonPhotos(salonId: number, forceReload: boolean = false) {
    if (this.photosInitialized[salonId] && !forceReload) {

      return;
    }

    if (this.getLoadingState(`photos-${salonId}`)) {

      return;
    }



    this.setLoadingState(`photos-${salonId}`, true);
    this.photosErrors[salonId] = '';

    this.salonService.getSalonPhotos(salonId).subscribe({
      next: (photos: any[]) => {


        this.salonPhotos[salonId] = photos || [];
        this.photosInitialized[salonId] = true;
        this.setLoadingState(`photos-${salonId}`, false);


      },
      error: (error) => {
        console.error(` Erreur photos salon ${salonId}:`, error);

        this.photosErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonPhotos[salonId] = [];
        this.photosInitialized[salonId] = true;
        this.setLoadingState(`photos-${salonId}`, false);

        this.errorMessage = `Erreur photos salon ${salonId}: ${error.message}`;
      }
    });
  }

  //  MÉTHODE CORRIGÉE pour setActiveTab incluant les horaires
  setActiveTab(salonId: number, tab: string) {


    if (this.activeTab[salonId] === tab) {

      return;
    }

    this.activeTab[salonId] = tab;

    // Charger les données selon l'onglet sélectionné
    if (tab === 'services') {
      this.loadServices(salonId);
    } else if (tab === 'horaires') {
      this.loadSalonHoraires(salonId); // Appel de la méthode simplifiée
    } else if (tab === 'photos') {

      this.loadSalonPhotos(salonId);
    } else if (tab === 'employes') {

      this.loadSalonEmployes(salonId);
    }
  }

  //  MÉTHODES UTILITAIRES AMÉLIORÉES

  setLoadingState(key: string, loading: boolean) {
    this.loadingStates[key] = loading;

  }

  getLoadingState(key: string): boolean {
    return this.loadingStates[key] || false;
  }

  hasPhotosLoaded(salonId: number): boolean {
    return this.photosInitialized[salonId] === true;
  }

  arePhotosLoading(salonId: number): boolean {
    return this.getLoadingState(`photos-${salonId}`);
  }

  getPhotosCount(salonId: number): number {
    return this.salonPhotos[salonId]?.length || 0;
  }

  hasPhotosError(salonId: number): boolean {
    return !!(this.photosErrors[salonId]);
  }

  getPhotosError(salonId: number): string {
    return this.photosErrors[salonId] || '';
  }

  reloadPhotos(salonId: number) {

    this.photosInitialized[salonId] = false;
    this.photosErrors[salonId] = '';
    this.loadSalonPhotos(salonId, true);
  }

  //  NOUVELLE: Méthode pour gérer les erreurs remontées par HorairesManagerComponent
  handleHorairesError(salonId: number, message: string): void {
    this.horairesErrors[salonId] = message;
    console.error(`Erreur horaires pour le salon ${salonId}: ${message}`);
    this.errorMessage = `Erreur de gestion des horaires pour le salon ${salonId}: ${message}`;
  }

  //  REMOVED: reloadHoraires, areHorairesLoading, hasHorairesLoaded, hasHorairesError, getHorairesError
  // Ces méthodes sont maintenant gérées directement par HorairesManagerComponent ou via son output d'erreur.

  debugSalon(salonId: number) {






 //  DEBUG Horaires


    if (confirm('Tester l\'API directement ?')) {
      this.testSalonPhotosAPI(salonId);
    }
  }

  testSalonPhotosAPI(salonId: number) {
    const url = `http://localhost:8081/api/salons/${salonId}/photos`;


    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
    .then(response => {



      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return response.json();
    })
    .then(data => {


      if (data && typeof data === 'object' && 'photos' in data) {




      } else if (Array.isArray(data)) {


      } else {

      }

      const summary = Array.isArray(data)
        ? `Format tableau: ${data.length} photos`
        : `Format objet: ${data.photos?.length || 0} photos`;

      alert(` API fonctionne!\n${summary}\n\nVoir console pour détails`);

      if (confirm('Voulez-vous utiliser ces données dans le composant ?')) {
        const photos = Array.isArray(data) ? data : (data.photos || []);
        this.salonPhotos[salonId] = photos;
        this.photosInitialized[salonId] = true;
      }
    })
    .catch(error => {
      console.error(' Erreur en test direct:', error);
      alert(` Erreur API: ${error.message}\n\nVoir console pour détails`);
    });
  }

  uploadSalonPhotos(salonId: number, files: FileList) {

    this.setLoadingState(`upload-photos-${salonId}`, true);

    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }

    this.salonService.uploadSalonPhotos(salonId, formData).subscribe({
      next: (response: UploadResponse) => {


        if (response && response.photos && Array.isArray(response.photos)) {
          if (!this.salonPhotos[salonId]) {
            this.salonPhotos[salonId] = [];
          }
          this.salonPhotos[salonId] = [...this.salonPhotos[salonId], ...response.photos];



        } else {
          console.warn(' Réponse upload sans photos:', response);
        }

        this.setLoadingState(`upload-photos-${salonId}`, false);
      },
      error: (error) => {
        console.error(' Erreur upload photos:', error);
        this.errorMessage = "Erreur lors du téléchargement des photos: " + error.message;
        this.setLoadingState(`upload-photos-${salonId}`, false);
      }
    });
  }

  deletePhoto(photoId: number, salonId: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;


    this.setLoadingState(`delete-photo-${photoId}`, true);

    this.salonService.deleteSalonPhoto(photoId).subscribe({
      next: (response: DeleteResponse) => {


        if (response && response.success) {
          if (this.salonPhotos[salonId]) {
            this.salonPhotos[salonId] = this.salonPhotos[salonId].filter(photo => photo.id !== photoId);
          }



        } else {
          console.error(' Échec suppression:', response.error);
          this.errorMessage = `Erreur suppression: ${response.error}`;
        }

        this.setLoadingState(`delete-photo-${photoId}`, false);
      },
      error: (error) => {
        console.error(' Erreur suppression photo:', error);
        this.errorMessage = "Erreur lors de la suppression de la photo: " + error.message;
        this.setLoadingState(`delete-photo-${photoId}`, false);
      }
    });
  }

  openNoDataDialog(data: { title: string, message: string, buttonText: string, icon: string }) {
    const dialogRef = this.dialog.open(NoDataDialogComponent, {
      width: '400px',
      data: data
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        if (data.buttonText === 'Créer un salon') {
          this.closeModal();
        } else if (data.buttonText === 'Ajouter un service') {
          this.addService(this.expandedSalonId!);
        }
      }
    });
  }

  addService(salonId: number) {
    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'blur-backdrop',
      panelClass: 'clean-dialog-panel',
      data: {
        service: null,
        salonId: salonId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        if (!this.services[salonId]) this.services[salonId] = [];
        this.services[salonId].push(result);
      }
    });
  }

  createService(salonId: number, serviceData: any) {
    this.setLoadingState(`create-service-${salonId}`, true);

    this.serviceSalonService.createService(salonId, serviceData).subscribe({
      next: (service) => {


        if (!this.services[salonId]) {
          this.services[salonId] = [];
        }
        this.services[salonId].push(service);

        this.setLoadingState(`create-service-${salonId}`, false);
      },
      error: (error) => {
        console.error(' Erreur création service:', error);
        this.errorMessage = 'Erreur lors de l\'ajout du service: ' + error.message;
        this.setLoadingState(`create-service-${salonId}`, false);
      }
    });
  }

  editService(serviceId: number, salonId: number) {
    const existingService = this.services[salonId]?.find(s => s.id === serviceId);

    if (!existingService) {
      this.errorMessage = 'Service non trouvé';
      return;
    }

    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '560px',
      maxHeight: '90vh',
      disableClose: false,
      hasBackdrop: true,
      backdropClass: 'blur-backdrop',
      panelClass: 'clean-dialog-panel',
      data: {
        service: existingService,
        salonId: salonId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {

        this.updateService(serviceId, salonId, result);
      }
    });
  }

  updateService(serviceId: number, salonId: number, serviceData: any) {
    this.setLoadingState(`update-service-${serviceId}`, true);

    this.serviceSalonService.updateService(serviceId, serviceData).subscribe({
      next: (updatedService) => {


        const index = this.services[salonId].findIndex(s => s.id === serviceId);
        if (index !== -1) {
          this.services[salonId][index] = updatedService;
        }

        this.setLoadingState(`update-service-${serviceId}`, false);
      },
      error: (error) => {
        console.error(' Erreur modification service:', error);
        this.errorMessage = 'Erreur lors de la modification du service: ' + error.message;
        this.setLoadingState(`update-service-${serviceId}`, false);
      }
    });
  }

  deleteService(serviceId: number, salonId: number) {
    if (confirm('Voulez-vous vraiment supprimer ce service ?')) {
      this.serviceSalonService.deleteService(serviceId).subscribe({
        next: () => {
          this.services[salonId] = this.services[salonId].filter(s => s.id !== serviceId);
          if (this.services[salonId].length === 0) {
            this.openNoDataDialog({
              title: 'Services du Salon',
              message: 'Ce salon n\'a plus de services.',
              buttonText: 'Ajouter un service',
              icon: 'add'
            });
          }
        },
        error: (error) => {
          this.errorMessage = 'Erreur lors de la suppression du service: ' + error.message;
        }
      });
    }
  }

  editSalon(salonId: number) {

    
    // Trouver le salon à modifier dans la liste
    const salonToEdit = this.salons.find(salon => salon.id === salonId);
    
    if (!salonToEdit) {
      console.error(' Salon non trouvé avec ID:', salonId);
      return;
    }
    

    
    // Activer le mode édition et définir le salon à modifier
    this.isEditMode = true;
    this.salonToEdit = salonToEdit;
    this.showModal = true;
  }

  closeModal() {

    this.showModal = false;
    this.isEditMode = false;
    this.salonToEdit = null;
    this.closeModalEvent.emit();
  }

  //  NOUVELLE MÉTHODE - Gérer la mise à jour du salon
  onSalonUpdated(updatedSalon: any) {

    
    // Mettre à jour la liste des salons
    const index = this.salons.findIndex(salon => salon.id === updatedSalon.id);
    if (index !== -1) {
      this.salons[index] = updatedSalon;
    }
    
    this.closeModal();
    
    // Recharger les données du salon
    this.loadSalons();
  }

  //  NOUVELLE MÉTHODE - Ouvrir modal de création
  openCreateModal() {
    this.isEditMode = false;
    this.salonToEdit = null;
    this.showModal = true;
  }

  changeProfilePhoto(salonId: number) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';

    fileInput.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.uploadProfilePhoto(salonId, file);
      }
    });

    fileInput.click();
  }

  uploadProfilePhoto(salonId: number, file: File) {
    this.setLoadingState(`profile-photo-${salonId}`, true);

    const formData = new FormData();
    formData.append('file', file);

    this.salonService.updateSalonProfilePhoto(salonId, formData).subscribe({
      next: (updatedSalon) => {
        const index = this.salons.findIndex(s => s.id === salonId);
        if (index !== -1) {
          this.salons[index] = updatedSalon;
        }
        this.setLoadingState(`profile-photo-${salonId}`, false);
      },
      error: (error) => {
        this.errorMessage = "Erreur lors du téléchargement de la photo: " + error.message;
        this.setLoadingState(`profile-photo-${salonId}`, false);
      }
    });
  }

  openFileSelector(salonId: number) {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;

    fileInput.addEventListener('change', (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (files && files.length > 0) {
        this.uploadSalonPhotos(salonId, files);
      }
    });

    fileInput.click();
  }

  setAsProfilePhoto(photoUrl: string, salonId: number) {
    this.setLoadingState(`set-profile-${salonId}`, true);
    this.salonService.updateSalonProfilePhotoUrl(salonId, { photoUrl }).subscribe({
      next: (updatedSalon) => {
        const index = this.salons.findIndex(s => s.id === salonId);
        if (index !== -1) {
          this.salons[index] = updatedSalon;
        }
        this.setLoadingState(`set-profile-${salonId}`, false);
      },
      error: (error) => {
        this.errorMessage = "Erreur lors de la mise à jour de la photo de profil: " + error.message;
        this.setLoadingState(`set-profile-${salonId}`, false);
      }
    });
  }

  onImageError(event: any) {
    console.warn('Erreur de chargement d\'image:', event.target.src);
    event.target.src = 'assets/images/default-image.jpg';
  }

  //  NOUVELLES MÉTHODES POUR LA GESTION DES EMPLOYÉS

  loadSalonEmployes(salonId: number, forceReload: boolean = false) {
    if (this.employesInitialized[salonId] && !forceReload) {

      return;
    }

    if (this.getLoadingState(`employes-${salonId}`)) {

      return;
    }



    this.setLoadingState(`employes-${salonId}`, true);
    this.employesErrors[salonId] = '';

    this.employeService.listerEmployes(salonId, 0, 10).subscribe({
      next: (response: { content: EmployeListItem[]; totalElements: number; }) => {


        this.salonEmployes[salonId] = response.content || [];
        this.employesInitialized[salonId] = true;
        this.setLoadingState(`employes-${salonId}`, false);


      },
      error: (error) => {
        console.error(` Erreur employés salon ${salonId}:`, error);

        this.employesErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonEmployes[salonId] = [];
        this.employesInitialized[salonId] = true;
        this.setLoadingState(`employes-${salonId}`, false);

        this.errorMessage = `Erreur employés salon ${salonId}: ${error.message}`;
      }
    });
  }

  // Méthodes utilitaires pour les employés
  areEmployesLoading(salonId: number): boolean {
    return this.getLoadingState(`employes-${salonId}`);
  }

  hasEmployesLoaded(salonId: number): boolean {
    return this.employesInitialized[salonId] === true;
  }

  hasEmployesError(salonId: number): boolean {
    return !!(this.employesErrors[salonId]);
  }

  getEmployesError(salonId: number): string {
    return this.employesErrors[salonId] || '';
  }

  getEmployesCount(salonId: number): number {
    return this.salonEmployes[salonId]?.length || 0;
  }

  getEmployeStatutClass(statut: string): string {
    switch (statut?.toLowerCase()) {
      case 'actif': return 'statut-actif';
      case 'inactif': return 'statut-inactif';
      case 'conge': return 'statut-conge';
      case 'suspendu': return 'statut-suspendu';
      default: return '';
    }
  }

  // Ouvrir le formulaire employé en modal
  navigateToEmployeForm(salonId: number) {

    
    const dialogRef = this.dialog.open(EmployeFormComponent, {
      width: '800px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      disableClose: false,
      hasBackdrop: true,
      panelClass: 'employe-form-dialog',
      data: { 
        salonId: salonId,
        isEditMode: false
      }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result && result.success) {

        // Recharger les employés du salon
        this.reloadEmployes(salonId);
      } else {

      }
    });
  }

  navigateToEmployeList(salonId: number) {

    // Stocker l'ID du salon pour filtrer les employés
    localStorage.setItem('currentSalonId', salonId.toString());
    this.router.navigate(['/employeur/employes']);
  }

  editEmploye(employeId: number, salonId: number) {

    
    const dialogRef = this.dialog.open(EmployeFormComponent, {
      width: '800px',
      maxWidth: '95vw', 
      maxHeight: '90vh',
      disableClose: false,
      hasBackdrop: true,
      panelClass: 'employe-form-dialog',
      data: {
        salonId: salonId,
        employeId: employeId,
        isEditMode: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {

      if (result && result.success) {

        // Recharger les employés du salon
        this.reloadEmployes(salonId);
      } else {

      }
    });
  }

  reloadEmployes(salonId: number) {

    this.employesInitialized[salonId] = false;
    this.employesErrors[salonId] = '';
    this.loadSalonEmployes(salonId, true);
  }
}