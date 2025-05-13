import { TestBed } from '@angular/core/testing';

import { CandidatureService } from './candidatures.service';

describe('CandidaturesService', () => {
  let service: CandidatureService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CandidatureService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
