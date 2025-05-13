import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FreelanceDashbordComponent } from './freelance-dashbord.component';

describe('FreelanceDashbordComponent', () => {
  let component: FreelanceDashbordComponent;
  let fixture: ComponentFixture<FreelanceDashbordComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FreelanceDashbordComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FreelanceDashbordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
