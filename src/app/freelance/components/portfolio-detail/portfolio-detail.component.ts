// portfolio-detail.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PortfolioService } from '../../services/portfolio.service';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { DatePipe } from '@angular/common';
import { trigger, transition, style, animate } from '@angular/animations';
import { PortfolioItem } from '../../../models/PortfolioItem';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { RouterModule } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-portfolio-detail',
  templateUrl: './portfolio-detail.component.html',
  styleUrls: ['./portfolio-detail.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatIconModule, 
    MatButtonModule, 
    MatProgressSpinnerModule,
    MatSnackBarModule,
    DatePipe,
    MatTooltipModule
  ],
  animations: [
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('500ms', style({ opacity: 1 })),
      ]),
    ]),
  ],
})
export class PortfolioDetailComponent implements OnInit {
  portfolioItem!: PortfolioItem;
  loading: boolean = true;
  itemId!: number;
  activeImageIndex: number = 0;
  // Le backend déterminera si l'utilisateur est propriétaire et l'inclura dans la réponse
  isOwner: boolean = false;

  constructor(
    private portfolioService: PortfolioService,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar
  ) { }

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    this.itemId = idParam ? +idParam : 0;
    this.loadPortfolioItem();
  }

  loadPortfolioItem(): void {
    this.loading = true;
    this.portfolioService.getPortfolioItem(this.itemId).subscribe({
      next: (item) => {
        this.portfolioItem = item;
        
        // Supposons que le backend ajoute cette propriété si l'utilisateur connecté est le propriétaire
        this.isOwner = item.isOwner === true;
        
        this.loading = false;
      },
      error: (error) => {
        console.error('Erreur lors du chargement de l\'élément', error);
        this.loading = false;
        this.snackBar.open('Impossible de charger les détails du portfolio', 'Fermer', {
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'bottom'
        });
      }
    });
  }

  likeItem(): void {
    // Ne rien faire si l'utilisateur est le propriétaire
    if (this.isOwner) {
      return;
    }
    
    this.portfolioService.likeItem(this.itemId).subscribe({
      next: (updatedItem) => {
        this.portfolioItem.nombreLikes = updatedItem.nombreLikes;
        // Si le backend renvoie aussi un indicateur pour savoir si l'utilisateur a aimé l'élément
        if (updatedItem.hasOwnProperty('liked')) {
          this.portfolioItem.liked = updatedItem.liked;
        }
        
        // Message différent selon que l'utilisateur aime ou retire son like
        const message = this.portfolioItem.liked ? 
          'Merci pour votre appréciation !' : 
          'Votre like a été retiré';
          
        this.snackBar.open(message, 'Fermer', {
          duration: 2000
        });
      },
      error: (error) => {
        // Si l'erreur est due au fait que l'utilisateur n'est pas connecté (code 401)
        if (error.status === 401) {
          this.snackBar.open('Vous devez être connecté pour aimer cet élément', 'Se connecter', {
            duration: 3000
          }).onAction().subscribe(() => {
            this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
          });
        } else {
          console.error('Erreur lors du like', error);
          this.snackBar.open('Impossible d\'aimer cet élément', 'Fermer', {
            duration: 3000
          });
        }
      }
    });
  }

  deleteItem(): void {
    // Vérifier que l'utilisateur est bien le propriétaire
    if (!this.isOwner) {
      this.snackBar.open('Vous n\'êtes pas autorisé à supprimer cet élément', 'Fermer', {
        duration: 3000
      });
      return;
    }
    
    if (confirm('Êtes-vous sûr de vouloir supprimer cet élément de votre portfolio ?')) {
      this.portfolioService.deletePortfolioItem(this.itemId).subscribe({
        next: () => {
          this.snackBar.open('Élément supprimé avec succès', 'Fermer', {
            duration: 3000
          });
          this.router.navigate(['/portfolio']);
        },
        error: (error) => {
          console.error('Erreur lors de la suppression', error);
          this.snackBar.open('Impossible de supprimer cet élément', 'Fermer', {
            duration: 3000
          });
        }
      });
    }
  }

  editItem(): void {
    // Vérifier que l'utilisateur est bien le propriétaire
    if (!this.isOwner) {
      this.snackBar.open('Vous n\'êtes pas autorisé à modifier cet élément', 'Fermer', {
        duration: 3000
      });
      return;
    }
    
    this.router.navigate(['/portfolio/edit', this.itemId]);
  }

  setActiveImage(index: number): void {
    this.activeImageIndex = index;
  }

  nextImage(): void {
    if ((this.portfolioItem?.images ?? []).length > 0) {
      this.activeImageIndex = (this.activeImageIndex + 1) % (this.portfolioItem.images?.length ?? 0);
    }
  }

  prevImage(): void {
    if (this.portfolioItem && this.portfolioItem.images && this.portfolioItem.images.length > 0) {
      this.activeImageIndex = (this.activeImageIndex - 1 + this.portfolioItem.images.length) % this.portfolioItem.images.length;
    }
  }

  shareOnSocialMedia(platform: string): void {
    let shareUrl = '';
    const currentUrl = window.location.href;
    const title = encodeURIComponent(this.portfolioItem.titre);
    
    switch (platform) {
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${title}&url=${encodeURIComponent(currentUrl)}`;
        break;
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(currentUrl)}`;
        break;
    }
    
    if (shareUrl) {
      window.open(shareUrl, '_blank', 'width=600,height=400');
    }
  }
  
  // Nouvelle méthode pour contacter le freelance
  contactFreelance(): void {
    // Rediriger vers la page de contact avec l'ID du freelance
    this.router.navigate(['/contact', this.portfolioItem.freelance.id], {
      queryParams: { 
        project: this.portfolioItem.titre,
        source: 'portfolio'
      }
    });
  }
}