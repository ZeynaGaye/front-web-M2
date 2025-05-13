import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { OffreEmploi, OffreEmploisService } from '../../../employeur/services/OffreEmploisService/offre-emplois-service.service';
import { OffreDetailsComponent } from '../offre-details/offre-details.component';
import { Router } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-opportunites-emploi',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, OffreDetailsComponent, MatIconModule],
  templateUrl: './opportunites-emploi.component.html',
  styleUrls: ['./opportunites-emploi.component.scss']
})
export class OpportunitesEmploiComponent implements OnInit {
  offres: OffreEmploi[] = [];
  filteredOffres: OffreEmploi[] = [];
  isLoading: boolean = true;
  searchForm: FormGroup;
  selectedOffre: OffreEmploi | null = null;
  showDetails: boolean = false;
  searchTerm: string = '';
  selectedStatus: string = '';
  
  statusOptions = ['OUVERT', 'FERMÉ', 'EN_ATTENTE'];
  
  constructor(
    private offreEmploisService: OffreEmploisService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.searchForm = this.fb.group({
      searchTerm: [''],
      status: ['']
    });
  }

  ngOnInit(): void {
    this.loadOffres();
    this.searchForm.valueChanges.subscribe(values => {
      this.searchTerm = values.searchTerm || '';
      this.selectedStatus = values.status || '';
      this.applyFilters();
    });
  }
 
  goBack() {
    this.router.navigate(['/home-freelance']);
  }
  loadOffres(): void {
    this.isLoading = true;
    this.offreEmploisService.getAllOffresEmplois().subscribe({
      next: (data) => {
        this.offres = data;
        this.filteredOffres = data;
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Erreur lors du chargement des offres', err);
        this.isLoading = false;
      }
    });
  }

  applyFilters(): void {
    this.filteredOffres = this.offres.filter(offre => {
      const titleMatch = !this.searchTerm || 
        offre.titre.toLowerCase().includes(this.searchTerm.toLowerCase());
      const statusMatch = !this.selectedStatus || 
        offre.status === this.selectedStatus;
      return titleMatch && statusMatch;
    });
  }

  resetFilters(): void {
    this.searchForm.reset();
    this.searchTerm = '';
    this.selectedStatus = '';
    this.filteredOffres = this.offres;
  }

  viewOffreDetails(offre: OffreEmploi): void {
    this.selectedOffre = offre;
    this.showDetails = true;
  }

  closeDetails(): void {
    this.showDetails = false;
    this.selectedOffre = null;
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'OUVERT': return 'status-open';
      case 'FERMÉ': return 'status-closed';
      case 'EN_ATTENTE': return 'status-pending';
      default: return '';
    }
  }

  truncateText(text: string, maxLength: number): string {
    if (text && text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  }

}

