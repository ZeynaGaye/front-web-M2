import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProFreeComponent } from './pro-free.component';

describe('ProFreeComponent', () => {
  let component: ProFreeComponent;
  let fixture: ComponentFixture<ProFreeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProFreeComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProFreeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
