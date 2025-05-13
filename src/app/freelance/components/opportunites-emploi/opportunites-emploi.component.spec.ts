import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpportunitesEmploiComponent } from './opportunites-emploi.component';

describe('OpportunitesEmploiComponent', () => {
  let component: OpportunitesEmploiComponent;
  let fixture: ComponentFixture<OpportunitesEmploiComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OpportunitesEmploiComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OpportunitesEmploiComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
