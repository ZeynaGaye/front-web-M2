import { Component, inject } from '@angular/core';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { HeaderService } from '../../../shared/services/header/header.service';
import { Router } from '@angular/router';
import { PortfolioComponent } from '../portfolio/portfolio.component';
import { NgFor, NgIf } from '@angular/common';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-home-freelance',
  standalone: true,
  imports: [
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatListModule,
    MatButtonModule,
    MatInputModule,
    MatCardModule,
    MatFormFieldModule,
    PortfolioComponent,
    NgIf,
    NgFor
  ],
  templateUrl: './home-freelance.component.html',
  styleUrls: ['./home-freelance.component.scss']
})
export class HomeFreelanceComponent {
  sidebarOpen = true;
  public headerService = inject(HeaderService);
  private router = inject(Router);
  showPortfolio = false;
  currentSlide = 0;
  autoSlideInterval: any;

  // Données pour le carousel
  beautyImages = [
    {
      url: 'assets/images/belle-femme-peau-foncee-sourit-joyeusement-mange-delicieuses-glaces-pendant-chaudes-journees-ete-porte-lunettes-soleil-serviette-tete-isolee-mur-rose_273609-48553.avif',
      title: 'Maquillage Éclatant',
      description: 'Techniques professionnelles pour un teint radieux'
    },
    {
      url: 'assets/images/ai-genere-portrait-femme-fleur_23-2150693154.avif',
      title: 'Coiffures Tendances',
      description: 'Les dernières créations pour cheveux naturels'
    },
    {
      url: 'assets/images/deux-jeunes-femmes-multiethniques-appliquent-taches-dorees-sous-yeux-se-tiennent-pres-autre-ont-peau-douce-propre-profitent-spa-journee-beaute-isoles-mur-rose_273609-53529.avif',
      title: 'Soins Visage',
      description: 'Routines personnalisées pour chaque type de peau'
    }
  ];

  // Services populaires
  popularServices = [
    { icon: 'face', name: 'Maquillage', price: '€60-120' },
    { icon: 'cut', name: 'Coiffure', price: '€45-90' },
    { icon: 'spa', name: 'Soin Visage', price: '€70-150' },
    { icon: 'colorize', name: 'Coloration', price: '€80-160' },
    { icon: 'local_offer', name: 'Onglerie', price: '€35-75' },
    // { icon: 'style', name: 'Stylisme', price: '€90-180' }
  ];

  get username() {
    return this.headerService.username();
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  navigateToPortfolio() {
    this.showPortfolio = true;
  }

  navigateToOpportunities() {
    this.router.navigate(['/freelance/opportunites-emploi']);
  }

  ngOnInit() {
    this.startAutoSlide();
  }
  
  ngOnDestroy() {
    this.stopAutoSlide();
  }
  
  startAutoSlide() {
    this.autoSlideInterval = setInterval(() => {
      this.nextSlide();
    }, 5000); // Change toutes les 5 secondes
  }
  
  stopAutoSlide() {
    if (this.autoSlideInterval) {
      clearInterval(this.autoSlideInterval);
    }
  }
  
  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.beautyImages.length;
    this.resetAutoSlide();
  }
  
  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.beautyImages.length) % this.beautyImages.length;
    this.resetAutoSlide();
  }
  
  goToSlide(index: number) {
    this.currentSlide = index;
    this.resetAutoSlide();
  }
  
  resetAutoSlide() {
    this.stopAutoSlide();
    this.startAutoSlide();
  }
}