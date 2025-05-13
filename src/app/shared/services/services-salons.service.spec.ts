import { TestBed } from '@angular/core/testing';

import { ServiceSalonService } from './services-salons.service';

describe('ServicesSalonsService', () => {
  let service: ServiceSalonService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceSalonService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
