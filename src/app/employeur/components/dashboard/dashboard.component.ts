import { Component, OnInit, ViewChild } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { Chart, ChartConfiguration, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  imports: [ MatCardModule,],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {
  // Données de test
  totalCandidatures = 120;
  candidaturesValidees = 80;
  tauxAcceptation = Math.round((this.candidaturesValidees / this.totalCandidatures) * 100);

  totalVisites = 1500;
  tauxConversion = 10; // Exemple : 10% de conversion

  totalReservations = 120;
  tauxRemplissage = 80; // Exemple : 80% de remplissage

  revenusTotaux = 5000; // Exemple : 5000 €

  // Références aux graphiques
  @ViewChild('candidaturesChart') candidaturesChartRef: any;
  @ViewChild('reservationsChart') reservationsChartRef: any;
  @ViewChild('revenusChart') revenusChartRef: any;
  @ViewChild('satisfactionChart') satisfactionChartRef: any;

  constructor() {}

  ngOnInit(): void {
    this.renderCharts();
  }

  // Rendre les graphiques
  renderCharts() {
    this.renderCandidaturesChart();
    this.renderReservationsChart();
    this.renderRevenusChart();
    this.renderSatisfactionChart();
  }

  // Graphique d'évolution des candidatures
  renderCandidaturesChart() {
    const ctx = this.candidaturesChartRef.nativeElement.getContext('2d');
    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
        datasets: [
          {
            label: 'Candidatures Reçues',
            data: [10, 20, 30, 40, 50, 60],
            borderColor: '#fb8f71',
            fill: false,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    };
    new Chart(ctx, config);
  }

  // Graphique de répartition des réservations par service
  renderReservationsChart() {
    const ctx = this.reservationsChartRef.nativeElement.getContext('2d');
    const config: ChartConfiguration = {
      type: 'pie',
      data: {
        labels: ['Coiffure', 'Maquillage', 'Soins', 'Massage'],
        datasets: [
          {
            label: 'Réservations par Service',
            data: [40, 30, 20, 10],
            backgroundColor: ['#fb8f71', '#e5e7eb', '#a4b1bd', '#ffcc99'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    };
    new Chart(ctx, config);
  }

  // Graphique des revenus mensuels
  renderRevenusChart() {
    const ctx = this.revenusChartRef.nativeElement.getContext('2d');
    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
        datasets: [
          {
            label: 'Revenus Mensuels',
            data: [1000, 1200, 900, 1500, 2000, 1800],
            backgroundColor: '#fb8f71',
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    };
    new Chart(ctx, config);
  }

  // Graphique de satisfaction client
  renderSatisfactionChart() {
    const ctx = this.satisfactionChartRef.nativeElement.getContext('2d');
    const config: ChartConfiguration = {
      type: 'doughnut',
      data: {
        labels: ['Positifs', 'Négatifs'],
        datasets: [
          {
            label: 'Satisfaction Client',
            data: [80, 20],
            backgroundColor: ['#fb8f71', '#e5e7eb'],
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
          },
        },
      },
    };
    new Chart(ctx, config);
  }
}