import { Component, Inject, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { ServiceCreationIntelligenteService, CreateServiceFreelanceRequest, ServiceCreationResponse } from '../../../shared/services/ServiceCreationIntelligente/service-creation-intelligente.service';
import { ServicePredefiniDto, ServicePredefiniGroupe, ServicePredefiniService } from '../../../shared/services/ServicePredefini/service-predefini.service';
import { ServiceFreelance } from '../../../models/service-models';
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDivider } from "@angular/material/divider";
import { MatCardModule } from "@angular/material/card";
import { ServiceFreelanceRequestDto } from '../../ServiceFreelance/service-freelance.service';

@Component({
  selector: 'app-add-service-freelance-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatDivider,
    MatCardModule
],
  templateUrl: './add-service-freelance-dialog.component.html',
  styleUrls: ['./add-service-freelance-dialog.component.scss']
})
export class AddServiceFreelanceDialogComponent implements OnInit, OnDestroy {
  [x: string]: any;
  
  // ✅ Input pour recevoir les données du composant parent
  @Input() modalData: any = null;
  
  // ✅ EventEmitters pour communiquer avec le parent
  @Output() serviceCreated = new EventEmitter<ServiceFreelanceRequestDto>();
  @Output() serviceUpdated = new EventEmitter<{ 
    serviceId: number; 
    serviceData: ServiceFreelanceRequestDto; 
  }>();
  @Output() closeModalEvent = new EventEmitter<void>();
  
  serviceForm: FormGroup;
  isEditMode: boolean = false;
  freelanceId: number | undefined;
  
  // ✅ SERVICES PRÉDÉFINIS
  servicesPredefinis: ServicePredefiniDto[] = [];
  servicesPredefinisFiltres: ServicePredefiniDto[] = [];
  servicesGroupes: ServicePredefiniGroupe[] = [];
  serviceSelectionne: ServicePredefiniDto | null = null;
  
  // ✅ ÉTATS UI
  afficherTousServices = false;
  modeRecherche = false;
  chargementServices = true;
  erreurChargement = false;
  
  // ✅ CONFIRMATION ET DÉTECTION INTELLIGENTE
  enAttenteConfirmation = false;
  suggestionService: ServicePredefiniDto | null = null;
  nomOriginal = '';
  actionsConfirmation: any = null;
  
  // ✅ NOUVELLE PROPRIÉTÉ : Stocker la requête originale pour la confirmation
  private requeteOriginale: CreateServiceFreelanceRequest | null = null;
  
  // ✅ DÉTECTION DE DOUBLONS INTELLIGENTE
  servicesSimilaires: ServicePredefiniDto[] = [];
  serviceExistantDetecte: ServicePredefiniDto | null = null;
  
  // ✅ SOUMISSION
  enCoursCreation = false;
  
  // Options d'intervention
  typesIntervention = [
    { value: 'DOMICILE', label: 'À domicile uniquement' },
    { value: 'SALON', label: 'En salon uniquement' },
    { value: 'MIXTE', label: 'Domicile et salon' }
  ];
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddServiceFreelanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      service?: ServiceFreelance, 
      freelanceId: number 
    },
    private servicePredefiniService: ServicePredefiniService,
    private creationService: ServiceCreationIntelligenteService
  ) {
    this.serviceForm = this.createForm();
    
    // ✅ Gestion des données via @Input ou MAT_DIALOG_DATA
    if (data) {
      // Utilisé avec MatDialog.open()
      this.isEditMode = !!data?.service;
      this.freelanceId = data.freelanceId;
    }
  }

  ngOnInit(): void {
    // ✅ Gestion des données via @Input modalData
    if (this.modalData && !this.data) {
      this.isEditMode = !!this.modalData?.service;
      this.freelanceId = this.modalData.freelanceId;
      
      if (this.isEditMode && this.modalData.service) {
        this.populateForm(this.modalData.service);
      }
    }
    
    this.chargerServicesPredefinis();
    this.configurerRechercheTempsReel();
    
    // Gestion classique avec MAT_DIALOG_DATA
    if (this.isEditMode && this.data?.service) {
      this.populateForm(this.data.service);
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private createForm(): FormGroup {
    return this.fb.group({
      // ✅ SERVICE
      servicePredefini: [''],
      nomPersonnalise: [''],
      estFormulaireDemande: [false],
      rechercheQuery: [''],
      
      // ✅ DÉTAILS SERVICE (spécifiques freelance)
      description: [''],
      prixMin: ['', [Validators.required, Validators.min(1)]],
      prixMax: ['', [Validators.required, Validators.min(1)]],
      dureeEnMinutes: [60, [Validators.min(15), Validators.max(480)]],
      
      // ✅ SPÉCIFICITÉS FREELANCE
      typeIntervention: ['DOMICILE'],
      materielInclus: [true],
      deplacementInclus: [false],
      supplementDeplacementKm: [{ value: '', disabled: true }],
      horairesFlexibles: [true],
      disponibleWeekend: [false],
      disponibleSoir: [false]
    }, { 
      validators: [this.serviceValidator.bind(this), this.prixValidator.bind(this)]
    });
  }

  private populateForm(service: ServiceFreelance): void {
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      nomPersonnalise: service.nom,
      description: service.description,
      prixMin: service.prixMin,
      prixMax: service.prixMax,
      dureeEnMinutes: service.dureeEnMinutes || 60,
      typeIntervention: service.typeIntervention || 'DOMICILE',
      materielInclus: service.materielInclus ?? true,
      deplacementInclus: service.deplacementInclus ?? false,
      supplementDeplacementKm: service.supplementDeplacementKm,
      horairesFlexibles: service.horairesFlexibles ?? true,
      disponibleWeekend: service.disponibleWeekend ?? false,
      disponibleSoir: service.disponibleSoir ?? false
    });
    
    this.gererDeplacementInclus();
  }

  /**
   * 📋 Charger les services prédéfinis (universels)
   */
  private chargerServicesPredefinis(): void {
    console.log('📋 Chargement services prédéfinis...');
    this.chargementServices = true;
    
    this.servicePredefiniService.getTousLesServices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (services) => {
          console.log('✅ Services récupérés:', services.length);
          this.servicesPredefinis = services;
          this.servicesPredefinisFiltres = services;
          this.servicesGroupes = this.servicePredefiniService.grouperParCategorie(services);
          this.chargementServices = false;
          this.erreurChargement = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement services:', error);
          this.chargementServices = false;
          this.erreurChargement = true;
          this.basculerVersSaisieLibre();
        }
      });
  }

  /**
   * 🔍 Configurer recherche temps réel
   */
  private configurerRechercheTempsReel(): void {
    this.serviceForm.get('rechercheQuery')?.valueChanges
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(query => {
        this.onRechercheServices(query || '');
      });

    // ✅ DÉTECTION INTELLIGENTE : Surveiller la saisie du nom personnalisé
    this.serviceForm.get('nomPersonnalise')?.valueChanges
      .pipe(
        debounceTime(500),
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(nom => {
        if (nom && nom.trim().length >= 3) {
          // this.detecterServicesSimilaires(nom);
        } else {
          this.servicesSimilaires = [];
          this.serviceExistantDetecte = null;
        }
      });
  }

  /**
   * 🔍 Rechercher dans les services
   */
  onRechercheServices(query: string): void {
    const queryTrimmed = query.trim();
    
    if (queryTrimmed.length === 0) {
      this.servicesPredefinisFiltres = this.servicesPredefinis;
      this.modeRecherche = false;
      return;
    }
    
    if (queryTrimmed.length < 2) {
      return;
    }
    
    this.modeRecherche = true;
    
    // Recherche locale
    const resultatsLocaux = this.servicesPredefinis.filter(service =>
      service.nom.toLowerCase().includes(queryTrimmed.toLowerCase()) ||
      service.categorie.toLowerCase().includes(queryTrimmed.toLowerCase())
    );
    
    this.servicesPredefinisFiltres = resultatsLocaux;
    
    // Recherche serveur
    this.servicePredefiniService.rechercherServices(queryTrimmed, 10)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultatsServeur) => {
          const idsLocaux = new Set(resultatsLocaux.map(s => s.id));
          const nouveaux = resultatsServeur.filter(s => !idsLocaux.has(s.id));
          this.servicesPredefinisFiltres = [...resultatsLocaux, ...nouveaux];
        },
        error: (error) => {
          console.error('❌ Erreur recherche serveur:', error);
        }
      });
  }

  /**
   * 🎯 Sélection d'un service prédéfini
   */
  onServicePredefiniSelected(event: any): void {
    const serviceId = parseInt(event.target.value);
    if (!serviceId) {
      this.serviceSelectionne = null;
      return;
    }
    
    const service = this.servicesPredefinis.find(s => s.id === serviceId) ||
                   this.servicesPredefinisFiltres.find(s => s.id === serviceId);
    
    if (service) {
      console.log('🎯 Service freelance sélectionné:', service);
      this.serviceSelectionne = service;
      this.serviceForm.patchValue({
        estFormulaireDemande: false,
        nomPersonnalise: ''
      });
    }
  }

  /**
   * 🚚 Gérer l'inclusion du déplacement
   */
  onDeplacementInclusChange(): void {
    this.gererDeplacementInclus();
  }

  private gererDeplacementInclus(): void {
    const deplacementInclus = this.serviceForm.get('deplacementInclus')?.value;
    const supplementControl = this.serviceForm.get('supplementDeplacementKm');
    
    if (deplacementInclus) {
      supplementControl?.disable();
      supplementControl?.setValue('');
    } else {
      supplementControl?.enable();
    }
  }

  /**
   * ➕ Demander un nouveau service
   */
  demanderNouveauService(): void {
    console.log('➕ Demande nouveau service freelance');
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      servicePredefini: ''
    });
    this.serviceSelectionne = null;
    this.enAttenteConfirmation = false;
  }

  /**
   * ❌ Annuler demande nouveau service
   */
  annulerDemandeNouveauService(): void {
    this.serviceForm.patchValue({
      estFormulaireDemande: false,
      nomPersonnalise: '',
      rechercheQuery: ''
    });
    this.enAttenteConfirmation = false;
  }

  /**
   * 🔄 Basculer vers saisie libre
   */
  basculerVersSaisieLibre(): void {
    console.log('🔄 Bascule vers saisie libre freelance');
    this.serviceForm.patchValue({
      estFormulaireDemande: true
    });
  }

  /**
   * 👀 Basculer affichage services
   */
  basculerAffichageServices(): void {
    this.afficherTousServices = !this.afficherTousServices;
  }

  /**
   * ✅ CORRIGÉ : Utiliser la suggestion
   */
  utiliserSuggestion(): void {
    if (this.suggestionService && this.requeteOriginale) {
      console.log('✅ Utilisation de la suggestion:', this.suggestionService);

      const confirmationData = {
        action: 'useStandard'as const,
        servicePredefiniId: this.suggestionService.id,
        ...this.requeteOriginale
      };

      this.enCoursCreation = true;
      
      this.creationService.confirmerCreationServiceFreelance(this.freelanceId!, confirmationData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ServiceCreationResponse) => {
            this.enCoursCreation = false;
            this.enAttenteConfirmation = false;
            this.gererReponseCreationIntelligente(response, this.requeteOriginale!);
          },
          error: (error) => {
            console.error('❌ Erreur confirmation suggestion:', error);
            this.enCoursCreation = false;
          }
        });
    }
  }

 
  
  private serviceValidator(group: FormGroup): {[key: string]: any} | null {
    if (!group) return null;
    
    const servicePredefini = group.get('servicePredefini')?.value;
    const estFormulaireDemande = group.get('estFormulaireDemande')?.value;
    const nomPersonnalise = group.get('nomPersonnalise')?.value;
    
    if (estFormulaireDemande) {
      if (!nomPersonnalise || nomPersonnalise.trim().length < 3) {
        return { 
          'servicePersonnalise': { 
            message: 'Le nom du service doit faire au moins 3 caractères' 
          } 
        };
      }
    } else {
      if (!servicePredefini) {
        return { 
          'serviceRequired': { 
            message: 'Veuillez sélectionner un service ou en créer un nouveau' 
          } 
        };
      }
    }
    
    return null;
  }

  private prixValidator(group: FormGroup): {[key: string]: any} | null {
    if (!group) return null;
    
    const prixMin = group.get('prixMin')?.value;
    const prixMax = group.get('prixMax')?.value;
    
    if (prixMin && prixMax && Number(prixMax) < Number(prixMin)) {
      return { 
        'prixIncoherent': { 
          message: 'Le prix maximum doit être supérieur au prix minimum' 
        } 
      };
    }
    
    return null;
  }

  // ✅ GETTERS POUR TEMPLATE
  get estFormulaireDemande(): boolean {
    return this.serviceForm.get('estFormulaireDemande')?.value || false;
  }

  get aServicesPredefinis(): boolean {
    return this.servicesPredefinis.length > 0;
  }

  get aResultatsRecherche(): boolean {
    return this.servicesPredefinisFiltres.length > 0;
  }

  // ✅ UTILITAIRES
  getFormattedDuration(): string {
    const minutes = this.serviceForm.get('dureeEnMinutes')?.value;
    if (!minutes) return '';
    
    if (minutes < 60) return `${minutes} min`;
    
    const heures = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    return mins === 0 ? `${heures}h` : `${heures}h${mins.toString().padStart(2, '0')}`;
  }

  getPrixFormate(): string {
    const prixMin = this.serviceForm.get('prixMin')?.value;
    const prixMax = this.serviceForm.get('prixMax')?.value;
    
    if (!prixMin && !prixMax) return '';
    
    if (prixMin && prixMax) {
      if (prixMin === prixMax) {
        return `${Number(prixMin).toLocaleString()} CFA`;
      }
      return `${Number(prixMin).toLocaleString()} - ${Number(prixMax).toLocaleString()} CFA`;
    }
    
    return prixMin ? `À partir de ${Number(prixMin).toLocaleString()} CFA` : '';
  }

  getFieldErrorMessage(fieldName: string): string {
    const field = this.serviceForm.get(fieldName);
    
    if (!field?.touched && !field?.dirty) return '';
    
    if (field?.hasError('required')) return 'Ce champ est obligatoire';
    if (field?.hasError('min')) {
      const min = field.errors?.['min']?.min;
      return `La valeur doit être supérieure ou égale à ${min}`;
    }
    
    return '';
  }

  getFormErrorMessage(): string {
    if (this.serviceForm.hasError('serviceRequired')) {
      return this.serviceForm.errors?.['serviceRequired']?.message;
    }
    
    if (this.serviceForm.hasError('servicePersonnalise')) {
      return this.serviceForm.errors?.['servicePersonnalise']?.message;
    }
    
    if (this.serviceForm.hasError('prixIncoherent')) {
      return this.serviceForm.errors?.['prixIncoherent']?.message;
    }
    
    return '';
  }

  isFormValid(): boolean {
    return this.serviceForm.valid && !this.enAttenteConfirmation;
  }

  // ✅ SOUMISSION
  onSubmit(): void {
    if (this.enCoursCreation) return;
    
    this.markAllFieldsAsTouched();
    
    if (!this.isFormValid()) {
      console.log('❌ Formulaire freelance invalide');
      return;
    }
    
    this.soumettre();
  }

  /**
   * ✅ MÉTHODE PRINCIPALE CORRIGÉE : Soumission avec détection intelligente
   */
  private soumettre(): void {
    this.enCoursCreation = true;
    const formValue = this.serviceForm.value;
    
    // ✅ Préparation des données pour l'endpoint intelligent
    const requestData: CreateServiceFreelanceRequest = {
      description: formValue.description?.trim() || '',
      prixMin: Number(formValue.prixMin),
      prixMax: Number(formValue.prixMax),
      dureeEnMinutes: Number(formValue.dureeEnMinutes) || 60,
      typeIntervention: formValue.typeIntervention,
      materielInclus: formValue.materielInclus,
      deplacementInclus: formValue.deplacementInclus,
      supplementDeplacementKm: formValue.deplacementInclus ? 
        undefined : Number(formValue.supplementDeplacementKm) || undefined,
      horairesFlexibles: formValue.horairesFlexibles,
      disponibleWeekend: formValue.disponibleWeekend,
      disponibleSoir: formValue.disponibleSoir
    };

    if (formValue.estFormulaireDemande && formValue.nomPersonnalise) {
      // 🔍 NOUVEAU SERVICE LIBRE - Utiliser l'endpoint intelligent pour détecter les doublons
      requestData.nomService = formValue.nomPersonnalise.trim();
      console.log('🧠 Création service intelligent (nouveau):', requestData);

      this.creationService.creerServiceFreelanceIntelligent(this.freelanceId!, requestData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ServiceCreationResponse) => {
            this.enCoursCreation = false;
            this.gererReponseCreationIntelligente(response, requestData);
          },
          error: (error) => {
            console.error('❌ Erreur création service intelligent:', error);
            this.enCoursCreation = false;
          }
        });

    } else if (this.serviceSelectionne) {
      // ✅ SERVICE PRÉDÉFINI CHOISI
      requestData.servicePredefiniId = this.serviceSelectionne.id;
      console.log('🧠 Création service intelligent (prédéfini):', requestData);

      this.creationService.creerServiceFreelanceIntelligent(this.freelanceId!, requestData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ServiceCreationResponse) => {
            this.enCoursCreation = false;
            this.gererReponseCreationIntelligente(response, requestData);
          },
          error: (error) => {
            console.error('❌ Erreur création service intelligent:', error);
            this.enCoursCreation = false;
          }
        });

    } else {
      this.enCoursCreation = false;
      return;
    }
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Gérer la réponse de création intelligente
   */
  private gererReponseCreationIntelligente(response: ServiceCreationResponse, requeteOriginale: CreateServiceFreelanceRequest): void {
    console.log('📥 Réponse création intelligente:', response);

    if (response.needsConfirmation && response.suggestion) {
      // 🔍 SUGGESTION TROUVÉE - Afficher la confirmation au lieu de créer directement
      console.log('💡 Suggestion trouvée:', response.suggestion);
      
      this.enAttenteConfirmation = true;
      this.suggestionService = response.suggestion;
      this.nomOriginal = response.originalName || requeteOriginale.nomService || '';
      this.actionsConfirmation = response.actions;

      // ✅ Stocker la requête originale pour la confirmation
      this.requeteOriginale = requeteOriginale;

    } else if (response.service) {
      // ✅ SERVICE CRÉÉ DIRECTEMENT - Convertir et émettre vers le parent
      console.log('✅ Service créé directement:', response.service);
      
      const serviceData: ServiceFreelanceRequestDto = {
        nom: response.service.nom,
        description: response.service.description || '',
        categorie: response.service.categorie,
        prixMin: response.service.prixMin,
        prixMax: response.service.prixMax,
        dureeEnMinutes: response.service.dureeEnMinutes,
        typeIntervention: response.service.typeIntervention,
        materielInclus: response.service.materielInclus,
        deplacementInclus: response.service.deplacementInclus,
        supplementDeplacementKm: response.service.supplementDeplacementKm,
        horairesFlexibles: response.service.horairesFlexibles,
        disponibleWeekend: response.service.disponibleWeekend,
        disponibleSoir: response.service.disponibleSoir
      };

      // Émettre vers le composant parent
      if (this.isEditMode && this.modalData?.service) {
        this.serviceUpdated.emit({
          serviceId: this.modalData.service.id,
          serviceData: serviceData
        });
      } else {
        this.serviceCreated.emit(serviceData);
      }
    }
  }

  /**
   * ✅ Méthode pour fermer le modal
   */
  onCancel(): void {
    if (this.dialogRef) {
      // Utilisé avec MatDialog
      this.dialogRef.close();
    } else {
      // Utilisé comme composant normal
      this.closeModalEvent.emit();
    }
  }

  private markAllFieldsAsTouched(): void {
    Object.keys(this.serviceForm.controls).forEach(key => {
      const control = this.serviceForm.get(key);
      control?.markAsTouched();
      control?.updateValueAndValidity();
    });
    this.serviceForm.updateValueAndValidity();
  }
}