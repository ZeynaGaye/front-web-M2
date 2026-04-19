import { Component, Input, Output, EventEmitter, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { ProfileManagementService } from '../../services/profile/profile-management.service';

@Component({
  selector: 'app-profile-photo-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    DragDropModule
  ],
  templateUrl: './profile-photo-manager.component.html',
  styleUrls: ['./profile-photo-manager.component.scss']
})
export class ProfilePhotoManagerComponent implements OnInit {
  @Input() userId!: number;
  @Input() currentPhotoUrl: string | null = null;
  @Input() userRole!: string;
  
  @Output() photoUploaded = new EventEmitter<string>();
  @Output() photoDeleted = new EventEmitter<void>();

  // Services
  private profileService = inject(ProfileManagementService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // États
  isUploading = false;
  isDeleting = false;
  isDragOver = false;
  
  // Configuration
  readonly MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  readonly ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  readonly PREVIEW_SIZE = 150; // px

  ngOnInit(): void {
  }

  //  Gestion de la sélection de fichier
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      const file = input.files[0];
      this.processFile(file);
    }
  }

  //  Gestion du drag & drop
  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      const file = files[0];
      this.processFile(file);
    }
  }

  //  Traitement du fichier
  private processFile(file: File): void {
    // Validation du type
    if (!this.ACCEPTED_TYPES.includes(file.type)) {
      this.showError('Type de fichier non supporté. Utilisez JPG, PNG ou WEBP.');
      return;
    }

    // Validation de la taille
    if (file.size > this.MAX_FILE_SIZE) {
      this.showError('Fichier trop volumineux. Maximum 5MB.');
      return;
    }


    this.uploadFile(file);
  }

  //  Upload du fichier
  private uploadFile(file: File): void {
    this.isUploading = true;

    this.profileService.uploadProfilePhoto(file).subscribe({
      next: (photoUrl) => {
        this.currentPhotoUrl = photoUrl;
        this.isUploading = false;
        this.photoUploaded.emit(photoUrl);
        this.showSuccess('Photo de profil mise à jour avec succès');
      },
      error: (error) => {
        console.error(' Erreur upload photo:', error);
        this.isUploading = false;
        this.showError(error.message || 'Erreur lors de l\'upload de la photo');
      }
    });
  }

  //  Suppression de la photo
  onDeletePhoto(): void {
    if (!this.currentPhotoUrl) {
      return;
    }

    // Confirmation
    const confirmed = confirm('Êtes-vous sûr de vouloir supprimer votre photo de profil ?');
    if (!confirmed) {
      return;
    }

    this.isDeleting = true;

    this.profileService.deleteProfilePhoto().subscribe({
      next: () => {
        this.currentPhotoUrl = null;
        this.isDeleting = false;
        this.photoDeleted.emit();
        this.showSuccess('Photo de profil supprimée avec succès');
      },
      error: (error) => {
        console.error(' Erreur suppression photo:', error);
        this.isDeleting = false;
        this.showError(error.message || 'Erreur lors de la suppression de la photo');
      }
    });
  }

  //  Prévisualisation de l'image
  get photoPreviewUrl(): string {
    if (this.currentPhotoUrl) {
      // Si c'est une URL complète, l'utiliser directement
      if (this.currentPhotoUrl.startsWith('http')) {
        return this.currentPhotoUrl;
      }
      // Sinon, construire l'URL avec le serveur backend
      return `http://localhost:8081${this.currentPhotoUrl}`;
    }
    return '';
  }

  //  Icône par défaut selon le rôle
  get defaultIcon(): string {
    switch (this.userRole?.toLowerCase()) {
      case 'freelance':
        return 'spa';
      case 'client':
        return 'person';
      case 'employeur':
        return 'business';
      default:
        return 'account_circle';
    }
  }

  //  Couleur selon le rôle
  get roleColor(): string {
    return '#A4B1BD';
  }

  //  Formater la taille du fichier
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  //  Ouvrir le sélecteur de fichier
  openFileSelector(): void {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = this.ACCEPTED_TYPES.join(',');
    fileInput.addEventListener('change', (event) => {
      this.onFileSelected(event);
    });
    fileInput.click();
  }

  //  Messages de notification
  private showSuccess(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });
  }

  private showError(message: string): void {
    this.snackBar.open(message, 'Fermer', {
      duration: 5000,
      panelClass: ['error-snackbar']
    });
  }

  //  Getters pour le template
  get isLoading(): boolean {
    return this.isUploading || this.isDeleting;
  }

  get hasPhoto(): boolean {
    return !!this.currentPhotoUrl;
  }

  get maxFileSizeFormatted(): string {
    return this.formatFileSize(this.MAX_FILE_SIZE);
  }

  get acceptedTypesFormatted(): string {
    return this.ACCEPTED_TYPES
      .map(type => type.split('/')[1].toUpperCase())
      .join(', ');
  }
}