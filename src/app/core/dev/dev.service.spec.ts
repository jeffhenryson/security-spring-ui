import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DevService } from './dev.service';
import { environment } from '../../../environments/environment';

const API = environment.apiUrl;

describe('DevService', () => {
  let service: DevService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(DevService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('firstCode', () => {
    it('POST /auth/dev/first-code com totpCode e retorna devToken', async () => {
      const expected = { devToken: 'dev-tok-123', expiresInSeconds: 90 };
      const promise = service.firstCode('123456');

      const req = controller.expectOne(`${API}/auth/dev/first-code`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ totpCode: '123456' });
      req.flush(expected);

      const result = await promise;
      expect(result).toEqual(expected);
    });

    it('propaga erro 400 (código TOTP inválido)', async () => {
      const promise = service.firstCode('000000');
      controller
        .expectOne(`${API}/auth/dev/first-code`)
        .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toBeTruthy();
    });
  });

  describe('complete', () => {
    it('POST /auth/dev/complete com devToken + totpCode e retorna devAccessToken', async () => {
      const expected = { devAccessToken: 'dev-access-xyz', expiresIn: 3600 };
      const promise = service.complete('dev-tok-123', '654321');

      const req = controller.expectOne(`${API}/auth/dev/complete`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({ devToken: 'dev-tok-123', totpCode: '654321' });
      req.flush(expected);

      const result = await promise;
      expect(result).toEqual(expected);
    });

    it('propaga erro 410 (devToken expirado)', async () => {
      const promise = service.complete('expired-tok', '123456');
      controller
        .expectOne(`${API}/auth/dev/complete`)
        .flush('Gone', { status: 410, statusText: 'Gone' });
      await expect(promise).rejects.toBeTruthy();
    });

    it('propaga erro 400 (código não consecutivo)', async () => {
      const promise = service.complete('dev-tok', '111111');
      controller
        .expectOne(`${API}/auth/dev/complete`)
        .flush('Bad Request', { status: 400, statusText: 'Bad Request' });
      await expect(promise).rejects.toBeTruthy();
    });
  });
});
