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
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { MatDivider } from "@angular/material/divider";
import { MatCardModule } from "@angular/material/card";

import { ServiceSalon } from '../../../models/service-salon';
import { ServiceCreationIntelligenteService, CreateServiceSalonRequest, ServiceCreationResponse } from '../../../shared/services/ServiceCreationIntelligente/service-creation-intelligente.service';
import { ServicePredefiniDto, ServicePredefiniGroupe, ServicePredefiniService } from '../../../shared/services/ServicePredefini/service-predefini.service';

export interface ServiceSalonRequestDto {
  nom: string;
  description?: string;
  categorie: string;
  prix: number;
  dureeEnMinutes?: number;
}

@Component({
  selector: 'app-add-service-salon-dialog',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule,
    MatFormFieldModule, MatInputModule, MatSelectModule, MatCheckboxModule,
    MatButtonModule, MatIconModule,
    MatProgressSpinnerModule,
    MatCardModule
],
  templateUrl: './add-service-dialog.component.html',
  styleUrls: ['./add-service-dialog.component.scss', './suggestions-styles.scss']
})
export class AddServiceDialogComponent implements OnInit, OnDestroy {
  [x: string]: any;
  
  // ✅ Input pour recevoir les données du composant parent
  @Input() modalData: any = null;
  
  // ✅ EventEmitters pour communiquer avec le parent
  @Output() serviceCreated = new EventEmitter<ServiceSalonRequestDto>();
  @Output() serviceUpdated = new EventEmitter<{ 
    serviceId: number; 
    serviceData: ServiceSalonRequestDto; 
  }>();
  @Output() closeModalEvent = new EventEmitter<void>();
  
  serviceForm: FormGroup;
  isEditMode: boolean = false;
  salonId: number | undefined;
  
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
  
  // ✅ SUGGESTION EN TEMPS RÉEL
  suggestionsTempsReel: ServicePredefiniDto[] = [];
  afficherSuggestionsTempsReel = false;
  rechercheEnCours = false;
  
  // ✅ INFORMATION SERVICE EXISTANT
  serviceExisteDeja = false;
  messageServiceExistant = '';
  serviceExistantTrouve: ServicePredefiniDto | null = null;
  
  // ✅ Stocker la requête originale pour la confirmation
  private requeteOriginale: CreateServiceSalonRequest | null = null;
  
  // ✅ SOUMISSION
  enCoursCreation = false;
  
  private destroy$ = new Subject<void>();
  
  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { 
      service?: ServiceSalon, 
      salonId: number 
    },
    private servicePredefiniService: ServicePredefiniService,
    private creationService: ServiceCreationIntelligenteService
  ) {
    this.serviceForm = this.createForm();
    
    // ✅ Gestion des données via @Input ou MAT_DIALOG_DATA
    console.log('🔍 Constructor data reçue:', data);
    if (data) {
      this.isEditMode = !!data?.service;
      this.salonId = data.salonId;
      console.log('🔍 SalonId assigné dans constructor:', this.salonId);
    }
  }

  ngOnInit(): void {
    // ✅ Gestion des données via @Input modalData
    if (this.modalData && !this.data) {
      this.isEditMode = !!this.modalData?.service;
      this.salonId = this.modalData.salonId;
      
      if (this.isEditMode && this.modalData.service) {
        this.populateForm(this.modalData.service);
      }
    }
    
    this.chargerServicesPredefinis();
    this.configurerRechercheTempsReel();
    this.configurerSuggestionTempsReel(); // ✅ NOUVEAU
    
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
      
      // ✅ DÉTAILS SERVICE SALON
      description: [''],
      categorie: ['Autre'], // ✅ AJOUTÉ : Catégorie par défaut pour services personnalisés
      prix: ['', [Validators.required, Validators.min(1)]],
      dureeEnMinutes: [60, [Validators.min(15), Validators.max(480)]]
    }, { 
      validators: [this.serviceValidator.bind(this)]
    });
  }

  private populateForm(service: ServiceSalon): void {
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      nomPersonnalise: service.nom,
      description: service.description,
      prix: service.prix,
      dureeEnMinutes: service.dureeEnMinutes || 60
    });
  }

  /**
   * 📋 Charger les services prédéfinis
   */
  private chargerServicesPredefinis(): void {
    console.log('📋 Chargement services prédéfinis salon...');
    this.chargementServices = true;
    
    this.servicePredefiniService.getTousLesServices()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (services) => {
          console.log('✅ Services salon récupérés:', services.length);
          this.servicesPredefinis = services;
          this.servicesPredefinisFiltres = services;
          this.servicesGroupes = this.servicePredefiniService.grouperParCategorie(services);
          this.chargementServices = false;
          this.erreurChargement = false;
        },
        error: (error) => {
          console.error('❌ Erreur chargement services salon:', error);
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
  }

  /**
   * 💡 NOUVEAU : Configurer suggestion en temps réel pour service personnalisé
   */
  private configurerSuggestionTempsReel(): void {
    this.serviceForm.get('nomPersonnalise')?.valueChanges
      .pipe(
        debounceTime(400), // Un peu plus long pour éviter trop d'appels
        distinctUntilChanged(),
        takeUntil(this.destroy$)
      )
      .subscribe(nomSaisi => {
        this.rechercherSuggestionsTempsReel(nomSaisi || '');
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
    
    const resultatsLocaux = this.servicesPredefinis.filter(service =>
      service.nom.toLowerCase().includes(queryTrimmed.toLowerCase()) ||
      service.categorie.toLowerCase().includes(queryTrimmed.toLowerCase())
    );
    
    this.servicesPredefinisFiltres = resultatsLocaux;
    
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
   * 💡 NOUVEAU : Rechercher suggestions en temps réel
   */
  private rechercherSuggestionsTempsReel(nomSaisi: string): void {
    const nomTrimme = nomSaisi.trim();
    
    // Reset si vide ou trop court
    if (nomTrimme.length < 3) {
      this.suggestionsTempsReel = [];
      this.afficherSuggestionsTempsReel = false;
      return;
    }
    
    this.rechercheEnCours = true;
    
    // D'abord chercher localement dans les services prédéfinis
    const suggestionsLocales = this.servicesPredefinis
      .filter(service => 
        service.nom.toLowerCase().includes(nomTrimme.toLowerCase()) ||
        service.motsCles?.toLowerCase().includes(nomTrimme.toLowerCase())
      )
      .slice(0, 5); // Limiter à 5 suggestions
    
    this.suggestionsTempsReel = suggestionsLocales;
    this.afficherSuggestionsTempsReel = suggestionsLocales.length > 0;
    this.rechercheEnCours = false;
    
    // Optionnel : Appeler aussi le backend pour plus de suggestions
    this.servicePredefiniService.rechercherServices(nomTrimme, 5)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (resultatsServeur) => {
          // Fusionner avec les résultats locaux (éviter doublons)
          const idsLocaux = new Set(suggestionsLocales.map(s => s.id));
          const nouveaux = resultatsServeur.filter(s => !idsLocaux.has(s.id));
          
          this.suggestionsTempsReel = [...suggestionsLocales, ...nouveaux].slice(0, 5);
          this.afficherSuggestionsTempsReel = this.suggestionsTempsReel.length > 0;
          this.rechercheEnCours = false;
        },
        error: (error) => {
          console.error('❌ Erreur recherche suggestions temps réel:', error);
          this.rechercheEnCours = false;
        }
      });
  }

  /**
   * 💡 NOUVEAU : Sélectionner une suggestion temps réel
   */
  selectionnerSuggestionTempsReel(suggestion: ServicePredefiniDto): void {
    console.log('💡 Suggestion sélectionnée:', suggestion);
    
    // Remplir le formulaire avec la suggestion
    this.serviceForm.patchValue({
      nomPersonnalise: suggestion.nom,
      categorie: suggestion.categorie
    });
    
    // Masquer les suggestions
    this.afficherSuggestionsTempsReel = false;
    this.suggestionsTempsReel = [];
    
    // Optionnel : Stocker la suggestion pour l'utiliser lors de la création
    this.serviceSelectionne = suggestion;
  }

  /**
   * 💡 NOUVEAU : Masquer les suggestions
   */
  masquerSuggestionsTempsReel(): void {
    // Délai pour permettre le clic sur une suggestion
    setTimeout(() => {
      this.afficherSuggestionsTempsReel = false;
    }, 200);
  }

  /**
   * 🎯 Sélection d'un service prédéfini
   */
  onServicePredefiniSelected(event: any): void {
    // ✅ Gestion de l'événement MatSelectChange (pas event.target.value)
    if (!event || event.value === undefined || event.value === null) {
      console.warn('⚠️ Event invalide dans onServicePredefiniSelected:', event);
      this.serviceSelectionne = null;
      return;
    }
    
    const serviceId = parseInt(event.value); // ← CORRECTION: event.value au lieu de event.target.value
    if (!serviceId) {
      this.serviceSelectionne = null;
      return;
    }
    
    const service = this.servicesPredefinis.find(s => s.id === serviceId) ||
                   this.servicesPredefinisFiltres.find(s => s.id === serviceId);
    
    if (service) {
      console.log('🎯 Service salon sélectionné:', service);
      this.serviceSelectionne = service;
      this.serviceForm.patchValue({
        estFormulaireDemande: false,
        nomPersonnalise: '',
        categorie: service.categorie // ✅ AJOUTÉ : Utiliser la catégorie du service prédéfini
      });
    }
  }

  /**
   * ➕ Demander un nouveau service
   */
  demanderNouveauService(): void {
    console.log('➕ Demande nouveau service salon');
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      servicePredefini: '',
      categorie: 'Autre' // ✅ AJOUTÉ : Remettre à "Autre" pour service personnalisé
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
    this.suggestionService = null;
    this.nomOriginal = '';
  }

  /**
   * 🔄 Basculer vers saisie libre
   */
  basculerVersSaisieLibre(): void {
    console.log('🔄 Bascule vers saisie libre salon');
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
   * ✅ Utiliser la suggestion
   */
  utiliserSuggestion(): void {
    if (this.suggestionService && this.requeteOriginale) {
      console.log('✅ Utilisation de la suggestion salon:', this.suggestionService);

      // ✅ Vérifier que salonId est défini
      if (!this.salonId) {
        console.error('❌ SalonId manquant - impossible de confirmer la suggestion');
        this.enCoursCreation = false;
        return;
      }

      const confirmationData = {
        action: 'useStandard' as const,
        servicePredefiniId: this.suggestionService.id,
        ...this.requeteOriginale
      };

      this.enCoursCreation = true;
      
      this.creationService.confirmerCreationServiceSalon(this.salonId, confirmationData)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: ServiceCreationResponse) => {
            this.enCoursCreation = false;
            this.enAttenteConfirmation = false;
            this.gererReponseCreationIntelligente(response, this.requeteOriginale!);
          },
          error: (error) => {
            console.error('❌ Erreur confirmation suggestion salon:', error);
            this.enCoursCreation = false;
            
            // ✅ FALLBACK: Utiliser directement la suggestion
            const serviceData: ServiceSalonRequestDto = {
              nom: this.suggestionService!.nom,
              description: this.requeteOriginale!.description || '',
              categorie: this.suggestionService!.categorie,
              prix: this.requeteOriginale!.prix,
              dureeEnMinutes: this.requeteOriginale!.dureeEnMinutes || 60
            };
            
            this.enAttenteConfirmation = false;
            this.emettreServiceCreee(serviceData);
          }
        });
    }
  }

  /**
   * ❌ NOUVELLE MÉTHODE : Annuler la suggestion
   */
  annulerSuggestion(): void {
    console.log('❌ Annulation de la suggestion salon');
    
    // Reset de l'état de confirmation
    this.enAttenteConfirmation = false;
    this.suggestionService = null;
    this.nomOriginal = '';
    this.requeteOriginale = null;
    
    // Remettre l'utilisateur en mode saisie libre
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      nomPersonnalise: '', // Vider le champ pour qu'il ressaisisse
      servicePredefini: ''
    });
    
    // Focus sur le champ nom pour faciliter la ressaisie
    setTimeout(() => {
      const nomInput = document.querySelector('input[formControlName="nomPersonnalise"]') as HTMLInputElement;
      if (nomInput) {
        nomInput.focus();
      }
    }, 100);
  }

  /**
   * ✅ NOUVELLE MÉTHODE : Utiliser le service existant
   */
  utiliserServiceExistant(): void {
    if (this.serviceExistantTrouve) {
      console.log('✅ Utilisation du service existant:', this.serviceExistantTrouve);
      
      // Créer le service avec les données du service existant
      const serviceData: ServiceSalonRequestDto = {
        nom: this.serviceExistantTrouve.nom,
        description: this.serviceForm.get('description')?.value || this.serviceExistantTrouve.description || '',
        categorie: this.serviceExistantTrouve.categorie,
        prix: this.serviceForm.get('prix')?.value || 0,
        dureeEnMinutes: this.serviceForm.get('dureeEnMinutes')?.value || 60
      };

      this.emettreServiceCreee(serviceData);
    }
  }

  /**
   * 🔄 NOUVELLE MÉTHODE : Retour à la saisie
   */
  retourSaisie(): void {
    console.log('🔄 Retour à la saisie libre');
    
    // Reset de l'état d'information
    this.serviceExisteDeja = false;
    this.serviceExistantTrouve = null;
    this.messageServiceExistant = '';
    
    // Remettre l'utilisateur en mode saisie libre
    this.serviceForm.patchValue({
      estFormulaireDemande: true,
      nomPersonnalise: '', // Vider le champ pour qu'il ressaisisse
      servicePredefini: ''
    });
    
    // Focus sur le champ nom pour faciliter la ressaisie
    setTimeout(() => {
      const nomInput = document.querySelector('input[formControlName="nomPersonnalise"]') as HTMLInputElement;
      if (nomInput) {
        nomInput.focus();
      }
    }, 100);
  }

  // ✅ VALIDATION
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
    const prix = this.serviceForm.get('prix')?.value;
    if (!prix) return '';
    return `${Number(prix).toLocaleString()} CFA`;
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
      console.log('❌ Formulaire salon invalide');
      return;
    }
    
    this.soumettre();
  }

  /**
   * ✅ MÉTHODE OPTIMISÉE : Soumission avec détection intelligente
   */
  private soumettre(): void {
    this.enCoursCreation = true;
    const formValue = this.serviceForm.value;
    
    // ✅ Préparation des données de base
    const requestData: CreateServiceSalonRequest = {
      description: formValue.description?.trim() || '',
      prix: Number(formValue.prix),
      dureeEnMinutes: Number(formValue.dureeEnMinutes) || 60
    };

    // 🆕 CAS 1 : NOUVEAU SERVICE LIBRE (saisie manuelle)
    if (formValue.estFormulaireDemande && formValue.nomPersonnalise?.trim()) {
      requestData.nomService = formValue.nomPersonnalise.trim();
      console.log('🧠 Création service salon intelligent (nouveau):', requestData);
      
      this.creerAvecDetectionIntelligente(requestData);

    
    // ✅ CAS 2 : SERVICE PRÉDÉFINI SÉLECTIONNÉ VIA VARIABLE
    } else if (this.serviceSelectionne?.id) {
      requestData.servicePredefiniId = this.serviceSelectionne.id;
      console.log('🧠 Création service salon intelligent (prédéfini):', requestData);
      
      this.creerAvecDetectionIntelligente(requestData);

    // 🔄 CAS 3 : FALLBACK - Service prédéfini depuis le formulaire
    } else if (formValue.servicePredefini) {
      const serviceId = parseInt(formValue.servicePredefini);
      if (serviceId && !isNaN(serviceId)) {
        requestData.servicePredefiniId = serviceId;
        console.log('🧠 Création service salon intelligent (fallback prédéfini):', requestData);
        
        this.creerAvecDetectionIntelligente(requestData);
      } else {
        console.error('❌ ID de service prédéfini invalide:', formValue.servicePredefini);
        this.enCoursCreation = false;
      }

    // ❌ CAS 4 : ERREUR - Aucun service sélectionné
    } else {
      console.error('❌ Aucun service sélectionné pour la création');
      console.error('❌ Debug - serviceSelectionne:', this.serviceSelectionne);
      console.error('❌ Debug - formValue:', formValue);
      console.error('❌ Debug - estFormulaireDemande:', formValue.estFormulaireDemande);
      console.error('❌ Debug - nomPersonnalise:', formValue.nomPersonnalise);
      console.error('❌ Debug - servicePredefini:', formValue.servicePredefini);
      this.enCoursCreation = false;
      return;
    }
  }

  /**
   * 🧠 NOUVELLE MÉTHODE : Création avec détection intelligente
   */
  private creerAvecDetectionIntelligente(requestData: CreateServiceSalonRequest): void {
    // ✅ Vérifier que salonId est défini
    if (!this.salonId) {
      console.error('❌ SalonId manquant - impossible de créer le service');
      this.enCoursCreation = false;
      return;
    }

    this.creationService.creerServiceSalonIntelligent(this.salonId, requestData)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: ServiceCreationResponse) => {
          this.enCoursCreation = false;
          this.gererReponseCreationIntelligente(response, requestData);
        },
        error: (error) => {
          console.error('❌ Erreur création service salon intelligent:', error);
          this.enCoursCreation = false;
          
          // ✅ FALLBACK : Vérifier localement puis créer si nécessaire
          console.log('🔄 Fallback vers vérification locale');
          this.verifierEtCreerServiceLocal(requestData);
        }
      });
  }

  /**
   * ✅ MÉTHODE AMÉLIORÉE : Gérer la réponse de création intelligente
   */
  private gererReponseCreationIntelligente(response: ServiceCreationResponse, requeteOriginale: CreateServiceSalonRequest): void {
    console.log('📥 Réponse création salon intelligente:', response);

    if (response.needsConfirmation && response.suggestion) {
      // 🚫 SERVICE EXISTE DÉJÀ - NE PAS CRÉER, JUSTE INFORMER
      console.log('🚫 Service existe déjà:', response.suggestion);
      
      // Reset les états précédents
      this.enAttenteConfirmation = false;
      this.suggestionService = null;
      
      // Afficher l'information du service existant
      this.serviceExisteDeja = true;
      this.serviceExistantTrouve = response.suggestion;
      this.messageServiceExistant = `Ce service existe déjà sous le nom "${response.suggestion.nom}" dans la catégorie ${response.suggestion.categorie}`;
      
      console.log('ℹ️ Service non créé - doublon évité');

    } else if (response.service) {
      // ✅ SERVICE CRÉÉ DIRECTEMENT - NOUVEAU SERVICE
      console.log('✅ Nouveau service salon créé:', response.service);
      
      const serviceData: ServiceSalonRequestDto = {
        nom: response.service.nom,
        description: response.service.description || '',
        categorie: response.service.categorie,
        prix: response.service.prix,
        dureeEnMinutes: response.service.dureeEnMinutes || 60
      };

      this.emettreServiceCreee(serviceData);
      
    } else {
      // ⚠️ CAS INATTENDU - Fallback à la création locale
      console.warn('⚠️ Réponse inattendue, création locale:', response);
      this.verifierEtCreerServiceLocal(requeteOriginale);
    }
  }

  /**
   * 🔍 NOUVELLE MÉTHODE : Vérifier localement et créer si nécessaire
   */
  private verifierEtCreerServiceLocal(requestData: CreateServiceSalonRequest): void {
    const formValue = this.serviceForm.value;
    const nomSaisi = requestData.nomService?.toLowerCase().trim();
    
    if (!nomSaisi) {
      console.error('❌ Nom de service manquant');
      return;
    }
    
    // Rechercher dans les services prédéfinis locaux
    const serviceExistant = this.servicesPredefinis.find(service => {
      const nomService = service.nom.toLowerCase().trim();
      const motsCles = service.motsCles?.toLowerCase() || '';
      
      return nomService === nomSaisi || 
             nomService.includes(nomSaisi) || 
             nomSaisi.includes(nomService) ||
             motsCles.includes(nomSaisi);
    });
    
    if (serviceExistant) {
      // 🚫 SERVICE TROUVÉ - NE PAS CRÉER
      console.log('🚫 Service existe localement:', serviceExistant);
      
      this.serviceExisteDeja = true;
      this.serviceExistantTrouve = serviceExistant;
      this.messageServiceExistant = `Ce service existe déjà sous le nom "${serviceExistant.nom}" dans la catégorie ${serviceExistant.categorie}`;
      
      console.log('ℹ️ Service non créé - doublon évité (vérification locale)');
      
    } else {
      // ✅ SERVICE NOUVEAU - CRÉER
      console.log('✅ Nouveau service - création autorisée');
      this.creerServiceDirectement(requestData);
    }
  }

  /**
   * ✅ MÉTHODE AMÉLIORÉE : Création directe (fallback)
   */
  private creerServiceDirectement(requestData: CreateServiceSalonRequest): void {
    const formValue = this.serviceForm.value;
    
    // ✅ Déterminer le nom du service
    let nomService = '';
    let categorieService = 'Autre';
    
    if (formValue.estFormulaireDemande && requestData.nomService) {
      // Nouveau service libre
      nomService = requestData.nomService;
      categorieService = 'Personnalisé';
    } else if (this.serviceSelectionne) {
      // Service prédéfini
      nomService = this.serviceSelectionne.nom;
      categorieService = this.serviceSelectionne.categorie;
    } else {
      console.error('❌ Impossible de déterminer le nom du service');
      return;
    }
    
    const serviceData: ServiceSalonRequestDto = {
      nom: nomService,
      description: requestData.description || '',
      categorie: formValue.categorie || categorieService, // ✅ UTILISER la catégorie du formulaire
      prix: requestData.prix,
      dureeEnMinutes: requestData.dureeEnMinutes || 60
    };

    console.log('📤 Création service salon directe (fallback):', serviceData);

    this.emettreServiceCreee(serviceData);
  }

  /**
   * 📤 NOUVELLE MÉTHODE : Centraliser l'émission vers le parent
   */
  private emettreServiceCreee(serviceData: ServiceSalonRequestDto): void {
    if (this.isEditMode && this.modalData?.service) {
      console.log('📝 Émission : Service salon modifié');
      this.serviceUpdated.emit({
        serviceId: this.modalData.service.id,
        serviceData: serviceData
      });
    } else {
      console.log('➕ Émission : Nouveau service salon créé');
      this.serviceCreated.emit(serviceData);
    }
    
    // ✅ Fermer le modal après émission
    this.onCancel();
  }

  /**
   * ✅ Méthode pour fermer le modal
   */
  onCancel(): void {
    if (this.dialogRef) {
      this.dialogRef.close();
    } else {
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