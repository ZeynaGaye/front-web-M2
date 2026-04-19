
  import { Component, ElementRef, Inject, ViewChild } from '@angular/core';
  import { FormArray, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
  import { Router } from '@angular/router';
  import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
  import { COMMA, ENTER } from '@angular/cdk/keycodes';
  import { PortfolioService } from '../../services/portfolio.service';
  import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
  import { CommonModule } from '@angular/common';
  import { MatInputModule } from '@angular/material/input';
  import { MatFormFieldModule } from '@angular/material/form-field';
  import { MatIconModule } from '@angular/material/icon';
  import { MatButtonModule } from '@angular/material/button';
  import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
  import { ReactiveFormsModule } from '@angular/forms';
  import { RouterModule } from '@angular/router';

  import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { DragDropDirective } from '../../directives/drag-drop/drag-drop.directive';

  @Component({
    selector: 'app-add-portfolio-item',
    templateUrl: './add-portfolio-item.component.html',
    styleUrls: ['./add-portfolio-item.component.scss'],
    standalone: true,
    imports: [
      CommonModule,
      ReactiveFormsModule,
      MatFormFieldModule,
      MatInputModule,
      MatButtonModule,
      MatIconModule,
      MatChipsModule,
      MatProgressSpinnerModule,
      MatSnackBarModule,
      RouterModule,
      MatDialogModule,
      DragDropDirective,


    ]
  })
  export class AddPortfolioItemComponent {
  [x: string]: any;
    portfolioForm: FormGroup;
    selectedFiles: File[] = [];
    filePreviews: string[] = [];
    fileCaptions: FormControl[] = [];
    readonly separatorKeysCodes = [ENTER, COMMA] as const;
    isSubmitting = false;
    maxFiles = 5;
    maxFileSizeMB = 5;
    isDragging = false;

    @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

    constructor(
      private fb: FormBuilder,
      private portfolioService: PortfolioService,
      private router: Router,
      private snackBar: MatSnackBar,
      public dialogRef: MatDialogRef<AddPortfolioItemComponent>,
      @Inject(MAT_DIALOG_DATA) public data: any
    ) {
      this.portfolioForm = this.fb.group({
        titre: ['', [Validators.required, Validators.maxLength(100)]],
        description: ['', [Validators.required, Validators.minLength(30)]],
        categories: this.fb.array([], [Validators.required, Validators.minLength(1)]),
        tags: this.fb.array([])
      });
    }

    get categoriesFormArray(): FormArray {
      return this.portfolioForm.get('categories') as FormArray;
    }

    get tagsFormArray(): FormArray {
      return this.portfolioForm.get('tags') as FormArray;
    }

    addCategory(event: MatChipInputEvent): void {
      const value = (event.value || '').trim();
      if (value) {
        this.categoriesFormArray.push(this.fb.control(value));
        event.chipInput!.clear();
      }
    }

    removeCategory(index: number): void {
      this.categoriesFormArray.removeAt(index);
    }

    addTag(event: MatChipInputEvent): void {
      const value = (event.value || '').trim();
      if (value) {
        this.tagsFormArray.push(this.fb.control(value));
        event.chipInput!.clear();
      }
    }

    removeTag(index: number): void {
      this.tagsFormArray.removeAt(index);
    }

    onFileSelected(event: Event): void {
      const input = event.target as HTMLInputElement;
      if (input.files?.length) {
        this.handleFiles(input.files);
      }
    }

    onFileDropped(files: FileList): void {  //  Type FileList
  this.handleFiles(files);  // Traitement direct des fichiers
}

    private handleFiles(files: FileList): void {
      const remainingSlots = this.maxFiles - this.selectedFiles.length;
      
      
      if (remainingSlots <= 0) {
        this.showError(`Maximum ${this.maxFiles} images autorisées`);
        return;
      }

      const filesArray = Array.from(files).slice(0, remainingSlots);

      for (const file of filesArray) {
        if (!file.type.match('image.*')) {
          this.showError('Seules les images sont acceptées');
          continue;
        }

        if (file.size > this.maxFileSizeMB * 1024 * 1024) {
          this.showError(`La taille maximale est de ${this.maxFileSizeMB}MB par fichier`);
          continue;
        }

        this.selectedFiles.push(file);
        
        const reader = new FileReader();
        reader.onload = (e: ProgressEvent<FileReader>) => {
          if (e.target?.result) {
            this.filePreviews.push(e.target.result as string);
          }
        };
        reader.readAsDataURL(file);
        
        // Toujours initialiser avec une chaîne vide pour garantir que la légende existe
        const captionControl = new FormControl('', [Validators.maxLength(100)]);
        this.fileCaptions.push(captionControl);
      }
    }

    removeFile(index: number): void {
      this.selectedFiles.splice(index, 1);
      this.filePreviews.splice(index, 1);
      this.fileCaptions.splice(index, 1);
    }

    // Méthode onSubmit améliorée pour s'assurer que les légendes sont toujours enregistrées
    onSubmit(): void {
      if (this.portfolioForm.invalid || this.isSubmitting || this.selectedFiles.length === 0) {
        this.markFormGroupTouched(this.portfolioForm);
        
        if (this.selectedFiles.length === 0) {
          this.showError('Veuillez ajouter au moins une image');
        }
        
        return;
      }

      this.isSubmitting = true;

      // Création du FormData
      const formData = new FormData();
      
      // Informations de base
      formData.append('titre', this.portfolioForm.get('titre')?.value || '');
      formData.append('description', this.portfolioForm.get('description')?.value || '');

      // Catégories - Vérifier si le tableau existe et contient des éléments
      if (this.categoriesFormArray && this.categoriesFormArray.length > 0) {
        this.categoriesFormArray.controls.forEach((control) => {
          if (control.value) {
            formData.append('categories[]', control.value);
          }
        });
      }

      // Tags - Vérifier si le tableau existe et contient des éléments
      if (this.tagsFormArray && this.tagsFormArray.length > 0) {
        this.tagsFormArray.controls.forEach((control) => {
          if (control.value) {
            formData.append('tags[]', control.value);
          }
        });
      }

      // Images et leurs légendes
      this.selectedFiles.forEach((file, index) => {
        formData.append('images[]', file);
        
        // Assurer que chaque image a une légende (même vide)
        let caption = '';
        if (this.fileCaptions[index]) {
          caption = this.fileCaptions[index].value || '';
        }
        
        // Toujours ajouter la légende explicitement
        formData.append('captions[]', caption);
        
        // Pour le debugging

      });

      // Envoi au service
      this.portfolioService.addPortfolioItem(formData)
        .subscribe({
          next: () => {
            this.showSuccess('Réalisation ajoutée avec succès');
            this.dialogRef.close(true);
          },
          error: (err: { error: { message: any; }; }) => {
            console.error('Erreur lors de l\'ajout de la réalisation', err);
            this.showError(err.error?.message || 'Une erreur est survenue');
            this.isSubmitting = false;
          }
        });
    }

    private markFormGroupTouched(formGroup: FormGroup | FormArray) {
      Object.values(formGroup.controls).forEach(control => {
        control.markAsTouched();

        if (control instanceof FormGroup || control instanceof FormArray) {
          this.markFormGroupTouched(control);
        }
      });
    }

    private showError(message: string): void {
      this.snackBar.open(message, 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }

    private showSuccess(message: string): void {
      this.snackBar.open(message, 'Fermer', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });
    }

    onCancel(): void {
      this.dialogRef.close(false);
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
  }