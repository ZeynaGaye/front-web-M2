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
import { PaymentService, BeautyPaymentRequest, BeautyPaymentResponse } from '../../../services/payment.service';


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

  // ========================================
  // PROPRIÉTÉS EXISTANTES (conservées)
  // ========================================
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

  // ========================================
  // NOUVELLES PROPRIÉTÉS POUR LE PAIEMENT
  // ========================================
  currentStep: 'booking' | 'payment' = 'booking';
  selectedPaymentMethod: string = '';
  paymentForm: FormGroup;
  isProcessingPayment = false;
  paymentStatus: BeautyPaymentResponse | null = null;
  createdReservation: any = null; // Stocke la réservation créée

  // ========================================
  // NOUVELLES PROPRIÉTÉS POUR TEMPS RÉEL
  // ========================================
  private refreshInterval: any = null;
  private currentSelectedDate: Date | null = null;
  private pollSubscription: any = null;

  // Opérateurs de paiement que l'utilisateur connaît
  paymentMethods = [
    {
      id: 'orange_money',
      name: 'Orange Money',
      icon: 'assets/images/OM.jpg',
      type: 'mobile',
      description: 'Payez avec votre compte Orange Money',
      phonePattern: '^(221)?(77|78)\\d{7}$'
    },
    {
      id: 'wave',
      name: 'Wave',
      icon: 'assets/images/wave.png',
      type: 'mobile',

      description: 'Payez avec votre compte Wave',
      phonePattern: '^(221)?(77|78|76|70)\\d{7}$'
    },
    {
      id: 'carte_bancaire',
      name: 'Carte Bancaire',
      icon: 'assets/images/mastercard-visa.jpg',
      type: 'mobile',
      description: 'Payez par carte Visa/mastercard-visa',
      phonePattern: null
    }
  ];

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
    private paymentService: PaymentService,
    private snackBar: MatSnackBar
  ) {
    // Formulaire de réservation existant
    this.bookingForm = this.fb.group({
      date: ['', Validators.required],
      timeSlot: ['', Validators.required]
    });

    // Nouveau formulaire de paiement avec validation dynamique
    this.paymentForm = this.fb.group({
      phoneNumber: ['', [Validators.required, this.phoneNumberValidator]],
      email: ['', [Validators.email]],
      customerName: ['', Validators.required]
    });

    dialogRef.disableClose = true;
  }

  ngOnInit(): void {
    try {
      this.validateInputData();
      this.detectBookingType();
      this.validateProvider();
      this.checkUserAuthentication();
      this.initializeForm();
      this.setupInitialSlots();

    } catch (error) {
      console.error(' Erreur dans ngOnInit:', error);
      this.errorMessage = `Erreur d'initialisation : ${typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error)}`;
    }
  }

  private validateInputData(): void {
    if (!this.data) {
      console.error(' Aucune donnée fournie au dialog');
      throw new Error('Aucune donnée fournie');
    }

    if (!this.data.service) {
      console.error(' Service manquant dans les données');
      throw new Error('Service manquant');
    }

    if (!this.data.salon && !this.data.freelance) {
      console.error(' Informations du prestataire manquantes');
      throw new Error('Informations du prestataire manquantes');
    }


  }

  private detectBookingType(): void {
    try {
      if (this.data.type) {
        this.isFreelanceBooking = this.data.type === 'freelance';

      } else {
        this.isFreelanceBooking = !!this.data.freelance;

      }

      this.providerInfo = this.isFreelanceBooking ? this.data.freelance : this.data.salon;

    } catch (error) {
      console.error(' Erreur détection type:', error);
      throw new Error('Impossible de déterminer le type de réservation');
    }
  }

  private validateProvider(): void {
    if (!this.providerInfo) {
      console.error(' Informations du prestataire manquantes après détection');
      throw new Error('Informations du prestataire manquantes');
    }

    if (!this.providerInfo.id) {
      console.error(' ID du prestataire manquant:', this.providerInfo);
      throw new Error('ID du prestataire manquant');
    }


  }

  private checkUserAuthentication(): void {
    try {


      const currentUser = this.authService.getCurrentUser();


      this.userId = currentUser?.id || null;

      if (!this.userId) {
        console.warn(' Utilisateur non connecté');
        this.errorMessage = 'Vous devez être connecté pour effectuer une réservation.';

        this.snackBar.open(
          'Veuillez vous connecter pour réserver un service',
          'Fermer',
          {
            duration: 5000,
            panelClass: ['warning-snackbar']
          }
        );
      } else {

      }

    } catch (error) {
      console.error(' Erreur vérification auth:', error);
      this.errorMessage = 'Erreur de vérification de connexion';
      this.userId = null;
    }
  }

  private initializeForm(): void {
    try {


      const today = new Date();


      if (!this.bookingForm) {
        throw new Error('FormGroup non initialisé');
      }

      const dateControl = this.bookingForm.get('date');
      if (!dateControl) {
        throw new Error('Control date non trouvé dans le formulaire');
      }

      dateControl.setValue(today);


    } catch (error) {
      console.error(' Erreur initialisation formulaire:', error);
      throw new Error('Impossible d\'initialiser le formulaire');
    }
  }

  private setupInitialSlots(): void {
    try {


      const today = new Date();
      this.currentSelectedDate = today;
      this.loadAvailableSlots(today);
      this.setupDateChangeListener();
      this.startAutoRefresh();



    } catch (error) {
      console.error(' Erreur configuration créneaux:', error);
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

          if (date) {
            this.currentSelectedDate = date;
            this.loadAvailableSlots(date);

            const timeSlotControl = this.bookingForm.get('timeSlot');
            if (timeSlotControl) {
              timeSlotControl.setValue('');
            }
          }
        },
        error: (error) => {
          console.error(' Erreur dans valueChanges:', error);
        }
      });

    } catch (error) {
      console.error(' Erreur setup listener:', error);
      throw error;
    }
  }

  // ==========================================
  // GESTION PROGRAMMATIQUE DES CONTRÔLES
  // ==========================================

  private updateTimeSlotControlState(): void {
    try {
      const timeSlotControl = this.bookingForm.get('timeSlot');
      if (!timeSlotControl) {
        console.warn(' TimeSlot control non trouvé');
        return;
      }

      if (timeSlotControl.disabled) {
        timeSlotControl.enable();

      }
    } catch (error) {
      console.error(' Erreur update timeSlot state:', error);
    }
  }

  canSubmitBooking(): boolean {
    try {
      if (this.isLoading || this.isLoadingSlots) return false;
      if (!this.userId) return false;
      if (!this.bookingForm) return false;

      const dateValue = this.bookingForm.get('date')?.value;
      const timeSlotValue = this.bookingForm.get('timeSlot')?.value;

      if (!dateValue || !timeSlotValue) return false;
      if (this.availableTimeSlots.length === 0) return false;

      const selectedSlotExists = this.availableTimeSlots.some(slot => slot.value === timeSlotValue);
      return selectedSlotExists;
    } catch (error) {
      console.error(' Erreur canSubmitBooking:', error);
      return false;
    }
  }

  // ==========================================
  // CHARGEMENT DES CRÉNEAUX (conservé)
  // ==========================================

  private loadAvailableSlots(date: Date, silentRefresh: boolean = false): void {
    if (!silentRefresh) {

    }

    try {
      if (!date) {
        console.warn(' Date manquante');
        return;
      }

      if (!this.providerInfo?.id) {
        console.warn(' Provider ID manquant:', this.providerInfo);
        return;
      }

      // Pour les refresh silencieux, on ne change pas les indicateurs de loading
      if (!silentRefresh) {
        this.isLoadingSlots = true;
        this.updateTimeSlotControlState();
        // On garde les créneaux existants pendant le refresh silencieux
        this.availableTimeSlots = [];
      }

      const dateStr = date.toISOString().split('T')[0];


      const dureeService = this.getServiceDuration();


      if (this.isFreelanceBooking) {
        if (!silentRefresh)
        this.loadFreelanceSlots(dateStr, dureeService, silentRefresh);
      } else {
        if (!silentRefresh)
        this.loadSalonSlots(dateStr, dureeService, silentRefresh);
      }

    } catch (error) {
      console.error(' Erreur dans loadAvailableSlots:', error);
      this.isLoadingSlots = false;
      this.updateTimeSlotControlState();
      this.availableTimeSlots = [];
      this.showSlotsError();
    }
  }

  private getServiceDuration(): number {
    try {
      return this.data.service?.dureeEnMinutes ||
             this.data.service?.duree_minutes ||
             this.parseServiceDuration(this.data.service?.duree) ||
             30;
    } catch (error) {
      console.warn(' Erreur parsing durée service:', error);
      return 30;
    }
  }

  private loadSalonSlots(dateStr: string, dureeService: number, silentRefresh: boolean = false): void {
    this.reservationService.getCreneauxDisponibles(this.providerInfo.id, dateStr, dureeService)
      .subscribe({
        next: (response) => {
          try {
            if (!silentRefresh) {
              this.isLoadingSlots = false;
              this.updateTimeSlotControlState();

            }

            if (response && response.creneaux && Array.isArray(response.creneaux)) {
              this.availableTimeSlots = response.creneaux.map((creneau: any) => ({
                value: this.formatTimeForSelect(creneau.heureDebut),
                label: this.formatTimeForDisplay(creneau.heureDebut),
                dateTime: creneau.heureDebut
              }));

              if (!silentRefresh) {


                if (this.availableTimeSlots.length === 0) {
                  this.showNoSlotsMessage(dateStr);
                }
              }
            } else {
              if (!silentRefresh) {
                console.warn(' Format réponse salon inattendu:', response);
                this.showNoSlotsMessage(dateStr);
              }
            }
          } catch (error) {
            console.error(' Erreur traitement réponse salon:', error);
            if (!silentRefresh) {
              this.isLoadingSlots = false;
              this.updateTimeSlotControlState();
              this.showSlotsError();
            }
          }
        },
        error: (error) => {
          if (!silentRefresh) {
            this.isLoadingSlots = false;
            this.updateTimeSlotControlState();
            console.error(' Erreur chargement créneaux salon:', error);
            this.showSlotsError();
          }
        }
      });
  }

  private loadFreelanceSlots(dateStr: string, dureeService: number, silentRefresh: boolean = false): void {
    this.reservationService.getCreneauxDisponiblesFreelance(this.providerInfo.id, dateStr, dureeService)
      .subscribe({
        next: (response) => {
          try {
            if (!silentRefresh) {
              this.isLoadingSlots = false;
              this.updateTimeSlotControlState();
            }

            if (response && response.creneaux && Array.isArray(response.creneaux)) {
              this.availableTimeSlots = response.creneaux.map((creneau: any) => ({
                value: this.formatTimeForSelect(creneau.heureDebut),
                label: this.formatTimeForDisplay(creneau.heureDebut),
                dateTime: creneau.heureDebut
              }));

              if (!silentRefresh && this.availableTimeSlots.length === 0) {
                this.showNoSlotsMessage(dateStr);
              }
            } else {
              if (!silentRefresh) {
                console.warn(' Format réponse freelance inattendu:', response);
                this.showNoSlotsMessage(dateStr);
              }
            }
          } catch (error) {
            console.error(' Erreur traitement réponse freelance:', error);
            if (!silentRefresh) {
              this.isLoadingSlots = false;
              this.updateTimeSlotControlState();
              this.showSlotsError();
            }
          }
        },
        error: (error) => {
          if (!silentRefresh) {
            this.isLoadingSlots = false;
            this.updateTimeSlotControlState();
            console.error(' Erreur chargement créneaux freelance:', error);
            this.showSlotsError();
          }
        }
      });
  }

  // ==========================================
  // UTILITAIRES
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
      console.warn(' Erreur parsing durée:', duree, error);
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
      console.warn(' Erreur formatage time select:', dateTime, error);
      return dateTime;
    }
  }

  private formatTimeForDisplay(dateTime: string): string {
    try {
      const time = this.formatTimeForSelect(dateTime);
      return time.replace(':', 'h');
    } catch (error) {
      console.warn(' Erreur formatage time display:', dateTime, error);
      return dateTime;
    }
  }

  private showNoSlotsMessage(date: string): void {
    try {
      this.snackBar.open(
        `Aucun créneau disponible le ${new Date(date).toLocaleDateString('fr-FR')}. Essayez une autre date.`,
        'Fermer',
        { duration: 4000, panelClass: ['info-snackbar'] }
      );
    } catch (error) {
      console.error(' Erreur affichage message no slots:', error);
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
      console.error(' Erreur affichage message erreur slots:', error);
    }
  }

  // ==========================================
  //  NOUVELLES MÉTHODES POUR TEMPS RÉEL
  // ==========================================

  /**
   * Démarrer le rafraîchissement automatique des créneaux (15 secondes)
   */
  private startAutoRefresh(): void {
    // Arrêter le timer existant s'il y en a un
    this.stopAutoRefresh();



    this.refreshInterval = setInterval(() => {
      // Ne pas rafraîchir si :
      // - On est en étape paiement (pour ne pas perturber)
      // - Pas de date sélectionnée
      // - Chargement en cours
      if (this.currentStep === 'payment' ||
          !this.currentSelectedDate ||
          this.isLoadingSlots) {
        return;
      }


      this.loadAvailableSlots(this.currentSelectedDate, true); // true = refresh silencieux
    }, 15000); // 15 secondes
  }

  /**
   * Arrêter le rafraîchissement automatique
   */
  private stopAutoRefresh(): void {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;

    }
  }

  /**
   * Vérifier la disponibilité d'un créneau avant paiement
   */
  private async verifySlotBeforePayment(): Promise<boolean> {


    try {
      const formValues = this.bookingForm.value;
      const selectedSlot = this.availableTimeSlots.find(slot => slot.value === formValues.timeSlot);

      if (!selectedSlot) {
        console.warn(' Créneau sélectionné non trouvé dans la liste');
        return false;
      }

      // Calculer heure de fin
      const debut = new Date(selectedSlot.dateTime);
      const fin = new Date(debut.getTime() + (this.getServiceDuration() * 60000));

      // Vérifier via l'API
      const verification = await this.reservationService.verifierDisponibilite(
        this.providerInfo.id,
        debut.toISOString(),
        fin.toISOString(),
        !this.isFreelanceBooking
      ).toPromise();

      const isAvailable = verification?.estDisponible || false;



      return isAvailable;

    } catch (error) {
      console.error(' Erreur vérification disponibilité:', error);
      // En cas d'erreur, on assume que c'est disponible pour ne pas bloquer
      return true;
    }
  }

  /**
   * Afficher message de créneau pris
   */
  private showSlotTakenMessage(): void {
    this.snackBar.open(
      ' Ce créneau vient d\'être pris par quelqu\'un d\'autre. Veuillez en choisir un autre.',
      'Choisir un autre',
      {
        duration: 8000,
        panelClass: ['warning-snackbar']
      }
    );

    // Retourner à l'étape de réservation
    this.goBackToBooking();

    // Rafraîchir la liste des créneaux
    if (this.currentSelectedDate) {
      this.loadAvailableSlots(this.currentSelectedDate);
    }
  }

  /**
   * Afficher message d'erreur de vérification
   */
  private showVerificationError(): void {
    this.snackBar.open(
      ' Impossible de vérifier la disponibilité. Veuillez réessayer.',
      'Réessayer',
      {
        duration: 5000,
        panelClass: ['error-snackbar']
      }
    );
  }

  // ==========================================
  //  MÉTHODES POUR LE PAIEMENT (MISES À JOUR)
  // ==========================================

  /**
   * Validation personnalisée selon l'opérateur sélectionné
   */
  phoneNumberValidator = (control: any) => {
    const value = control.value?.replace(/\D/g, '');
    if (!value || !this.selectedPaymentMethod) return null;

    const selectedMethod = this.paymentMethods.find(m => m.id === this.selectedPaymentMethod);
    if (!selectedMethod?.phonePattern) return null; // Pas de validation pour carte bancaire

    const isValid = new RegExp(selectedMethod.phonePattern).test(value);
    return isValid ? null : { invalidPhone: true };
  }

  /**
   * Sélectionner une méthode de paiement
   */
  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;
    this.errorMessage = '';

    // Adapter les validations selon la méthode
    if (methodId === 'carte_bancaire') {
      this.paymentForm.get('email')?.setValidators([Validators.required, Validators.email]);
      this.paymentForm.get('phoneNumber')?.clearValidators();
    } else {
      this.paymentForm.get('email')?.setValidators([Validators.email]);
      this.paymentForm.get('phoneNumber')?.setValidators([Validators.required, this.phoneNumberValidator]);
    }

    this.paymentForm.get('email')?.updateValueAndValidity();
    this.paymentForm.get('phoneNumber')?.updateValueAndValidity();
  }

  /**
   * Obtenir le nom de l'opérateur sélectionné
   */
  getSelectedOperatorName(): string {
    const selectedMethod = this.paymentMethods.find(m => m.id === this.selectedPaymentMethod);
    return selectedMethod?.name || '';
  }

  /**
   * Formater le numéro de téléphone
   */
  formatPhoneNumber(phoneNumber: string): string {
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    if (cleanPhone.length === 12 && cleanPhone.startsWith('221')) {
      return cleanPhone.substring(3); // Remove 221 prefix
    }
    if (cleanPhone.length === 9) {
      return cleanPhone; // Already in correct format
    }
    return cleanPhone;
  }

  /**
   * Récupérer les informations du créneau sélectionné
   */
  getSelectedTimeSlotLabel(): string {
    const selectedValue = this.bookingForm.get('timeSlot')?.value;
    const selectedSlot = this.availableTimeSlots.find(slot => slot.value === selectedValue);
    return selectedSlot?.label || '';
  }

  /**
   * Calculer le montant total
   */
  getTotalAmount(): number {
    const s = this.data.service;
    if (!s) return 0;
    return s.prix || s.prixMin || s.prixMoyen || 0;
  }

  /**
   * Naviguer vers l'étape paiement
   */
  goToPaymentStep(): void {
    if (!this.canSubmitBooking()) return;

    this.currentStep = 'payment';

    // Pré-remplir le nom du client si disponible
    const currentUser = this.authService.getCurrentUser();
    if (currentUser) {
      this.paymentForm.patchValue({
        customerName: `${currentUser.prenom || ''} ${currentUser.nom || ''}`.trim() || 'Client',
        email: currentUser.email || ''
      });
    }
  }

  /**
   * Revenir à l'étape réservation
   */
  goBackToBooking(): void {
    this.currentStep = 'booking';
    this.selectedPaymentMethod = '';
    this.paymentStatus = null;
    this.errorMessage = '';
  }

  /**
   * MODIFICATION DE submitBooking() - maintenant va vers le paiement
   */
  submitBooking(): void {


    if (!this.canSubmitBooking()) {
      this.markFormGroupTouched();
      return;
    }

    this.goToPaymentStep();
  }

  /**
   * Confirmer le paiement et créer la réservation
   */
  async confirmPayment(): Promise<void> {
    if (!this.selectedPaymentMethod || this.paymentForm.invalid) {
      this.markFormGroupTouched();
      this.paymentForm.markAllAsTouched();
      return;
    }

    // Ouvrir la fenêtre ICI (contexte synchrone du clic) pour éviter le blocage popup
    const paymentWindow = window.open('about:blank', '_blank', 'width=680,height=760,scrollbars=yes,resizable=yes');

    try {
      this.isProcessingPayment = true;
      this.errorMessage = '';

      // 1. Créer la réservation
      const reservationData = await this.createPendingReservation();

      if (!reservationData?.id || reservationData.id === 0) {
        paymentWindow?.close();
        throw new Error('Impossible de créer la réservation');
      }

      this.createdReservation = reservationData;

      // 2. Initier le paiement
      const paymentRequest: BeautyPaymentRequest = {
        bookingId: reservationData.id,
        method: 'PAYDUNYA',
        phoneNumber: this.formatPhoneNumber(this.paymentForm.value.phoneNumber),
        email: this.paymentForm.value.email,
        customerName: this.paymentForm.value.customerName,
        preferredOperator: this.selectedPaymentMethod
      };

      const initResponse = await new Promise<any>((resolve, reject) => {
        this.paymentService.initiatePayment(paymentRequest).subscribe({
          next: resolve,
          error: reject
        });
      });

      if (!initResponse || initResponse.status === 'FAILED') {
        paymentWindow?.close();
        throw new Error(initResponse?.message || 'Échec de l\'initialisation du paiement');
      }

      // 3. Naviguer la fenêtre déjà ouverte vers PayDunya
      if (initResponse.paymentUrl) {
        if (paymentWindow && !paymentWindow.closed) {
          paymentWindow.location.href = initResponse.paymentUrl;
        } else {
          window.open(initResponse.paymentUrl, '_blank');
        }
      } else {
        paymentWindow?.close();
      }

      // 4. Stopper le spinner et afficher statut en attente
      this.isProcessingPayment = false;
      this.paymentStatus = { ...initResponse, status: 'PENDING' } as any;

      // 5. Polling en arrière-plan
      if (initResponse.transactionId) {
        this.monitorPaymentStatus(initResponse.transactionId);
      }

    } catch (error: any) {
      console.error(' Erreur lors du paiement:', error);
      this.isProcessingPayment = false;
      paymentWindow?.close();
      this.errorMessage = error.message || 'Erreur lors du paiement';
      this.snackBar.open(this.errorMessage, 'Fermer', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    }
  }

  /**
   * Créer une réservation avec statut en attente de paiement
   */
  private async createPendingReservation(): Promise<any> {
    const formValues = this.bookingForm.value;
    const selectedSlot = this.availableTimeSlots.find(slot => slot.value === formValues.timeSlot);

    let datePrestation: Date;

    if (selectedSlot && selectedSlot.dateTime) {
      datePrestation = new Date(selectedSlot.dateTime);
    } else {
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

    const reservationData = this.isFreelanceBooking ? {
      clientId: this.userId,
      freelanceId: this.providerInfo.id,
      serviceId: this.data.service.id,
      datePrestation: datePrestation.toISOString(),
      status: 'EN_ATTENTE_PAIEMENT',
      type: 'freelance'
    } : {
      clientId: this.userId,
      salonId: this.providerInfo.id,
      serviceId: this.data.service.id,
      datePrestation: datePrestation.toISOString(),
      status: 'EN_ATTENTE_PAIEMENT',
      type: 'salon'
    };

    return this.reservationService.createReservation(reservationData).toPromise();
  }

  /**
   * Surveiller le statut du paiement
   */
  private monitorPaymentStatus(transactionId: string): void {


    this.pollSubscription?.unsubscribe();
    this.pollSubscription = this.paymentService.pollPaymentStatus(transactionId, 3000).subscribe({
      next: (response) => {
        this.paymentStatus = response;
        if (response.status === 'COMPLETED') {
          this.handlePaymentSuccess(response);
        } else if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(response.status)) {
          this.handlePaymentFailure(response);
        }
      },
      error: (error) => {
        console.error(' Erreur surveillance paiement:', error);
        this.isProcessingPayment = false;
        this.errorMessage = 'Erreur lors de la vérification du paiement';
      }
    });
  }

  /**
   * Gérer le succès du paiement
   */
  private handlePaymentSuccess(response: BeautyPaymentResponse): void {
    this.isProcessingPayment = false;


    this.snackBar.open('Paiement effectué avec succès ! Réservation confirmée.', 'Fermer', {
      duration: 5000,
      panelClass: ['success-snackbar']
    });

    // Optionnel : fermer automatiquement après 2 secondes
    setTimeout(() => {
      this.dialogRef.close({
        success: true,
        reservation: this.createdReservation,
        payment: response
      });
    }, 2000);
  }

  /**
   * Gérer l'échec du paiement
   */
  private handlePaymentFailure(response: BeautyPaymentResponse): void {
    this.isProcessingPayment = false;


    this.errorMessage = response.message || 'Le paiement a échoué';

    this.snackBar.open('Paiement échoué. Vous pouvez réessayer ou choisir un autre mode de paiement.', 'Fermer', {
      duration: 7000,
      panelClass: ['error-snackbar']
    });
  }

  /**
   * Obtenir le message de statut du paiement
   */
  getPaymentStatusMessage(): string {
    if (!this.paymentStatus) return '';
    return this.paymentService.getStatusMessage(this.paymentStatus.status);
  }

  /**
   * Vérifier si on peut réessayer le paiement
   */
  canRetryPayment(): boolean {
    return this.paymentStatus ? this.paymentService.canRetry(this.paymentStatus.status) : false;
  }

  /**
   * Réessayer le paiement
   */
  retryPayment(): void {
    this.paymentStatus = null;
    this.errorMessage = '';
    this.confirmPayment();
  }

  /**
   * Vérifier si on peut confirmer le paiement
   */
  canConfirmPayment(): boolean {
    return !this.isProcessingPayment &&
           !!this.selectedPaymentMethod &&
           this.paymentForm.valid;
  }

  // ==========================================
  // MÉTHODES UTILITAIRES MISES À JOUR
  // ==========================================

  private markFormGroupTouched(): void {
    try {
      // Formulaire de réservation
      Object.keys(this.bookingForm.controls).forEach(key => {
        const control = this.bookingForm.get(key);
        if (control) control.markAsTouched();
      });

      // Formulaire de paiement
      if (this.currentStep === 'payment') {
        Object.keys(this.paymentForm.controls).forEach(key => {
          const control = this.paymentForm.get(key);
          if (control) control.markAsTouched();
        });
      }
    } catch (error) {
      console.error(' Erreur marking forms touched:', error);
    }
  }

  // ==========================================
  // GESTION DES ÉVÉNEMENTS (mise à jour)
  // ==========================================

  onDialogClick(event: Event): void {
    event.stopPropagation();
  }

  closeDialog(result?: any): void {
    // Si un paiement est en cours, demander confirmation
    if (this.isProcessingPayment) {
      const confirmClose = confirm('Un paiement est en cours. Êtes-vous sûr de vouloir fermer ?');
      if (!confirmClose) return;

      // Réinitialiser l'état du paiement
      this.paymentService.resetPaymentState();
    }


    this.dialogRef.close(result);
  }

  @HostListener('keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.isProcessingPayment) {
      event.preventDefault();
      event.stopPropagation();
      this.snackBar.open('Impossible de fermer pendant le paiement', 'OK', { duration: 3000 });
      return;
    }

    if (this.bookingForm.dirty || this.paymentForm.dirty) {
      const confirmClose = confirm('Vous avez des modifications non sauvegardées. Voulez-vous vraiment fermer ?');
      if (!confirmClose) {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
    }
    this.closeDialog();
  }

  openDatePicker(): void {
    try {
      if (this.datePicker) {

        this.datePicker.open();
      } else {
        console.warn(' DatePicker non disponible');
      }
    } catch (error) {
      console.error(' Erreur ouverture datepicker:', error);
    }
  }

  // ==========================================
  // MÉTHODES DE DEBUG
  // ==========================================

  ngAfterViewInit(): void {




  }

  ngOnDestroy(): void {
    this.stopAutoRefresh();

    // Arrêter le polling de statut si en cours
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
      this.pollSubscription = null;
    }

    // Réinitialiser l'état paiement si besoin
    if (this.isProcessingPayment) {
      this.isProcessingPayment = false;
      this.paymentService.resetPaymentState();
    }
  }

  logComponentState(): void {

  }

  // ==========================================
  // NOUVELLES MÉTHODES - REDESIGN UI
  // ==========================================

  // Créneaux standards affichés (disponibles + grisés)
  readonly standardSlots = [
    '09:00', '10:00', '11:00', '12:00',
    '14:00', '15:00', '16:00', '17:00',
    '18:00', '19:00'
  ];

  isSlotAvailable(time: string): boolean {
    return this.availableTimeSlots.some(s => s.value === time);
  }

  getSlotLabel(time: string): string {
    const slot = this.availableTimeSlots.find(s => s.value === time);
    return slot ? slot.label : time.replace(':', 'h');
  }

    onCalendarDateSelect(date: Date | null): void {
    this.bookingForm.get('date')?.setValue(date);
  }

  selectTimeSlot(value: string): void {
    if (!this.isSlotAvailable(value)) return;
    this.bookingForm.get('timeSlot')?.setValue(value);
  }

  canConfirmAll(): boolean {
    if (this.isLoading || this.isProcessingPayment || this.isLoadingSlots) return false;
    if (!this.userId) return false;
    const dateValue = this.bookingForm.get('date')?.value;
    const timeSlotValue = this.bookingForm.get('timeSlot')?.value;
    if (!dateValue || !timeSlotValue) return false;
    if (this.availableTimeSlots.length === 0) return false;
    if (!this.selectedPaymentMethod) return false;
    return this.paymentForm.get('customerName')?.valid === true &&
           this.paymentForm.get('phoneNumber')?.valid === true;
  }

  submitAll(): void {
    if (!this.canConfirmAll()) {
      this.markFormGroupTouched();
      this.paymentForm.markAllAsTouched();
      return;
    }
    this.currentStep = 'payment';
    this.confirmPayment();
  }

  getProviderImage(): string {
    if (!this.providerInfo) return 'assets/images/default-salon.jpg';
    return this.providerInfo.photoProfilUrl ||
           this.providerInfo.profileImage ||
           this.providerInfo.image ||
           this.providerInfo.photo ||
           this.providerInfo.imageUrl ||
           this.providerInfo.photoProfil ||
           this.providerInfo.photoUrl ||
           'assets/images/default-salon.jpg';
  }

  onImgError(event: Event): void {
    const img = event.target as HTMLImageElement;
    img.src = 'assets/images/default-salon.jpg';
  }

  getServiceDurationDisplay(): string {
    const service = this.data?.service;
    if (!service) return '30 min';
    const minutes = service.dureeEnMinutes ||
                    service.duree_minutes ||
                    this.parseDurationMinutes(service.duree);
    if (!minutes) return '30 min';
    if (minutes >= 60) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h}h ${m}min` : `${h}h`;
    }
    return `${minutes} min`;
  }

  private parseDurationMinutes(duree: string | undefined): number {
    if (!duree) return 0;
    const d = duree.toLowerCase().trim();
    if (d.includes('h')) {
      const parts = d.split('h');
      const h = parseInt(parts[0]) || 0;
      const m = parts[1] ? parseInt(parts[1].replace(/\D/g, '')) || 0 : 0;
      return h * 60 + m;
    }
    return parseInt(d.replace(/\D/g, '')) || 0;
  }
}
