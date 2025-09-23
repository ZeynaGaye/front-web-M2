import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HorairesManagerComponent } from './horaires-manager.component';

describe('HorairesManagerComponent', () => {
  let component: HorairesManagerComponent;
  let fixture: ComponentFixture<HorairesManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HorairesManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HorairesManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
