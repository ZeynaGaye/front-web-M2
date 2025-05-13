import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MesSalonsComponent } from './mes-salons.component';

describe('MesSalonsComponent', () => {
  let component: MesSalonsComponent;
  let fixture: ComponentFixture<MesSalonsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MesSalonsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MesSalonsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
