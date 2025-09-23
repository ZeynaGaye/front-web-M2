import { TestBed } from '@angular/core/testing';

import { ServicePredefiniService } from './service-predefini.service';

describe('ServicePredefiniService', () => {
  let service: ServicePredefiniService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServicePredefiniService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
