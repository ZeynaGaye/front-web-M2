import { TestBed } from '@angular/core/testing';

import { RoleRedirectService } from '../../servces/role-redirect.service';

describe('RoleRedirectService', () => {
  let service: RoleRedirectService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RoleRedirectService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
