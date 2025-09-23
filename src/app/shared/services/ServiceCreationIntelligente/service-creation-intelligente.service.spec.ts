import { TestBed } from '@angular/core/testing';

import { ServiceCreationIntelligenteService } from './service-creation-intelligente.service';

describe('ServiceCreationIntelligenteService', () => {
  let service: ServiceCreationIntelligenteService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ServiceCreationIntelligenteService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
