import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule,], 
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
})
export class ContactComponent {
  contactForm: FormGroup;

  constructor(private fb: FormBuilder, private dialogRef: MatDialogRef<ContactComponent>) {
    this.contactForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      subject: ['', Validators.required],
      message: ['', Validators.required],
    });
  }

  onSubmit() {
    if (this.contactForm.valid) {
      console.log('Formulaire soumis :', this.contactForm.value);
      alert('Merci pour votre message ! Nous vous répondrons bientôt.');
      this.contactForm.reset();
    } else {
      alert('Veuillez remplir tous les champs correctement.');
    }
  }

  closeModal() {
    this.dialogRef.close(); // Fermer la fenêtre modale
  }

}
