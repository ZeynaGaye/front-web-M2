
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
  isLoadingSlots = false;
  errorMessage = '';
  minDate = new Date();
  userId: number | null = null;
  
  // ✅ Créneaux dynamiques depuis votre API
  availableTimeSlots: Array<{value: string, label: string, dateTime: string}> = [];

  constructor(
    public dialogRef: MatDialogRef<BookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { service: any, salon: any },
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.userId = this.authService.getCurrentUser()?.id || null;
    
    if (!this.userId) {
      this.errorMessage = 'Vous devez être connecté pour effectuer une réservation.';
      this.snackBar.open('Veuillez vous connecter pour réserver un service', 'Fermer', {
        duration: 5000,
        panelClass: ['warning-snackbar']
      });
      return;
    }
    
    this.minDate.setDate(this.minDate.getDate() + 1);
    
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    this.bookingForm.get('date')?.setValue(tomorrow);
    
    // ✅ Charger créneaux pour demain
    this.loadAvailableSlots(tomorrow);
    
    // ✅ Écouter changement de date
    this.bookingForm.get('date')?.valueChanges.subscribe(date => {
      if (date) {
        this.loadAvailableSlots(date);
        this.bookingForm.get('timeSlot')?.setValue('');
      }
    });
  }

  // ✅ Charger créneaux via votre API
  private loadAvailableSlots(date: Date): void {
    if (!date || !this.data.salon?.id) return;
    
    this.isLoadingSlots = true;
    this.availableTimeSlots = [];
    
    const dateStr = date.toISOString().split('T')[0];
    
    // Calculer durée service (votre API utilise dureeService en minutes)
    const dureeService = this.data.service?.dureeEnMinutes || 
                        this.data.service?.duree_minutes ||
                        this.parseServiceDuration(this.data.service?.duree) || 
                        30;
    
    console.log(`📅 Chargement créneaux salon ${this.data.salon.id} pour ${dateStr} (${dureeService}min)`);
    
    // ✅ UTILISER votre API qui fonctionne maintenant !
    this.reservationService.getCreneauxDisponibles(this.data.salon.id, dateStr, dureeService)
      .subscribe({
        next: (response) => {
          this.isLoadingSlots = false;
          console.log('✅ Créneaux reçus:', response);
          
          if (response && response.creneaux && Array.isArray(response.creneaux)) {
            this.availableTimeSlots = response.creneaux.map((creneau: any) => ({
              value: this.formatTimeForSelect(creneau.heureDebut),
              label: this.formatTimeForDisplay(creneau.heureDebut),
              dateTime: creneau.heureDebut
            }));
            
            console.log(`✅ ${this.availableTimeSlots.length} créneaux formatés`);
            
            if (this.availableTimeSlots.length === 0) {
              this.showNoSlotsMessage(dateStr);
            }
          } else {
            console.warn('⚠️ Format réponse inattendu:', response);
            this.showNoSlotsMessage(dateStr);
          }
        },
        error: (error) => {
          this.isLoadingSlots = false;
          console.error('❌ Erreur chargement créneaux:', error);
          
          this.snackBar.open(
            'Impossible de charger les créneaux. Veuillez réessayer.',
            'Fermer',
            { duration: 3000, panelClass: ['warning-snackbar'] }
          );
          
          // Optionnel : fallback avec créneaux par défaut
          // this.loadFallbackSlots();
        }
      });
  }

  // ✅ Utilitaires de formatage
  private parseServiceDuration(duree: string): number | null {
    if (!duree) return null;
    
    try {
      const d = duree.toLowerCase().trim();
      if (d.includes('h')) {
        const parts = d.split('h');
        const heures = parseInt(parts[0]) || 0;
        const minutes = parts[1] ? parseInt(parts[1].replace(/\D/g, '')) || 0 : 0;
        return heures * 60 + minutes;
      } else {
        return parseInt(d.replace(/\D/g, '')) || null;
      }
    } catch {
      return null;
    }
  }

  private formatTimeForSelect(dateTime: string): string {
    try {
      return new Date(dateTime).toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
    } catch {
      return dateTime;
    }
  }

  private formatTimeForDisplay(dateTime: string): string {
    try {
      const time = this.formatTimeForSelect(dateTime);
      return time.replace(':', 'h');
    } catch {
      return dateTime;
    }
  }

  private showNoSlotsMessage(date: string): void {
    this.snackBar.open(
      `Aucun créneau disponible le ${new Date(date).toLocaleDateString('fr-FR')}. Essayez une autre date.`,
      'Fermer',
      { duration: 4000, panelClass: ['info-snackbar'] }
    );
  }

  // ✅ Soumission réservation
  submitBooking(): void {
    if (this.bookingForm.invalid || !this.userId) {
      return;
    }
    
    this.isLoading = true;
    this.errorMessage = '';
    
    const formValues = this.bookingForm.value;
    const selectedSlot = this.availableTimeSlots.find(slot => slot.value === formValues.timeSlot);
    
    let datePrestation: Date;
    
    if (selectedSlot && selectedSlot.dateTime) {
      // Utiliser datetime exact du créneau
      datePrestation = new Date(selectedSlot.dateTime);
    } else {
      // Fallback : construire datetime
      const selectedDate = new Date(formValues.date);
      const [hours, minutes] = formValues.timeSlot.split(':');
      datePrestation = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(hours),
        parseInt(minutes)
      );
    }
    
    // Créer réservation selon format de votre backend
    const reservationData = {
      clientId: this.userId,
      serviceId: this.data.service.id,
      datePrestation: datePrestation.toISOString()
    };
    
    console.log('📤 Création réservation:', reservationData);
    
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
          this.errorMessage = error.message || 'Une erreur est survenue lors de la création de la réservation.';
          console.error('❌ Erreur création réservation:', error);
        }
      });
  }

  closeDialog(): void {
    this.dialogRef.close();
  }
}