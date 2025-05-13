import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReservationService } from '../../services/reservation/reservation.service';
import { AuthService } from '../../../core/servces/auth.service';



@Component({
  selector: 'app-booking-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './booking-dialog.component.html',
  styleUrls: ['./booking-dialog.component.scss']
})
export class BookingDialogComponent implements OnInit {
  bookingForm: FormGroup;
  isLoading = false;
  errorMessage = '';
  minDate = new Date();
  userId: number | null = null;
  
  // Plages horaires disponibles
  availableTimeSlots = [
    { value: '09:00', label: '09:00' },
    { value: '09:30', label: '09:30' },
    { value: '10:00', label: '10:00' },
    { value: '10:30', label: '10:30' },
    { value: '11:00', label: '11:00' },
    { value: '11:30', label: '11:30' },
    { value: '12:00', label: '12:00' },
    { value: '14:00', label: '14:00' },
    { value: '14:30', label: '14:30' },
    { value: '15:00', label: '15:00' },
    { value: '15:30', label: '15:30' },
    { value: '16:00', label: '16:00' },
    { value: '16:30', label: '16:30' },
    { value: '17:00', label: '17:00' },
    { value: '17:30', label: '17:30' }
  ];

  constructor(
    public dialogRef: MatDialogRef<BookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { service: any, salon: any },
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    // Initialisation du formulaire
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Récupérer l'ID de l'utilisateur connecté
    this.userId = this.authService.getCurrentUser()?.id || null;
    
    if (!this.userId) {
      this.errorMessage = 'Vous devez être connecté pour effectuer une réservation.';
      this.snackBar.open('Veuillez vous connecter pour réserver un service', 'Fermer', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
    }
    
    // Ajouter 1 jour à la date minimale pour éviter les réservations le jour même
    this.minDate.setDate(this.minDate.getDate() + 1);
    
    // Précharger une date par défaut (demain)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.bookingForm.get('date')?.setValue(tomorrow);
  }

  // Soumettre la réservation
  submitBooking(): void {
    if (this.bookingForm.invalid || !this.userId) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const formValues = this.bookingForm.value;
    
    // Créer la date de prestation en combinant la date et l'heure
    const selectedDate = new Date(formValues.date);
    const [hours, minutes] = formValues.timeSlot.split(':');
    
    // Créer un objet DateTime pour la date de prestation
    const datePrestation = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth(),
      selectedDate.getDate(),
      parseInt(hours),
      parseInt(minutes)
    );
    
    // Créer l'objet de réservation conforme au DTO backend
    const reservationData = {
      clientId: this.userId,
      serviceId: this.data.service.id,
      datePrestation: datePrestation.toISOString(), // Format ISO pour les dates
      dateReservation: new Date().toISOString(),
      status: 'EN_ATTENTE'
    };
    
    this.reservationService.createReservation(reservationData)
      .subscribe({
        next: (reservation) => {
          this.isLoading = false;
          if (reservation) {
            this.snackBar.open('Réservation confirmée avec succès !', 'Fermer', {
              duration: 5000,
              panelClass: ['success-snackbar']
            });
            this.dialogRef.close({ success: true, reservation });
          } else {
            this.errorMessage = 'Impossible de créer la réservation. Veuillez réessayer.';
          }
        },
        error: (error) => {
          this.isLoading = false;
          this.errorMessage = error.error || 'Une erreur est survenue lors de la création de la réservation.';
          console.error('Erreur lors de la création de la réservation:', error);
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}