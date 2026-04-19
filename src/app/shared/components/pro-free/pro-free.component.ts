import { Component, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';
import { AuthUIService } from '../../services/authUI/auth-ui.service';

@Component({
  selector: 'app-pro-free',
  templateUrl: './pro-free.component.html',
  styleUrls: ['./pro-free.component.scss'],
  imports: [RouterModule, CommonModule],
  standalone: true,
})
export class ProFreeComponent implements OnInit {
  freelanceCount: number | null = null;

  constructor(private http: HttpClient, private authUI: AuthUIService) {}

  ngOnInit(): void {
    this.http.get<any>(`${environment.apiUrl}/freelances/statistics`).subscribe({
      next: (data) => {
        this.freelanceCount = data.totalFreelances ?? null;
      },
      error: () => {
        this.freelanceCount = null;
      }
    });
  }

  openLoginModal(): void {
    this.authUI.triggerLoginModal();
  }
}
