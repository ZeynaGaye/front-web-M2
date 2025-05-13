import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddPortfolioItemComponent } from './add-portfolio-item.component';

describe('AddPortfolioItemComponent', () => {
  let component: AddPortfolioItemComponent;
  let fixture: ComponentFixture<AddPortfolioItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPortfolioItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddPortfolioItemComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
