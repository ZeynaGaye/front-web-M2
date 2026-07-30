import { Component, OnInit, Output, EventEmitter, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { RegisterService, SignupRequest } from '../../services/register.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GeocodingService } from '../../../core/servces/GeocodingService/geocoding-service.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss'],
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, CommonModule]
})
export class RegisterComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() switchToLoginEvent = new EventEmitter<void>();

  registerForm!: FormGroup;
  currentStep = 1;
  errorMessage = '';
  isLoading = false;
  registrationSuccess = false;
  registeredEmail = '';
  showPassword = false;
  showConfirmPassword = false;
  private cachedCoords: { lat: number; lon: number } | null = null;

  constructor(
    private fb: FormBuilder,
    private authService: RegisterService,
    private router: Router,
    private geocodingService: GeocodingService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.registerForm = this.fb.group({
      nom:       ['', Validators.required],
      prenom:    ['', Validators.required],
      email:     ['', [Validators.required, Validators.email]],
      telephone: ['', [Validators.pattern(/^\d{9,10}$/)]],
      ville:     ['', Validators.required],
      adresse:   ['', Validators.required],
      role:      ['', Validators.required],
      sexe:      ['', Validators.required],
      motDePasse: ['', [
        Validators.required,
        Validators.minLength(6),
        Validators.pattern(/^(?=.*\d).+$/)
      ]],
      confirmPassword: ['', Validators.required],
    }, { validators: this.checkPasswords });

    this.registerForm.get('role')?.valueChanges.subscribe(role => {
      if (role) this.updateFormFields(role);
    });

    // Géocodage en arrière-plan dès que l'adresse change
    this.registerForm.get('adresse')?.valueChanges.subscribe(adresse => {
      this.cachedCoords = null;
      if (adresse && adresse.length > 5) {
        this.geocodingService.getCoordinates(adresse).subscribe({
          next: coords => { if (coords) this.cachedCoords = coords; }
        });
      }
    });
  }

  checkPasswords(group: AbstractControl): { [key: string]: boolean } | null {
    const pw  = group.get('motDePasse')?.value;
    const cpw = group.get('confirmPassword')?.value;
    return pw === cpw ? null : { notMatching: true };
  }

  updateFormFields(role: string | null): void {
    if (!role) return;
    ['description', 'preferences', 'competences', 'experiences'].forEach(f => {
      if (this.registerForm.contains(f)) this.registerForm.removeControl(f);
    });
    switch (role) {
      case 'EMPLOYEUR':
        this.registerForm.addControl('description', this.fb.control('', Validators.required));
        break;
      case 'CLIENT':
        this.registerForm.addControl('preferences', this.fb.control('', Validators.required));
        break;
      case 'FREELANCE':
        this.registerForm.addControl('competences', this.fb.control('', Validators.required));
        this.registerForm.addControl('experiences',  this.fb.control('', Validators.required));
        break;
    }
  }

  selectRole(role: string): void {
    this.registerForm.get('role')?.setValue(role);
    this.registerForm.get('role')?.markAsTouched();
  }

  selectSexe(sexe: string): void {
    this.registerForm.get('sexe')?.setValue(sexe);
    this.registerForm.get('sexe')?.markAsTouched();
  }

  nextStep(): void {
    if (this.currentStep === 1 && this.validateControls(['nom', 'prenom', 'email'])) {
      this.currentStep++;
    } else if (this.currentStep === 2 && this.validateStep2()) {
      this.currentStep++;
    }
  }

  previousStep(): void {
    this.currentStep--;
  }

  private validateStep2(): boolean {
    const base = ['telephone', 'ville', 'adresse', 'role', 'sexe'];
    const role  = this.registerForm.get('role')?.value;
    const extra = role === 'EMPLOYEUR' ? ['description']
                : role === 'CLIENT'    ? ['preferences']
                : role === 'FREELANCE' ? ['competences', 'experiences']
                : [];
    return this.validateControls([...base, ...extra]);
  }

  validateControls(names: string[]): boolean {
    let valid = true;
    names.forEach(name => {
      const ctrl = this.registerForm.get(name);
      if (ctrl?.invalid) { ctrl.markAsTouched(); valid = false; }
    });
    return valid;
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const v = this.registerForm.value;
    const req: SignupRequest = {
      email:      v.email,
      motDePasse: v.motDePasse,
      nom:        v.nom,
      prenom:     v.prenom,
      telephone:  v.telephone || '',
      ville:      v.ville     || '',
      adresse:    v.adresse   || '',
      role:       v.role,
      sexe:       v.sexe,
    };
    if (v.description) req.description = v.description;
    if (v.preferences)  req.preferences = v.preferences;
    if (v.competences)  req.competences = v.competences;
    if (v.experiences)  req.experiences = v.experiences;
    if (this.cachedCoords) { req.latitude = this.cachedCoords.lat; req.longitude = this.cachedCoords.lon; }

    this.sendSignupRequest(req);
  }

  private sendSignupRequest(req: SignupRequest): void {
    this.authService.signup(req).subscribe({
      next: res => {
        this.isLoading = false;
        this.registeredEmail = res.email ?? req.email;
        this.registrationSuccess = true;
        this.cdr.detectChanges();
      },
      error: err => {
        this.isLoading = false;
        this.errorMessage = typeof err === 'string'
          ? err
          : (err?.message || "Une erreur est survenue lors de l'inscription");
      }
    });
  }

  closeModal():    void { this.close.emit(); }
  switchToLogin(): void { this.switchToLoginEvent.emit(); }
}
