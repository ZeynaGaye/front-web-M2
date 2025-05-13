import { TestBed } from '@angular/core/testing';

import { ServiceSalonService } from './service-salon.service';

describe('ServiceSalonService', () => {
  let service: ServiceSalonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceSalonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
