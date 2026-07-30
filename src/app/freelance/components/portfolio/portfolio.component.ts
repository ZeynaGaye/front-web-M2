import { isPlatformBrowser, CommonModule } from '@angular/common';
import { Component, Inject, NgZone, OnDestroy, OnInit, PLATFORM_ID, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, Input, HostListener } from '@angular/core';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { trigger, transition, style, animate, state, query, stagger } from '@angular/animations';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
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
    MatProgressSpinnerModule,
    FormsModule,
    ReactiveFormsModule
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
    ]),
    trigger('modalAnimation', [
      state('closed', style({ 
        opacity: 0,
        transform: 'scale(0.9)',
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
export class PortfolioComponent implements OnInit, OnDestroy, AfterViewInit {
  // Paramètres d'entrée existants
  @Input() clientMode: boolean = false;
  @Input() freelanceId: number | null = null;
  @Input() hideHeader: boolean = false;
  
  // Variables existantes pour le portfolio
  swiperInstances: { [key: number]: any } = {};
  userLikes: Set<number> = new Set<number>();
  portfolioItems: PortfolioItem[] = [];
  loading: boolean = true;
  error: boolean = false;
  isImageLoading = true;
  activeFilter: string = 'all';
  autoplayStatus: { [key: number]: boolean } = {};
  freelanceInfo: Freelance | null = null;
  
  //  NOUVEAU : État de chargement séparé pour les infos freelance
  freelanceInfoLoading: boolean = false;
  imagesInitialized: { [itemId: number]: boolean } = {};
  imagesErrors: { [itemId: number]: string } = {};
  portfolioImages: { [itemId: number]: any[] } = {};
  loadingStates: { [key: string]: boolean } = {};
  // Videos par item
  itemVideos: { [itemId: number]: any[] } = {};
  videosLoading: { [itemId: number]: boolean } = {};
  showVideoSection: { [itemId: number]: boolean } = {};
  showAddVideoForm: { [itemId: number]: boolean } = {};
  newVideoTitre: { [itemId: number]: string } = {};
  newVideoLegende: { [itemId: number]: string } = {};
  // Propriétés pour le contact
  showContactModal: boolean = false;
  selectedFreelanceForContact: Freelance | null = null;
  contactForm: FormGroup;
  isSubmittingContact: boolean = false;
  
  // Statistiques
  stats: any = {
    totalItems: 0,
    totalViews: 0,
    totalLikes: 0
  };

  private viewedItems = new Set<number>();
  private intersectionObserver: IntersectionObserver | null = null;
  
  // Filtres : dynamiques depuis les catégories réelles des items
  
  // Configuration Swiper
  swiperConfig = {
    slidesPerView: 1,
    navigation: false,
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
    private fb: FormBuilder,
    public authManager: PortfolioAuthManagerService,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    // Initialisation du formulaire de contact
    this.contactForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', [Validators.required, Validators.minLength(5)]],
      message: ['', [Validators.required, Validators.minLength(10)]],
      freelanceId: [''],
      portfolioContext: ['']
    });
  }

  ngOnInit(): void {
    // Si nous sommes en mode client et qu'aucun ID n'a été fourni, utiliser le paramètre d'URL
    if (this.freelanceId === null) {
      const idParam = this.route.snapshot.paramMap.get('id');
      this.freelanceId = idParam && idParam !== '0' ? +idParam : null;
    }
    

    
    this.loadUserLikes();
    this.loadStats();
    
    //  NOUVEAU : Chargement simultané du portfolio ET des infos freelance
    this.loadPortfolioAndFreelanceInfo();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.portfolioItems.length > 0) {
        this.initSwipers();
      }
    }, 100);
  }

  // ==========================================
  //  NOUVELLE MÉTHODE DE CHARGEMENT OPTIMISÉE
  // ==========================================

  /**
   *  NOUVELLE : Charge le portfolio ET les infos freelance simultanément
   */
  loadPortfolioAndFreelanceInfo(): void {
    this.loading = true;
    this.freelanceInfoLoading = true;
    this.error = false;
    

    
    // Déterminer l'observable du portfolio selon le mode
    const portfolioObservable = this.freelanceId !== null 
      ? this.portfolioService.getFreelancePortfolio(this.freelanceId)
      : this.portfolioService.getCurrentUserPortfolio();
    
    // Charger le portfolio en premier
    portfolioObservable.subscribe({
      next: (items) => {

        
        // Traiter les éléments du portfolio
        this.portfolioItems = items.map(item => ({
          ...item,
          isExpanded: false,
          images: item.images?.map(img => ({
            ...img,
            url: this.portfolioService.getImageUrl(img.url)
          })) || [],
          isOwner: !this.clientMode && this.authManager.isOwnerOfPortfolio(item.freelanceId)
        }));
        
        this.loading = false;
        
        //  CRUCIAL : Déterminer l'ID du freelance à charger
        let freelanceIdToLoad: number | null = null;
        
        if (this.freelanceId) {
          // Cas 1: ID fourni en paramètre (mode client avec URL)
          freelanceIdToLoad = this.freelanceId;

        } else if (this.portfolioItems.length > 0 && this.portfolioItems[0].freelanceId) {
          // Cas 2: ID depuis le premier élément du portfolio (mode propriétaire)
          freelanceIdToLoad = this.portfolioItems[0].freelanceId;

        }
        
        // Charger les infos du freelance si on a un ID
        if (freelanceIdToLoad) {
          this.loadFreelanceInfoById(freelanceIdToLoad);
        } else {
          console.warn(' Aucun ID freelance trouvé');
          this.freelanceInfoLoading = false;
        }
        
        // Initialiser les swipers et le tracking des vues après le chargement
        setTimeout(() => {
          this.initSwipers();
          this.setupViewTracking();
        }, 300);
      },
      error: (error) => {
        console.error(' Erreur chargement portfolio:', error);
        this.loading = false;
        this.freelanceInfoLoading = false;
        this.error = true;
      }
    });
  }

  /**
   *  AMÉLIORÉE : Charge les infos du freelance par ID
   */
  loadFreelanceInfoById(freelanceId: number): void {

    
    this.freelanceService.getFreelanceById(freelanceId).subscribe({
      next: (freelance) => {

        
        this.freelanceInfo = freelance;
        this.freelanceInfoLoading = false;
        
        // Mettre à jour tous les éléments du portfolio avec ces infos
        this.portfolioItems = this.portfolioItems.map(item => ({
          ...item,
          freelance: freelance
        }));
        

      },
      error: (error) => {
        console.error(' Erreur chargement infos freelance:', error);
        this.freelanceInfoLoading = false;
        
        // Fallback: essayer d'utiliser les infos depuis le portfolio
        if (this.portfolioItems.length > 0 && this.portfolioItems[0].freelance) {

          this.freelanceInfo = this.portfolioItems[0].freelance;
        }
      }
    });
  }

  // ==========================================
  //  MÉTHODES POUR RÉCUPÉRER LES INFOS DU PROPRIÉTAIRE
  // ==========================================

  /**
   *  AMÉLIORÉE : Récupère le nom d'affichage avec fallback intelligent
   */
  getOwnerDisplayName(): string | null {
    // 1. Source principale : freelanceInfo chargé séparément
    if (this.freelanceInfo?.prenom && this.freelanceInfo?.nom) {
      return `${this.freelanceInfo.prenom} ${this.freelanceInfo.nom}`;
    }

    // 2. Fallback : Premier élément du portfolio
    if (this.portfolioItems.length > 0 && this.portfolioItems[0].freelance) {
      const freelance = this.portfolioItems[0].freelance;
      if (freelance.prenom && freelance.nom) {
        return `${freelance.prenom} ${freelance.nom}`;
      }
    }

    // 3. Fallback partiel : prénom seulement
    if (this.freelanceInfo?.prenom) {
      return this.freelanceInfo.prenom;
    }

    // 4. Fallback partiel depuis portfolio
    if (this.portfolioItems.length > 0 && this.portfolioItems[0].freelance?.prenom) {
      return this.portfolioItems[0].freelance.prenom;
    }

    // 5. Aucune info disponible
    return null;
  }

  /**
   *  AMÉLIORÉE : Récupère l'objet freelance complet
   */
  getOwnerInfo(): Freelance | null {
    // 1. Source principale
    if (this.freelanceInfo) {
      return this.freelanceInfo;
    }

    // 2. Fallback depuis portfolio
    if (this.portfolioItems.length > 0 && this.portfolioItems[0].freelance) {
      return this.portfolioItems[0].freelance;
    }

    return null;
  }

  /**
   *  NOUVELLE : Vérifie si on est en cours de chargement
   */
  isLoadingOwnerInfo(): boolean {
    return this.freelanceInfoLoading || this.loading;
  }

  // ==========================================
  // MÉTHODES POUR LE FORMULAIRE DE CONTACT (INCHANGÉES)
  // ==========================================

  contactFreelance(freelance: Freelance, event: Event): void {
    if (!freelance) {
      console.warn(' Tentative de contact avec freelance null');
      return;
    }
    
    event.stopPropagation();
    event.preventDefault();
    

    
    this.selectedFreelanceForContact = freelance;
    
    let contextMessage = '';
    if (this.clientMode) {
      contextMessage = `Bonjour ${freelance.prenom},

J'ai consulté votre magnifique portfolio et je suis très intéressé(e) par vos créations.

Pourriez-vous me contacter pour discuter d'une collaboration ?

Cordialement.`;
    } else {
      contextMessage = `Bonjour ${freelance.prenom},

Je vous contacte après avoir vu votre travail. Vos réalisations sont impressionnantes !

J'aimerais en savoir plus sur vos services.

Cordialement.`;
    }
    
    this.contactForm.patchValue({
      subject: `Demande après consultation de votre portfolio - ${freelance.prenom} ${freelance.nom}`,
      freelanceId: freelance.id,
      portfolioContext: 'portfolio_contact',
      name: '',
      email: '',
      message: contextMessage
    });
    
    this.showContactModal = true;
    
    if (this.isBrowser) {
      document.body.style.overflow = 'hidden';
    }
  }

  closeContactModal(): void {

    
    this.showContactModal = false;
    this.selectedFreelanceForContact = null;
    this.contactForm.reset();
    
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
  }

  onSubmitContact(): void {
    if (this.contactForm.invalid) {

      
      Object.keys(this.contactForm.controls).forEach(key => {
        this.contactForm.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmittingContact = true;
    const formData = this.contactForm.value;



    // Simulation d'envoi
    setTimeout(() => {
      this.isSubmittingContact = false;
      
      this.snackBar.open(
        `Message envoyé à ${this.selectedFreelanceForContact?.prenom} avec succès !`, 
        'Fermer', 
        {
          duration: 5000,
          panelClass: 'success-snackbar'
        }
      );
      
      this.closeContactModal();
      
    }, 2000);
  }

  hasFieldError(fieldName: string): boolean {
    const field = this.contactForm.get(fieldName);
    return !!(field && field.invalid && field.touched);
  }

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

  private getFieldLabel(fieldName: string): string {
    const labels: { [key: string]: string } = {
      name: 'Le nom',
      email: 'L\'e-mail',
      subject: 'Le sujet',
      message: 'Le message'
    };
    return labels[fieldName] || 'Ce champ';
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent): void {
    if (this.showContactModal) {
      this.closeContactModal();
    }
  }

  // ==========================================
  // MÉTHODES EXISTANTES (INCHANGÉES)
  // ==========================================

  setupViewTracking(): void {
    if (!this.isBrowser || this.filteredItems.length === 0) return;

    this.intersectionObserver?.disconnect();

    this.ngZone.runOutsideAngular(() => {
      this.intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          const id = parseInt(entry.target.getAttribute('data-item-id') || '0');
          if (!id || this.viewedItems.has(id)) return;

          this.viewedItems.add(id);
          this.intersectionObserver?.unobserve(entry.target);
          this.portfolioService.recordView(id).subscribe();

          this.ngZone.run(() => {
            this.stats.totalViews = (this.stats.totalViews || 0) + 1;
            const idx = this.portfolioItems.findIndex(i => i.id === id);
            if (idx !== -1) {
              this.portfolioItems[idx] = {
                ...this.portfolioItems[idx],
                nombreVues: (this.portfolioItems[idx].nombreVues || 0) + 1
              };
            }
          });
        });
      }, { threshold: 0.5 });

      setTimeout(() => {
        document.querySelectorAll('.portfolio-card[data-item-id]').forEach(card => {
          this.intersectionObserver!.observe(card);
        });
      }, 200);
    });
  }

  initSwipers(): void {
    if (!this.isBrowser) return;
    const swiperElements = document.querySelectorAll('swiper-container');
    swiperElements.forEach((element: any) => {
      const itemId = element.getAttribute('data-item-id');
      if (itemId && !element.initialized) {
        try {
          Object.assign(element, this.swiperConfig);
          element.initialize();
          this.swiperInstances[parseInt(itemId)] = element;
          this.autoplayStatus[parseInt(itemId)] = true;
        } catch (_) {}
      }
    });
  }

  loadPortfolio(): void {
    //  Cette méthode est maintenant remplacée par loadPortfolioAndFreelanceInfo()
    // Gardée pour compatibilité avec les boutons "Réessayer"
    this.loadPortfolioAndFreelanceInfo();
  }
  
  loadStats(): void {
    if (this.clientMode) {
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

  shouldShowMore(description: string | undefined): boolean {
    if (!description) return false;
    return description.length > 100;
  }
  
  toggleExpand(item: PortfolioItem): void {
    item.isExpanded = !item.isExpanded;
  }

  get categories(): string[] {
    if (!this.portfolioItems || this.portfolioItems.length === 0) return [];
    const allCategories = new Set<string>();
    this.portfolioItems.forEach(item => {
      (item.categories || []).forEach(cat => {
        if (cat?.trim()) allCategories.add(cat.trim());
      });
    });
    return Array.from(allCategories).sort();
  }

  filterByCategory(category: string): void {
    this.activeFilter = category;
  }

  private normalize(s: string): string {
    return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  }

  get filteredItems(): PortfolioItem[] {
    if (this.activeFilter === 'all') return this.portfolioItems;
    const filter = this.normalize(this.activeFilter);
    return this.portfolioItems.filter(item =>
      (item.categories || []).some(cat => this.normalize(cat) === filter)
    );
  }

  trackById(index: number, item: PortfolioItem): number {
    return item.id || index;
  }

  likeItem(itemId: number, event: Event): void {
    event.stopPropagation();
    event.preventDefault();
    
    if (!this.authManager.isAuthenticated()) {
      this.snackBar.open('Vous devez être connecté pour aimer cet élément', 'Se connecter', {
        duration: 5000
      }).onAction().subscribe(() => {
        this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
      });
      return;
    }
    
    const isLiked = this.userLikes.has(itemId);
    
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
          
          if (isLiked) {
            this.stats.totalLikes = Math.max(0, (this.stats.totalLikes || 0) - 1);
            this.userLikes.delete(itemId);
          } else {
            this.stats.totalLikes = (this.stats.totalLikes || 0) + 1;
            this.userLikes.add(itemId);
          }
          
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
  return this.authManager.isAuthenticated() && this.userLikes.has(itemId);
}
 loadUserLikes(): void {
  if (!this.authManager.isAuthenticated()) {
    this.userLikes.clear();
    return;
  }

  this.portfolioService.getUserLikes().subscribe({
    next: (likedItemsIds) => {
      this.userLikes.clear();
      likedItemsIds.forEach(id => this.userLikes.add(id));
    },
    error: () => {
      this.userLikes.clear();
    }
  });
}

  openAddPortfolioDialog(): void {
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
    if (this.clientMode || !item.isOwner) {
      return;
    }
    
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
      if (itemIndex !== -1) {
        this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: false };
      }

      if (result && item.id) {
        if (itemIndex !== -1) {
          this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: true };
        }

        this.portfolioService.deletePortfolioItem(item.id).subscribe({
          next: () => {
            this.portfolioItems = this.portfolioItems.filter(i => i.id !== item.id);
            this.stats.totalItems = (this.stats.totalItems || 0) - 1;
            this.stats.totalViews = (this.stats.totalViews || 0) - (item.nombreVues || 0);
            this.stats.totalLikes = (this.stats.totalLikes || 0) - (item.nombreLikes || 0);
            this.snackBar.open(`"${item.titre}" a été supprimé avec succès`, 'Fermer', {
              duration: 3000,
              panelClass: 'success-snackbar'
            });
          },
          error: (err) => {
            console.error(' Erreur lors de la suppression:', err);
            if (itemIndex !== -1) {
              this.portfolioItems[itemIndex] = { ...this.portfolioItems[itemIndex], isDeleting: false };
            }
            
            let errorMessage = 'Erreur lors de la suppression. Veuillez réessayer.';
            if (err.status === 404) {
              errorMessage = 'Élément déjà supprimé ou introuvable.';
              // Si 404, supprimer quand même de l'affichage local
              this.portfolioItems = this.portfolioItems.filter(i => i.id !== item.id);
            } else if (err.status === 403) {
              errorMessage = 'Vous n\'avez pas les droits pour supprimer cet élément.';
            }
            
            this.snackBar.open(errorMessage, 'Fermer', {
              duration: 4000,
              panelClass: 'error-snackbar'
            });
          }
        });
      }
    });
  }

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


  // Videos portfolio

  toggleVideoSection(itemId: number): void {
    this.showVideoSection[itemId] = !this.showVideoSection[itemId];
    if (this.showVideoSection[itemId] && !this.itemVideos[itemId]) {
      this.loadItemVideos(itemId);
    }
  }

  loadItemVideos(itemId: number): void {
    this.videosLoading[itemId] = true;
    this.portfolioService.getPortfolioItemVideos(itemId).subscribe({
      next: (videos: any[]) => {
        this.itemVideos[itemId] = videos || [];
        this.videosLoading[itemId] = false;
      },
      error: () => {
        this.itemVideos[itemId] = [];
        this.videosLoading[itemId] = false;
      }
    });
  }

  toggleAddVideoForm(itemId: number): void {
    this.showAddVideoForm[itemId] = !this.showAddVideoForm[itemId];
    if (!this.newVideoTitre[itemId]) this.newVideoTitre[itemId] = '';
    if (!this.newVideoLegende[itemId]) this.newVideoLegende[itemId] = '';
  }

  openVideoFileSelector(itemId: number): void {
    const input = document.getElementById('video-input-' + itemId) as HTMLInputElement;
    if (input) input.click();
  }

  onVideoFileSelected(event: Event, itemId: number): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.loadingStates['upload-video-' + itemId] = true;
    const formData = new FormData();
    formData.append('videoFile', file);
    formData.append('portfolioItemId', itemId.toString());
    formData.append('titre', this.newVideoTitre[itemId] || file.name.replace(/\.[^/.]+$/, ''));
    if (this.newVideoLegende[itemId]) formData.append('legende', this.newVideoLegende[itemId]);
    this.portfolioService.uploadPortfolioItemVideo(formData).subscribe({
      next: (response: any) => {
        if (response?.success && response.video) {
          if (!this.itemVideos[itemId]) this.itemVideos[itemId] = [];
          this.itemVideos[itemId] = [...this.itemVideos[itemId], response.video];
        }
        this.showAddVideoForm[itemId] = false;
        this.newVideoTitre[itemId] = '';
        this.newVideoLegende[itemId] = '';
        this.loadingStates['upload-video-' + itemId] = false;
        input.value = '';
      },
      error: () => { this.loadingStates['upload-video-' + itemId] = false; }
    });
  }

  deleteItemVideo(videoId: number, itemId: number): void {
    this.loadingStates['delete-video-' + videoId] = true;
    this.portfolioService.deletePortfolioItemVideo(videoId).subscribe({
      next: () => {
        this.itemVideos[itemId] = this.itemVideos[itemId].filter((v: any) => v.id !== videoId);
        this.loadingStates['delete-video-' + videoId] = false;
      },
      error: () => { this.loadingStates['delete-video-' + videoId] = false; }
    });
  }

  getItemVideosCount(itemId: number): number {
    return this.itemVideos[itemId]?.length || 0;
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      document.body.style.overflow = 'auto';
    }
    this.intersectionObserver?.disconnect();
    this.intersectionObserver = null;
    Object.values(this.swiperInstances).forEach((el: any) => {
      try { el?.swiper?.destroy(true, true); } catch (_) {}
    });
    this.swiperInstances = {};
  }

  
}