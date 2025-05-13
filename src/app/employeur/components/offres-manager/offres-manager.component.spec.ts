import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OffresManagerComponent } from './offres-manager.component';

describe('OffresManagerComponent', () => {
  let component: OffresManagerComponent;
  let fixture: ComponentFixture<OffresManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [OffresManagerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(OffresManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
