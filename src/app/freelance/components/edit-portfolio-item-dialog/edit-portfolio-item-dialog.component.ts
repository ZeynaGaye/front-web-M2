import {
  Component,
  Inject,
  OnInit,
  ViewChild,
  ElementRef,
  
} from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import {
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { PortfolioService } from '../../services/portfolio.service';
import { PortfolioImage } from '../../../models/PortfolioImage';
import { PortfolioItem } from '../../../models/PortfolioItem';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormField, MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipListbox, MatChipsModule } from '@angular/material/chips';

import { switchMap, of, forkJoin, finalize, catchError } from 'rxjs';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DragDropDirective } from '../../directives/drag-drop/drag-drop.directive';
@Component({
  selector: 'app-edit-portfolio-item-dialog',
  templateUrl: './edit-portfolio-item-dialog.component.html',
  styleUrls: ['./edit-portfolio-item-dialog.component.scss'],
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    MatProgressSpinnerModule,
    CommonModule,
    MatDialogModule,
    MatChipListbox,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatFormField,
    DragDropDirective,
    FormsModule,
  ],
})
export class EditPortfolioItemDialogComponent implements OnInit {
  editForm: FormGroup;
  tags: string[] = [];
  existingImages: PortfolioImage[] = [];
  newImages: { file: File; legende?: string; preview: string }[] = [];
  filePreviews: string[] = [];
  isDragging = false;
  maxFiles = 5;
  maxFileSizeMB = 50; // 50 MB
  isSubmitting: boolean = false; // Ensure consistent type and initialization
  // Couleurs
  primaryMain = '#fb8f71';
  primaryLighter = '#ffd7cc';
  primaryDarker = '#f36a4a';
  primaryText = '#ffffff';
  secondaryMain = '#9ca3af';
  secondaryLighter = '#e5e7eb';
  secondaryDarker = '#6b7280';

  @ViewChild('fileInput') fileInput!: ElementRef;
  // Removed duplicate declaration of isSubmitting


  constructor(
    private fb: FormBuilder,
    private portfolioService: PortfolioService,
    private snackBar: MatSnackBar,
    public dialogRef: MatDialogRef<EditPortfolioItemDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { item: PortfolioItem }
  ) {
    this.editForm = this.fb.group({
      titre: ['', Validators.required],
      description: ['', Validators.required],
      newCategory: [''],
      newTag: [''],
      categories: [[]],
      tags: [[]],
    });
  }

  ngOnInit(): void {
    if (this.data.item) {
      this.editForm.patchValue({
        titre: this.data.item.titre,
        description: this.data.item.description,
        categories: this.data.item.categories || [],
        tags: this.data.item.tags || [],
      });
      this.tags = this.data.item.tags || [];
      this.existingImages = this.data.item.images || [];
    }
  }

  // Gestion des catégories
  addCategory(): void {
    const categoryControl = this.editForm.get('newCategory');
    if (categoryControl?.value?.trim()) {
      const currentCategories = this.editForm.get('categories')?.value || [];
      if (!currentCategories.includes(categoryControl.value)) {
        this.editForm
          .get('categories')
          ?.setValue([...currentCategories, categoryControl.value.trim()]);
        categoryControl.setValue('');
      }
    }
  }

  removeCategory(category: string): void {
    const currentCategories = this.editForm.get('categories')?.value || [];
    this.editForm
      .get('categories')
      ?.setValue(currentCategories.filter((c: string) => c !== category));
  }

  // Gestion des tags
  addTag(): void {
    const tagControl = this.editForm.get('newTag');
    if (
      tagControl?.value?.trim() &&
      !this.tags.includes(tagControl.value.trim())
    ) {
      this.tags.push(tagControl.value.trim());
      this.editForm.get('tags')?.setValue(this.tags);
      tagControl.setValue('');
    }
  }

  removeTag(tag: string): void {
    this.tags = this.tags.filter((t) => t !== tag);
    this.editForm.get('tags')?.setValue(this.tags);
  }

  // Gestion des images
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.handleFiles(input.files);
    }
  }

  onFileDropped(files: FileList): void {
    this.handleFiles(files);
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  private handleFiles(files: FileList): void {
    const remainingSlots =
      this.maxFiles - (this.existingImages.length + this.newImages.length);

    if (remainingSlots <= 0) {
      alert(`Maximum ${this.maxFiles} images autorisées`);
      return;
    }

    const filesArray = Array.from(files).slice(0, remainingSlots);

    for (const file of filesArray) {
      if (!file.type.match('image.*')) {
        alert('Seules les images sont acceptées');
        continue;
      }

      if (file.size > this.maxFileSizeMB * 1024 * 1024) {
        alert(`La taille maximale est de ${this.maxFileSizeMB}MB par fichier`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = (e: ProgressEvent<FileReader>) => {
        if (e.target?.result) {
          this.newImages.push({
            file: file,
            legende: '',
            preview: e.target.result as string,
          });
        }
      };
      reader.readAsDataURL(file);
    }
  }

  removeNewImage(index: number): void {
    this.newImages.splice(index, 1);
  }

  deleteImage(imageId: number): void {
    this.portfolioService.deleteImage(imageId).subscribe({
      next: () => {
        this.existingImages = this.existingImages.filter(
          (img) => img.id !== imageId
        );
      },
      error: (err) => console.error('Error deleting image', err),
    });
  }

  // Soumission du formulaire
  onSubmit(): void {
    if (!this.editForm.valid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.editForm.controls).forEach((key) => {
        const control = this.editForm.get(key);
        control?.markAsTouched();
      });
      return;
    }

    const itemId = this.data.item?.id;
    if (!itemId) {
      console.error("ID de l'élément manquant");
      return;
    }

    // Afficher un indicateur de chargement
    this.isSubmitting = true;

    // Créer un nouvel objet pour les données mises à jour
    const updatedItem = {
      id: itemId,
      titre: this.editForm.get('titre')?.value,
      description: this.editForm.get('description')?.value,
      categories: this.editForm.get('categories')?.value || [],
      tags: this.tags,
      // Ne pas inclure les images ici, elles sont gérées séparément
    };

    // Mettre à jour les métadonnées de l'élément
    this.portfolioService
      .updatePortfolioItem(itemId, updatedItem)
      .pipe(
        // Si des images ont été supprimées localement mais pas encore en base
        // les supprimer maintenant
        switchMap(() => {
          const deletedImageIds = this.getDeletedImageIds();
          if (deletedImageIds.length === 0) {
            return of(null);
          }

          // Créer un tableau de promesses pour supprimer les images
          const deleteObservables = deletedImageIds.map((id) =>
            this.portfolioService.deleteImage(id)
          );

          return forkJoin(deleteObservables).pipe(
            catchError((error) => {
              console.error('Erreur lors de la suppression des images', error);
              return of(null);
            })
          );
        }),

        // Télécharger les nouvelles images
        switchMap(() => {
          if (this.newImages.length === 0) {
            return of(null);
          }

          // Créer un tableau de promesses pour ajouter les images
          const uploadObservables = this.newImages.map((img) =>
            this.portfolioService.addImageToItem(itemId, img.file, img.legende)
          );

          return forkJoin(uploadObservables).pipe(
            catchError((error) => {
              console.error("Erreur lors de l'ajout des images", error);
              return of(null);
            })
          );
        }),

        // Mettre à jour les légendes des images existantes
        switchMap(() => {
          const imagesToUpdate = this.getModifiedExistingImages();
          if (imagesToUpdate.length === 0) {
            return of(null);
          }

          // Créer un tableau de promesses pour mettre à jour les légendes
          const updateObservables = imagesToUpdate.map((img) =>
            this.portfolioService.updateImageCaption(img.id, img.legende || '')
          );

          return forkJoin(updateObservables).pipe(
            catchError((error) => {
              console.error(
                'Erreur lors de la mise à jour des légendes',
                error
              );
              return of(null);
            })
          );
        }),

        finalize(() => {
          this.isSubmitting = false;
        })
      )
      .subscribe({
        next: () => {
          // Afficher une notification de succès
          this.snackBar.open('Modification enregistrée avec succès', 'Fermer', {
            duration: 3000,
            panelClass: 'success-snackbar',
          });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Erreur lors de la mise à jour', err);
          // Afficher une notification d'erreur
          this.snackBar.open(
            'Erreur lors de la mise à jour. Veuillez réessayer.',
            'Fermer',
            {
              duration: 5000,
              panelClass: 'error-snackbar',
            }
          );
        },
      });
  }

  // Méthode pour obtenir les IDs des images supprimées
  private getDeletedImageIds(): number[] {
    if (!this.data.item?.images) return [];

    const originalImageIds = this.data.item.images.map((img) => img.id);
    const currentImageIds = this.existingImages.map((img) => img.id);

    return originalImageIds.filter((id) => !currentImageIds.includes(id));
  }

  // Méthode pour obtenir les images existantes modifiées
  private getModifiedExistingImages(): PortfolioImage[] {
    if (!this.data.item?.images) return [];

    return this.existingImages.filter((currentImg) => {
      const originalImg = this.data.item.images?.find(
        (img) => img.id === currentImg.id
      );
      return originalImg && originalImg.legende !== currentImg.legende;
    });
  }

  onCancel(): void {
    this.dialogRef.close(false);
  }
}
