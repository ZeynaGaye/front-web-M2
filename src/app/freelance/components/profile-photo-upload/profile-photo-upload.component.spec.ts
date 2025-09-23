import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ProfilePhotoUploadComponent } from './profile-photo-upload.component';

describe('ProfilePhotoUploadComponent', () => {
  let component: ProfilePhotoUploadComponent;
  let fixture: ComponentFixture<ProfilePhotoUploadComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        ProfilePhotoUploadComponent,
        HttpClientTestingModule,
        MatSnackBarModule,
        BrowserAnimationsModule
      ]
    });
    fixture = TestBed.createComponent(ProfilePhotoUploadComponent);
    component = fixture.componentInstance;
    component.freelanceId = 1; // Valeur de test
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should trigger file select when triggerFileSelect is called', () => {
    const mockFileInput = document.createElement('input');
    mockFileInput.id = 'photo-file-input';
    spyOn(mockFileInput, 'click');
    spyOn(document, 'getElementById').and.returnValue(mockFileInput);
    
    component.triggerFileSelect();
    
    expect(mockFileInput.click).toHaveBeenCalled();
  });

  it('should handle drag events correctly', () => {
    const mockEvent = new DragEvent('dragover');
    spyOn(mockEvent, 'preventDefault');
    
    component.onDragOver(mockEvent);
    expect(mockEvent.preventDefault).toHaveBeenCalled();
    expect(component.dragOver).toBe(true);
    
    component.onDragLeave(mockEvent);
    expect(component.dragOver).toBe(false);
  });
});