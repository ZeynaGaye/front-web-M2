import { Component } from '@angular/core';
import { OffresService } from '../offres.service';

@Component({
  selector: 'app-offres',
  imports: [],
  templateUrl: './offres.component.html',
  styleUrl: './offres.component.scss'
})
export class OffresComponent {
voirDetails(arg0: any) {
throw new Error('Method not implemented.');
}

  offres: any[] = [];

  constructor(private offreService: OffresService) {}

  ngOnInit(): void {
    //this.loadOffres();
  }

  // loadOffres(): void {
  //   this.offreService.getOffres().subscribe(
  //     (data) => {
  //       this.offres = data;
  //     },
  //     (error) => {
  //       console.error('Erreur lors du chargement des offres', error);
  //     }
  //   );
  // }
}

