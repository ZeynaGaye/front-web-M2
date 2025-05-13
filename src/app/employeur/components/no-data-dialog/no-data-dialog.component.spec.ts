import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NoDataDialogComponent } from './no-data-dialog.component';

describe('NoDataDialogComponent', () => {
  let component: NoDataDialogComponent;
  let fixture: ComponentFixture<NoDataDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NoDataDialogComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(NoDataDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
