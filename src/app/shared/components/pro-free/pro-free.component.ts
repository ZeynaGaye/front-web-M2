import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, OnDestroy, OnInit, PLATFORM_ID } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { CommonModule, NgFor } from '@angular/common';

@Component({
  selector: 'app-pro-free',
  templateUrl: './pro-free.component.html',
  styleUrls: ['./pro-free.component.scss'],
  imports: [NgFor, CommonModule, RouterModule],
  standalone: true,
})
export class ProFreeComponent implements OnInit, OnDestroy {
  currentSlide = 0;
  slides = [
    { id: 1, image: '/assets/images/femme noir.avif', title: 'Créez votre portfolio', subtitle: 'Exposez vos plus belles réalisations' },
    { id: 2, image: '/assets/images/pexels-rdne-7755238.jpg', title: 'Gagnez en visibilité', subtitle: 'Apparaissez dans les recherches locales' },
    { id: 3, image: '/assets/images/pexels-barik5ive-3355696-5282408.jpg', title: 'Recevez des demandes', subtitle: 'Clients et salons vous contactent directement' },
    { id: 4, image: '/assets/images/photo-1522335789203-aabd1fc54bc9.avif', title: 'Développez votre clientèle', subtitle: 'Attirez plus de clients grâce à votre expertise' },
  ];
  private interval: any;
  isBrowser: boolean;

  constructor(
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    // console.log('ProFreeComponent initialized');
    // Seulement démarrer le carrousel si nous sommes dans un navigateur
    if (this.isBrowser) {
      // console.log('Starting carousel in browser environment');
      this.startCarousel();
    }
  }

  startCarousel() {
    this.interval = setInterval(() => {
      this.nextSlide();
    }, 5000);
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length;
    // console.log('Current slide:', this.currentSlide);
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
    // console.log('Current slide:', this.currentSlide);
  }

  goToSlide(index: number) {
    this.currentSlide = index;
    // console.log('Going to slide:', this.currentSlide);
    this.resetTimer();
  }

  resetTimer() {
    if (this.isBrowser) {
      clearInterval(this.interval);
      this.startCarousel();
    }
  }

  ngOnDestroy() {
    if (this.isBrowser) {
      clearInterval(this.interval);
    }
  }
}