import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgFor } from '@angular/common';
import { trigger, transition, style, animate, state } from '@angular/animations';

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
    FormsModule
  ],
  standalone: true,
  animations: [
    trigger('fadeInOut', [
      state('void', style({ opacity: 0 })),
      transition('void <=> *', animate('400ms ease-in-out')),
    ]),
    trigger('expandPanel', [
      state('collapsed', style({ height: '0', opacity: 0 })),
      state('expanded', style({ height: '*', opacity: 1 })),
      transition('collapsed <=> expanded', animate('300ms ease-out'))
    ])
    ,
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
  itemsPerPage: number = 3; // Nombre de freelances par page
  totalPages: number = 1;
  Math = Math;
  filteredFreelances: Freelance[] = [];
  paginatedFreelances: Freelance[] = [];
  showFreelancesSection: boolean = false;
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
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    if (this.isBrowser) {
      this.startRotation();
    }
    
    // Charger tous les freelances au lieu des freelances en vedette
    // this.loadAllFreelances();
  }
  
  toggleFreelancesSection() {
    this.showFreelancesSection = !this.showFreelancesSection;
    
    // Si on ouvre la section et qu'on n'a pas encore chargé les freelances
    if (this.showFreelancesSection && this.allFreelances.length === 0) {
      this.loadAllFreelances();
    }
    
    // Si on ouvre la section, défiler vers la section des freelances
    if (this.showFreelancesSection) {
      // Définir un délai pour laisser le temps à l'animation de se produire
      setTimeout(() => {
        const freelanceSection = document.querySelector('.freelance-list-section');
        if (freelanceSection) {
          freelanceSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 400); // délai correspondant à la durée de l'animation
    } else {
      // Si on ferme la section, défiler vers la fonctionnalité "Explorez les portfolios"
      setTimeout(() => {
        this.activeFeature = 1; // Index de la fonctionnalité "Explorez les portfolios"
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
        // Initialiser les freelances filtrés
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
    
    // Faire défiler vers le portfolio
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

  contactFreelance(freelance: Freelance, event: Event) {
    event.preventDefault();
    event.stopPropagation();
    
    // Vous pouvez soit ouvrir une modal de contact, soit rediriger vers une page dédiée
    this.router.navigate(['/contact-freelance', freelance.id]);
  }

// Ajoutez ces méthodes:

// Méthode pour filtrer les freelances selon la recherche et les filtres
filterFreelances() {
  let result = [...this.allFreelances];
  
  // Appliquer le filtre de recherche
  if (this.searchTerm.trim() !== '') {
    const term = this.searchTerm.toLowerCase().trim();
    result = result.filter(freelance => 
      freelance.prenom?.toLowerCase().includes(term) || 
      freelance.nom?.toLowerCase().includes(term) ||
       (freelance.competences && freelance.competences.toLowerCase().includes(term))
    );
  }
  
  // Appliquer le filtre de catégorie
  if (this.activeFilter !== 'all') {
    result = result.filter(freelance => 
      freelance.competences && freelance.competences.toLowerCase().includes(this.activeFilter.toLowerCase())
    );
  }
  
  this.filteredFreelances = result;
  this.totalPages = Math.ceil(this.filteredFreelances.length / this.itemsPerPage);
  this.currentPage = 1; // Retour à la première page après filtrage
  this.updatePaginatedFreelances();
}

// Mise à jour des freelances paginés
updatePaginatedFreelances() {
  const startIndex = (this.currentPage - 1) * this.itemsPerPage;
  const endIndex = Math.min(startIndex + this.itemsPerPage, this.filteredFreelances.length);
  this.paginatedFreelances = this.filteredFreelances.slice(startIndex, endIndex);
}

// Changement de page
changePage(pageNumber: number) {
  if (pageNumber < 1 || pageNumber > this.totalPages) {
    return;
  }
  this.currentPage = pageNumber;
  this.updatePaginatedFreelances();
  
  // Défilement en douceur vers le haut de la liste
  const element = document.querySelector('.freelance-list-section');
  if (element) {
    element.scrollIntoView({ 
      behavior: 'smooth', 
      block: 'start' 
    });
  }
}

// Changer le filtre actif
setFilter(filter: string) {
  this.activeFilter = filter;
  this.filterFreelances();
}

// Réinitialiser les filtres
resetFilters() {
  this.searchTerm = '';
  this.activeFilter = 'all';
  this.filterFreelances();
}

// Obtenir la liste des numéros de page à afficher
getPageNumbers(): number[] {
  // Logique pour limiter le nombre de boutons de page affichés
  const pages: number[] = [];
  const maxPagesToShow = 5;
  
  if (this.totalPages <= maxPagesToShow) {
    // Afficher toutes les pages si le total est inférieur à maxPagesToShow
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Logique pour afficher les pages autour de la page actuelle
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

// Extraire la ville de l'adresse
extractCity(address: string): string {
  if (!address) return '';
  
  // Essayer d'extraire le code postal et la ville
  const parts = address.split(',');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  
  return address;
}

// Formater le numéro de téléphone
formatPhone(phone: string): string {
  if (!phone) return '';
  
  // Formater le numéro de téléphone : 07 12 34 56 78
  return phone.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
}

// Obtenir la catégorie principale
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
    }
  }

}