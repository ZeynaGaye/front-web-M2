import { TestBed } from '@angular/core/testing';

import { OffreEmploisServiceService } from './offre-emplois-service.service';

describe('OffreEmploisServiceService', () => {
  let service: OffreEmploisServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(OffreEmploisServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
