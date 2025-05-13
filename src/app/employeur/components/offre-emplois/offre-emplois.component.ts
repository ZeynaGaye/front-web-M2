import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OffreEmploisService } from '../../services/OffreEmploisService/offre-emplois-service.service';


@Component({
  selector: 'app-offre-emplois',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './offre-emplois.component.html',
  styleUrls: ['./offre-emplois.component.scss'],
})
export class OffreEmploisComponent {
  @Output() closeModalEvent = new EventEmitter<void>();
  currentStep = 1;
  offreEmploiForm: FormGroup;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;
  offreCount = 0;

  constructor(
    private fb: FormBuilder,
    private offreEmploisService: OffreEmploisService
  ) {
    this.offreEmploiForm = this.fb.group({
      titre: ['', Validators.required],
      description: ['', Validators.required],
      competences: ['', Validators.required],
      lieu: ['', Validators.required],
      typeContrat: ['', Validators.required],
      salaire: ['', Validators.required],
      dateLimite: ['', Validators.required],
      experienceRequise: ['', Validators.required],
    });
  }


  onInit() {
    this.loadOffresCount();
  }
  loadOffresCount() {
    this.offreEmploisService.getMyOffresEmplois().subscribe({
      next: (offres) => {
        this.offreCount = offres.length;
      },
      error: (error) => {
        console.error('Erreur lors du chargement des offres:', error);
      }
    });
  }
  // Passer à l'étape suivante
  nextStep() {
    // Vérifier si l'étape actuelle est valide
    const etapesValidation: { [key: number]: string[] } = {
      1: ['titre', 'description'],
      2: ['competences', 'lieu', 'experienceRequise'],
      3: ['typeContrat', 'salaire', 'dateLimite']
    };
    
    const champsEtapeActuelle = etapesValidation[this.currentStep];
    const etapeValide = champsEtapeActuelle.every(champ => 
      this.offreEmploiForm.get(champ)?.valid
    );
    
    if (etapeValide && this.currentStep < 3) {
      this.currentStep++;
    } else {
      // Marquer les champs comme touchés pour afficher les erreurs
      champsEtapeActuelle.forEach(champ => 
        this.offreEmploiForm.get(champ)?.markAsTouched()
      );
    }
  }

  // Revenir à l'étape précédente
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Soumettre le formulaire
  onSubmit() {
    if (this.offreEmploiForm.valid) {
      this.isSubmitting = true;
      this.submitError = '';

        // Créer une copie et ajouter le champ manquant
    const formData = {
      ...this.offreEmploiForm.value,
      experienceRequise: 'Non spécifié' // Valeur par défaut
    };
      
      // Utiliser le service pour créer l'offre d'emploi
      this.offreEmploisService.createOffreEmploi(this.offreEmploiForm.value)
        .subscribe({
          next: (response) => {
            console.log('Offre publiée avec succès:', response);
            this.isSubmitting = false;
            this.submitSuccess = true;
            // Fermer le modal après 1.5 seconde pour montrer le message de succès
            setTimeout(() => this.closeModal(), 1500);
          },
          error: (error) => {
            console.error('Erreur lors de la publication:', error);
            this.submitError = 'Erreur lors de la publication. Veuillez réessayer.';
            this.isSubmitting = false;
          }
        });
    } else {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.offreEmploiForm.controls).forEach(key => {
        this.offreEmploiForm.get(key)?.markAsTouched();
      });
    }
  }

  // Fermer le modal
  closeModal() {
    this.closeModalEvent.emit();
    this.loadOffresCount();
  }
}