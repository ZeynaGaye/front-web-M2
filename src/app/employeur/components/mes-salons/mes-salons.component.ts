import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { NoDataDialogComponent } from '../no-data-dialog/no-data-dialog.component';
import { AddServiceDialogComponent } from '../add-service-dialog/add-service-dialog.component';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { trigger, transition, style, animate } from '@angular/animations';
import { HorairesManagerComponent } from '../../../shared/components/horaires-manager/horaires-manager.component';
import { PlaceholderImageService } from '../../../shared/services/placeholder-image.service';
import { inject } from '@angular/core';
import { SalonComponent } from '../salon/salon.component';
import { EmployeFormComponent } from '../employe-form/employe-form.component';
import { EmployeListComponent } from '../employe-list/employe-list.component';
import { OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';
import { ReservationService } from '../../../shared/services/reservation/reservation.service';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

interface UploadResponse { photos: any[]; total: number; message: string; }
interface DeleteResponse { success: boolean; photoId: number; message?: string; error?: string; }

@Component({
  selector: 'app-mes-salons',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, MatListModule, MatInputModule,
    MatFormFieldModule, MatButtonModule, MatProgressSpinnerModule,
    MatDialogModule, MatExpansionModule, MatMenuModule, MatTooltipModule,
    HorairesManagerComponent, SalonComponent, EmployeListComponent,
    AddServiceDialogComponent,
  ],
  templateUrl: './mes-salons.component.html',
  styleUrl: './mes-salons.component.scss',
  animations: [
    trigger('pageSwitch', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(20px)' }),
        animate('320ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-20px)' }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(16px)' }),
        animate('300ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('tabAnim', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate('240ms 40ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    trigger('heroIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(1.02)' }),
        animate('400ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('serviceAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(-12px)' }),
        animate('260ms cubic-bezier(0.25, 0.46, 0.45, 0.94)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(12px)' }))
      ])
    ]),
    trigger('photoAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.85)' }),
        animate('280ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    trigger('statIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8) translateY(4px)' }),
        animate('350ms 100ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ])
    ]),
    trigger('expandDown', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('420ms cubic-bezier(0.34, 1.56, 0.64, 1)', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ overflow: 'hidden' }),
        animate('240ms cubic-bezier(0.4, 0, 0.2, 1)', style({ height: 0, opacity: 0 }))
      ])
    ])
  ]
})
export class MesSalonsComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();

  // ── Core data ──────────────────────────────────────
  salons: any[] = [];
  services: { [salonId: number]: any[] } = {};
  salonPhotos: { [salonId: number]: any[] } = {};
  salonVideos: { [salonId: number]: any[] } = {};
  salonEmployes: { [salonId: number]: EmployeListItem[] } = {};

  // ── UI state ───────────────────────────────────────
  isLoading = false;
  errorMessage = '';
  activeTab: { [salonId: number]: string } = {};
  loadingStates: { [key: string]: boolean } = {};
  horairesErrors: { [salonId: number]: string } = {};

  // ── Photo / video state ────────────────────────────
  photosInitialized: { [salonId: number]: boolean } = {};
  photosErrors: { [salonId: number]: string } = {};
  videosInitialized: { [salonId: number]: boolean } = {};
  videosErrors: { [salonId: number]: string } = {};
  showAddVideoForm: { [salonId: number]: boolean } = {};
  newVideoTitre: { [salonId: number]: string } = {};
  newVideoDescription: { [salonId: number]: string } = {};
  editingVideoId: number | null = null;
  editTitre = '';
  editDescription = '';

  // ── Employe state ──────────────────────────────────
  employesInitialized: { [salonId: number]: boolean } = {};
  employesErrors: { [salonId: number]: string } = {};

  // ── Salon modal (create / edit) ────────────────────
  showModal = false;
  isEditMode = false;
  salonToEdit: any = null;

  // ── Service inline expansion ────────────────────────
  showServiceForm = false;
  serviceFormSalonId: number | null = null;
  serviceFormEditData: any = null;

  // ── List + Detail state ────────────────────────────
  selectedSalon: any = null;
  searchTerm = '';
  statusFilter: 'tous' | 'ouverts' | 'fermes' = 'tous';
  salonEmployesCounts: { [id: number]: number } = {};
  salonOffresCounts: { [id: number]: number } = {};
  salonRevenues: { [id: number]: number } = {};
  editForm = { nom: '', adresse: '', telephone: '', specialites: '', description: '' };
  isSavingInfo = false;

  private placeholderSvc = inject(PlaceholderImageService);

  constructor(
    private salonService: SalonService,
    private serviceSalonService: ServiceSalonService,
    private employeService: EmployeService,
    private offreEmploisService: OffreEmploisService,
    private reservationService: ReservationService,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadSalons();
  }

  // ─────────────────────────────────────────────────────────────────
  // LOAD
  // ─────────────────────────────────────────────────────────────────

  loadSalons(): void {
    this.isLoading = true;
    this.salonService.getMesSalons().subscribe({
      next: (data: any[]) => {
        this.salons = data;
        this.isLoading = false;
        this.salons.forEach(salon => {
          this.activeTab[salon.id] = 'info';
          this.photosInitialized[salon.id] = false;
          this.salonPhotos[salon.id] = [];
          this.photosErrors[salon.id] = '';
          this.videosInitialized[salon.id] = false;
          this.salonVideos[salon.id] = [];
          this.videosErrors[salon.id] = '';
          this.employesInitialized[salon.id] = false;
          this.salonEmployes[salon.id] = [];
          this.employesErrors[salon.id] = '';
          this.horairesErrors[salon.id] = '';
        });
        this.loadSalonStats();
        if (data.length === 0) {
          this.openNoDataDialog({ title: 'Mes salons', message: 'Vous n\'avez pas encore de salon.', buttonText: 'Créer un salon', icon: 'add_business' });
        }
      },
      error: (error: { message: string }) => {
        this.errorMessage = 'Erreur lors du chargement des salons : ' + error.message;
        this.isLoading = false;
      }
    });
  }

  loadSalonStats(): void {
    this.salons.forEach(salon => {
      const id = salon.id;

      this.employeService.listerEmployes(id, 0, 1).pipe(
        catchError(() => of({ totalElements: 0, content: [] }))
      ).subscribe((res: any) => {
        this.salonEmployesCounts[id] = res.totalElements ?? 0;
      });

      this.offreEmploisService.getOffresEmploisBySalon(id).subscribe({
        next: (offres: any[]) => { this.salonOffresCounts[id] = offres.length; },
        error: () => { this.salonOffresCounts[id] = 0; }
      });

      this.reservationService.getSalonReservations(id).subscribe({
        next: (reservations: any[]) => {
          const monthAgo = new Date();
          monthAgo.setDate(monthAgo.getDate() - 30);
          this.salonRevenues[id] = reservations
            .filter((r: any) => {
              const statut = (r.status || r.statut || '').toUpperCase();
              const date = new Date(r.datePrestation || r.dateReservation || r.date);
              return (statut === 'TERMINEE' || statut === 'CONFIRMEE') && date >= monthAgo;
            })
            .reduce((sum: number, r: any) => sum + (r.prixTotal ?? r.servicePrixMax ?? r.servicePrixMin ?? 0), 0);
        },
        error: () => { this.salonRevenues[id] = 0; }
      });
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // LIST VIEW HELPERS
  // ─────────────────────────────────────────────────────────────────

  get filteredSalons(): any[] {
    let list = this.salons;
    if (this.searchTerm.trim()) {
      const t = this.searchTerm.toLowerCase();
      list = list.filter(s => (s.nom || '').toLowerCase().includes(t) || (s.adresse || '').toLowerCase().includes(t));
    }
    if (this.statusFilter === 'ouverts') list = list.filter(s => this.isOuvert(s));
    else if (this.statusFilter === 'fermes') list = list.filter(s => !this.isOuvert(s));
    return list;
  }

  get ouvertsCount(): number { return this.salons.filter(s => this.isOuvert(s)).length; }
  get fermesCount(): number { return this.salons.filter(s => !this.isOuvert(s)).length; }

  isOuvert(salon: any): boolean {
    const s = (salon.statut || salon.status || '').toUpperCase();
    return s !== 'FERME' && s !== 'FERMÉ' && s !== 'CLOSED' && s !== 'INACTIF';
  }

  isPrincipal(salon: any): boolean { return this.salons.indexOf(salon) === 0; }

  getEmployeCountForSalon(id: number): number { return this.salonEmployesCounts[id] ?? 0; }
  getOffresCountForSalon(id: number): number { return this.salonOffresCounts[id] ?? 0; }
  getRevenueForSalon(id: number): number { return this.salonRevenues[id] ?? 0; }
  getServicesCountForSalon(id: number): number { return this.services[id]?.length ?? 0; }

  formatRevenue(amount: number): string {
    if (!amount) return '0';
    if (amount >= 1000000) return (amount / 1000000).toFixed(1).replace('.0', '') + 'M';
    if (amount >= 1000) return Math.round(amount / 1000) + 'K';
    return amount.toString();
  }

  // ─────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────

  selectSalon(salon: any): void {
    this.selectedSalon = salon;
    if (!this.activeTab[salon.id]) this.activeTab[salon.id] = 'info';
    this.editForm = {
      nom: salon.nom || '',
      adresse: salon.adresse || '',
      telephone: salon.telephone || '',
      specialites: salon.specialites || '',
      description: salon.description || ''
    };
    if (!this.services[salon.id]) this.loadServices(salon.id);
  }

  deselectSalon(): void { this.selectedSalon = null; }

  saveInfo(): void {
    if (!this.selectedSalon || this.isSavingInfo) return;
    this.isSavingInfo = true;
    const data = { ...this.editForm };
    this.salonService.updateSalon(this.selectedSalon.id, data).subscribe({
      next: () => {
        const idx = this.salons.findIndex(s => s.id === this.selectedSalon.id);
        if (idx !== -1) this.salons[idx] = { ...this.salons[idx], ...data };
        Object.assign(this.selectedSalon, data);
        this.isSavingInfo = false;
      },
      error: () => { this.isSavingInfo = false; }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // TABS
  // ─────────────────────────────────────────────────────────────────

  setActiveTab(salonId: number, tab: string): void {
    if (this.activeTab[salonId] === tab) return;
    this.activeTab[salonId] = tab;
    if (tab === 'services') this.loadServices(salonId);
    else if (tab === 'horaires') this.horairesErrors[salonId] = '';
    else if (tab === 'photos') this.loadSalonPhotos(salonId);
    else if (tab === 'videos') this.loadSalonVideos(salonId);
    else if (tab === 'employes') this.loadSalonEmployes(salonId);
  }

  // ─────────────────────────────────────────────────────────────────
  // SERVICES
  // ─────────────────────────────────────────────────────────────────

  loadServices(salonId: number): void {
    if (this.services[salonId]) return;
    this.setLoadingState(`services-${salonId}`, true);
    this.serviceSalonService.getServicesBySalon(salonId).subscribe({
      next: (data: any[]) => {
        this.services[salonId] = data;
        this.setLoadingState(`services-${salonId}`, false);
      },
      error: (e: { message: string }) => {
        this.errorMessage = 'Erreur services : ' + e.message;
        this.setLoadingState(`services-${salonId}`, false);
      }
    });
  }

  addService(salonId: number): void {
    this.serviceFormEditData = null;
    this.serviceFormSalonId = salonId;
    this.showServiceForm = true;
  }

  editService(serviceId: number, salonId: number): void {
    const existing = this.services[salonId]?.find(s => s.id === serviceId);
    if (!existing) return;
    this.serviceFormEditData = existing;
    this.serviceFormSalonId = salonId;
    this.showServiceForm = true;
  }

  closeServiceForm(): void {
    this.showServiceForm = false;
    this.serviceFormSalonId = null;
    this.serviceFormEditData = null;
  }

  onServiceFormCreated(serviceData: any, salonId: number): void {
    if (!this.services[salonId]) this.services[salonId] = [];
    this.services[salonId].push(serviceData);
    this.closeServiceForm();
  }

  onServiceFormUpdated(event: { serviceId: number; serviceData: any }, salonId: number): void {
    const idx = this.services[salonId]?.findIndex((s: any) => s.id === event.serviceId);
    if (idx !== undefined && idx !== -1) {
      this.services[salonId][idx] = { ...this.services[salonId][idx], ...event.serviceData };
    }
    this.closeServiceForm();
  }

  updateService(serviceId: number, salonId: number, data: any): void {
    this.setLoadingState(`update-service-${serviceId}`, true);
    this.serviceSalonService.updateService(serviceId, data).subscribe({
      next: (updated) => {
        const idx = this.services[salonId].findIndex(s => s.id === serviceId);
        if (idx !== -1) this.services[salonId][idx] = updated;
        this.setLoadingState(`update-service-${serviceId}`, false);
      },
      error: () => { this.setLoadingState(`update-service-${serviceId}`, false); }
    });
  }

  deleteService(serviceId: number, salonId: number): void {
    if (!confirm('Supprimer ce service ?')) return;
    this.serviceSalonService.deleteService(serviceId).subscribe({
      next: () => { this.services[salonId] = this.services[salonId].filter(s => s.id !== serviceId); },
      error: (e: any) => { this.errorMessage = 'Erreur suppression : ' + e.message; }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // PHOTOS
  // ─────────────────────────────────────────────────────────────────

  loadSalonPhotos(salonId: number, forceReload = false): void {
    if (this.photosInitialized[salonId] && !forceReload) return;
    if (this.getLoadingState(`photos-${salonId}`)) return;
    this.setLoadingState(`photos-${salonId}`, true);
    this.photosErrors[salonId] = '';
    this.salonService.getSalonPhotos(salonId).subscribe({
      next: (photos: any[]) => {
        this.salonPhotos[salonId] = photos || [];
        this.photosInitialized[salonId] = true;
        this.setLoadingState(`photos-${salonId}`, false);
      },
      error: (error) => {
        this.photosErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonPhotos[salonId] = [];
        this.photosInitialized[salonId] = true;
        this.setLoadingState(`photos-${salonId}`, false);
      }
    });
  }

  reloadPhotos(salonId: number): void { this.photosInitialized[salonId] = false; this.photosErrors[salonId] = ''; this.loadSalonPhotos(salonId, true); }
  openFileSelector(salonId: number): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*'; input.multiple = true;
    input.addEventListener('change', (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files?.length) this.uploadSalonPhotos(salonId, files);
    });
    input.click();
  }

  uploadSalonPhotos(salonId: number, files: FileList): void {
    this.setLoadingState(`upload-photos-${salonId}`, true);
    const fd = new FormData();
    for (let i = 0; i < files.length; i++) fd.append('files', files[i]);
    this.salonService.uploadSalonPhotos(salonId, fd).subscribe({
      next: (res: UploadResponse) => {
        if (res?.photos?.length) {
          if (!this.salonPhotos[salonId]) this.salonPhotos[salonId] = [];
          this.salonPhotos[salonId] = [...this.salonPhotos[salonId], ...res.photos];
        }
        this.setLoadingState(`upload-photos-${salonId}`, false);
      },
      error: () => { this.setLoadingState(`upload-photos-${salonId}`, false); }
    });
  }

  deletePhoto(photoId: number, salonId: number): void {
    if (!confirm('Supprimer cette photo ?')) return;
    this.setLoadingState(`delete-photo-${photoId}`, true);
    this.salonService.deleteSalonPhoto(photoId).subscribe({
      next: (res: DeleteResponse) => {
        if (res?.success) this.salonPhotos[salonId] = this.salonPhotos[salonId].filter(p => p.id !== photoId);
        this.setLoadingState(`delete-photo-${photoId}`, false);
      },
      error: () => { this.setLoadingState(`delete-photo-${photoId}`, false); }
    });
  }

  setAsProfilePhoto(photoUrl: string, salonId: number): void {
    this.setLoadingState(`set-profile-${salonId}`, true);
    this.salonService.updateSalonProfilePhotoUrl(salonId, { photoUrl }).subscribe({
      next: (updated) => {
        const idx = this.salons.findIndex(s => s.id === salonId);
        if (idx !== -1) this.salons[idx] = updated;
        if (this.selectedSalon?.id === salonId) this.selectedSalon = updated;
        this.setLoadingState(`set-profile-${salonId}`, false);
      },
      error: () => { this.setLoadingState(`set-profile-${salonId}`, false); }
    });
  }

  arePhotosLoading(id: number): boolean { return this.getLoadingState(`photos-${id}`); }
  hasPhotosLoaded(id: number): boolean { return this.photosInitialized[id] === true; }
  getPhotosCount(id: number): number { return this.salonPhotos[id]?.length || 0; }
  hasPhotosError(id: number): boolean { return !!(this.photosErrors[id]); }
  getPhotosError(id: number): string { return this.photosErrors[id] || ''; }

  // ─────────────────────────────────────────────────────────────────
  // VIDEOS
  // ─────────────────────────────────────────────────────────────────

  loadSalonVideos(salonId: number, forceReload = false): void {
    if (this.videosInitialized[salonId] && !forceReload) return;
    if (this.getLoadingState(`videos-${salonId}`)) return;
    this.setLoadingState(`videos-${salonId}`, true);
    this.videosErrors[salonId] = '';
    this.salonService.getVideosBySalon(salonId).subscribe({
      next: (videos: any[]) => {
        this.salonVideos[salonId] = videos || [];
        this.videosInitialized[salonId] = true;
        this.setLoadingState(`videos-${salonId}`, false);
      },
      error: (error) => {
        this.videosErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonVideos[salonId] = [];
        this.videosInitialized[salonId] = true;
        this.setLoadingState(`videos-${salonId}`, false);
      }
    });
  }

  reloadVideos(id: number): void { this.videosInitialized[id] = false; this.videosErrors[id] = ''; this.loadSalonVideos(id, true); }
  areVideosLoading(id: number): boolean { return this.getLoadingState(`videos-${id}`); }
  hasVideosLoaded(id: number): boolean { return this.videosInitialized[id] === true; }
  getVideosCount(id: number): number { return this.salonVideos[id]?.length || 0; }
  hasVideosError(id: number): boolean { return !!(this.videosErrors[id]); }
  getVideosError(id: number): string { return this.videosErrors[id] || ''; }

  toggleAddVideoForm(salonId: number): void {
    this.showAddVideoForm[salonId] = !this.showAddVideoForm[salonId];
    if (!this.newVideoTitre[salonId]) this.newVideoTitre[salonId] = '';
    if (!this.newVideoDescription[salonId]) this.newVideoDescription[salonId] = '';
  }

  openVideoSelector(salonId: number): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'video/mp4,video/webm,video/ogg,video/quicktime';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadSalonVideo(salonId, file);
    });
    input.click();
  }

  uploadSalonVideo(salonId: number, file: File): void {
    this.setLoadingState(`upload-video-${salonId}`, true);
    const fd = new FormData();
    fd.append('videoFile', file);
    fd.append('titre', this.newVideoTitre[salonId] || file.name.replace(/\.[^/.]+$/, ''));
    fd.append('description', this.newVideoDescription[salonId] || '');
    this.salonService.uploadSalonVideo(salonId, fd).subscribe({
      next: (res: any) => {
        if (res?.success && res.video) {
          if (!this.salonVideos[salonId]) this.salonVideos[salonId] = [];
          this.salonVideos[salonId] = [...this.salonVideos[salonId], res.video];
        }
        this.showAddVideoForm[salonId] = false;
        this.newVideoTitre[salonId] = '';
        this.newVideoDescription[salonId] = '';
        this.setLoadingState(`upload-video-${salonId}`, false);
      },
      error: () => { this.setLoadingState(`upload-video-${salonId}`, false); }
    });
  }

  startEditVideo(video: any): void { this.editingVideoId = video.id; this.editTitre = video.titre || ''; this.editDescription = video.description || ''; }
  cancelEditVideo(): void { this.editingVideoId = null; this.editTitre = ''; this.editDescription = ''; }

  saveVideoEdit(videoId: number, salonId: number): void {
    this.setLoadingState(`edit-video-${videoId}`, true);
    this.salonService.updateSalonVideo(salonId, videoId, { titre: this.editTitre, description: this.editDescription }).subscribe({
      next: () => {
        const v = this.salonVideos[salonId]?.find(x => x.id === videoId);
        if (v) { v.titre = this.editTitre; v.description = this.editDescription; }
        this.cancelEditVideo();
        this.setLoadingState(`edit-video-${videoId}`, false);
      },
      error: () => { this.setLoadingState(`edit-video-${videoId}`, false); }
    });
  }

  deleteVideo(videoId: number, salonId: number): void {
    if (!confirm('Supprimer cette vidéo ?')) return;
    this.setLoadingState(`delete-video-${videoId}`, true);
    this.salonService.deleteSalonVideo(salonId, videoId).subscribe({
      next: () => {
        this.salonVideos[salonId] = this.salonVideos[salonId].filter(v => v.id !== videoId);
        this.setLoadingState(`delete-video-${videoId}`, false);
      },
      error: () => { this.setLoadingState(`delete-video-${videoId}`, false); }
    });
  }

  // ─────────────────────────────────────────────────────────────────
  // EMPLOYES
  // ─────────────────────────────────────────────────────────────────

  loadSalonEmployes(salonId: number, forceReload = false): void {
    if (this.employesInitialized[salonId] && !forceReload) return;
    if (this.getLoadingState(`employes-${salonId}`)) return;
    this.setLoadingState(`employes-${salonId}`, true);
    this.employesErrors[salonId] = '';
    this.employeService.listerEmployes(salonId, 0, 10).subscribe({
      next: (res: { content: EmployeListItem[]; totalElements: number }) => {
        this.salonEmployes[salonId] = res.content || [];
        this.employesInitialized[salonId] = true;
        this.setLoadingState(`employes-${salonId}`, false);
      },
      error: (error) => {
        this.employesErrors[salonId] = error.message || 'Erreur de chargement';
        this.salonEmployes[salonId] = [];
        this.employesInitialized[salonId] = true;
        this.setLoadingState(`employes-${salonId}`, false);
      }
    });
  }

  reloadEmployes(salonId: number): void {
    this.employesInitialized[salonId] = false;
    this.employesErrors[salonId] = '';
    this.loadSalonEmployes(salonId, true);
  }

  navigateToEmployeForm(salonId: number): void {
    const ref = this.dialog.open(EmployeFormComponent, {
      width: '800px', maxWidth: '95vw', maxHeight: '90vh',
      disableClose: false, hasBackdrop: true, panelClass: 'employe-form-dialog',
      data: { salonId, isEditMode: false }
    });
    ref.afterClosed().subscribe(result => { if (result?.success) this.reloadEmployes(salonId); });
  }

  // ─────────────────────────────────────────────────────────────────
  // SALON PHOTO
  // ─────────────────────────────────────────────────────────────────

  getSalonPhoto(salon: any): string {
    return this.placeholderSvc.resolveImage(salon, 'salon');
  }

  changeProfilePhoto(salonId: number): void {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) this.uploadProfilePhoto(salonId, file);
    });
    input.click();
  }

  uploadProfilePhoto(salonId: number, file: File): void {
    this.setLoadingState(`profile-photo-${salonId}`, true);
    const fd = new FormData();
    fd.append('file', file);
    this.salonService.updateSalonProfilePhoto(salonId, fd).subscribe({
      next: (updated) => {
        const idx = this.salons.findIndex(s => s.id === salonId);
        if (idx !== -1) this.salons[idx] = updated;
        if (this.selectedSalon?.id === salonId) this.selectedSalon = { ...this.selectedSalon, ...updated };
        this.setLoadingState(`profile-photo-${salonId}`, false);
      },
      error: () => { this.setLoadingState(`profile-photo-${salonId}`, false); }
    });
  }

  onImageError(event: any): void {
    const img = event.target as HTMLImageElement;
    if (img.dataset['fallback']) return;
    img.dataset['fallback'] = '1';
    img.src = this.placeholderSvc.getPlaceholder(parseInt(img.dataset['salonId'] ?? '0'), 'salon');
  }

  // ─────────────────────────────────────────────────────────────────
  // SALON MODAL (create / edit)
  // ─────────────────────────────────────────────────────────────────

  editSalon(salonId: number): void {
    const salon = this.salons.find(s => s.id === salonId);
    if (!salon) return;
    this.isEditMode = true;
    this.salonToEdit = salon;
    this.showModal = true;
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.salonToEdit = null;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.isEditMode = false;
    this.salonToEdit = null;
  }

  onSalonUpdated(updatedSalon: any): void {
    const idx = this.salons.findIndex(s => s.id === updatedSalon.id);
    if (idx !== -1) this.salons[idx] = updatedSalon;
    else this.loadSalons();
    if (this.selectedSalon?.id === updatedSalon.id) {
      this.selectedSalon = updatedSalon;
      this.editForm = {
        nom: updatedSalon.nom || '',
        adresse: updatedSalon.adresse || '',
        telephone: updatedSalon.telephone || '',
        specialites: updatedSalon.specialites || '',
        description: updatedSalon.description || ''
      };
    }
    this.showModal = false;
    this.isEditMode = false;
    this.salonToEdit = null;
  }

  // ─────────────────────────────────────────────────────────────────
  // HORAIRES
  // ─────────────────────────────────────────────────────────────────

  handleHorairesError(salonId: number, message: string): void {
    this.horairesErrors[salonId] = message;
  }

  // ─────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────

  setLoadingState(key: string, loading: boolean): void { this.loadingStates[key] = loading; }
  getLoadingState(key: string): boolean { return this.loadingStates[key] || false; }

  openNoDataDialog(data: { title: string; message: string; buttonText: string; icon: string }): void {
    const ref = this.dialog.open(NoDataDialogComponent, { width: '400px', data });
    ref.afterClosed().subscribe(result => {
      if (result && data.buttonText === 'Créer un salon') this.openCreateModal();
    });
  }
}
