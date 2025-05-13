import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, Input } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { trigger, transition, style, animate, state, query, stagger } from '@angular/animations';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { PortfolioService } from '../../services/portfolio.service';
import { FreelanceService } from '../../services/freelance.service';

import { AddPortfolioItemComponent } from '../add-portfolio-item/add-portfolio-item.component';
import { EditPortfolioItemDialogComponent } from '../edit-portfolio-item-dialog/edit-portfolio-item-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';
import { register } from 'swiper/element/bundle';
import { finalize } from 'rxjs/operators';
import { Freelance, PortfolioItem } from '../../../models/PortfolioItem';
import { PortfolioAuthManagerService } from '../../services/portfolio-auth-manager-service.service';


// Enregistrer Swiper comme élément personnalisé
register();

@Component({
  selector: 'app-portfolio',
  templateUrl: './portfolio.component.html',
  styleUrls: ['./portfolio.component.scss'],
  standalone: true,
  imports: [
    CommonModule, 
    RouterModule, 
    MatIconModule, 
    MatButtonModule, 
    MatTooltipModule, 
    MatSnackBarModule,
    MatDialogModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  animations: [
    trigger('portfolioAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(50px)' }),
          stagger(100, [
            animate('0.5s ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ])
  ]
})
export class PortfolioComponent implements OnInit, OnDestroy, AfterViewInit {
  // Paramètre d'entrée pour forcer le mode "client" (pour la section client)
  @Input() clientMode: boolean = false;
  @Input() freelanceId: number | null = null;
  
  // Variables pour le portfolio
  swiperInstances: { [key: number]: any } = {};
  userLikes: Set<number> = new Set<number>();
  portfolioItems: PortfolioItem[] = [];
  loading: boolean = true;
  error: boolean = false;
  isImageLoading = true;
  activeFilter: string = 'all';
  autoplayStatus: { [key: number]: boolean } = {};
  
  // Freelance complet avec toutes les informations
  freelanceInfo: Freelance | null = null;
  
  // Statistiques
  stats: any = {
    totalItems: 0,
    totalViews: 0, 
    totalLikes: 0
  };
  
  // Filtres disponibles
  filters = [
    { id: 'all', label: 'Tous' },
    { id: 'coiffure', label: 'Coiffure' },
    { id: 'maquillage', label: 'Maquillage' },
    { id: 'manucure', label: 'Manucure' },
    { id: 'pédicure', label: 'Pédicure' },
    { id: 'massage', label: 'Massage' },
    { id: 'soins', label: 'Soins de la peau' }
  ];
  
  // Configuration Swiper
  swiperConfig = {
    slidesPerView: 1,
    navigation: true,
    pagination: {
      clickable: true
    },
    autoplay: {
      delay: 3000,
      disableOnInteraction: false
    },
    speed: 500,
    loop: true
  };
  
  isBrowser: boolean;

  constructor(
    private portfolioService: PortfolioService,
    private freelanceService: FreelanceService,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    public authManager: PortfolioAuthManagerService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit(): void {
    // Si nous sommes en mode client et qu'aucun ID n'a été fourni, utiliser le paramètre d'URL
    if (this.freelanceId === null) {
      const idParam = this.route.snapshot.paramMap.get('id');
      this.freelanceId = idParam && idParam !== '0' ? +idParam : null;
    }
    
    // Pour le débogage
    console.log('Mode client:', this.clientMode);
    console.log('Freelance ID:', this.freelanceId);
    console.log('User authentifié:', this.authManager.isAuthenticated());
    
    this.loadUserLikes();
    this.loadPortfolio();
    this.loadStats();
    
    // Si nous avons un ID de freelance, charger ses informations complètes
    if (this.freelanceId) {
      this.loadFreelanceInfo(this.freelanceId);
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.portfolioItems.length > 0) {
        this.initSwipers();
      }
    }, 100);
  }

  // Méthode pour charger les informations complètes du freelance
  loadFreelanceInfo(freelanceId: number): void {
    this.freelanceService.getFreelanceById(freelanceId).subscribe({
      next: (freelance) => {
        this.freelanceInfo = freelance;
        console.log('Informations du freelance chargées:', this.freelanceInfo);
        
        // Mettre à jour les informations du freelance dans tous les éléments du portfolio
        this.portfolioItems = this.portfolioItems.map(item => ({
          ...item,
          freelance: this.freelanceInfo || item.freelance
        }));
      },
      error: (error) => {
        console.error('Erreur lors du chargement des informations du freelance:', error);
        // On ne définit pas error = true ici pour ne pas bloquer l'affichage du portfolio
      }
    });
  }

  // Initialiser tous les Swipers
  initSwipers(): void {
    const swiperElements = document.querySelectorAll('swiper-container');
    if (swiperElements.length > 0) {
      swiperElements.forEach((element: any) => {
        const itemId = element.getAttribute('data-item-id');
        if (itemId) {
          // Configurer le swiper
          Object.assign(element, this.swiperConfig);
          element.initialize();
          
          // Stocker l'instance
          this.swiperInstances[parseInt(itemId)] = element;
          
          // Initialiser l'état autoplay
          this.autoplayStatus[parseInt(itemId)] = true;
        }
      });
    }
  }

  loadPortfolio(): void {
    this.loading = true;
    this.error = false;
    
    const portfolioObservable = this.freelanceId !== null 
      ? this.portfolioService.getFreelancePortfolio(this.freelanceId)
      : this.portfolioService.getCurrentUserPortfolio();
    
    portfolioObservable
      .pipe(finalize(() => this.loading = false))
      .subscribe({
        next: (items) => {
          // Mapper les éléments et ajouter isExpanded et les URLs des images
          this.portfolioItems = items.map(item => ({
            ...item,
            isExpanded: false,
            images: item.images?.map(img => ({
              ...img,
              url: this.portfolioService.getImageUrl(img.url)
            })) || [],
            // Ajouter isOwner uniquement si on est en mode freelance
            isOwner: !this.clientMode && this.authManager.isOwnerOfPortfolio(item.freelanceId)
          }));
          
          console.log('Éléments de portfolio chargés:', this.portfolioItems);
          console.log('isOwner défini sur:', this.portfolioItems.map(item => item.isOwner));
          
          // Si nous avons déjà les informations du freelance, les mettre à jour
          if (this.freelanceInfo) {
            this.portfolioItems = this.portfolioItems.map(item => ({
              ...item,
              freelance: this.freelanceInfo || item.freelance
            }));
          } 
          // Si nous n'avons pas encore les infos du freelance mais que tous les éléments partagent le même freelanceId
          else if (this.portfolioItems.length > 0 && !this.freelanceId) {
            const firstItem = this.portfolioItems[0];
            if (firstItem.freelanceId) {
              this.loadFreelanceInfo(firstItem.freelanceId);
            }
          }
          
          // Initialiser les swipers après le chargement
          setTimeout(() => this.initSwipers(), 100);
        },
        error: (error) => {
          console.error('Error loading portfolio', error);
          this.error = true;
        }
      });
  }
  
  loadStats(): void {
    if (this.clientMode) {
      // En mode client, nous ne chargeons pas les statistiques
      return;
    }
    
    const statsObservable = this.freelanceId !== null
      ? this.portfolioService.getPortfolioStats(this.freelanceId)
      : this.portfolioService.getCurrentUserPortfolioStats();
    
    statsObservable.subscribe({
      next: (stats) => this.stats = stats,
      error: (error) => console.error('Error loading stats', error)
    });
  }

  // Méthode pour vérifier si une description devrait être tronquée
  shouldShowMore(description: string | undefined): boolean {
    if (!description) return false;
    return description.length > 100; // Limite de caractères avant troncature
  }
  
  // Méthode pour basculer l'état d'expansion d'une description
  toggleExpand(item: PortfolioItem): void {
    item.isExpanded = !item.isExpanded;
  }

  get categories(): string[] {
    if (!this.portfolioItems || this.portfolioItems.length === 0) return [];
    
    const allCategories = new Set<string>();
    this.portfolioItems.forEach(item => {
      if (item.categories) {
        item.categories.forEach(cat => allCategories.add(cat));
      }
    });
    
    return Array.from(allCategories);
  }

  filterByCategory(category: string): void {
    this.activeFilter = category;
  }

  get filteredItems(): PortfolioItem[] {
    if (this.activeFilter === 'all') return this.portfolioItems;
    return this.portfolioItems.filter(item => 
      item.categories?.includes(this.activeFilter)
    );
  }

  trackById(index: number, item: PortfolioItem): number {
    return item.id || index;
  }

  likeItem(itemId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    // Si l'utilisateur n'est pas authentifié, afficher un message et rediriger
    if (!this.authManager.isAuthenticated()) {
      this.snackBar.open('Vous devez être connecté pour aimer cet élément', 'Se connecter', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      });
      return;
    }
    
    // Vérifier si l'item est déjà liké par l'utilisateur
    const isLiked = this.userLikes.has(itemId);
    
    // Appeler le service approprié selon l'état actuel
    const likeObservable = isLiked 
      ? this.portfolioService.unlikeItem(itemId)
      : this.portfolioService.likeItem(itemId);
    
    likeObservable.subscribe({
      next: (updatedItem) => {
        const index = this.portfolioItems.findIndex(item => item.id === itemId);
        if (index !== -1) {
          this.portfolioItems[index] = {
            ...updatedItem,
            isExpanded: this.portfolioItems[index].isExpanded,
            freelance: this.portfolioItems[index].freelance
          };
          
          // Mettre à jour les stats totales
          if (isLiked) {
            this.stats.totalLikes = Math.max(0, (this.stats.totalLikes || 0) - 1);
            this.userLikes.delete(itemId);
          } else {
            this.stats.totalLikes = (this.stats.totalLikes || 0) + 1;
            this.userLikes.add(itemId);
          }
          
          // Animation pour le like
          const likeIcon = document.querySelector(`[data-item-id="${itemId}"] .liked-icon`);
          if (likeIcon) {
            likeIcon.classList.add('like-animation');
            setTimeout(() => {
              likeIcon.classList.remove('like-animation');
            }, 1000);
          }
        }
      },
      error: (error) => {
        // Si l'erreur est 401 (Non authentifié)
        if (error.status === 401) {
          this.snackBar.open('Vous devez être connecté pour aimer cet élément', 'Se connecter', {
            duration: 5000
          }).onAction().subscribe(() => {
            this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
          });
        } else {
          console.error('Erreur lors du like', error);
          this.snackBar.open('Une erreur est survenue', 'Fermer', {
            duration: 3000
          });
        }
      }
    });
  }
  isLikedByUser(itemId: number): boolean {
    return this.userLikes.has(itemId);
  }
  // Charger les likes de l'utilisateur
loadUserLikes(): void {
  this.portfolioService.getUserLikes().subscribe({
    next: (likedItemsIds) => {
      // Réinitialiser les likes de l'utilisateur
      this.userLikes.clear();
      
      // Ajouter les IDs des éléments likés par l'utilisateur
      likedItemsIds.forEach(id => this.userLikes.add(id));
    },
    error: (error) => console.error('Error loading user likes', error)
  });
}
openAddPortfolioDialog(): void {
  // N'est accessible qu'en mode propriétaire
  if (this.clientMode) {
    return;
  }
  
  const dialogRef = this.dialog.open(AddPortfolioItemComponent, {
    width: '80%',
    maxWidth: '600px',
    disableClose: true
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result === 'success') {
      this.loadPortfolio();
      this.loadStats();
    }
  });
}

editItem(item: PortfolioItem): void {
  // N'est accessible qu'en mode propriétaire
  if (this.clientMode || !item.isOwner) {
    return;
  }
  
  const dialogRef = this.dialog.open(EditPortfolioItemDialogComponent, {
    width: '600px',
    data: { item }
  });

  dialogRef.afterClosed().subscribe(result => {
    if (result) {
      this.loadPortfolio();
    }
  });
}

deleteItem(item: PortfolioItem): void {
  // N'est accessible qu'en mode propriétaire
  if (this.clientMode || !item.isOwner) {
    return;
  }
  
  // Afficher un état de chargement avant d'ouvrir la boîte de dialogue
  const itemIndex = this.portfolioItems.findIndex(i => i.id === item.id);
  if (itemIndex !== -1) {
    this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: true };
  }

  const dialogRef = this.dialog.open(ConfirmDialogComponent, {
    width: '400px',
    disableClose: true,
    data: {
      title: 'Confirmer la suppression',
      message: `Êtes-vous sûr de vouloir supprimer "${item.titre}" ? Cette action est irréversible.`
    }
  });

  dialogRef.afterClosed().subscribe(result => {
    // Réinitialiser l'état de chargement
    if (itemIndex !== -1) {
      this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: false };
    }

    if (result && item.id) {
      // Ajouter un état de chargement pour la suppression
      if (itemIndex !== -1) {
        this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: true };
      }

      this.portfolioService.deletePortfolioItem(item.id).subscribe({
        next: () => {
          // Suppression réussie - retirer l'élément de la liste
          this.portfolioItems = this.portfolioItems.filter(i => i.id !== item.id);
          
          // Mettre à jour les statistiques
          this.stats.totalItems = (this.stats.totalItems || 0) - 1;
          this.stats.totalViews = (this.stats.totalViews || 0) - (item.nombreVues || 0);
          this.stats.totalLikes = (this.stats.totalLikes || 0) - (item.nombreLikes || 0);
          
          // Afficher un message de succès
          this.snackBar.open(`"${item.titre}" a été supprimé avec succès`, 'Fermer', {
            duration: 3000,
            panelClass: 'success-snackbar'
          });
        },
        error: (err) => {
          console.error('Erreur lors de la suppression:', err);
          // Réinitialiser l'état de chargement en cas d'erreur
          if (itemIndex !== -1) {
            this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: false };
          }
          // Afficher un message d'erreur
          this.snackBar.open('Erreur lors de la suppression. Veuillez réessayer.', 'Fermer', {
            duration: 4000,
            panelClass: 'error-snackbar'
          });
        }
      });
    }
  });
}
// Toggle autoplay pour Swiper
toggleAutoplay(itemId: number, event: Event): void {
  event.stopPropagation();
  event.preventDefault();
  
  const swiper = this.swiperInstances[itemId];
  if (!swiper) return;
  
  if (this.autoplayStatus[itemId]) {
    swiper.swiper.autoplay.stop();
    this.autoplayStatus[itemId] = false;
  } else {
    swiper.swiper.autoplay.start();
    this.autoplayStatus[itemId] = true;
  }
}

onImageLoad(): void {
  this.isImageLoading = false;
}

onImageError(event: Event): void {
  const imgElement = event.target as HTMLImageElement;
  imgElement.src = 'assets/images/image-placeholder.jpg';
  this.isImageLoading = false;
}
// Méthode pour contacter un freelance
contactFreelance(freelance: Freelance, event: Event): void {
  if (!freelance) return;
  
  event.stopPropagation();
  
  let message = `Contacter ${freelance.prenom} ${freelance.nom}`;
  if (freelance.telephone) {
    message += ` au ${freelance.telephone}`;
  }
  if (freelance.email) {
    message += ` / ${freelance.email}`;
  }
  
  this.snackBar.open(message, 'Fermer', {
    duration: 5000
  });
  
  // Rediriger vers une page de contact
  // this.router.navigate(['/contact', freelance.id]);
}
ngOnDestroy(): void {
  // Nettoyage des instances Swiper si nécessaire
}
}