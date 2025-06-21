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
    ReactiveFormsModule // ✅ AJOUTÉ pour le formulaire de contact
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
    // ✅ NOUVELLE animation pour la modal de contact
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

  // ✅ NOUVELLES propriétés pour le formulaire de contact
  showContactModal: boolean = false;
  selectedFreelanceForContact: Freelance | null = null;
  contactForm: FormGroup;
  isSubmittingContact: boolean = false;

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

  constructor(
    private router: Router,
    private freelanceService: FreelanceService,
    private fb: FormBuilder, // ✅ AJOUTÉ pour le FormBuilder
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // ✅ INITIALISATION du formulaire de contact
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      freelanceId: [''] // ✅ Champ caché pour identifier le freelance contacté
    });
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startRotation();
    }
  }
  
  toggleFreelancesSection() {
    this.showFreelancesSection = !this.showFreelancesSection;
    
    if (this.showFreelancesSection && this.allFreelances.length === 0) {
      this.loadAllFreelances();
    }
    
    if (this.showFreelancesSection) {
      setTimeout(() => {
        const freelanceSection = document.querySelector('.freelance-list-section');
        if (freelanceSection) {
          freelanceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400);
    } else {
      setTimeout(() => {
        this.activeFeature = 1;
        const featureDisplay = document.querySelector('.feature-display');
        if (featureDisplay) {
          featureDisplay.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  loadAllFreelances() {
    this.loadingFreelances = true;
    this.freelanceService.getAllFreelances().subscribe({
      next: (freelances: Freelance[]) => {
        this.allFreelances = freelances;
        this.filteredFreelances = [...freelances];
        this.totalPages = Math.ceil(this.filteredFreelances.length / this.itemsPerPage);
        this.updatePaginatedFreelances();
        this.loadingFreelances = false;
      },
      error: (error: any) => {
        console.error('Erreur lors du chargement des freelances:', error);
        this.loadingFreelances = false;
      }
    });
  }

  viewFreelancePortfolio(freelanceId: number) {
    this.selectedFreelanceId = freelanceId;
    this.showPortfolio = true;
    
    setTimeout(() => {
      const portfolioElement = document.getElementById('freelance-portfolio');
      if (portfolioElement) {
        portfolioElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }

  closePortfolio() {
    this.showPortfolio = false;
    this.selectedFreelanceId = null;
  }

  // ==========================================
  // 📧 NOUVELLES MÉTHODES POUR LE CONTACT
  // ==========================================

  /**
   * ✅ NOUVEAU : Ouvre la modal de contact pour un freelance
   */
  contactFreelance(freelance: Freelance, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    console.log('Ouverture du formulaire de contact pour:', freelance.prenom, freelance.nom);
    
    // Stocker le freelance sélectionné
    this.selectedFreelanceForContact = freelance;
    
    // Pré-remplir le formulaire
    this.contactForm.patchValue({
      subject: `Demande de prestation - ${freelance.prenom} ${freelance.nom}`,
      freelanceId: freelance.id,
      name: '', // Sera rempli par l'utilisateur
      email: '', // Sera rempli par l'utilisateur
      message: `Bonjour ${freelance.prenom},\n\nJe souhaiterais en savoir plus sur vos services.\n\nCordialement.`
    });
    
    // Afficher la modal
    this.showContactModal = true;
    
    // Empêcher le scroll en arrière-plan
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  /**
   * ✅ NOUVEAU : Ferme la modal de contact
   */
  closeContactModal() {
    this.showContactModal = false;
    this.selectedFreelanceForContact = null;
    this.contactForm.reset();
    
    // Rétablir le scroll
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  /**
   * ✅ NOUVEAU : Soumet le formulaire de contact
   */
  onSubmitContact() {
    if (this.contactForm.invalid) {
      // Marquer tous les champs comme touchés pour afficher les erreurs
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmittingContact = true;
    const formData = this.contactForm.value;

    console.log('Envoi du message de contact:', formData);

    // Simuler l'envoi (remplacez par votre service)
    setTimeout(() => {
      this.isSubmittingContact = false;
      
      // Afficher un message de succès
      alert(`Merci ${formData.name} ! Votre message a été envoyé à ${this.selectedFreelanceForContact?.prenom}. Vous recevrez une réponse sous peu.`);
      
      // Fermer la modal
      this.closeContactModal();
      
      // TODO: Intégrer avec votre service de messagerie
      // this.messageService.sendContactMessage(formData).subscribe({
      //   next: (response) => {
      //     this.showSuccessMessage();
      //     this.closeContactModal();
      //   },
      //   error: (error) => {
      //     this.showErrorMessage();
      //   }
      // });
      
    }, 2000); // Simulation d'une requête réseau
  }

  /**
   * ✅ NOUVEAU : Vérifie si un champ a une erreur
   */
  hasFieldError(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

  /**
   * ✅ NOUVEAU : Obtient le message d'erreur pour un champ
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
   * ✅ UTILITAIRE : Obtient le label d'un champ
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
  // 🔄 MÉTHODES EXISTANTES (INCHANGÉES)
  // ==========================================

  startRotation() {
    this.interval = setInterval(() => {
      this.activeFeature = (this.activeFeature + 1) % this.features.length;
    }, 4000);
  }

  setActiveFeature(index: number) {
    this.activeFeature = index;
    this.resetTimer();
  }

  resetTimer() {
    if (this.isBrowser) {
      clearInterval(this.interval);
      this.startRotation();
    }
  }
  
  toggleExpand() {
    this.isExpanded = !this.isExpanded;
  }

  filterFreelances() {
    let result = [...this.allFreelances];
    
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      result = result.filter(freelance => 
        freelance.prenom?.toLowerCase().includes(term) || 
        freelance.nom?.toLowerCase().includes(term) ||
         (freelance.competences && freelance.competences.toLowerCase().includes(term))
      );
    }
    
    if (this.activeFilter !== 'all') {
      result = result.filter(freelance => 
        freelance.competences && freelance.competences.toLowerCase().includes(this.activeFilter.toLowerCase())
      );
    }
    
    this.filteredFreelances = result;
    this.totalPages = Math.ceil(this.filteredFreelances.length / this.itemsPerPage);
    this.currentPage = 1;
    this.updatePaginatedFreelances();
  }

  updatePaginatedFreelances() {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredFreelances.length);
    this.paginatedFreelances = this.filteredFreelances.slice(startIndex, endIndex);
  }

  changePage(pageNumber: number) {
    if (pageNumber < 1 || pageNumber > this.totalPages) {
      return;
    }
    this.currentPage = pageNumber;
    this.updatePaginatedFreelances();
    
    const element = document.querySelector('.freelance-list-section');
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
      });
    }
  }

  setFilter(filter: string) {
    this.activeFilter = filter;
    this.filterFreelances();
  }

  resetFilters() {
    this.searchTerm = '';
    this.activeFilter = 'all';
    this.filterFreelances();
  }

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

  extractCity(address: string): string {
    if (!address) return '';
    
    const parts = address.split(',');
    if (parts.length > 1) {
      return parts[parts.length - 1].trim();
    }
    
    return address;
  }

  formatPhone(phone: string): string {
    if (!phone) return '';
    
    return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
  }

  getMainCategory(competences: string): string {
    if (!competences) return 'Beauté';
    
    const categories = competences.split(',');
    if (categories.length > 0) {
      return categories[0].trim();
    }
    
    return 'Beauté';
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      clearInterval(this.interval);
      // Rétablir le scroll au cas où la modal serait ouverte
      document.body.style.overflow = 'auto';
    }
  }
}