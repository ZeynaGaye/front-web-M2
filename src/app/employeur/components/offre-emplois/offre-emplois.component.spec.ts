import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffreEmploisComponent } from './offre-emplois.component';

describe('OffreEmploisComponent', () => {
  let component: OffreEmploisComponent;
  let fixture: ComponentFixture<OffreEmploisComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffreEmploisComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffreEmploisComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
