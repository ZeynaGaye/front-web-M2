import { Component, Inject, OnInit, ViewChild, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { MatDatepicker } from '@angular/material/datepicker';
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
  @ViewChild('datePicker') datePicker!: MatDatepicker<Date>;
  
  bookingForm: FormGroup;
  isLoading = false;
  isLoadingSlots = false;
  errorMessage = '';
  minDate = new Date();
  userId: number | null = null;
  
  // Support des deux types : salon et freelance
  isFreelanceBooking = false;
  providerInfo: any = null;
  
  // Créneaux dynamiques depuis votre API
  availableTimeSlots: Array<{value: string, label: string, dateTime: string}> = [];

  constructor(
    public dialogRef: MatDialogRef<BookingDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      service: any, 
      salon?: any, 
      freelance?: any, 
      type?: 'salon' | 'freelance' 
    },
    private fb: FormBuilder,
    private reservationService: ReservationService,
    private authService: AuthService,
    private snackBar: MatSnackBar
  ) {
    // ✅ Initialisation sécurisée du formulaire
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });

    // ✅ Configuration dialog pour éviter fermeture accidentelle
    dialogRef.disableClose = true;
  }

  // ==========================================
  // 🔄 INITIALISATION SÉCURISÉE
  // ==========================================

  ngOnInit(): void {
    console.log('🔄 DEBUT ngOnInit - BookingDialog');
    console.log('📋 Données reçues:', this.data);
    
    try {
      // ✅ VALIDATION DES DONNÉES D'ENTRÉE
      this.validateInputData();
      
      // ✅ DÉTECTION DU TYPE AVEC VALIDATION
      this.detectBookingType();
      
      // ✅ VALIDATION DU PROVIDER
      this.validateProvider();
      
      // ✅ VÉRIFICATION UTILISATEUR AVEC GESTION D'ERREUR
      this.checkUserAuthentication();
      
      // ✅ INITIALISATION DU FORMULAIRE AVEC GESTION D'ERREUR
      this.initializeForm();
      
      // ✅ CHARGEMENT INITIAL DES CRÉNEAUX
      this.setupInitialSlots();
      
      console.log('✅ Initialisation complète avec succès');
      
    } catch (error) {
      console.error('❌ Erreur dans ngOnInit:', error);
      this.errorMessage = `Erreur d'initialisation : ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)}`;
      // ⚠️ NE PAS FERMER LE DIALOG - Juste afficher l'erreur
    }
    
    console.log('🔄 FIN ngOnInit - BookingDialog');
  }

  // ==========================================
  // 🔍 MÉTHODES DE VALIDATION
  // ==========================================

  private validateInputData(): void {
    if (!this.data) {
      console.error('❌ Aucune donnée fournie au dialog');
      throw new Error('Aucune donnée fournie');
    }
    
    if (!this.data.service) {
      console.error('❌ Service manquant dans les données');
      throw new Error('Service manquant');
    }
    
    if (!this.data.salon && !this.data.freelance) {
      console.error('❌ Informations du prestataire manquantes');
      throw new Error('Informations du prestataire manquantes');
    }
    
    console.log('✅ Validation des données OK');
  }

  private detectBookingType(): void {
    try {
      if (this.data.type) {
        this.isFreelanceBooking = this.data.type === 'freelance';
        console.log('🎯 Type détecté via data.type:', this.data.type);
      } else {
        this.isFreelanceBooking = !!this.data.freelance;
        console.log('🎯 Type détecté automatiquement:', this.isFreelanceBooking ? 'freelance' : 'salon');
      }
      
      this.providerInfo = this.isFreelanceBooking ? this.data.freelance : this.data.salon;
      
    } catch (error) {
      console.error('❌ Erreur détection type:', error);
      throw new Error('Impossible de déterminer le type de réservation');
    }
  }

  private validateProvider(): void {
    if (!this.providerInfo) {
      console.error('❌ Informations du prestataire manquantes après détection');
      throw new Error('Informations du prestataire manquantes');
    }
    
    if (!this.providerInfo.id) {
      console.error('❌ ID du prestataire manquant:', this.providerInfo);
      throw new Error('ID du prestataire manquant');
    }
    
    console.log('✅ Provider validé:', this.providerInfo);
  }

  private checkUserAuthentication(): void {
    try {
      console.log('🔐 Vérification authentification...');
      
      // ⚠️ Cette ligne peut lancer une erreur
      const currentUser = this.authService.getCurrentUser();
      console.log('👤 Utilisateur récupéré:', currentUser);
      
      this.userId = currentUser?.id || null;
      
      if (!this.userId) {
        console.warn('⚠️ Utilisateur non connecté');
        this.errorMessage = 'Vous devez être connecté pour effectuer une réservation.';
        
        this.snackBar.open(
          'Veuillez vous connecter pour réserver un service', 
          'Fermer', 
          {
            duration: 5000,
            panelClass: ['warning-snackbar']
          }
        );
        
        // ⚠️ NE PAS faire return; ici - laissez l'utilisateur voir le message
      } else {
        console.log('✅ Utilisateur connecté avec ID:', this.userId);
      }
      
    } catch (error) {
      console.error('❌ Erreur vérification auth:', error);
      this.errorMessage = 'Erreur de vérification de connexion';
      this.userId = null;
      // NE PAS lancer l'erreur - gérer gracieusement
    }
  }

  private initializeForm(): void {
    try {
      console.log('📝 Initialisation du formulaire...');
      
      const today = new Date();
      console.log('📅 Date du jour:', today);
      
      // Vérifier que le FormGroup existe
      if (!this.bookingForm) {
        throw new Error('FormGroup non initialisé');
      }
      
      // Vérifier que le control 'date' existe
      const dateControl = this.bookingForm.get('date');
      if (!dateControl) {
        throw new Error('Control date non trouvé dans le formulaire');
      }
      
      dateControl.setValue(today);
      console.log('✅ Date initialisée dans le formulaire');
      
    } catch (error) {
      console.error('❌ Erreur initialisation formulaire:', error);
      throw new Error('Impossible d\'initialiser le formulaire');
    }
  }

  private setupInitialSlots(): void {
    try {
      console.log('⏰ Configuration des créneaux initiaux...');
      
      const today = new Date();
      
      // ⚠️ Cette méthode peut échouer mais ne doit pas crasher le dialog
      this.loadAvailableSlots(today);
      
      // ⚠️ Cette subscription peut échouer
      this.setupDateChangeListener();
      
      console.log('✅ Créneaux et listeners configurés');
      
    } catch (error) {
      console.error('❌ Erreur configuration créneaux:', error);
      // NE PAS lancer l'erreur - le dialog peut fonctionner sans créneaux au début
      this.errorMessage = 'Erreur de chargement des créneaux. Sélectionnez une date.';
    }
  }

  private setupDateChangeListener(): void {
    try {
      const dateControl = this.bookingForm.get('date');
      if (!dateControl) {
        throw new Error('Control date non trouvé');
      }
      
      dateControl.valueChanges.subscribe({
        next: (date) => {
          console.log('📅 Changement de date détecté:', date);
          if (date) {
            this.loadAvailableSlots(date);
            
            // Reset du créneau sélectionné
            const timeSlotControl = this.bookingForm.get('timeSlot');
            if (timeSlotControl) {
              timeSlotControl.setValue('');
            }
          }
        },
        error: (error) => {
          console.error('❌ Erreur dans valueChanges:', error);
        }
      });
      
    } catch (error) {
      console.error('❌ Erreur setup listener:', error);
      throw error;
    }
  }

  // ==========================================
  // 🎯 GESTION PROGRAMMATIQUE DES CONTRÔLES
  // ==========================================

  /**
   * ✅ Méthode pour gérer l'état du contrôle timeSlot
   */
  private updateTimeSlotControlState(): void {
    try {
      const timeSlotControl = this.bookingForm.get('timeSlot');
      if (!timeSlotControl) {
        console.warn('⚠️ TimeSlot control non trouvé');
        return;
      }

      // Toujours garder le contrôle activé - l'UI gère l'état de chargement
      if (timeSlotControl.disabled) {
        timeSlotControl.enable();
        console.log('🔓 TimeSlot réactivé');
      }
    } catch (error) {
      console.error('❌ Erreur update timeSlot state:', error);
    }
  }

  /**
   * ✅ Vérifier si on peut soumettre la réservation
   */
  canSubmitBooking(): boolean {
    try {
      // Vérifications de base
      if (this.isLoading || this.isLoadingSlots) {
        return false;
      }

      if (!this.userId) {
        return false;
      }

      if (!this.bookingForm) {
        return false;
      }

      // Vérifier que les champs requis sont remplis
      const dateValue = this.bookingForm.get('date')?.value;
      const timeSlotValue = this.bookingForm.get('timeSlot')?.value;

      if (!dateValue || !timeSlotValue) {
        return false;
      }

      // Vérifier qu'il y a des créneaux disponibles
      if (this.availableTimeSlots.length === 0) {
        return false;
      }

      // Vérifier que le créneau sélectionné existe dans la liste
      const selectedSlotExists = this.availableTimeSlots.some(slot => slot.value === timeSlotValue);
      if (!selectedSlotExists) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('❌ Erreur canSubmitBooking:', error);
      return false;
    }
  }

  // ==========================================
  // ⏰ CHARGEMENT DES CRÉNEAUX SÉCURISÉ
  // ==========================================

  private loadAvailableSlots(date: Date): void {
    console.log('⏰ Chargement créneaux pour:', date);
    
    try {
      // Validation des paramètres
      if (!date) {
        console.warn('⚠️ Date manquante');
        return;
      }
      
      if (!this.providerInfo?.id) {
        console.warn('⚠️ Provider ID manquant:', this.providerInfo);
        return;
      }
      
      // ✅ Gérer l'état du contrôle
      this.isLoadingSlots = true;
      this.updateTimeSlotControlState(); // Désactiver le contrôle
      
      this.availableTimeSlots = [];
      
      const dateStr = date.toISOString().split('T')[0];
      console.log('📅 Date formatée:', dateStr);
      
      // Calculer durée service avec fallback
      const dureeService = this.getServiceDuration();
      console.log('⏱️ Durée service:', dureeService, 'minutes');
      
      if (this.isFreelanceBooking) {
        console.log('👤 Chargement créneaux freelance...');
        this.loadFreelanceSlots(dateStr, dureeService);
      } else {
        console.log('🏢 Chargement créneaux salon...');
        this.loadSalonSlots(dateStr, dureeService);
      }
      
    } catch (error) {
      console.error('❌ Erreur dans loadAvailableSlots:', error);
      this.isLoadingSlots = false;
      this.updateTimeSlotControlState(); // Réactiver en cas d'erreur
      this.availableTimeSlots = [];
      this.showSlotsError();
    }
  }

  private getServiceDuration(): number {
    try {
      return this.data.service?.dureeEnMinutes || 
             this.data.service?.duree_minutes ||
             this.parseServiceDuration(this.data.service?.duree) || 
             30; // Fallback par défaut
    } catch (error) {
      console.warn('⚠️ Erreur parsing durée service:', error);
      return 30;
    }
  }

  // ✅ Chargement créneaux salon avec gestion du contrôle
  private loadSalonSlots(dateStr: string, dureeService: number): void {
    this.reservationService.getCreneauxDisponibles(this.providerInfo.id, dateStr, dureeService)
      .subscribe({
        next: (response) => {
          try {
            // ✅ Réactiver le contrôle
            this.isLoadingSlots = false;
            this.updateTimeSlotControlState();
            
            console.log('✅ Créneaux salon reçus:', response);
            
            if (response && response.creneaux && Array.isArray(response.creneaux)) {
              this.availableTimeSlots = response.creneaux.map((creneau: any) => ({
                value: this.formatTimeForSelect(creneau.heureDebut),
                label: this.formatTimeForDisplay(creneau.heureDebut),
                dateTime: creneau.heureDebut
              }));
              
              console.log(`✅ ${this.availableTimeSlots.length} créneaux salon formatés`);
              
              if (this.availableTimeSlots.length === 0) {
                this.showNoSlotsMessage(dateStr);
              }
            } else {
              console.warn('⚠️ Format réponse salon inattendu:', response);
              this.showNoSlotsMessage(dateStr);
            }
          } catch (error) {
            console.error('❌ Erreur traitement réponse salon:', error);
            this.isLoadingSlots = false;
            this.updateTimeSlotControlState();
            this.showSlotsError();
          }
        },
        error: (error) => {
          // ✅ Réactiver le contrôle en cas d'erreur
          this.isLoadingSlots = false;
          this.updateTimeSlotControlState();
          
          console.error('❌ Erreur chargement créneaux salon:', error);
          this.showSlotsError();
        }
      });
  }

  // ✅ Chargement créneaux freelance avec gestion du contrôle
  private loadFreelanceSlots(dateStr: string, dureeService: number): void {
    try {
      // Simulation API freelance (remplacer par vraie API plus tard)
      setTimeout(() => {
        try {
          // ✅ Réactiver le contrôle
          this.isLoadingSlots = false;
          this.updateTimeSlotControlState();
          
          // Créneaux par défaut basés sur les disponibilités freelance
          const baseSlots = [
            '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
          ];
          
          // Ajouter créneaux weekend/soir selon disponibilités
          const freelance = this.providerInfo;
          const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;
          
          let availableSlots = [...baseSlots];
          
          // Si freelance disponible en soirée
          if (freelance.disponibleSoir) {
            availableSlots.push('18:00', '19:00', '20:00');
          }
          
          // Si c'est le weekend et freelance pas disponible weekend
          if (isWeekend && !freelance.disponibleWeekend) {
            availableSlots = []; // Pas disponible le weekend
          }
          
          this.availableTimeSlots = availableSlots.map(time => ({
            value: time,
            label: time.replace(':', 'h'),
            dateTime: `${dateStr}T${time}:00`
          }));
          
          console.log(`✅ ${this.availableTimeSlots.length} créneaux freelance générés`);
          
          if (this.availableTimeSlots.length === 0) {
            this.showNoSlotsMessage(dateStr);
          }
        } catch (error) {
          console.error('❌ Erreur génération créneaux freelance:', error);
          this.isLoadingSlots = false;
          this.updateTimeSlotControlState();
          this.showSlotsError();
        }
      }, 1000); // Simulation délai API
      
    } catch (error) {
      console.error('❌ Erreur setup freelance slots:', error);
      this.isLoadingSlots = false;
      this.updateTimeSlotControlState();
      this.showSlotsError();
    }
  }

  // ==========================================
  // 🛠️ UTILITAIRES SÉCURISÉS
  // ==========================================

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
    } catch (error) {
      console.warn('⚠️ Erreur parsing durée:', duree, error);
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
    } catch (error) {
      console.warn('⚠️ Erreur formatage time select:', dateTime, error);
      return dateTime;
    }
  }

  private formatTimeForDisplay(dateTime: string): string {
    try {
      const time = this.formatTimeForSelect(dateTime);
      return time.replace(':', 'h');
    } catch (error) {
      console.warn('⚠️ Erreur formatage time display:', dateTime, error);
      return dateTime;
    }
  }

  // ==========================================
  // 📱 GESTION DES MESSAGES
  // ==========================================

  private showNoSlotsMessage(date: string): void {
    try {
      this.snackBar.open(
        `Aucun créneau disponible le ${new Date(date).toLocaleDateString('fr-FR')}. Essayez une autre date.`,
        'Fermer',
        { duration: 4000, panelClass: ['info-snackbar'] }
      );
    } catch (error) {
      console.error('❌ Erreur affichage message no slots:', error);
    }
  }

  private showSlotsError(): void {
    try {
      this.snackBar.open(
        'Impossible de charger les créneaux. Veuillez réessayer.',
        'Fermer',
        { duration: 3000, panelClass: ['warning-snackbar'] }
      );
    } catch (error) {
      console.error('❌ Erreur affichage message erreur slots:', error);
    }
  }

  // ==========================================
  // 🎬 ACTIONS UTILISATEUR
  // ==========================================

  // ✅ Empêcher fermeture accidentelle
  onDialogClick(event: Event): void {
    event.stopPropagation();
  }

  // ✅ Gestion propre de la fermeture
  closeDialog(result?: any): void {
    console.log('🚪 Fermeture dialog:', result);
    this.dialogRef.close(result);
  }

  // ✅ Gestion ESC key
  @HostListener('keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.bookingForm.dirty) {
      const confirmClose = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?');
      if (!confirmClose) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    this.closeDialog();
  }

  // ✅ Ouverture datepicker sécurisée
  openDatePicker(): void {
    try {
      if (this.datePicker) {
        console.log('📅 Ouverture datepicker');
        this.datePicker.open();
      } else {
        console.warn('⚠️ DatePicker non disponible');
      }
    } catch (error) {
      console.error('❌ Erreur ouverture datepicker:', error);
    }
  }

  // ==========================================
  // 📤 SOUMISSION RÉSERVATION SÉCURISÉE
  // ==========================================

  submitBooking(): void {
    console.log('📤 Tentative soumission réservation...');
    
    try {
      // Validations préliminaires
      if (this.bookingForm.invalid) {
        console.warn('⚠️ Formulaire invalide');
        this.markFormGroupTouched();
        return;
      }
      
      if (!this.userId) {
        console.warn('⚠️ Utilisateur non connecté');
        this.errorMessage = 'Vous devez être connecté pour effectuer une réservation.';
        return;
      }
      
      if (this.isLoading) {
        console.warn('⚠️ Soumission déjà en cours');
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
      
      // ✅ Créer données de réservation selon le type
      const reservationData = this.isFreelanceBooking ? {
        clientId: this.userId,
        freelanceId: this.providerInfo.id,
        serviceId: this.data.service.id,
        datePrestation: datePrestation.toISOString(),
        type: 'freelance'
      } : {
        clientId: this.userId,
        salonId: this.providerInfo.id,
        serviceId: this.data.service.id,
        datePrestation: datePrestation.toISOString(),
        type: 'salon'
      };
      
      console.log('📤 Données réservation:', reservationData);
      
      this.reservationService.createReservation(reservationData)
        .subscribe({
          next: (reservation) => {
            try {
              this.isLoading = false;
              if (reservation) {
                console.log('✅ Réservation créée:', reservation);
                this.snackBar.open('Réservation confirmée avec succès !', 'Fermer', {
                  duration: 5000,
                  panelClass: ['success-snackbar']
                });
                this.dialogRef.close({ success: true, reservation });
              } else {
                this.errorMessage = 'Impossible de créer la réservation. Veuillez réessayer.';
              }
            } catch (error) {
              console.error('❌ Erreur traitement succès:', error);
              this.isLoading = false;
              this.errorMessage = 'Erreur lors du traitement de la réponse.';
            }
          },
          error: (error) => {
            this.isLoading = false;
            let errorMsg = error.message || 'Une erreur est survenue lors de la création de la réservation.';
            
            // Gestion spéciale pour les erreurs de créneaux
            if (errorMsg.includes('créneau') || errorMsg.includes('disponible')) {
              errorMsg = '⚠️ ' + errorMsg + '\n\n💡 Conseil: Rechargez les créneaux ou choisissez une autre date.';
              
              // Recharger les créneaux automatiquement
              const currentDate = this.bookingForm.get('date')?.value;
              if (currentDate) {
                console.log('🔄 Rechargement automatique des créneaux après erreur...');
                setTimeout(() => {
                  this.loadAvailableSlots(currentDate);
                }, 1000);
              }
            }
            
            this.errorMessage = errorMsg;
            console.error('❌ Erreur création réservation:', error);
            
            this.snackBar.open(errorMsg, 'Fermer', {
              duration: 10000,
              panelClass: ['error-snackbar']
            });
          }
        });
        
    } catch (error) {
      this.isLoading = false;
      this.errorMessage = 'Erreur lors de la préparation de la réservation.';
      console.error('❌ Erreur préparation réservation:', error);
    }
  }

  private markFormGroupTouched(): void {
    try {
      Object.keys(this.bookingForm.controls).forEach(key => {
        const control = this.bookingForm.get(key);
        if (control) {
          control.markAsTouched();
        }
      });
    } catch (error) {
      console.error('❌ Erreur marking form touched:', error);
    }
  }

  // ==========================================
  // 🔍 MÉTHODES DE DEBUG
  // ==========================================

  ngAfterViewInit(): void {
    console.log('👁️ Vue initialisée');
    console.log('📅 DatePicker disponible:', !!this.datePicker);
    console.log('📝 FormGroup:', this.bookingForm);
    console.log('🎛️ Contrôles form:', {
      date: this.bookingForm.get('date'),
      timeSlot: this.bookingForm.get('timeSlot')
    });
  }

  ngOnDestroy(): void {
    console.log('💀 Destruction du composant BookingDialog');
  }

  /**
   * ✅ Debug state du composant
   */
  logComponentState(): void {
    console.log('🔍 État du composant:', {
      isLoading: this.isLoading,
      isLoadingSlots: this.isLoadingSlots,
      errorMessage: this.errorMessage,
      userId: this.userId,
      isFreelanceBooking: this.isFreelanceBooking,
      providerInfo: this.providerInfo,
      availableTimeSlots: this.availableTimeSlots.length,
      formValid: this.bookingForm?.valid,
      formValue: this.bookingForm?.value,
      canSubmit: this.canSubmitBooking()
    });
  }
}