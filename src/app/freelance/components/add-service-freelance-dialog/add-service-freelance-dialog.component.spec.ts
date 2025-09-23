import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddServiceFreelanceDialogComponent } from './add-service-freelance-dialog.component';

describe('AddServiceFreelanceDialogComponent', () => {
  let component: AddServiceFreelanceDialogComponent;
  let fixture: ComponentFixture<AddServiceFreelanceDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddServiceFreelanceDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddServiceFreelanceDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
