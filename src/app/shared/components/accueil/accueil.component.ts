import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ProFreeComponent } from "../pro-free/pro-free.component";
import { JobOfferComponent } from "../job-offer/job-offer.component";
import { RouterModule, RouterOutlet } from '@angular/router';
import { ClientSectionComponent } from '../client-section/client-section.component';
import { RecommendationsComponent } from '../recommendations/recommendations.component';
import { RecommendationData } from '../../services/recommendation.service';

// 🆕 Import du composant opportunités d'emploi

import { OffreEmploi } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';
import { OpportunitesEmploiComponent } from '../../../freelance/components/opportunites-emploi/opportunites-emploi.component';
import { HeaderComponent } from '../header/header.component';

@Component({
  selector: 'app-accueil',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule, 
    ProFreeComponent, 
    HeaderComponent,
    // JobOfferComponent,
    ClientSectionComponent,
    RecommendationsComponent,
    OpportunitesEmploiComponent // 🆕 Ajout du composant
  ],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent implements OnInit, OnDestroy {
  
  private destroy$ = new Subject<void>();
  
  // ==================== PROPRIÉTÉS RECOMMANDATIONS ====================
  showRecommendations = true;
  userLocation: { lat?: number, lon?: number } = {};
  
  // ==================== PROPRIÉTÉS OPPORTUNITÉS D'EMPLOI ====================
  showJobOpportunities = true;
  maxJobOffersOnHomepage = 6; // Limite pour la page d'accueil
  
  constructor(private router: Router) {}

  ngOnInit(): void {
    console.log('🏠 Composant Accueil initialisé');
    
    // Essayer d'obtenir la géolocalisation
    this.getCurrentLocation();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== GESTIONNAIRES RECOMMANDATIONS ====================

  /**
   * 👆 Naviguer vers le détail d'un salon
   */
  onSalonClick(salon: RecommendationData): void {
    console.log('🏠 Navigation vers salon:', salon.nom);
    this.router.navigate(['/salon', salon.id]);
  }

  /**
   * 👆 Voir tous les salons d'une section
   */
  onViewAllSection(event: { section: string, data: RecommendationData[] }): void {
    console.log('🏠 Voir section:', event.section);
    
    switch (event.section) {
      case 'populaires':
        this.router.navigate(['/salons'], { 
          queryParams: { filter: 'populaires' } 
        });
        break;
      case 'proches':
        this.router.navigate(['/salons'], { 
          queryParams: { 
            filter: 'proximite',
            lat: this.userLocation.lat,
            lon: this.userLocation.lon
          } 
        });
        break;
      case 'coiffure':
      case 'manucure':
      case 'barber':
        this.router.navigate(['/salons'], { 
          queryParams: { service: event.section } 
        });
        break;
      default:
        this.router.navigate(['/salons']);
    }
  }

  /**
   * ❤️ Gestion des favoris
   */
  onFavoriteToggle(event: { salon: RecommendationData, isFavorite: boolean }): void {
    console.log('🏠 Toggle favori:', event.salon.nom, event.isFavorite);
  }

  /**
   * 🔍 CTA recommandations
   */
  onRecommendationCta(): void {
    console.log('🏠 CTA recommandations cliqué');
    this.router.navigate(['/recherche-avancee']);
  }

  // ==================== 🆕 GESTIONNAIRES OPPORTUNITÉS D'EMPLOI ====================

  /**
   * 💼 Clic sur une offre d'emploi depuis la page d'accueil
   */
  onJobOfferClick(offre: OffreEmploi): void {
    console.log('💼 Clic sur offre depuis accueil:', offre.titre);
    
    // Naviguer vers les détails de l'offre
    this.router.navigate(['/emploi', offre.id]);
  }

  /**
   * 📋 Voir toutes les opportunités d'emploi
   */
  onViewAllJobOffers(): void {
    console.log('📋 Voir toutes les opportunités depuis accueil');
    this.router.navigate(['/opportunites-emploi']);
  }

  /**
   * 🔍 Changement de filtre depuis la page d'accueil
   */
  onJobFilterChange(filter: { type: string, value: string }): void {
    console.log('🔍 Changement de filtre depuis accueil:', filter);
    
    // Naviguer vers la page complète avec le filtre appliqué
    this.router.navigate(['/opportunites-emploi'], {
      queryParams: { [filter.type]: filter.value }
    });
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   * 📍 Obtenir la géolocalisation
   */
  private getCurrentLocation(): void {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };
          console.log('📍 Géolocalisation obtenue:', this.userLocation);
        },
        (error) => {
          console.warn('📍 Géolocalisation échouée:', error);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    }
  }
}