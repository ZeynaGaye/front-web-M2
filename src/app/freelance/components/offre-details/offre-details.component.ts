import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  FormBuilder, 
  FormGroup, 
  ReactiveFormsModule, 
  Validators 
} from '@angular/forms';
import { OffreEmploi } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TextFieldModule } from '@angular/cdk/text-field';
import { CandidatureService } from '../../services/candidatures.service';

@Component({
  selector: 'app-offre-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatIconModule,
    MatButtonModule,
    MatInputModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatDatepickerModule,
    MatNativeDateModule,
    TextFieldModule
  ],
  templateUrl: './offre-details.component.html',
  styleUrls: ['./offre-details.component.scss'],
  providers: [CandidatureService],
})
export class OffreDetailsComponent implements OnInit, OnDestroy {
  @Input() offre: OffreEmploi | null = null;
  @Output() closeEvent = new EventEmitter<void>();
  
  candidatureForm: FormGroup;
  isSubmitting = false;
  submitSuccess = false;
  showForm = false;
  aDejaPostule = false;
  errorMessage: string | null = null;
  applicationStatusChecked = false;
  
  constructor(
    private fb: FormBuilder,
    private candidatureService: CandidatureService
  ) {
    this.candidatureForm = this.fb.group({
      titre: ['', Validators.required],
      message: ['', [Validators.required, Validators.minLength(10)]],
      disponibilite: ['', Validators.required],
      // tarifPropose: ['', [Validators.required, Validators.min(0)]]
    });
  }

  ngOnInit(): void {
    if (this.offre?.id) {
      // Vérifier si l'utilisateur a déjà postulé avant d'afficher le formulaire
      this.checkIfAlreadyApplied(this.offre.id);
      
      // Initialiser le titre avec celui de l'offre
      this.candidatureForm.patchValue({
        titre: this.offre.titre
      });
    }
    
    // Empêcher le scroll du body quand le modal est ouvert
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    // Restaurer le scroll du body quand le composant est détruit
    document.body.style.overflow = 'auto';
  }

  private checkIfAlreadyApplied(offreId: number): void {
    this.applicationStatusChecked = false; // Reset avant vérification
    this.candidatureService.aDejaPostule(offreId).subscribe({
      next: (result: boolean) => {
        this.aDejaPostule = result;
        if (result) {
          // Si déjà postulé, s'assurer que le formulaire est fermé
          this.showForm = false;
        }
        this.applicationStatusChecked = true;
      },
      error: (err: any) => {
        console.error('Erreur vérification postulation :', err);
        this.errorMessage = 'Erreur lors de la vérification de votre candidature';
        this.applicationStatusChecked = true;
      }
    });
  }

  get offreExists(): boolean {
    return this.offre !== null;
  }

  getSkillsArray(): string[] {
    return this.offre?.competences?.split(',').map(s => s.trim()) || [];
  }

  getTodayDate(): Date {
    return new Date();
  }

  closeDetails(): void {
    // Restaurer le scroll du body avant de fermer
    document.body.style.overflow = 'auto';
    this.closeEvent.emit();
  }

  onSubmit(): void {
    // Vérifier si l'utilisateur a déjà postulé avant de soumettre
    if (this.aDejaPostule) {
      return; // Ne rien faire si déjà postulé
    }
    
    if (!this.offre?.id || !this.candidatureForm.valid) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = null;
    
    const candidatureData = {
      offreEmploiId: this.offre.id,
      titre: this.candidatureForm.value.titre,
      message: this.candidatureForm.value.message,
      disponibilite: this.candidatureForm.value.disponibilite,
      // tarifPropose: this.candidatureForm.value.tarifPropose
    };

    this.candidatureService.createCandidature(candidatureData).subscribe({
      next: (response) => {
        this.isSubmitting = false;
        this.submitSuccess = true;
        this.aDejaPostule = true;
        this.showForm = false; // Fermer le formulaire après soumission réussie
        setTimeout(() => this.closeDetails(), 2000);
      },
      error: (err) => {
        console.error('Erreur lors de la candidature:', err);
        this.isSubmitting = false;
        this.errorMessage = err.error?.message || 'Une erreur est survenue lors de la candidature';
      }
    });
  }

  getStatusClass(status?: string): string {
    switch (status) {
      case 'OUVERT': return 'status-open';
      case 'FERMÉ': return 'status-closed';
      case 'EN_ATTENTE': return 'status-pending';
      default: return '';
    }
  }
}