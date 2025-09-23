import { TestBed } from '@angular/core/testing';

import { PortfolioAuthManagerService } from './portfolio-auth-manager-service.service';

describe('PortfolioAuthManagerServiceService', () => {
  let service: PortfolioAuthManagerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PortfolioAuthManagerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
