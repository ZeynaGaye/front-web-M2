import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ServiceSalon } from '../../../models/service-salon';
import { MatInputModule } from "@angular/material/input";
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-add-service-dialog',
  templateUrl: './add-service-dialog.component.html',
  styleUrls: ['./add-service-dialog.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  standalone: true,
})
export class AddServiceDialogComponent implements OnInit {
  serviceForm: FormGroup;
  isEditMode = false;

  constructor(
    private fb: FormBuilder,
    public dialogRef: MatDialogRef<AddServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { service: ServiceSalon }
  ) {
    // ✅ FormGroup 100% français (correspond exactement au backend)
    this.serviceForm = this.fb.group({
      nom: ['', [Validators.required, Validators.minLength(2)]],
      description: ['', [Validators.required, Validators.minLength(5)]],
      prix: [null, [Validators.required, Validators.min(0.01)]],
      dureeEnMinutes: [null, [Validators.required, Validators.min(1)]]
    });

    // ✅ Debug des changements
    this.serviceForm.valueChanges.subscribe(value => {

    });
  }

  ngOnInit(): void {
    if (this.data && this.data.service) {
      this.isEditMode = true;
      
      // ✅ Pas de mapping nécessaire : même noms partout
      this.serviceForm.patchValue({
        nom: this.data.service.nom,
        description: this.data.service.description,
        prix: this.data.service.prix,
        dureeEnMinutes: this.data.service.dureeEnMinutes || 60
      });
    }
  }

  onSubmit(): void {
    if (this.serviceForm.valid) {
      const serviceData = this.serviceForm.value;
      
      // ✅ Formatage pour s'assurer des types corrects
      const formattedData = {
        nom: serviceData.nom?.trim() || '',
        description: serviceData.description?.trim() || '',
        prix: parseFloat(serviceData.prix) || 0,
        dureeEnMinutes: parseInt(serviceData.dureeEnMinutes) || 0
      };
      if (!formattedData.nom || formattedData.prix <= 0 || formattedData.dureeEnMinutes <= 0) {
        return;
      }
      
     
      this.dialogRef.close(formattedData);
    } else {
  
      this.markFormGroupTouched();
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  // ✅ Obtenir toutes les erreurs du formulaire
  getFormErrors(): any {
    const errors: any = {};
    Object.keys(this.serviceForm.controls).forEach(key => {
      const control = this.serviceForm.get(key);
      if (control && control.errors) {
        errors[key] = control.errors;
      }
    });
    return errors;
  }

  // ✅ Marquer tous les champs comme touchés
  private markFormGroupTouched(): void {
    Object.keys(this.serviceForm.controls).forEach(key => {
      const control = this.serviceForm.get(key);
      if (control) {
        control.markAsTouched();
        if (control.invalid) {
        }
      }
    });
  }
  
}