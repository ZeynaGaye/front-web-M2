import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditPortfolioItemDialogComponent } from './edit-portfolio-item-dialog.component';

describe('EditPortfolioItemDialogComponent', () => {
  let component: EditPortfolioItemDialogComponent;
  let fixture: ComponentFixture<EditPortfolioItemDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditPortfolioItemDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditPortfolioItemDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
