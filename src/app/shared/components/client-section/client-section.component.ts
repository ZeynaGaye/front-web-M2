import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgFor } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { PortfolioComponent } from '../../../freelance/components/portfolio/portfolio.component';
import { Freelance } from '../../../models/PortfolioItem';
import { FreelanceService } from '../../../freelance/services/freelance.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-client-section',
  templateUrl: './client-section.component.html',
  styleUrls: ['./client-section.component.scss'],
  imports: [
    NgFor, 
    CommonModule, 
    RouterModule, 
    PortfolioComponent,
    MatButtonModule,
    MatIconModule,
    FormsModule,
    ReactiveFormsModule 
  ],
  standalone: true,
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition('void <=> *', animate('400ms ease-in-out')),
    ]),
    trigger('expandPanel', [
      state('collapsed', style({ 
        height: '0', 
        opacity: 0,
        overflow: 'hidden'
      })),
      state('expanded', style({ 
        height: '*', 
        opacity: 1,
        overflow: 'visible'
      })),
      transition('collapsed <=> expanded', animate('400ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ]),
    // Animation pour la modal de contact
    trigger('modalAnimation', [
      state('closed', style({ 
        opacity: 0,
        transform: 'scale(0.8)',
        visibility: 'hidden'
      })),
      state('open', style({ 
        opacity: 1,
        transform: 'scale(1)',
        visibility: 'visible'
      })),
      transition('closed <=> open', animate('300ms cubic-bezier(0.4, 0.0, 0.2, 1)'))
    ])
  ]
})
export class ClientSectionComponent implements OnInit, OnDestroy {
[x: string]: any;
  // ==========================================
  // PROPRIÉTÉS DE BASE
  // ==========================================
  activeFeature = 0;
  isExpanded = false;
  allFreelances: Freelance[] = [];
  selectedFreelanceId: number | null = null;
  showPortfolio: boolean = false;
  loadingFreelances: boolean = false;
  searchTerm: string = '';
  activeFilter: string = 'all';
  currentPage: number = 1;
  itemsPerPage: number = 3;
  totalPages: number = 1;
  Math = Math;
  filteredFreelances: Freelance[] = [];
  paginatedFreelances: Freelance[] = [];
  showFreelancesSection: boolean = false;

  // ==========================================
  // PROPRIÉTÉS POUR LE CONTACT
  // ==========================================
  showContactModal: boolean = false;
  selectedFreelanceForContact: Freelance | null = null;
  contactForm: FormGroup;
  isSubmittingContact: boolean = false;

  // ==========================================
  // DONNÉES STATIQUES
  // ==========================================
  features = [
    { 
      id: 1, 
      icon: 'search',
      title: 'Trouvez votre expert beauté', 
      description: 'Parcourez les profils des meilleurs professionnels près de chez vous',
      image: '/assets/images/freelances1.jpeg'
    },
    { 
      id: 2, 
      icon: 'photo_library',
      title: 'Explorez les portfolios', 
      description: 'Visualisez les réalisations avant de choisir votre prestataire',
      image: '/assets/images/reserv.avif'
    },
    { 
      id: 3, 
      icon: 'home',
      title: 'Réservez à domicile', 
      description: 'Profitez de services personnalisés dans le confort de chez vous',
      image: '/assets/images/prestations.jpeg'
    },
    { 
      id: 4, 
      icon: 'chat',
      title: 'Contactez directement', 
      description: 'Échangez sans intermédiaire avec votre professionnel',
      image: '/assets/images/direct-contact.jpg'
    },
  ];
  
  expandedContent = [
    {
      title: 'Comment ça fonctionne',
      steps: [
        { number: '01', text: 'Inscrivez-vous gratuitement' },
        { number: '02', text: 'Recherchez par service ou localisation' },
        { number: '03', text: 'Parcourez les portfolios des professionnels' },
        { number: '04', text: 'Réservez et payez en toute sécurité' }
      ]
    }
  ];
  
  private interval: any;
  isBrowser: boolean;

  // ==========================================
  // CONSTRUCTEUR
  // ==========================================
  constructor(
    private router: Router,
    private freelanceService: FreelanceService,
    private fb: FormBuilder,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Initialisation du formulaire de contact
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      freelanceId: ['']
    });
  }

  // ==========================================
  // LIFECYCLE HOOKS
  // ==========================================
  ngOnInit() {
    if (this.isBrowser) {
      this.startRotation();
    }
    console.log('ClientSectionComponent initialisé');
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      clearInterval(this.interval);
      // Rétablir le scroll au cas où la modal serait ouverte
      if (typeof document !== 'undefined') {
        document.body.style.overflow = 'auto';
      }
    }
  }

  // ==========================================
  // MÉTHODES POUR LES FEATURES
  // ==========================================
  
  /**
   * Change la feature active et reset le timer de rotation
   */
  setActiveFeature(index: number) {
    console.log('Changement de feature active vers:', index);
    this.activeFeature = index;
    this.resetTimer();
    
    // Si on clique sur "Explorez les portfolios" (index 1)
    if (index === 1) {
      console.log('Feature "Explorez les portfolios" sélectionnée');
    }
  }

  /**
   * Démarre la rotation automatique des features
   */
  startRotation() {
    if (this.isBrowser) {
      this.interval = setInterval(() => {
        this.activeFeature = (this.activeFeature + 1) % this.features.length;
      }, 4000);
    }
  }

  /**
   * Reset le timer de rotation automatique
   */
  resetTimer() {
    if (this.isBrowser) {
      clearInterval(this.interval);
      this.startRotation();
    }
  }

  /**
   * Toggle l'état d'expansion (non utilisé actuellement)
   */
  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  // ==========================================
  // MÉTHODES POUR LES FREELANCES
  // ==========================================

  /**
   * ✅ CORRIGÉ : Toggle l'affichage de la section freelances
   */
  toggleFreelancesSection() {
    console.log('Toggle freelances section. État actuel:', this.showFreelancesSection);
    
    this.showFreelancesSection = !this.showFreelancesSection;
    
    console.log('Nouvel état:', this.showFreelancesSection);
    
    // Charger les freelances si la section est ouverte et qu'il n'y en a pas
    if (this.showFreelancesSection && this.allFreelances.length === 0) {
      console.log('Chargement des freelances...');
      this.loadAllFreelances();
    }
    
    // Scroll vers la section si elle est ouverte
    if (this.showFreelancesSection && this.isBrowser) {
      setTimeout(() => {
        const freelanceSection = document.querySelector('.freelance-list-section');
        if (freelanceSection) {
          freelanceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500); // Augmenté le délai pour laisser le temps à l'animation
    }
  }

  /**
   * ✅ CORRIGÉ : Charge tous les freelances
   */
  loadAllFreelances() {
    console.log('Début du chargement des freelances...');
    this.loadingFreelances = true;
    
    try {
      this.freelanceService.getAllFreelances().subscribe({
        next: (freelances: Freelance[]) => {
          console.log('Freelances chargés:', freelances.length);
          this.allFreelances = freelances;
          this.filteredFreelances = [...freelances];
          this.totalPages = Math.ceil(this.filteredFreelances.length / this.itemsPerPage);
          this.currentPage = 1; // Reset de la page courante
          this.updatePaginatedFreelances();
          this.loadingFreelances = false;
        },
        error: (error: any) => {
          console.error('Erreur lors du chargement des freelances:', error);
          this.loadingFreelances = false;
          this.allFreelances = [];
          this.filteredFreelances = [];
          this.totalPages = 0;
          this.paginatedFreelances = [];
        }
      });
    } catch (error) {
      console.error('Erreur critique:', error);
      this.loadingFreelances = false;
    }
  }

  /**
   * ✅ CORRIGÉ : Met à jour la liste paginée
   */
  updatePaginatedFreelances() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredFreelances.length);
    this.paginatedFreelances = this.filteredFreelances.slice(startIndex, endIndex);
    
    console.log(`Page ${this.currentPage}: affichage de ${startIndex + 1} à ${endIndex} sur ${this.filteredFreelances.length}`);
  }

  /**
   * ✅ CORRIGÉ : Filtre les freelances selon le terme de recherche et le filtre actif
   */
  filterFreelances() {
    console.log('Filtrage avec terme:', this.searchTerm, 'et filtre:', this.activeFilter);
    
    let result = [...this.allFreelances];
    
    // Filtrage par terme de recherche
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(freelance => 
        freelance.prenom?.toLowerCase().includes(term) || 
        freelance.nom?.toLowerCase().includes(term) ||
        (freelance.competences && freelance.competences.toLowerCase().includes(term)) ||
        (freelance.adresse && freelance.adresse.toLowerCase().includes(term))
      );
    }
    
    // Filtrage par catégorie
    if (this.activeFilter !== 'all') {
      result = result.filter(freelance => 
        freelance.competences && freelance.competences.toLowerCase().includes(this.activeFilter.toLowerCase())
      );
    }
    
    this.filteredFreelances = result;
    this.totalPages = Math.ceil(this.filteredFreelances.length / this.itemsPerPage);
    this.currentPage = 1; // Reset à la page 1 lors du filtrage
    this.updatePaginatedFreelances();
    
    console.log('Résultats filtrés:', this.filteredFreelances.length);
  }

  /**
   * Change la page courante
   */
  changePage(pageNumber: number) {
    if (pageNumber < 1 || pageNumber > this.totalPages) {
      return;
    }
    this.currentPage = pageNumber;
    this.updatePaginatedFreelances();
    
    if (this.isBrowser) {
      const element = document.querySelector('.freelance-list-section');
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }
  }

  /**
   * Définit le filtre actif
   */
  setFilter(filter: string) {
    this.activeFilter = filter;
    this.filterFreelances();
  }

  /**
   * Remet à zéro tous les filtres
   */
  resetFilters() {
    this.searchTerm = '';
    this.activeFilter = 'all';
    this.filterFreelances();
  }

  /**
   * Retourne les numéros de page à afficher
   */
  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5;
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
      let endPage = startPage + maxPagesToShow - 1;
      
      if (endPage > this.totalPages) {
        endPage = this.totalPages;
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // ==========================================
  // MÉTHODES UTILITAIRES
  // ==========================================

  /**
   * Extrait la ville d'une adresse
   */
  extractCity(address: string): string {
    if (!address) return '';
    
    const parts = address.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    
    return address;
  }

  /**
   * Formate un numéro de téléphone
   */
  formatPhone(phone: string): string {
    if (!phone) return '';
    
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  /**
   * Retourne la catégorie principale d'un freelance
   */
  getMainCategory(competences: string): string {
    if (!competences) return 'Beauté';
    
    const categories = competences.split(',');
    if (categories.length > 0) {
      return categories[0].trim();
    }
    
    return 'Beauté';
  }

  // ==========================================
  // MÉTHODES POUR LE PORTFOLIO
  // ==========================================

  /**
   * Affiche le portfolio d'un freelance
   */
  viewFreelancePortfolio(freelanceId: number) {
    this.selectedFreelanceId = freelanceId;
    this.showPortfolio = true;
    
    if (this.isBrowser) {
      setTimeout(() => {
        const portfolioElement = document.getElementById('freelance-portfolio');
        if (portfolioElement) {
          portfolioElement.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }

  /**
   * Ferme l'affichage du portfolio
   */
  closePortfolio() {
    this.showPortfolio = false;
    this.selectedFreelanceId = null;
  }

  // ==========================================
  // MÉTHODES POUR LE CONTACT
  // ==========================================

  /**
   * ✅ Ouvre la modal de contact pour un freelance
   */
  contactFreelance(freelance: Freelance, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Ouverture du formulaire de contact pour:', freelance.prenom, freelance.nom);
    
    this.selectedFreelanceForContact = freelance;
    
    // Pré-remplir le formulaire
    this.contactForm.patchValue({
      subject: `Demande de prestation - ${freelance.prenom} ${freelance.nom}`,
      freelanceId: freelance.id,
      name: '',
      email: '',
      message: `Bonjour ${freelance.prenom},\n\nJe souhaiterais en savoir plus sur vos services.\n\nCordialement.`
    });
    
    this.showContactModal = true;
    
    // Empêcher le scroll seulement si on est dans le navigateur
    if (this.isBrowser && typeof document !== 'undefined') {
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * ✅ Ferme la modal de contact
   */
  closeContactModal() {
    this.showContactModal = false;
    this.selectedFreelanceForContact = null;
    this.contactForm.reset();
    
    // Rétablir le scroll seulement si on est dans le navigateur
    if (this.isBrowser && typeof document !== 'undefined') {
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * ✅ Soumet le formulaire de contact
   */
  onSubmitContact() {
    if (this.contactForm.invalid) {
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmittingContact = true;
    const formData = this.contactForm.value;

    console.log('Envoi du message de contact:', formData);

    // Simulation avec gestion d'erreur
    setTimeout(() => {
      try {
        this.isSubmittingContact = false;
        
        const message = `Merci ${formData.name} ! Votre message a été envoyé à ${this.selectedFreelanceForContact?.prenom}. Vous recevrez une réponse sous peu.`;
        
        if (this.isBrowser) {
          alert(message);
        } else {
          console.log(message);
        }
        
        this.closeContactModal();
      } catch (error) {
        console.error('Erreur lors de l\'envoi:', error);
        this.isSubmittingContact = false;
      }
    }, 2000);
  }

  /**
   * ✅ Vérifie si un champ a une erreur
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * ✅ Obtient le message d'erreur pour un champ
   */
  getFieldError(fieldName: string): string {
    const field = this.contactForm.get(fieldName);
    if (!field || !field.errors) return '';

    if (field.errors['required']) {
      return `${this.getFieldLabel(fieldName)} est requis.`;
    }
    if (field.errors['email']) {
      return 'Veuillez entrer une adresse e-mail valide.';
    }
    if (field.errors['minlength']) {
      const requiredLength = field.errors['minlength'].requiredLength;
      return `${this.getFieldLabel(fieldName)} doit contenir au moins ${requiredLength} caractères.`;
    }
    
    return 'Ce champ contient une erreur.';
  }

  /**
   * ✅ Obtient le label d'un champ
   */
  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      email: 'L\'e-mail',
      subject: 'Le sujet',
      message: 'Le message'
    };
    return labels[fieldName] || 'Ce champ';
  }

  // ==========================================
  // MÉTHODE DE DEBUG (temporaire)
  // ==========================================

  /**
   * ✅ Méthode pour déboguer l'état de la section freelances
   */
  debugFreelanceSection() {
    console.log('=== DEBUG FREELANCE SECTION ===');
    console.log('showFreelancesSection:', this.showFreelancesSection);
    console.log('allFreelances.length:', this.allFreelances.length);
    console.log('filteredFreelances.length:', this.filteredFreelances.length);
    console.log('paginatedFreelances.length:', this.paginatedFreelances.length);
    console.log('loadingFreelances:', this.loadingFreelances);
    console.log('currentPage:', this.currentPage);
    console.log('totalPages:', this.totalPages);
    console.log('activeFeature:', this.activeFeature);
    console.log('features[activeFeature]:', this.features[this.activeFeature]);
    console.log('================================');
  }
}