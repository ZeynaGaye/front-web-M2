import { TestBed } from '@angular/core/testing';

import { ServiceFreelanceService } from './service-freelance.service';

describe('ServiceFreelanceService', () => {
  let service: ServiceFreelanceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceFreelanceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
