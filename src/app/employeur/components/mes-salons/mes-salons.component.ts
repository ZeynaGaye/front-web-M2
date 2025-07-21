import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { SalonService } from '../../services/salon.service';
import { ServiceSalonService } from '../../services/service-salon.service';
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
import { AddServiceDialogComponent } from '../add-service-dialog/add-service-dialog.component'; // ✅ AJOUT
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, state, style, transition, animate } from '@angular/animations';

// ✅ INTERFACES POUR LE TYPAGE
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
    MatTooltipModule
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
  isLoading = false;
  errorMessage = '';
  activeTab: { [salonId: number]: string } = {};
  
  // États de chargement spécifiques
  loadingStates: { [key: string]: boolean } = {};
  
  // ✅ NOUVEAU: États spécifiques pour les photos
  photosInitialized: { [salonId: number]: boolean } = {};
  photosErrors: { [salonId: number]: string } = {};

  constructor(
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadSalons();
  }

  loadSalons() {
    this.isLoading = true;
    this.salonService.getMesSalons().subscribe({
      next: (data: any[]) => {
        console.log('🏢 Salons chargés:', data);
        this.salons = data;
        this.isLoading = false;
        
        // Initialiser les tabs pour chaque salon
        this.salons.forEach(salon => {
          this.activeTab[salon.id] = 'info';
          // ✅ Initialiser les états des photos
          this.photosInitialized[salon.id] = false;
          this.salonPhotos[salon.id] = [];
          this.photosErrors[salon.id] = '';
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
        console.error('❌ Erreur chargement salons:', error);
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
      // Charger les services par défaut
      this.loadServices(salonId);
    }
  }

  loadServices(salonId: number) {
    if (!this.services[salonId]) {
      this.setLoadingState(`services-${salonId}`, true);
      this.serviceSalonService.getServicesBySalon(salonId).subscribe({
        next: (data: any[]) => {
          this.services[salonId] = data;
          this.setLoadingState(`services-${salonId}`, false);
          
          // Afficher le popup si aucun service n'est disponible
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

  // ✅ MÉTHODE COMPLÈTEMENT REFAITE pour le chargement des photos
  loadSalonPhotos(salonId: number, forceReload: boolean = false) {
    // Éviter les chargements multiples sauf si forcé
    if (this.photosInitialized[salonId] && !forceReload) {
      console.log(`📸 Photos déjà chargées pour salon ${salonId}`);
      return;
    }

    // Éviter les chargements simultanés
    if (this.getLoadingState(`photos-${salonId}`)) {
      console.log(`⏳ Chargement photos déjà en cours pour salon ${salonId}`);
      return;
    }

    console.log(`🔄 Début chargement photos salon ${salonId} (force: ${forceReload})`);
    
    // Marquer comme en cours de chargement
    this.setLoadingState(`photos-${salonId}`, true);
    this.photosErrors[salonId] = '';
    
    this.salonService.getSalonPhotos(salonId).subscribe({
      next: (photos: any[]) => {
        console.log(`✅ Photos reçues pour salon ${salonId}:`, photos);
        
        // Le service retourne maintenant toujours un tableau
        this.salonPhotos[salonId] = photos || [];
        this.photosInitialized[salonId] = true;
        this.setLoadingState(`photos-${salonId}`, false);
        
        console.log(`📊 ${photos.length} photos chargées pour salon ${salonId}`);
        
        // Log détaillé de chaque photo
        photos.forEach((photo, index) => {
          console.log(`📸 Photo ${index + 1}:`, {
            id: photo.id,
            url: photo.url,
            filename: photo.filename,
            fileExists: photo.fileExists
          });
        });
      },
      error: (error) => {
        console.error(`❌ Erreur photos salon ${salonId}:`, error);
        
        // Gérer l'erreur de manière gracieuse
        this.photosErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonPhotos[salonId] = [];
        this.photosInitialized[salonId] = true; // Marquer comme initialisé même en cas d'erreur
        this.setLoadingState(`photos-${salonId}`, false);
        
        // Afficher l'erreur à l'utilisateur
        this.errorMessage = `Erreur photos salon ${salonId}: ${error.message}`;
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE pour setActiveTab
  setActiveTab(salonId: number, tab: string) {
    console.log(`🔄 Changement d'onglet salon ${salonId}: ${this.activeTab[salonId]} → ${tab}`);
    
    // Éviter les changements inutiles
    if (this.activeTab[salonId] === tab) {
      console.log(`📌 Onglet ${tab} déjà actif pour salon ${salonId}`);
      return;
    }
    
    this.activeTab[salonId] = tab;
    
    // Charger les données selon l'onglet sélectionné
    if (tab === 'services') {
      this.loadServices(salonId);
    } else if (tab === 'photos') {
      console.log(`📸 Activation onglet photos pour salon ${salonId}`);
      this.loadSalonPhotos(salonId);
    }
  }

  // ✅ MÉTHODES UTILITAIRES AMÉLIORÉES

  // Méthodes utilitaires pour gérer les états de chargement
  setLoadingState(key: string, loading: boolean) {
    this.loadingStates[key] = loading;
    console.log(`🔄 Loading state ${key}: ${loading}`);
  }

  getLoadingState(key: string): boolean {
    return this.loadingStates[key] || false;
  }

  // Vérifier si un salon a des photos chargées
  hasPhotosLoaded(salonId: number): boolean {
    return this.photosInitialized[salonId] === true;
  }

  // Vérifier si les photos sont en cours de chargement
  arePhotosLoading(salonId: number): boolean {
    return this.getLoadingState(`photos-${salonId}`);
  }

  // ✅ NOUVELLE: Obtenir le nombre de photos pour un salon
  getPhotosCount(salonId: number): number {
    return this.salonPhotos[salonId]?.length || 0;
  }

  // ✅ NOUVELLE: Vérifier s'il y a une erreur pour les photos d'un salon
  hasPhotosError(salonId: number): boolean {
    return !!(this.photosErrors[salonId]);
  }

  // ✅ NOUVELLE: Obtenir le message d'erreur pour les photos d'un salon
  getPhotosError(salonId: number): string {
    return this.photosErrors[salonId] || '';
  }

  // ✅ NOUVELLE: Recharger les photos avec debug
  reloadPhotos(salonId: number) {
    console.log(`🔄 Rechargement forcé des photos pour salon ${salonId}`);
    this.photosInitialized[salonId] = false;
    this.photosErrors[salonId] = '';
    this.loadSalonPhotos(salonId, true);
  }

  // ✅ NOUVELLE: Debug complet d'un salon
  debugSalon(salonId: number) {
    console.log(`🔍 DEBUG salon ${salonId}:`);
    console.log('- Salon data:', this.salons.find(s => s.id === salonId));
    console.log('- Photos initialized:', this.photosInitialized[salonId]);
    console.log('- Photos data:', this.salonPhotos[salonId]);
    console.log('- Photos loading:', this.arePhotosLoading(salonId));
    console.log('- Photos error:', this.photosErrors[salonId]);
    console.log('- Active tab:', this.activeTab[salonId]);
    
    // Test de l'API directement
    if (confirm('Tester l\'API directement ?')) {
      this.testSalonPhotosAPI(salonId);
    }
  }

  // ✅ NOUVELLE MÉTHODE CORRIGÉE: Test direct de l'API
  testSalonPhotosAPI(salonId: number) {
    const url = `http://localhost:8081/api/salons/${salonId}/photos`;
    console.log(`🧪 Test direct API: ${url}`);
    
    fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        // Ajoutez ici vos headers d'authentification si nécessaire
        // 'Authorization': 'Bearer ' + your_token
      }
    })
    .then(response => {
      console.log('🌐 Status de la réponse:', response.status);
      console.log('🌐 Headers de la réponse:', Array.from(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    })
    .then(data => {
      console.log('✅ Données reçues en test direct:', data);
      
      // Analyser le format de la réponse
      if (data && typeof data === 'object' && 'photos' in data) {
        console.log(`📊 Format objet: ${data.photos.length} photos trouvées`);
        console.log('📋 Première photo:', data.photos[0]);
        console.log('📊 Total:', data.total);
        console.log('🏢 Salon ID:', data.salonId);
      } else if (Array.isArray(data)) {
        console.log(`📊 Format tableau: ${data.length} photos`);
        console.log('📋 Première photo:', data[0]);
      } else {
        console.log('⚠️ Format de données inattendu:', typeof data);
      }
      
      // Afficher un résumé à l'utilisateur
      const summary = Array.isArray(data) 
        ? `Format tableau: ${data.length} photos` 
        : `Format objet: ${data.photos?.length || 0} photos`;
      
      alert(`✅ API fonctionne!\n${summary}\n\nVoir console pour détails`);
      
      // Optionnel: mettre à jour les données du composant
      if (confirm('Voulez-vous utiliser ces données dans le composant ?')) {
        const photos = Array.isArray(data) ? data : (data.photos || []);
        this.salonPhotos[salonId] = photos;
        this.photosInitialized[salonId] = true;
      }
    })
    .catch(error => {
      console.error('❌ Erreur en test direct:', error);
      alert(`❌ Erreur API: ${error.message}\n\nVoir console pour détails`);
    });
  }

  // ✅ MÉTHODES PHOTOS CORRIGÉES avec gestion des nouveaux types

  uploadSalonPhotos(salonId: number, files: FileList) {
    console.log(`📤 Upload ${files.length} photos pour salon ${salonId}`);
    this.setLoadingState(`upload-photos-${salonId}`, true);
    
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append('files', files[i]);
    }
    
    this.salonService.uploadSalonPhotos(salonId, formData).subscribe({
      next: (response: UploadResponse) => {
        console.log('✅ Upload réussi:', response);
        
        // Le service retourne maintenant toujours un objet UploadResponse
        if (response && response.photos && Array.isArray(response.photos)) {
          // Ajouter les nouvelles photos aux existantes
          if (!this.salonPhotos[salonId]) {
            this.salonPhotos[salonId] = [];
          }
          this.salonPhotos[salonId] = [...this.salonPhotos[salonId], ...response.photos];
          
          console.log(`📊 Total photos après upload: ${this.salonPhotos[salonId].length}`);
          console.log(`📝 Message: ${response.message}`);
        } else {
          console.warn('⚠️ Réponse upload sans photos:', response);
        }
        
        this.setLoadingState(`upload-photos-${salonId}`, false);
      },
      error: (error) => {
        console.error('❌ Erreur upload photos:', error);
        this.errorMessage = "Erreur lors du téléchargement des photos: " + error.message;
        this.setLoadingState(`upload-photos-${salonId}`, false);
      }
    });
  }

  deletePhoto(photoId: number, salonId: number) {
    if (!confirm('Voulez-vous vraiment supprimer cette photo ?')) return;
    
    console.log(`🗑️ Suppression photo ${photoId} du salon ${salonId}`);
    this.setLoadingState(`delete-photo-${photoId}`, true);
    
    this.salonService.deleteSalonPhoto(photoId).subscribe({
      next: (response: DeleteResponse) => {
        console.log('✅ Réponse suppression:', response);
        
        // Le service retourne maintenant toujours un objet DeleteResponse
        if (response && response.success) {
          // Retirer la photo de la liste
          if (this.salonPhotos[salonId]) {
            this.salonPhotos[salonId] = this.salonPhotos[salonId].filter(photo => photo.id !== photoId);
          }
          
          console.log(`📊 Photos restantes: ${this.salonPhotos[salonId]?.length || 0}`);
          console.log(`📝 Message: ${response.message}`);
        } else {
          console.error('❌ Échec suppression:', response.error);
          this.errorMessage = `Erreur suppression: ${response.error}`;
        }
        
        this.setLoadingState(`delete-photo-${photoId}`, false);
      },
      error: (error) => {
        console.error('❌ Erreur suppression photo:', error);
        this.errorMessage = "Erreur lors de la suppression de la photo: " + error.message;
        this.setLoadingState(`delete-photo-${photoId}`, false);
      }
    });
  }

  // ✅ MÉTHODES DE SERVICES CORRIGÉES - UTILISATION DU DIALOGUE

  openNoDataDialog(data: {title: string, message: string, buttonText: string, icon: string}) {
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

  // ✅ MÉTHODE CORRIGÉE: Ouvre le dialogue au lieu de créer directement
  addService(salonId: number) {
    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '450px', // ✅ Réduit de 600px à 450px
      maxHeight: '90vh',
      disableClose: false,
      data: { service: null } // null car c'est un nouveau service
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // result contient les données du formulaire si l'utilisateur a cliqué sur "Ajouter"
        console.log('Nouveau service à créer:', result);
        this.createService(salonId, result);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Créer le service avec les données du formulaire
  createService(salonId: number, serviceData: any) {
    this.setLoadingState(`create-service-${salonId}`, true);
    
    this.serviceSalonService.createService(salonId, serviceData).subscribe({
      next: (service) => {
        console.log('✅ Service créé:', service);
        
        if (!this.services[salonId]) {
          this.services[salonId] = [];
        }
        this.services[salonId].push(service);
        
        this.setLoadingState(`create-service-${salonId}`, false);
      },
      error: (error) => {
        console.error('❌ Erreur création service:', error);
        this.errorMessage = 'Erreur lors de l\'ajout du service: ' + error.message;
        this.setLoadingState(`create-service-${salonId}`, false);
      }
    });
  }

  // ✅ MÉTHODE CORRIGÉE: Utilise le dialogue pour l'édition
  editService(serviceId: number, salonId: number) {
    // Récupérer le service existant
    const existingService = this.services[salonId]?.find(s => s.id === serviceId);
    
    if (!existingService) {
      this.errorMessage = 'Service non trouvé';
      return;
    }

    const dialogRef = this.dialog.open(AddServiceDialogComponent, {
      width: '450px', // ✅ Réduit de 600px à 450px
      maxHeight: '90vh',
      disableClose: false,
      data: { service: existingService } // Passer le service existant pour l'édition
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Service à modifier:', result);
        this.updateService(serviceId, salonId, result);
      }
    });
  }

  // ✅ NOUVELLE MÉTHODE: Mettre à jour le service
  updateService(serviceId: number, salonId: number, serviceData: any) {
    this.setLoadingState(`update-service-${serviceId}`, true);
    
    this.serviceSalonService.updateService(serviceId, serviceData).subscribe({
      next: (updatedService) => {
        console.log('✅ Service mis à jour:', updatedService);
        
        const index = this.services[salonId].findIndex(s => s.id === serviceId);
        if (index !== -1) {
          this.services[salonId][index] = updatedService;
        }
        
        this.setLoadingState(`update-service-${serviceId}`, false);
      },
      error: (error) => {
        console.error('❌ Erreur modification service:', error);
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

  // ✅ MÉTHODES EXISTANTES INCHANGÉES

  editSalon(salonId: number) {
    console.log('Modifier le salon avec ID:', salonId);
  }

  closeModal() {
    console.log('Modal fermé ou redirection effectuée.');
    this.closeModalEvent.emit();
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

  // Méthode pour gérer les erreurs de chargement d'images
  onImageError(event: any) {
    console.warn('Erreur de chargement d\'image:', event.target.src);
    // Remplacer par une image par défaut
    event.target.src = 'assets/images/default-image.jpg';
  }
}