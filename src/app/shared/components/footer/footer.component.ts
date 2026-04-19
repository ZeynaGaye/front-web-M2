import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-footer',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './footer.component.html',
  styleUrl: './footer.component.scss'
})
export class FooterComponent {
  currentYear: number = new Date().getFullYear();
  
  // Vous pouvez ajouter des méthodes ici si nécessaire
  
  // Par exemple, une méthode pour gérer l'inscription à la newsletter
  subscribeToNewsletter(email: string) {
    // Logique pour gérer l'inscription

  }
}