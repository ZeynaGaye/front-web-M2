import { TestBed } from '@angular/core/testing';

import { HorairesService } from './horaires.service';

describe('HorairesService', () => {
  let service: HorairesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HorairesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
