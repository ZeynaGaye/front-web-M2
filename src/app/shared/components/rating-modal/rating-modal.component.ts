import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ReservationService } from '../../services/reservation/reservation.service';

interface RatingData {
  reservation: any;
  serviceNom: string;
  prestataire: string;
  type: 'salon' | 'freelance';
  existingRating?: {
    note: number;
    commentaire: string;
  }
}

@Component({
  selector: 'app-rating-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule
  ],
  templateUrl: './rating-modal.component.html',
  styleUrl: './rating-modal.component.scss'
})
export class RatingModalComponent implements OnInit {

  // Données de notation
  rating = 0;
  hoverRating = 0;
  comment = '';

  // États du composant
  isSubmitting = false;
  isEditMode = false;

  // Critères de notation détaillés
  criteriaRatings = {
    qualite: 0,           // Qualité du service
    professionnalisme: 0,  // Professionnalisme
    proprete: 0,          // Propreté
    rapport_qualite_prix: 0, // Rapport qualité/prix
    ponctualite: 0        // Ponctualité
  };

  criteriaLabels: { [key: string]: string } = {
    qualite: 'Qualité du service',
    professionnalisme: 'Professionnalisme',
    proprete: 'Propreté',
    rapport_qualite_prix: 'Rapport qualité/prix',
    ponctualite: 'Ponctualité'
  };

  showDetailedRating = false;

  constructor(
    public dialogRef: MatDialogRef<RatingModalComponent>,
    @Inject(MAT_DIALOG_DATA) public data: RatingData,
    private reservationService: ReservationService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {

    // Si c'est une modification d'un avis existant
    if (this.data.existingRating) {
      this.rating = this.data.existingRating.note;
      this.comment = this.data.existingRating.commentaire || '';
      this.isEditMode = true;
    }
  }

  // ==========================================
  //  GESTION DES ÉTOILES
  // ==========================================

  /**
   * Définir la note au clic
   */
  setRating(rating: number): void {
    this.rating = rating;
    this.calculateAverageFromCriteria();
  }

  /**
   * Hover sur les étoiles
   */
  onStarHover(rating: number): void {
    this.hoverRating = rating;
  }

  /**
   * Quitter le hover
   */
  onStarLeave(): void {
    this.hoverRating = 0;
  }

  /**
   * Obtenir la classe CSS pour une étoile
   */
  getStarClass(starNumber: number): string {
    const effectiveRating = this.hoverRating || this.rating;

    if (starNumber <= effectiveRating) {
      return 'star-filled';
    } else if (starNumber - 0.5 <= effectiveRating) {
      return 'star-half';
    }
    return 'star-empty';
  }

  /**
   * Obtenir l'icône pour une étoile
   */
  getStarIcon(starNumber: number): string {
    const effectiveRating = this.hoverRating || this.rating;

    if (starNumber <= effectiveRating) {
      return 'star';
    } else if (starNumber - 0.5 <= effectiveRating) {
      return 'star_half';
    }
    return 'star_border';
  }

  // ==========================================
  //  NOTATION DÉTAILLÉE PAR CRITÈRES
  // ==========================================

  /**
   * Définir une note pour un critère spécifique
   */
  setCriteriaRating(criteria: string, rating: number): void {
    this.criteriaRatings[criteria as keyof typeof this.criteriaRatings] = rating;
    this.calculateAverageFromCriteria();
  }

  /**
   * Calculer la note globale à partir des critères
   */
  private calculateAverageFromCriteria(): void {
    if (!this.showDetailedRating) return;

    const ratings = Object.values(this.criteriaRatings).filter(r => r > 0);
    if (ratings.length > 0) {
      this.rating = Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10;
    }
  }

  /**
   * Obtenir les étoiles pour un critère
   */
  getCriteriaStars(criteria: string): number[] {
    return [1, 2, 3, 4, 5];
  }

  /**
   * Vérifier si une étoile de critère est remplie
   */
  isCriteriaStarFilled(criteria: string, starNumber: number): boolean {
    return this.criteriaRatings[criteria as keyof typeof this.criteriaRatings] >= starNumber;
  }

  // ==========================================
  //  GESTION DU COMMENTAIRE
  // ==========================================

  /**
   * Obtenir le texte descriptif de la note
   */
  getRatingText(): string {
    if (this.rating === 0) return 'Aucune note';
    if (this.rating <= 1) return 'Très décevant';
    if (this.rating <= 2) return 'Décevant';
    if (this.rating <= 3) return 'Correct';
    if (this.rating <= 4) return 'Bien';
    return 'Excellent';
  }

  /**
   * Obtenir la couleur de la note
   */
  getRatingColor(): string {
    if (this.rating <= 2) return '#f44336'; // Rouge
    if (this.rating <= 3) return '#ff9800'; // Orange
    if (this.rating <= 4) return '#ffc107'; // Jaune
    return '#4caf50'; // Vert
  }

  /**
   * Suggestions de commentaires selon la note
   */
  getCommentSuggestions(): string[] {
    if (this.rating <= 2) {
      return [
        'Le service ne correspondait pas à mes attentes',
        'Des améliorations sont nécessaires',
        'Je ne recommande pas ce prestataire'
      ];
    } else if (this.rating <= 3) {
      return [
        'Service correct dans l\'ensemble',
        'Quelques points d\'amélioration possibles',
        'Prestation acceptable'
      ];
    } else if (this.rating <= 4) {
      return [
        'Très satisfait(e) du service',
        'Prestataire professionnel et à l\'écoute',
        'Je recommande ce service'
      ];
    } else {
      return [
        'Service exceptionnel, je recommande vivement !',
        'Prestataire parfait, résultat au-delà de mes attentes',
        'Service 5 étoiles, à refaire sans hésiter !'
      ];
    }
  }

  /**
   * Utiliser une suggestion de commentaire
   */
  useSuggestion(suggestion: string): void {
    this.comment = suggestion;
  }

  // ==========================================
  //  ACTIONS PRINCIPALES
  // ==========================================

  /**
   * Soumettre la notation
   */
  // Dans votre classe RatingModalComponent
  submitRating(): void {
    // 1. Validation de base du formulaire
    if (this.rating === 0) {
      this.snackBar.open('Veuillez donner une note avant de soumettre', 'OK', {
        duration: 3000,
        panelClass: ['warning-snackbar']
      });
      return;
    }

    this.isSubmitting = true;

    // 2. Récupération de l'ID du prestataire en fonction de son type
    let prestataireId: number | null = null;
    if (this.data.type === 'salon') {
      prestataireId = this.data.reservation.salonId;
    } else if (this.data.type === 'freelance') {
      prestataireId = this.data.reservation.freelanceId;
    }

    // 3. Construction de l'objet de données à envoyer au backend
    const ratingData = {
      prestataireId: prestataireId,
      prestataireType: this.data.type, // ← CORRECTION: prestataireType au lieu de typePrestataire
      note: this.rating,
      commentaire: this.comment.trim(),

      // Autres données (potentiellement utiles mais non critiques pour l'AvisDTO de base)
      reservationId: this.data.reservation.id,
      criteres: this.showDetailedRating ? this.criteriaRatings : null,
      serviceId: this.data.reservation.serviceId,
    };


    // 4. Appel au service pour créer ou mettre à jour l'avis
    const submitRequest = this.isEditMode
      ? this.reservationService.updateAvis(this.data.reservation.avisId, ratingData)
      : this.reservationService.createAvis(ratingData);

    // 5. Gestion de la réponse du serveur (succès ou échec)
    submitRequest.subscribe({
      next: (response) => {
        this.snackBar.open(
          this.isEditMode ? 'Avis modifié avec succès !' : 'Merci pour votre avis !',
          'Fermer',
          {
            duration: 4000,
            panelClass: ['success-snackbar']
          }
        );
        this.dialogRef.close({
          success: true,
          rating: this.rating,
          comment: this.comment,
          data: response
        });
      },
      error: (error) => {
        console.error(' Erreur lors de la soumission:', error);
        this.isSubmitting = false;

        const errorMessage: string = error?.message || '';
        const alreadyReviewed = errorMessage.toLowerCase().includes('déjà') || errorMessage.toLowerCase().includes('already');

        if (alreadyReviewed) {
          // Passer en mode édition et afficher un message explicite
          this.isEditMode = true;
          this.snackBar.open(
            'Vous avez déjà soumis un avis. Vous pouvez le modifier ci-dessous.',
            'OK',
            {
              duration: 5000,
              panelClass: ['warning-snackbar']
            }
          );
        } else {
          this.snackBar.open(
            errorMessage || 'Erreur lors de l\'envoi de votre avis. Veuillez réessayer.',
            'Fermer',
            {
              duration: 5000,
              panelClass: ['error-snackbar']
            }
          );
        }
      }
    });
  }

  /**
   * Annuler et fermer
   */
  cancel(): void {
    this.dialogRef.close({ success: false });
  }

  /**
   * Basculer entre notation simple et détaillée
   */
  toggleDetailedRating(): void {
    this.showDetailedRating = !this.showDetailedRating;
    if (this.showDetailedRating) {
      // Répartir la note globale sur tous les critères
      Object.keys(this.criteriaRatings).forEach(key => {
        this.criteriaRatings[key as keyof typeof this.criteriaRatings] = this.rating;
      });
    }
  }

  // ==========================================
  //  HELPERS
  // ==========================================

  /**
   * Vérifier si le formulaire est valide
   */
  isFormValid(): boolean {
    return this.rating > 0 && !this.isSubmitting;
  }

  /**
   * Obtenir le titre de la modal
   */
  getModalTitle(): string {
    return this.isEditMode ? 'Modifier votre avis' : 'Donner votre avis';
  }

  /**
   * Obtenir le texte du bouton de soumission
   */
  getSubmitButtonText(): string {
    if (this.isSubmitting) {
      return this.isEditMode ? 'Modification...' : 'Envoi en cours...';
    }
    return this.isEditMode ? 'Modifier l\'avis' : 'Publier l\'avis';
  }
}
