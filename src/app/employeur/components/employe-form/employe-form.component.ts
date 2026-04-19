import { Component, OnInit, Inject, Optional, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AuthService } from '../../../core/servces/auth.service';
import { StatutEmploye, TypeContrat, Specialite } from '../../../models/employe';
import { EmployeService } from '../../services/employe';

// Imports Material - AJOUT des modules manquants
import { MatCardModule } from "@angular/material/card";
import { MatInputModule } from "@angular/material/input";
import { MatSelectModule } from "@angular/material/select";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { NgForOf, NgIf } from '@angular/common';

export interface EmployeFormData {
  salonId: number;
  employeId?: number;
  isEditMode?: boolean;
}

@Component({
  selector: 'app-employe-form',
  templateUrl: './employe-form.component.html',
  styleUrls: ['./employe-form.component.scss'],
  standalone: true,
  imports: [
    MatCardModule, 
    MatInputModule, 
    MatSelectModule, 
    MatProgressSpinnerModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    NgForOf,
    NgIf
  ]
})
export class EmployeFormComponent implements OnInit {
[x: string]: any;
// [x: string]: TrackByFunction<string>;
  @Output() employeCreated = new EventEmitter<any>();
  @Output() employeUpdated = new EventEmitter<any>();
  
  employeForm!: FormGroup;
  isEditMode = false;
  employeId!: number;
  salonId!: number;
  loading = false;
  isModal = false;
  employeData: any = null;
  
  statutOptions = Object.values(StatutEmploye);
  typeContratOptions = Object.values(TypeContrat);
  specialiteOptions = Object.values(Specialite);
  heuresOptions: string[] = [];

  constructor(
    private fb: FormBuilder,
    private employeService: EmployeService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    @Optional() private dialogRef: MatDialogRef<EmployeFormComponent>,
    @Optional() @Inject(MAT_DIALOG_DATA) private data: EmployeFormData
  ) {
    this.createForm();
    this.generateHeuresOptions();
    
    // Déterminer si on est en mode modal
    this.isModal = !!this.data && !!this.dialogRef;
    
    if (this.isModal) {
      // Mode modal - utiliser les données passées
      this.salonId = this.data.salonId;
      this.isEditMode = this.data.isEditMode || false;
      this.employeId = this.data.employeId || 0;
    }
  }

  ngOnInit(): void {
    if (!this.isModal) {
      // Mode page normale - récupérer depuis l'auth et les routes
      const user = this.authService.getCurrentUser();
      if (!user?.salonId) {
        this.snackBar.open('Erreur: Salon non trouvé', 'Fermer', { duration: 3000 });
        return;
      }
      this.salonId = user.salonId;
      
      this.route.params.subscribe(params => {
        if (params['id']) {
          this.isEditMode = true;
          this.employeId = +params['id'];
          this.loadEmploye();
        }
      });
    } else {
      // Mode modal - les données sont déjà définies dans le constructor
      if (this.isEditMode && this.employeId) {
        this.loadEmploye();
      }
    }
  }

  createForm(): void {
    this.employeForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)]],
      prenom: ['', [Validators.required, Validators.minLength(2), Validators.pattern(/^[a-zA-ZÀ-ÿ\s\-']+$/)]],
      email: ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\s\-\(\)]{8,15}$/)]],
      specialites: [[], Validators.required],
      typeContrat: ['', Validators.required],
      horaireDebut: ['09:00', Validators.required],
      horaireFin: ['17:00', Validators.required],
      statut: [StatutEmploye.ACTIF]
    });

    // Validation des horaires
    this.employeForm.get('horaireFin')?.valueChanges.subscribe(() => {
      this.validateHoraires();
    });
    this.employeForm.get('horaireDebut')?.valueChanges.subscribe(() => {
      this.validateHoraires();
    });
  }

  loadEmploye(): void {
    this.loading = true;
    this.employeService.obtenirEmploye(this.employeId)
      .subscribe({
        next: (employe) => {
          // Stocker les données de l'employé pour l'affichage
          this.employeData = employe;
          // Parser le nom complet de façon plus robuste
          const nomCompletParts = employe.nomComplet.split(' ');
          const prenom = nomCompletParts[0] || '';
          const nom = nomCompletParts.slice(1).join(' ') || '';
          
          // Parser les horaires de façon plus sûre
          const horaires = employe.horaires ? employe.horaires.split(' - ') : ['09:00', '17:00'];
          const horaireDebut = horaires[0] || '09:00';
          const horaireFin = horaires[1] || '17:00';

          this.employeForm.patchValue({
            nom: nom,
            prenom: prenom,
            email: employe.email || '',
            telephone: employe.telephone || '',
            specialites: employe.specialites || [],
            typeContrat: employe.typeContrat || '',
            horaireDebut: horaireDebut,
            horaireFin: horaireFin,
            statut: employe.statut || StatutEmploye.ACTIF
          });
          this.loading = false;
        },
        error: (error) => {
          console.error('Erreur lors du chargement de l\'employé:', error);
          this.snackBar.open('Erreur lors du chargement de l\'employé', 'Fermer', { 
            duration: 4000,
            panelClass: ['error-snackbar']
          });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.employeForm.valid && !this.hasHorairesError()) {
      this.loading = true;
      
      const formValue = this.employeForm.value;
      
      if (this.isEditMode) {
        const updateRequest = {
          ...formValue,
          salonId: undefined // Ne pas inclure salonId dans la modification
        };
        
        this.employeService.modifierEmploye(this.employeId, updateRequest)
          .subscribe({
            next: (employe) => {
              if (this.isModal) {
                this.employeUpdated.emit(employe);
                this.dialogRef?.close({ success: true, employe });
              } else {
                this.snackBar.open('Employé modifié avec succès', 'Fermer', { 
                  duration: 4000,
                  panelClass: ['success-snackbar']
                });
                this.router.navigate(['/employes']);
              }
            },
            error: (error) => {
              console.error('Erreur lors de la modification:', error);
              this.snackBar.open('Erreur lors de la modification', 'Fermer', { 
                duration: 4000,
                panelClass: ['error-snackbar']
              });
              this.loading = false;
            }
          });
      } else {
        const createRequest = {
          ...formValue,
          salonId: this.salonId
        };
        
        this.employeService.creerEmploye(createRequest)
          .subscribe({
            next: (employe) => {
              if (this.isModal) {

                this.employeCreated.emit(employe);
                this.dialogRef?.close({ success: true, employe });
              } else {
                this.snackBar.open('Employé créé avec succès', 'Fermer', { 
                  duration: 4000,
                  panelClass: ['success-snackbar']
                });
                this.router.navigate(['/employes']);
              }
            },
            error: (error) => {
              console.error('Erreur lors de la création:', error);
              this.snackBar.open('Erreur lors de la création', 'Fermer', { 
                duration: 4000,
                panelClass: ['error-snackbar']
              });
              this.loading = false;
            }
          });
      }
    } else {
      this.markFormGroupTouched();
    }
  }

  private markFormGroupTouched(): void {
    Object.keys(this.employeForm.controls).forEach(key => {
      const control = this.employeForm.get(key);
      control?.markAsTouched();
    });
  }

  annuler(): void {
    if (this.isModal) {
      this.dialogRef?.close(false);
    } else {
      this.router.navigate(['/employes']);
    }
  }

  getErrorMessage(fieldName: string): string {
    const control = this.employeForm.get(fieldName);
    if (control?.hasError('required')) {
      return `${this.getFieldDisplayName(fieldName)} est requis`;
    }
    if (control?.hasError('email')) {
      return 'Format d\'email invalide';
    }
    if (control?.hasError('minlength')) {
      return `${this.getFieldDisplayName(fieldName)} doit contenir au moins ${control.getError('minlength').requiredLength} caractères`;
    }
    if (control?.hasError('pattern')) {
      if (fieldName === 'telephone') {
        return 'Format de téléphone invalide (ex: +221 XX XXX XX XX)';
      }
      if (fieldName === 'nom' || fieldName === 'prenom') {
        return 'Seules les lettres, espaces, traits d\'union et apostrophes sont autorisés';
      }
    }
    if (control?.hasError('horairesInvalides')) {
      return 'L\'heure de fin doit être postérieure à l\'heure de début';
    }
    return '';
  }

  private getFieldDisplayName(fieldName: string): string {
    const displayNames: { [key: string]: string } = {
      nom: 'Le nom',
      prenom: 'Le prénom',
      email: 'L\'email',
      telephone: 'Le téléphone',
      specialites: 'Les spécialités',
      typeContrat: 'Le type de contrat',
      horaireDebut: 'L\'heure de début',
      horaireFin: 'L\'heure de fin'
    };
    return displayNames[fieldName] || fieldName;
  }

  private generateHeuresOptions(): void {
    this.heuresOptions = [];
    
    // Générer des heures de 06:00 à 22:00 par tranches de 30 minutes
    for (let hour = 6; hour <= 22; hour++) {
      for (let minutes of ['00', '30']) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minutes}`;
        this.heuresOptions.push(timeString);
      }
    }
  }

  // NOUVELLES MÉTHODES pour validation et UX

  hasHorairesError(): boolean {
    const debut = this.employeForm.get('horaireDebut')?.value;
    const fin = this.employeForm.get('horaireFin')?.value;
    
    if (!debut || !fin) return false;
    
    const heureDebut = this.timeToMinutes(debut);
    const heureFin = this.timeToMinutes(fin);
    
    return heureFin <= heureDebut;
  }

  private validateHoraires(): void {
    const debut = this.employeForm.get('horaireDebut')?.value;
    const fin = this.employeForm.get('horaireFin')?.value;
    
    if (debut && fin) {
      const heureDebut = this.timeToMinutes(debut);
      const heureFin = this.timeToMinutes(fin);
      
      if (heureFin <= heureDebut) {
        this.employeForm.get('horaireFin')?.setErrors({ 'horairesInvalides': true });
      } else {
        const errors = this.employeForm.get('horaireFin')?.errors;
        if (errors && errors['horairesInvalides']) {
          delete errors['horairesInvalides'];
          const hasOtherErrors = Object.keys(errors).length > 0;
          this.employeForm.get('horaireFin')?.setErrors(hasOtherErrors ? errors : null);
        }
      }
    }
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  onSpecialiteChange(_event: any): void {
    // Méthode pour gérer les changements de spécialités
    const selectedSpecialites = this.employeForm.get('specialites')?.value || [];

    
    // Optionnel: Limiter le nombre de spécialités
    if (selectedSpecialites.length > 5) {
      this.snackBar.open('Maximum 5 spécialités autorisées', 'OK', { 
        duration: 3000 
      });
      // Retirer la dernière sélection
      const updatedSpecialites = selectedSpecialites.slice(0, 5);
      this.employeForm.get('specialites')?.setValue(updatedSpecialites);
      return;
    }
  }

  addCloseButtonToPanel(selectElement: any): void {
    setTimeout(() => {
      this.createCloseButton(selectElement);
    }, 200);
  }

  private createCloseButton(selectElement: any): void {
    const panel = document.querySelector('.specialite-select-panel');
    if (panel && !panel.querySelector('.close-select-btn')) {
      const buttonContainer = document.createElement('div');
      buttonContainer.className = 'select-actions';
      buttonContainer.style.cssText = `
        position: sticky;
        bottom: 0;
        left: 0;
        right: 0;
        background: #fff;
        border-top: 1px solid #e0e0e0;
        padding: 12px;
        z-index: 1000;
      `;
      
      const button = document.createElement('button');
      button.className = 'close-select-btn';
      button.type = 'button';
      button.innerHTML = '<i class="fas fa-check"></i> Terminé';
      button.style.cssText = `
        width: 100%;
        padding: 12px;
        background: #A4B1BD;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      `;
      
      button.addEventListener('click', () => {
        selectElement.close();
      });
      
      button.addEventListener('mouseenter', () => {
        button.style.background = '#8A9AAA';
      });
      
      button.addEventListener('mouseleave', () => {
        button.style.background = '#A4B1BD';
      });
      
      buttonContainer.appendChild(button);
      panel.appendChild(buttonContainer);
    }
  }

  // Méthodes utilitaires pour le template
  formatSpecialiteName(specialite: string): string {
    return specialite
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatContractType(type: string): string {
    return type
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase());
  }

  formatStatutName(statut: string): string {
    return statut.charAt(0).toUpperCase() + statut.slice(1).toLowerCase();
  }

  formatStatut(statut: string): string {
    const statutMap: { [key: string]: string } = {
      [StatutEmploye.ACTIF]: 'Actif - Disponible',
      [StatutEmploye.INACTIF]: 'Inactif - Non disponible',
      [StatutEmploye.CONGE]: 'En congé',
      [StatutEmploye.SUSPENDU]: 'Suspendu'
    };
    return statutMap[statut] || statut;
  }

  calculateWorkDuration(): string {
    const debut = this.employeForm.get('horaireDebut')?.value;
    const fin = this.employeForm.get('horaireFin')?.value;
    
    if (debut && fin) {
      const [debutHeure, debutMin] = debut.split(':').map(Number);
      const [finHeure, finMin] = fin.split(':').map(Number);
      
      const debutMinutes = debutHeure * 60 + debutMin;
      const finMinutes = finHeure * 60 + finMin;
      
      let dureeMinutes = finMinutes - debutMinutes;
      if (dureeMinutes < 0) {
        dureeMinutes += 24 * 60; // Pour gérer le passage à minuit
      }
      
      const heures = Math.floor(dureeMinutes / 60);
      const minutes = dureeMinutes % 60;
      
      return `${heures}h${minutes > 0 ? minutes.toString().padStart(2, '0') : ''}`;
    }
    
    return '';
  }

}