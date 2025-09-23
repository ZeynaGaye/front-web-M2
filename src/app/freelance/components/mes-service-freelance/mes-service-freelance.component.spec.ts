import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesServiceFreelanceComponent } from './mes-service-freelance.component';

describe('MesServiceFreelanceComponent', () => {
  let component: MesServiceFreelanceComponent;
  let fixture: ComponentFixture<MesServiceFreelanceComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesServiceFreelanceComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesServiceFreelanceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
