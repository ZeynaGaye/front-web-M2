import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import { ProFreeComponent } from "../pro-free/pro-free.component";
import { SalonRegistrationComponent } from "../salon-registration/salon-registration.component";
import { JobOfferComponent } from "../job-offer/job-offer.component";
import { RouterModule, RouterOutlet } from '@angular/router';
import { ClientSectionComponent } from '../client-section/client-section.component';
import { RecommendationsComponent } from '../recommendations/recommendations.component';
import { RecommendationData } from '../../services/recommendation.service';



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
    SalonRegistrationComponent,
    JobOfferComponent,
    RecommendationsComponent,
    OpportunitesEmploiComponent,
    HeaderComponent,
],
  templateUrl: './accueil.component.html',
  styleUrl: './accueil.component.scss'
})
export class AccueilComponent implements OnInit, OnDestroy, AfterViewInit {

  private destroy$ = new Subject<void>();

  // ==================== PROPRIÉTÉS RECOMMANDATIONS ====================
  showRecommendations = true;
  userLocation: { lat?: number, lon?: number } = {};

  // ==================== PROPRIÉTÉS OPPORTUNITÉS D'EMPLOI ====================
  showJobOpportunities = true;
  maxJobOffersOnHomepage = 3;
  searchQuery = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  ngOnInit(): void {
    this.route.queryParams.pipe(takeUntil(this.destroy$)).subscribe(params => {
      this.searchQuery = params['q'] || '';
    });
    this.getCurrentLocation();
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;

    import('motion').then(({ animate }) => {
      const EASE = [0.22, 1, 0.36, 1] as [number, number, number, number];

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const el = entry.target as HTMLElement;
          const i = Number(el.dataset['revealIndex'] ?? 0);
          animate(el as any,
            { opacity: [0, 1], transform: ['translateY(40px)', 'translateY(0px)'] },
            { duration: 0.7, delay: i * 0.05, ease: EASE }
          );
          observer.unobserve(el);
        });
      }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

      document.querySelectorAll<HTMLElement>('.reveal-section').forEach((el, i) => {
        el.dataset['revealIndex'] = String(i);
        observer.observe(el);
      });
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ==================== GESTIONNAIRES RECOMMANDATIONS ====================

  /**
   *  Naviguer vers le détail d'un salon
   */
  onSalonClick(salon: RecommendationData): void {

    this.router.navigate(['/salon', salon.id]);
  }

  /**
   *  Voir tous les salons d'une section
   */
  onViewAllSection(event: { section: string, data: RecommendationData[] }): void {


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
   *  Gestion des favoris
   */
  onFavoriteToggle(event: { salon: RecommendationData, isFavorite: boolean }): void {

  }

  /**
   *  CTA recommandations
   */
  onRecommendationCta(): void {

    this.router.navigate(['/recherche-avancee']);
  }

  // ====================  GESTIONNAIRES OPPORTUNITÉS D'EMPLOI ====================

  /**
   *  Clic sur une offre d'emploi depuis la page d'accueil
   */
  onJobOfferClick(offre: OffreEmploi): void {


    // Naviguer vers les détails de l'offre
    this.router.navigate(['/emploi', offre.id]);
  }

  /**
   *  Voir toutes les opportunités d'emploi
   */
  onViewAllJobOffers(): void {

    this.router.navigate(['/opportunites-emploi']);
  }

  /**
   *  Changement de filtre depuis la page d'accueil
   */
  onJobFilterChange(filter: { type: string, value: string }): void {


    // Naviguer vers la page complète avec le filtre appliqué
    this.router.navigate(['/opportunites-emploi'], {
      queryParams: { [filter.type]: filter.value }
    });
  }

  // ==================== MÉTHODES PRIVÉES ====================

  /**
   *  Obtenir la géolocalisation
   */
  private getCurrentLocation(): void {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lon: position.coords.longitude
          };

        },
        (error) => {
          console.warn(' Géolocalisation échouée:', error);
        },
        {
          timeout: 5000,
          enableHighAccuracy: false
        }
      );
    }
  }
}
