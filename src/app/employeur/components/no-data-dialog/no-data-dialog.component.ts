import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-no-data-dialog',
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './no-data-dialog.component.html',
  styleUrl: './no-data-dialog.component.scss'
})
export class NoDataDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<NoDataDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {
      title: string;
      message: string;
      buttonText: string;
      icon: string;
    }
  ) {}
}
