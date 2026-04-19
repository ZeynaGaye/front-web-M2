import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OffreEmploisService, Salon } from '../../services/OffreEmploisService/offre-emplois-service.service';


@Component({
  selector: 'app-offre-emplois',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './offre-emplois.component.html',
  styleUrls: ['./offre-emplois.component.scss'],
})
export class OffreEmploisComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();
  currentStep = 1;
  offreEmploiForm: FormGroup;
  isSubmitting = false;
  submitError = '';
  submitSuccess = false;
  offreCount = 0;
  salons: Salon[] = [];
  loadingSalons = false;

  constructor(
    private fb: FormBuilder,
    private offreEmploisService: OffreEmploisService
  ) {
    this.offreEmploiForm = this.fb.group({
      titre: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', [Validators.required, Validators.maxLength(1000)]],
      competences: ['', [Validators.required, Validators.maxLength(255)]],
      lieu: ['', [Validators.required, Validators.maxLength(255)]],
      typeContrat: ['', Validators.required],
      salaire: ['', [Validators.required, Validators.maxLength(255)]],
      dateLimite: ['', Validators.required],
      experienceRequise: ['', [Validators.required, Validators.maxLength(255)]],
      salonId: ['', Validators.required], // NOUVEAU : sélection de salon obligatoire
    });
  }


  ngOnInit() {
    this.loadOffresCount();
    this.loadSalons();
  }

  loadSalons() {
    this.loadingSalons = true;
    // Désactiver le control pendant le chargement
    this.offreEmploiForm.get('salonId')?.disable();
    
    this.offreEmploisService.getMySalons().subscribe({
      next: (salons) => {
        this.salons = salons;
        this.loadingSalons = false;
        // Réactiver le control après le chargement
        this.offreEmploiForm.get('salonId')?.enable();
        
        // Si un seul salon, le sélectionner automatiquement
        if (salons.length === 1) {
          this.offreEmploiForm.patchValue({ salonId: salons[0].id });
        }
      },
      error: (error) => {
        console.error('Erreur lors du chargement des salons:', error);
        this.loadingSalons = false;
        // Réactiver le control même en cas d'erreur
        this.offreEmploiForm.get('salonId')?.enable();
        this.submitError = 'Erreur lors du chargement des salons. Assurez-vous d\'avoir au moins un salon.';
      }
    });
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
      1: ['titre', 'description', 'salonId'], // NOUVEAU : salon requis dès l'étape 1
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
      
      // Utiliser le nouveau service pour créer l'offre avec salon
      const formValue = this.offreEmploiForm.value;
      const salonId = formValue.salonId;
      
      // Supprimer salonId du formValue car il sera passé séparément
      const { salonId: _, ...offreData } = formValue;
      
      this.offreEmploisService.createOffreEmploiWithSalon(offreData, salonId)
        .subscribe({
          next: (response) => {

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