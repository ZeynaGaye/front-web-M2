import { Component, Inject, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ServiceSalon } from '../../../models/service-salon';


@Component({
  selector: 'app-add-service-dialog',
  templateUrl: './add-service-dialog.component.html',
  styleUrls: ['./add-service-dialog.component.scss'],
  imports: [],
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
    this.serviceForm = this.fb.group({
      name: ['', Validators.required],
      description: ['', Validators.required],
      price: ['', [Validators.required, Validators.min(0)]],
      duration: ['', [Validators.required, Validators.min(1)]]
    });
  }

  ngOnInit(): void {
    if (this.data && this.data.service) {
      this.isEditMode = true;
      this.serviceForm.patchValue({
        name: this.data.service.name,
        description: this.data.service.description,
        price: this.data.service.price,
        duration: this.data.service.duration
      });
    }
  }

  onSubmit(): void {
    if (this.serviceForm.valid) {
      this.dialogRef.close(this.serviceForm.value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}