import { TestBed } from '@angular/core/testing';

import { PortfolioAuthManagerServiceService } from './portfolio-auth-manager-service.service';

describe('PortfolioAuthManagerServiceService', () => {
  let service: PortfolioAuthManagerServiceService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PortfolioAuthManagerServiceService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
