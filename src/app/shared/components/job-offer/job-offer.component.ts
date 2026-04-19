import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthentComponent } from '../authent/authent.component';
import { HeaderService } from '../../services/header/header.service';
import { SalonService } from '../../services/salons/salons.service';
import { RegisterComponent } from '../register/register.component';

@Component({
  selector: 'app-job-offer',
  standalone: true,
  imports: [CommonModule, RouterModule, AuthentComponent, RegisterComponent],
  templateUrl: './job-offer.component.html',
  styleUrl: './job-offer.component.scss'
})
export class JobOfferComponent {
  showLoginModal: boolean = false;
  showRegisterModal: boolean = false;
  showMoreInfo: boolean = false;
  public headerService = inject(HeaderService);

  frequentlyAskedQuestions = [
    {
      question: 'Combien de temps prend généralement un recrutement ?',
      answer: 'En moyenne, nos employeurs trouvent leurs candidats idéaux en 7 jours. 65% des offres reçoivent leurs premières candidatures dans les 24 heures.',
      isOpen: false
    },
    {
      question: 'Comment sont vérifiés les profils des candidats ?',
      answer: 'Nous vérifions les diplômes, les expériences professionnelles et les références auprès des anciens employeurs. Chaque profil est évalué selon une échelle de confiance visible pour les recruteurs.',
      isOpen: false
    },
    {
      question: 'Est-ce que je peux publier plusieurs offres simultanément ?',
      answer: 'Absolument ! Vous pouvez publier autant d\'offres que nécessaire. Nos forfaits Premium vous permettent de publier des offres illimitées avec une visibilité accrue.',
      isOpen: false
    },
    {
      question: 'Que faire si je ne trouve pas le profil recherché ?',
      answer: 'Notre équipe de conseillers peut vous aider à ajuster votre offre ou à élargir vos critères. Nous proposons également un service de recherche proactive pour les postes difficiles à pourvoir.',
      isOpen: false
    }
  ];

  constructor(private salonService: SalonService) {}

  get isLoggedIn() {
    return this.headerService.isLoggedIn();
  }

  // Méthode pour afficher les informations supplémentaires
  learnMore() {
    this.showMoreInfo = true;
    
    // Défilement automatique vers la section d'informations
    setTimeout(() => {
      const moreInfoSection = document.querySelector('.more-info-section');
      if (moreInfoSection) {
        moreInfoSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 300);
  }
  
  // Méthode pour basculer l'affichage des informations supplémentaires
  toggleMoreInfo() {
    this.showMoreInfo = !this.showMoreInfo;
  }

  // Méthodes pour la gestion des modals
  login() {
    this.openLoginModal();
  }

  openLoginModal() {
    this.showLoginModal = true;
    this.showRegisterModal = false;

  }

  closeLoginModal() {
    this.showLoginModal = false;

  }

  openRegisterModal() {
    this.showRegisterModal = true;
    this.showLoginModal = false;

  }

  closeRegisterModal() {
    this.showRegisterModal = false;

  }

  switchToRegister() {
    this.closeLoginModal();
    this.openRegisterModal();

  }

  switchToLogin() {
    this.closeRegisterModal();
    this.openLoginModal();
    //
  }
}