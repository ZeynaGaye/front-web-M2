import { CommonModule, NgIf } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-candidatures',
  imports: [FormsModule, ReactiveFormsModule, CommonModule,NgIf],
  templateUrl: './candidatures.component.html',
  styleUrl: './candidatures.component.scss'
})
export class CandidaturesComponent {
[x: string]: any;
  @Input() offreId!: number; // ID de l'offre à laquelle le candidat postule
  @Output() closeModalEvent = new EventEmitter<void>();
  
  currentStep = 1; // Étape actuelle
  candidatureForm: FormGroup;
  cvFile: File | null = null;
  portfolioFiles: File[] = [];
  lettreMotivationFile: File | null = null;

  constructor(private fb: FormBuilder) {
    this.candidatureForm = this.fb.group({
      experience: ['', Validators.required],
      disponibilite: ['', Validators.required],
      pretentionSalariale: [''],
      specialites: ['', Validators.required],
      message: [''],
    });
  }

  // Passer à l'étape suivante
  nextStep() {
    if (this.currentStep < 2) {
      this.currentStep++;
    }
  }

  // Revenir à l'étape précédente
  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  // Gérer le changement de fichier CV
  onCvChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.cvFile = input.files[0];
    }
  }

  // Gérer les images du portfolio
  onPortfolioChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      for (let i = 0; i < input.files.length; i++) {
        this.portfolioFiles.push(input.files[i]);
      }
    }
  }

  // Supprimer une image du portfolio
  removePortfolioImage(index: number) {
    this.portfolioFiles.splice(index, 1);
  }

  // Gérer le changement de fichier lettre de motivation
  onLettreMotivationChange(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length) {
      this.lettreMotivationFile = input.files[0];
    }
  }

  // Soumettre le formulaire
  onSubmit() {
    if (this.candidatureForm.valid) {
      // Créer un objet FormData pour envoyer les fichiers
      const formData = new FormData();
      
      // Ajouter les champs du formulaire
      Object.keys(this.candidatureForm.value).forEach(key => {
        formData.append(key, this.candidatureForm.value[key]);
      });
      
      // Ajouter l'ID de l'offre
      formData.append('offreId', this.offreId.toString());
      
      // Ajouter le CV
      if (this.cvFile) {
        formData.append('cv', this.cvFile, this.cvFile.name);
      }
      
      // Ajouter les images du portfolio
      if (this.portfolioFiles.length > 0) {
        for (let i = 0; i < this.portfolioFiles.length; i++) {
          formData.append('portfolio', this.portfolioFiles[i], this.portfolioFiles[i].name);
        }
      }
      
      // Ajouter la lettre de motivation
      if (this.lettreMotivationFile) {
        formData.append('lettreMotivation', this.lettreMotivationFile, this.lettreMotivationFile.name);
      }
      
      console.log('Candidature soumise pour l\'offre ID:', this.offreId);
      // Ici, vous appelleriez votre service pour envoyer la candidature
      // this.candidatureService.submitCandidature(formData).subscribe(...);
      
      this.closeModal();
    }
  }

  // Fermer le modal
  closeModal() {
    this.closeModalEvent.emit();
  }
}