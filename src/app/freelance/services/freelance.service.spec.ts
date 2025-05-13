import { TestBed } from '@angular/core/testing';

import { FreelanceService } from './freelance.service';

describe('FreelanceService', () => {
  let service: FreelanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FreelanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
