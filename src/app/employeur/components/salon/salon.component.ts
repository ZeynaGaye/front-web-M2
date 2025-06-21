import { CommonModule, NgFor, NgIf, TitleCasePipe } from '@angular/common';
import { Component, EventEmitter, Output, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormsModule } from '@angular/forms';
import { SalonService } from '../../services/salon.service';
import { HttpClient } from '@angular/common/http';

 // Assurez-vous que le chemin est correct

@Component({
  selector: 'app-salon',
  standalone: true, // Je remarque que vous utilisez Angular en mode standalone
  imports: [
    TitleCasePipe, 
    NgFor,
    CommonModule,
    ReactiveFormsModule,
    NgIf,
    FormsModule
  ],
  providers: [SalonService], // Add SalonService to the providers array
  templateUrl: './salon.component.html',
  styleUrls: ['./salon.component.scss']
})
export class SalonComponent implements OnInit {
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() salonCreated = new EventEmitter<any>();
  
  currentStep = 1;
  joursSemaine = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
  
  typeSalon = [
    'BARBERSHOP',
    'SALON_DE_COIFFURE',
    'SALON_DE_MASSAGE',
    'PEDICURE',
    'MANICURE'
  ];

  salonForm: FormGroup;
  newServiceInput = '';
  isSubmitting = false;
  isServiceSelected = false; // Nouvelle propriété pour suivre si au moins un service est sélectionné

  constructor(
    private fb: FormBuilder,
    private salonService: SalonService, // Injecter le service
    private http: HttpClient
  ) {
    this.salonForm = this.fb.group({
      nom: ['', Validators.required],
      adresse: ['', Validators.required],
      specialites: ['', Validators.required],
      description: [''],
      services: this.fb.array([]),
      customServices: this.fb.array([]),
      telephone: ['', [Validators.required, Validators.pattern(/^\d{09}$/)]],
      email: ['', [Validators.required, Validators.email]],
      facebook: [''],
      instagram: [''],
      twitter: [''],
      photoProfil: [null],
      ...this.generateHorairesControls()
    });
  }

  ngOnInit() {
    // Surveiller les changements dans les services pour mettre à jour isServiceSelected
    this.servicesArray.valueChanges.subscribe(values => {
      this.updateServiceSelection();
    });
    
    this.customServicesArray.valueChanges.subscribe(values => {
      this.updateServiceSelection();
    });
  }

  updateServiceSelection() {
    this.isServiceSelected = 
      this.servicesArray.value.length > 0 || 
      this.customServicesArray.value.length > 0;
    console.log('Service selection updated:', this.isServiceSelected);
  }

  // Getter for services FormArray
  get servicesArray() {
    return this.salonForm.get('services') as FormArray;
  }

  // Getter for custom services FormArray
  get customServicesArray() {
    return this.salonForm.get('customServices') as FormArray;
  }

  // Check if form is valid for submission
  get canSubmit(): boolean {
    return this.salonForm.valid && this.isServiceSelected && !this.isSubmitting;
  }

  generateHorairesControls() {
    const controls: { [key: string]: any } = {};
    this.joursSemaine.forEach(jour => {
      controls[jour] = [''];
    });
    return controls;
  }

  isServiceActive(service: string): boolean {
    return this.servicesArray.value.includes(service);
  }

  // Method to handle service selection
  onServiceSelect(service: string) {
    const servicesArray = this.servicesArray;
    const index = servicesArray.value.findIndex((val: string) => val === service);
    
    if (index === -1) {
      // Si le service n'est pas déjà sélectionné, l'ajouter
      servicesArray.push(this.fb.control(service));
    } else {
      // Si le service est déjà sélectionné, le supprimer
      servicesArray.removeAt(index);
    }
    
    this.updateServiceSelection();
  }

  // Method to add a custom service
  addCustomService() {
    if (this.newServiceInput.trim()) {
      const customService = this.newServiceInput.trim().toLowerCase();
      
      // Check if service already exists in predefined or custom services
      const isDuplicate = 
        this.typeSalon.includes(customService) || 
        this.customServicesArray.value.some((val: string) => val === customService);
      
      if (!isDuplicate) {
        // Add to custom services array
        this.customServicesArray.push(this.fb.control(customService));
        
        // Clear input
        this.newServiceInput = '';
        this.updateServiceSelection();
      }
    }
  }

  // Method to remove a custom service
  removeCustomService(index: number) {
    this.customServicesArray.removeAt(index);
    this.updateServiceSelection();
  }

  nextStep() {
    if (this.currentStep === 1) {
      if (this.salonForm.get('nom')?.invalid || this.salonForm.get('adresse')?.invalid) {
        // Marquer les champs comme touchés pour afficher les erreurs
        this.salonForm.get('nom')?.markAsTouched();
        this.salonForm.get('adresse')?.markAsTouched();
        this.salonForm.get('specialites')?.markAsTouched();
        return;
      }
    } else if (this.currentStep === 2) {
      // Vérifier si au moins un service est sélectionné
      if (!this.isServiceSelected) {
        return;
      }
    }
    
    if (this.currentStep < 3) {
      this.currentStep++;
    }
  }

  previousStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  onSubmit() {
    if (this.canSubmit) {
      this.isSubmitting = true;
      
      // Créer un FormData pour gérer le téléchargement du fichier
      const formData = new FormData();
      
      // Créer un objet de base avec les données du formulaire
      const salonData = {
        nom: this.salonForm.get('nom')?.value,
        adresse: this.salonForm.get('adresse')?.value,
        specialites: this.salonForm.get('specialites')?.value,
        description: this.salonForm.get('description')?.value,
        telephone: this.salonForm.get('telephone')?.value,
        email: this.salonForm.get('email')?.value,
        // facebook: this.salonForm.get('facebook')?.value,
        // instagram: this.salonForm.get('instagram')?.value,
        // twitter: this.salonForm.get('twitter')?.value,
        
        // Convertir typeSalon au format attendu par l'énumération
        typeSalon: this.servicesArray.value.length > 0 ? 
          this.servicesArray.value[0] : 
          (this.customServicesArray.value.length > 0 ? this.customServicesArray.value[0] : null),
        
        // Formater les heures d'ouverture en chaîne JSON
        heuresOuverture: JSON.stringify(
          this.joursSemaine.reduce((acc: {[key: string]: string}, jour) => {
            if (this.salonForm.get(jour)?.value) {
              acc[jour] = this.salonForm.get(jour)?.value;
            }
            return acc;
          }, {} as {[key: string]: string})
        ),
        
        status: 'PUBLISHED'
      };
      
      // Si un fichier a été sélectionné, l'ajouter au FormData
      const fileInput = this.salonForm.get('photoProfil')?.value;
      if (fileInput) {
        formData.append('file', fileInput);
      }
      
      // Ajouter les données du salon au FormData
      formData.append('salon', new Blob([JSON.stringify(salonData)], { type: 'application/json' }));
      
      // Appeler le service pour créer le salon
      this.salonService.createSalonWithFile(formData).subscribe({
        next: (response: any) => {
          console.log('Salon créé :', response);
          this.creerHorairesDefaut(response.id);
          this.salonCreated.emit(response);
          this.closeModal();
          this.isSubmitting = false;
        },
        error: (error: any) => {
          console.error('Erreur lors de la création du salon', error);
          this.isSubmitting = false;
        }
      });
    } else {
      // Marquer tous les champs comme touchés
      Object.keys(this.salonForm.controls).forEach(key => {
        const control = this.salonForm.get(key);
        control?.markAsTouched();
      });
    }
  }
  private creerHorairesDefaut(salonId: number) {
    this.http.post(`http://localhost:8081/api/disponibilites/salon/${salonId}/horaires/defaut`, {})
      .subscribe({
        next: (response) => console.log('✅ Horaires créés:', response),
        error: (error) => console.error('❌ Erreur horaires:', error)
      });
  }
  closeModal() {
    this.closeModalEvent.emit();
  }

  onSaveDraft(): void {
    this.isSubmitting = true;
    
    // Similar logic to onSubmit
    const allServices = [
      ...this.servicesArray.value,
      ...this.customServicesArray.value
    ];
    
    const draftValue = {
      ...this.salonForm.value,
      services: allServices,
      status: 'DRAFT'
    };
    
    // Format horaires into an object
    const horaires: { [key: string]: string } = {};
    this.joursSemaine.forEach(jour => {
      if (draftValue[jour]) {
        horaires[jour] = draftValue[jour];
        delete draftValue[jour];
      }
    });
    
    draftValue.horaires = horaires;
    
    // Delete separated services arrays
    delete draftValue.customServices;
    
    // Call service to save draft - using createSalon with status DRAFT
    this.salonService.createSalon(draftValue).subscribe({
      next: (response: any) => {
        console.log('Brouillon enregistré :', response);
        this.salonCreated.emit(response);
        this.closeModal();
        this.isSubmitting = false;
      },
      error: (error: any) => {
        console.error('Erreur lors de l\'enregistrement du brouillon', error);
        // Handle error (show message to user)
        this.isSubmitting = false;
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