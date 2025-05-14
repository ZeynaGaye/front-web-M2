import { TestBed } from '@angular/core/testing';

import { AuthUIService } from './auth-ui.service';

describe('AuthUIService', () => {
  let service: AuthUIService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(AuthUIService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
