import { CommonModule, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormsModule } from '@angular/forms';
import { SalonService } from '../../services/salon.service';
import { HttpClient } from '@angular/common/http';
import { finalize } from 'rxjs/operators';
import { GeocodingService } from '../../../core/servces/GeocodingService/geocoding-service.service';

@Component({
  selector: 'app-salon',
  standalone: true,
  imports: [
    TitleCasePipe,
    NgFor,
    CommonModule,
    ReactiveFormsModule,
    NgIf,
    FormsModule
  ],
  providers: [SalonService],
  templateUrl: './salon.component.html',
  styleUrls: ['./salon.component.scss']
})
export class SalonComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() salonCreated = new EventEmitter<any>();

  currentStep = 1;
  joursSemaine = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

  typeSalon = ['BARBERSHOP', 'SALON_DE_COIFFURE', 'SALON_DE_MASSAGE', 'PEDICURE', 'MANICURE'];

  salonForm: FormGroup;
  newServiceInput = '';
  isSubmitting = false;
  isServiceSelected = false;

  constructor(
    private fb: FormBuilder,
    private salonService: SalonService,
    private geocodingService: GeocodingService, // ✅ Injecté ici
    private http: HttpClient
  ) {
    this.salonForm = this.fb.group({
      nom: ['', Validators.required],
      adresse: ['', Validators.required],
      specialites: ['', Validators.required],
      description: [''],
      services: this.fb.array([]),
      customServices: this.fb.array([]),
      telephone: ['', [Validators.required, Validators.pattern(/^\d{9}$/)]],
      email: ['', [Validators.required, Validators.email]],
      latitude: [null],
      longitude: [null],
      photoProfil: [null],
      ...this.generateHorairesControls()
    });
  }

  ngOnInit() {
    this.servicesArray.valueChanges.subscribe(() => this.updateServiceSelection());
    this.customServicesArray.valueChanges.subscribe(() => this.updateServiceSelection());
  }

  updateServiceSelection() {
    this.isServiceSelected =
      this.servicesArray.value.length > 0 || this.customServicesArray.value.length > 0;
  }

  get servicesArray() {
    return this.salonForm.get('services') as FormArray;
  }

  get customServicesArray() {
    return this.salonForm.get('customServices') as FormArray;
  }

  get canSubmit(): boolean {
    return this.salonForm.valid && this.isServiceSelected && !this.isSubmitting;
  }

  generateHorairesControls() {
    const controls: { [key: string]: any } = {};
    this.joursSemaine.forEach(jour => controls[jour] = ['']);
    return controls;
  }

  isServiceActive(service: string): boolean {
    return this.servicesArray.value.includes(service);
  }

  onServiceSelect(service: string) {
    const array = this.servicesArray;
    const index = array.value.findIndex((val: string) => val === service);
    if (index === -1) array.push(this.fb.control(service));
    else array.removeAt(index);
    this.updateServiceSelection();
  }

  addCustomService() {
    if (this.newServiceInput.trim()) {
      const custom = this.newServiceInput.trim().toLowerCase();
      const exists = this.typeSalon.includes(custom) || this.customServicesArray.value.includes(custom);
      if (!exists) {
        this.customServicesArray.push(this.fb.control(custom));
        this.newServiceInput = '';
        this.updateServiceSelection();
      }
    }
  }

  removeCustomService(index: number) {
    this.customServicesArray.removeAt(index);
    this.updateServiceSelection();
  }

  nextStep() {
    if (this.currentStep === 1 &&
      (this.salonForm.get('nom')?.invalid ||
        this.salonForm.get('adresse')?.invalid ||
        this.salonForm.get('specialites')?.invalid)) {
      this.salonForm.get('nom')?.markAsTouched();
      this.salonForm.get('adresse')?.markAsTouched();
      this.salonForm.get('specialites')?.markAsTouched();
      return;
    }
    if (this.currentStep === 2 && !this.isServiceSelected) return;
    if (this.currentStep < 3) this.currentStep++;
  }

  previousStep() {
    if (this.currentStep > 1) this.currentStep--;
  }

  onSubmit() {
    if (!this.canSubmit) {
      Object.keys(this.salonForm.controls).forEach(key => this.salonForm.get(key)?.markAsTouched());
      return;
    }

    this.isSubmitting = true;

    const adresse = this.salonForm.get('adresse')?.value;

    this.geocodingService.getCoordinates(adresse).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: coords => {
        if (coords) {
          this.salonForm.patchValue({ latitude: coords.lat, longitude: coords.lon });
        }

        this.submitSalonForm(); // 🔁 Appel logique réelle ici
      },
      error: err => {
        console.warn("Erreur géolocalisation :", err);
        this.submitSalonForm(); // 🛑 même si géoloc échoue, on envoie quand même
      }
    });
  }

  private submitSalonForm() {
    const salonData = {
      nom: this.salonForm.get('nom')?.value,
      adresse: this.salonForm.get('adresse')?.value,
      specialites: this.salonForm.get('specialites')?.value,
      description: this.salonForm.get('description')?.value,
      telephone: this.salonForm.get('telephone')?.value,
      email: this.salonForm.get('email')?.value,
      latitude: this.salonForm.get('latitude')?.value,
      longitude: this.salonForm.get('longitude')?.value,
      typeSalon: this.servicesArray.value[0] || this.customServicesArray.value[0] || null,
      heuresOuverture: JSON.stringify(this.joursSemaine.reduce((acc, jour) => {
        const val = this.salonForm.get(jour)?.value;
        if (val) acc[jour] = val;
        return acc;
      }, {} as { [key: string]: string })),
      status: 'PUBLISHED'
    };

    const formData = new FormData();
    const file = this.salonForm.get('photoProfil')?.value;
    if (file) formData.append('file', file);
    formData.append('salon', new Blob([JSON.stringify(salonData)], { type: 'application/json' }));

    this.salonService.createSalonWithFile(formData).subscribe({
      next: (response) => {
        console.log('Salon créé :', response);
        this.creerHorairesDefaut(response.id);
        this.salonCreated.emit(response);
        this.closeModal();
      },
      error: (error) => {
        console.error('Erreur création salon :', error);
      }
    });
  }

  private creerHorairesDefaut(salonId: number) {
    this.http.post(`http://localhost:8081/api/disponibilites/salon/${salonId}/horaires/defaut`, {})
      .subscribe({
        next: (res) => console.log('✅ Horaires créés:', res),
        error: (err) => console.error('❌ Erreur horaires:', err)
      });
  }

  closeModal() {
    this.closeModalEvent.emit();
  }

  onSaveDraft(): void {
    this.isSubmitting = true;

    const allServices = [...this.servicesArray.value, ...this.customServicesArray.value];
    const draft = { ...this.salonForm.value, services: allServices, status: 'DRAFT' };

    const horaires: { [key: string]: string } = {};
    this.joursSemaine.forEach(jour => {
      if (draft[jour]) {
        horaires[jour] = draft[jour];
        delete draft[jour];
      }
    });
    draft.horaires = horaires;
    delete draft.customServices;

    this.salonService.createSalon(draft).pipe(
      finalize(() => this.isSubmitting = false)
    ).subscribe({
      next: (response) => {
        console.log('Brouillon enregistré :', response);
        this.salonCreated.emit(response);
        this.closeModal();
      },
      error: (error) => {
        console.error('Erreur brouillon:', error);
      }
    });
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.salonForm.patchValue({ photoProfil: file });
    }
  }
}
