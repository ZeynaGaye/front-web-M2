import { TestBed } from '@angular/core/testing';

import { FreelanceServicesService } from './freelance-services.service';

describe('FreelanceServicesService', () => {
  let service: FreelanceServicesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FreelanceServicesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
