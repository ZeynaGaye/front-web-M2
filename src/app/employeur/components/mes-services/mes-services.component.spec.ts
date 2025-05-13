import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesServicesComponent } from './mes-services.component';

describe('MesServicesComponent', () => {
  let component: MesServicesComponent;
  let fixture: ComponentFixture<MesServicesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesServicesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesServicesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
