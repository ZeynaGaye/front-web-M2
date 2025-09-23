// horaires-manager.component.ts
import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule, NgIf, NgFor, DatePipe } from '@angular/common';
import { FormGroup, FormBuilder, Validators, FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Modules Angular Material
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { HorairesService } from '../../services/horaires/horaires.service';

// Interfaces pour la structure de vos données (MISES À JOUR pour correspondre au backend)
export interface HoraireJour {
  id?: number;
  jourSemaine: string;
  jourSemaineLibelle?: string;
  estOuvert: boolean;
  heureOuverture: string | null; // Autorise null
  heureFermeture: string | null; // Autorise null
  dureeCreneauMinutes: number | null; // Autorise null (ou 0 si le backend attend un int primitif)
  pauseEntreCreneauxMinutes?: number;
  salonId?: number;
  freelanceId?: number;
}

export interface Conge {
  id?: number;
  dateDebut: string; // Format 'YYYY-MM-DD'
  dateFin: string;   // Format 'YYYY-MM-DD'
  motif?: string;
}

export interface Creneau {
  heureDebut: string; // 'YYYY-MM-DDTHH:MM:SS'
  heureFin: string;   // 'YYYY-MM-DDTHH:MM:SS'
  // La disponibilité est implicite si le créneau est retourné par le backend
}

@Component({
  selector: 'app-horaires-manager',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MatSlideToggleModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatFormFieldModule,
    MatInputModule,
    DatePipe
  ],
  templateUrl: './horaires-manager.component.html',
  styleUrls: ['./horaires-manager.component.scss']
})
export class HorairesManagerComponent implements OnInit {

  @Input() entityId!: number; // L'ID du salon ou du freelance
  @Input() isSalon!: boolean; // Vrai si c'est un salon, Faux si c'est un freelance

  @Output() horaireError = new EventEmitter<string>();

  activeTab: string = 'horaires';

  // --- Section Horaires ---
  horairesFormGroup!: FormGroup;
 joursSemaine = [
    { code: 'LUNDI', libelle: 'Lundi' }, // CHANGÉ ICI
    { code: 'MARDI', libelle: 'Mardi' }, // CHANGÉ ICI
    { code: 'MERCREDI', libelle: 'Mercredi' }, // CHANGÉ ICI
    { code: 'JEUDI', libelle: 'Jeudi' }, // CHANGÉ ICI
    { code: 'VENDREDI', libelle: 'Vendredi' }, // CHANGÉ ICI
    { code: 'SAMEDI', libelle: 'Samedi' }, // CHANGÉ ICI
    { code: 'DIMANCHE', libelle: 'Dimanche' }, // CHANGÉ ICI
  ];

  // --- Section Planning ---
  selectedPlanningDate: Date = new Date();
  calendarDays: any[] = [];
  creneauxJour: Creneau[] = [];

  // --- Section Congés ---
  newConge: Conge = { dateDebut: '', dateFin: '', motif: '' };
  congesList: Conge[] = [];

  constructor(
    private fb: FormBuilder,
    private horairesService: HorairesService
  ) {}

  ngOnInit(): void {
    this.initHorairesForm();
    this.chargerHoraires();
    this.genererCalendrier(); // Ceci appellera chargerPlanning()
    this.chargerConges();
  }

  private patchHorairesForm(horaires: HoraireJour[]): void {
    horaires.forEach(horaire => {
      // Utilisez le code du jourSemaine pour accéder au FormGroup
      if (this.horairesFormGroup.get(horaire.jourSemaine)) {
        this.horairesFormGroup.get(horaire.jourSemaine)?.patchValue({
          estOuvert: horaire.estOuvert,
          heureOuverture: horaire.heureOuverture,
          heureFermeture: horaire.heureFermeture,
          dureeCreneauMinutes: horaire.dureeCreneauMinutes
          // pauseEntreCreneauxMinutes n'est pas directement dans le formulaire pour le moment
        });
        // Appeler onEstOuvertChange pour gérer l'état enabled/disabled des champs
        this.onEstOuvertChange(horaire.jourSemaine, { checked: horaire.estOuvert });
      }
    });
  }

  setActiveTab(tab: string): void {
    this.activeTab = tab;
    if (tab === 'planning') {
      this.chargerPlanning();
    } else if (tab === 'conges') {
      this.chargerConges();
    }
  }

  // --- Méthodes pour la Section Horaires ---
  private initHorairesForm(): void {
    const group: { [key: string]: FormGroup } = {};
    this.joursSemaine.forEach(jour => {
      group[jour.code] = this.fb.group({
        estOuvert: [true],
        heureOuverture: ['09:00', Validators.required],
        heureFermeture: ['18:00', Validators.required],
        dureeCreneauMinutes: [30, [Validators.required, Validators.min(15), Validators.max(120)]]
      });

      // Gère l'activation/désactivation des champs en fonction de 'estOuvert'
      group[jour.code].get('estOuvert')?.valueChanges.subscribe(estOuvert => {
        if (estOuvert) {
          group[jour.code].get('heureOuverture')?.enable();
          group[jour.code].get('heureFermeture')?.enable();
          group[jour.code].get('dureeCreneauMinutes')?.enable();
        } else {
          group[jour.code].get('heureOuverture')?.disable();
          group[jour.code].get('heureFermeture')?.disable();
          group[jour.code].get('dureeCreneauMinutes')?.disable();
        }
      });
    });
    this.horairesFormGroup = this.fb.group(group);
  }

  onEstOuvertChange(jourCode: string, event: any): void {
    const estOuvert = event.checked;
    const jourForm = this.horairesFormGroup.get(jourCode) as FormGroup;
    if (jourForm) {
      if (estOuvert) {
        jourForm.get('heureOuverture')?.enable();
        jourForm.get('heureFermeture')?.enable();
        jourForm.get('dureeCreneauMinutes')?.enable();
      } else {
        jourForm.get('heureOuverture')?.disable();
        jourForm.get('heureFermeture')?.disable();
        jourForm.get('dureeCreneauMinutes')?.disable();
      }
    }
  }

  chargerHoraires(): void {
    this.horairesService.getHoraires(this.entityId, this.isSalon).subscribe({
      next: (data: HoraireJour[]) => {
        this.patchHorairesForm(data);
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement des horaires', err);
        this.horaireError.emit('Erreur lors du chargement des horaires: ' + (err.message || ''));
      }
    });
  }

  sauvegarderHoraires(): void {
    if (this.horairesFormGroup.valid) {
      const horairesToSave: HoraireJour[] = [];
      this.joursSemaine.forEach(jour => {
        const jourForm = this.horairesFormGroup.get(jour.code)?.value;
        horairesToSave.push({
          jourSemaine: jour.code, // Utilise le code 'MONDAY'
          // Le backend utilise le jourSemaineLibelle pour le PUT, mais le service le construit déjà
          estOuvert: jourForm.estOuvert,
          heureOuverture: jourForm.heureOuverture,
          heureFermeture: jourForm.heureFermeture,
          dureeCreneauMinutes: jourForm.dureeCreneauMinutes
        });
      });

      this.horairesService.saveHoraires(this.entityId, this.isSalon, horairesToSave).subscribe({
        next: () => {
          alert('Horaires sauvegardés avec succès !');
          this.chargerPlanning(); // Recharger le planning après sauvegarde des horaires
        },
        error: (err: any) => {
          console.error('Erreur lors de la sauvegarde des horaires', err);
          this.horaireError.emit('Erreur lors de la sauvegarde des horaires: ' + (err.message || ''));
        }
      });
    } else {
      alert('Veuillez corriger les erreurs dans le formulaire des horaires.');
      this.horairesFormGroup.markAllAsTouched();
      this.horaireError.emit('Formulaire des horaires invalide.');
    }
  }

  copierHoraires(): void {
    alert('Fonctionnalité "Copier un jour" à implémenter.');
  }

  resetHoraires(): void {
    // Recharger les horaires par défaut du backend
    this.horairesService.createDefaultHoraires(this.entityId, this.isSalon).subscribe({
      next: () => {
        alert('Horaires réinitialisés aux valeurs par défaut !');
        this.chargerHoraires(); // Recharger les horaires après la réinitialisation
        this.chargerPlanning(); // Recharger le planning
      },
      error: (err: any) => {
        console.error('Erreur lors de la réinitialisation des horaires par défaut', err);
        this.horaireError.emit('Erreur lors de la réinitialisation des horaires par défaut: ' + (err.message || ''));
      }
    });
  }

  // --- Méthodes pour la Section Planning ---
  genererCalendrier(): void {
    this.calendarDays = [];
    const today = new Date();
    // Début de la semaine (dimanche) de la date sélectionnée
    const startOfWeek = new Date(this.selectedPlanningDate);
    startOfWeek.setDate(this.selectedPlanningDate.getDate() - this.selectedPlanningDate.getDay());

    for (let i = 0; i < 7; i++) {
      const currentDay = new Date(startOfWeek);
      currentDay.setDate(startOfWeek.getDate() + i);
      this.calendarDays.push({
        date: currentDay,
        dayOfMonth: currentDay.getDate(),
        dayOfWeekShort: currentDay.toLocaleDateString('fr-FR', { weekday: 'short' }),
        isToday: currentDay.toDateString() === today.toDateString(),
        isAvailable: true, // Ceci sera mis à jour par chargerPlanning
        creneauxCount: 0 // Ceci sera mis à jour par chargerPlanning
      });
    }
    this.chargerPlanning(); // Charge le planning pour la semaine initialisée
  }

  chargerPlanning(): void {
    const dateStr = this.selectedPlanningDate.toISOString().split('T')[0];
    this.horairesService.getPlanning(this.entityId, this.isSalon, dateStr).subscribe({
      next: (data: Creneau[]) => {
        this.creneauxJour = data;
        // La disponibilité est déterminée par la présence de créneaux
        this.updateCalendarDayStatus(dateStr, data.length > 0, data.length);
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement du planning', err);
        this.creneauxJour = [];
        this.updateCalendarDayStatus(dateStr, false, 0); // Marquer comme non disponible en cas d'erreur
        this.horaireError.emit('Erreur lors du chargement du planning: ' + (err.message || ''));
      }
    });
  }

  updateCalendarDayStatus(dateStr: string, hasCreneaux: boolean, creneauxCount: number): void {
    const index = this.calendarDays.findIndex(d => d.date.toISOString().split('T')[0] === dateStr);
    if (index !== -1) {
      this.calendarDays[index].isAvailable = hasCreneaux;
      this.calendarDays[index].creneauxCount = creneauxCount;
    }
  }

  selectCalendarDay(date: Date): void {
    this.selectedPlanningDate = date;
    this.chargerPlanning();
  }

  // --- Méthodes pour la Section Congés ---
  chargerConges(): void {
    this.horairesService.getConges(this.entityId, this.isSalon).subscribe({
      next: (data: Conge[]) => this.congesList = data,
      error: (err: any) => {
        console.error('Erreur lors du chargement des congés', err);
        this.horaireError.emit('Erreur lors du chargement des congés: ' + (err.message || ''));
      }
    });
  }

  ajouterConge(): void {
    // Validation des dates
    if (!this.newConge.dateDebut || !this.newConge.dateFin) {
      alert('Veuillez saisir les dates de début et de fin du congé.');
      this.horaireError.emit('Dates de congé manquantes.');
      return;
    }
    if (new Date(this.newConge.dateDebut) > new Date(this.newConge.dateFin)) {
      alert('La date de début ne peut pas être postérieure à la date de fin.');
      this.horaireError.emit('Date de début de congé invalide.');
      return;
    }

    this.horairesService.addConge(this.entityId, this.isSalon, this.newConge).subscribe({
      next: () => {
        alert('Congé ajouté avec succès !');
        this.newConge = { dateDebut: '', dateFin: '', motif: '' };
        this.chargerConges();
        this.chargerPlanning(); // Recharger le planning pour refléter le congé [Previous suggestion implemented]
      },
      error: (err: any) => {
        console.error('Erreur lors de l\'ajout du congé', err);
        this.horaireError.emit('Erreur lors de l\'ajout du congé: ' + (err.message || ''));
      }
    });
  }

  supprimerConge(congeId?: number): void {
    if (congeId) {
      if (confirm('Êtes-vous sûr de vouloir supprimer ce congé ?')) {
        this.horairesService.deleteConge(this.entityId, this.isSalon, congeId).subscribe({
          next: () => {
            alert('Congé supprimé avec succès !');
            this.chargerConges();
            this.chargerPlanning(); // Recharger le planning pour refléter la suppression [Previous suggestion implemented]
          },
          error: (err: any) => {
            console.error('Erreur lors de la suppression du congé', err);
            this.horaireError.emit('Erreur lors de la suppression du congé: ' + (err.message || ''));
          }
        });
      }
    }
  }

  fermerAujourdhui(): void {
    const today = new Date().toISOString().split('T')[0];
    const congeToday: Conge = { dateDebut: today, dateFin: today, motif: 'Fermeture exceptionnelle' };
    this.horairesService.addConge(this.entityId, this.isSalon, congeToday).subscribe({
      next: () => {
        alert('Journée marquée comme fermée !');
        this.chargerConges();
        this.chargerPlanning(); // Recharger le planning après fermeture exceptionnelle
      },
      error: (err: any) => {
        console.error('Erreur lors de la fermeture du jour', err);
        this.horaireError.emit('Erreur lors de la fermeture du jour: ' + (err.message || ''));
      }
    });
  }

  // --- Méthodes pour la Section Actions Rapides ---
  appliquerHoraires(type: 'bureau' | 'flexible'): void {
    const defaultHours = {
      bureau: { heureOuverture: '09:00', heureFermeture: '18:00', dureeCreneauMinutes: 60 },
      flexible: { heureOuverture: '08:00', heureFermeture: '20:00', dureeCreneauMinutes: 30 }
    };
    const selectedHours = defaultHours[type];

    this.joursSemaine.forEach(jour => {
      const jourForm = this.horairesFormGroup.get(jour.code);
      if (jourForm) {
        jourForm.patchValue({
          estOuvert: true,
          heureOuverture: selectedHours.heureOuverture,
          heureFermeture: selectedHours.heureFermeture,
          dureeCreneauMinutes: selectedHours.dureeCreneauMinutes
        });
        this.onEstOuvertChange(jour.code, { checked: true });
      }
    });
    alert(`Horaires "${type}" appliqués.`);
    this.sauvegarderHoraires();
  }

  ouvrirWeekend(): void {
    ['SATURDAY', 'SUNDAY'].forEach(jourCode => { // Utilise les codes d'énumération
      const jourForm = this.horairesFormGroup.get(jourCode);
      if (jourForm) {
        jourForm.patchValue({ estOuvert: true, heureOuverture: '10:00', heureFermeture: '17:00', dureeCreneauMinutes: 60 });
        this.onEstOuvertChange(jourCode, { checked: true });
      }
    });
    alert('Weekend ouvert avec des horaires par défaut.');
    this.sauvegarderHoraires();
  }

  fermerWeekend(): void {
    ['SATURDAY', 'SUNDAY'].forEach(jourCode => { // Utilise les codes d'énumération
      const jourForm = this.horairesFormGroup.get(jourCode);
      if (jourForm) {
        jourForm.patchValue({ estOuvert: false });
        this.onEstOuvertChange(jourCode, { checked: false });
      }
    });
    alert('Weekend fermé.');
    this.sauvegarderHoraires();
  }

  changerDureeCreneaux(duree: number): void {
    this.joursSemaine.forEach(jour => {
      const jourForm = this.horairesFormGroup.get(jour.code);
      if (jourForm && jourForm.get('estOuvert')?.value) {
        jourForm.get('dureeCreneauMinutes')?.setValue(duree);
      }
    });
    alert(`Durée des créneaux changée à ${duree} minutes pour les jours ouverts.`);
    this.sauvegarderHoraires();
  }
}