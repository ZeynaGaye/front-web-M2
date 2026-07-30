import { Component, Input, Output, EventEmitter, OnInit, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatCardModule } from '@angular/material/card';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-profile-photo-upload',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatCardModule
  ],
  templateUrl: './profile-photo-upload.component.html',
  styleUrls: ['./profile-photo-upload.component.scss']
})
export class ProfilePhotoUploadComponent implements OnInit {
  @Input() freelanceId!: number;
  @Input() currentPhotoUrl?: string;
  @Output() photoUploaded = new EventEmitter<string>();
  @Output() photoDeleted = new EventEmitter<void>();

  private http = inject(HttpClient);
  private snackBar = inject(MatSnackBar);
  private platformId = inject(PLATFORM_ID);

  isUploading = false;
  isDeleting = false;
  hasPhoto = false;
  photoUrl = '';
  selectedFile: File | null = null;
  dragOver = false;

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (this.currentPhotoUrl) {
      this.photoUrl = this.getFullPhotoUrl(this.currentPhotoUrl);
      this.hasPhoto = true;
    } else {
      this.loadCurrentPhoto();
    }
  }

  private getFullPhotoUrl(photoPath: string): string {
    if (!photoPath) return '';
    
    if (photoPath.startsWith('http://') || photoPath.startsWith('https://')) {
      return photoPath;
    }
    
    if (photoPath.startsWith('/uploads/')) {
      return `${environment.apiUrl}${photoPath}`;
    }
    
    return `${environment.apiUrl}/uploads/${photoPath}`;
  }

  private loadCurrentPhoto(): void {
    if (!this.freelanceId || !this.isBrowser) return;

    this.http.get<any>(`${environment.apiUrl}/api/freelances/${this.freelanceId}/profile-photo`)
      .subscribe({
        next: (response) => {
          this.hasPhoto = response.hasPhoto;
          if (response.hasPhoto && response.photoUrl) {
            this.photoUrl = this.getFullPhotoUrl(response.photoUrl);
          }
        },
        error: (error) => {
          console.error('Erreur chargement photo actuelle:', error);
        }
      });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.validateAndUploadFile();
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.dragOver = false;
    
    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.selectedFile = files[0];
      this.validateAndUploadFile();
    }
  }

  private validateAndUploadFile(): void {
    if (!this.selectedFile) return;

    // Validation du type de fichier
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(this.selectedFile.type)) {
      this.snackBar.open('Format non supporté. Utilisez JPG, PNG ou WEBP', 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    // Validation de la taille (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (this.selectedFile.size > maxSize) {
      this.snackBar.open('Fichier trop volumineux. Maximum 5MB', 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
      return;
    }

    this.uploadPhoto();
  }

  uploadPhoto(): void {
    if (!this.selectedFile || !this.freelanceId || !this.isBrowser) return;

    this.isUploading = true;
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.http.post<any>(`${environment.apiUrl}/api/freelances/${this.freelanceId}/upload-profile-photo`, formData)
      .subscribe({
        next: (response) => {
          
          this.photoUrl = this.getFullPhotoUrl(response.photoUrl);
          this.hasPhoto = true;
          this.isUploading = false;
          this.selectedFile = null;
          
          this.photoUploaded.emit(response.photoUrl);
          
          this.snackBar.open('Photo de profil mise à jour avec succès !', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error(' Erreur upload photo:', error);
          this.isUploading = false;
          this.selectedFile = null;
          
          const message = error.error?.message || 'Erreur lors de l\'upload de la photo';
          this.snackBar.open(message, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  deletePhoto(): void {
    if (!this.freelanceId || !this.isBrowser) return;

    this.isDeleting = true;

    this.http.delete<any>(`${environment.apiUrl}/api/freelances/${this.freelanceId}/profile-photo`)
      .subscribe({
        next: (response) => {
          
          this.photoUrl = '';
          this.hasPhoto = false;
          this.isDeleting = false;
          
          this.photoDeleted.emit();
          
          this.snackBar.open('Photo de profil supprimée', 'Fermer', {
            duration: 3000,
            panelClass: ['success-snackbar']
          });
        },
        error: (error: HttpErrorResponse) => {
          console.error(' Erreur suppression photo:', error);
          this.isDeleting = false;
          
          const message = error.error?.message || 'Erreur lors de la suppression';
          this.snackBar.open(message, 'Fermer', {
            duration: 5000,
            panelClass: ['error-snackbar']
          });
        }
      });
  }

  triggerFileSelect(): void {
    if (!this.isBrowser) return;
    
    const fileInput = document.getElementById('photo-file-input') as HTMLInputElement;
    if (fileInput) {
      fileInput.click();
    }
  }

  onImageError(event: any): void {
    console.warn(' Erreur chargement image de profil');
    event.target.src = 'assets/images/placeholders/freelance-africaine.jpg';
    this.hasPhoto = false;
  }
}