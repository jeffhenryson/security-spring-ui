import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Sentry from '@sentry/angular';
import { globalErrorInterceptor } from './global-error.interceptor';

jest.mock('@sentry/angular', () => ({ captureException: jest.fn() }));

describe('globalErrorInterceptor', () => {
  let controller: HttpTestingController;
  let http: HttpClient;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;
  let router: jest.Mocked<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    snackBar = { open: jest.fn() };
    router = { navigate: jest.fn() };
    (Sentry.captureException as jest.Mock).mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([globalErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
        { provide: Router, useValue: router },
      ],
    });

    controller = TestBed.inject(HttpTestingController);
    http = TestBed.inject(HttpClient);
  });

  afterEach(() => controller.verify());

  it('exibe snackbar para erros 5xx e re-lança o erro', async () => {
    let caught: unknown;
    http.get('/api/test').subscribe({ error: (e) => (caught = e) });

    controller.expectOne('/api/test').flush({}, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();

    expect(snackBar.open).toHaveBeenCalledWith(
      'Erro no servidor. Tente novamente em alguns instantes.',
      'OK',
      { duration: 5000 },
    );
    expect(caught).toBeDefined();
  });

  it('exibe snackbar para 503', async () => {
    http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 503, statusText: 'Service Unavailable' });
    await Promise.resolve();
    expect(snackBar.open).toHaveBeenCalled();
  });

  it('captura erros 5xx no Sentry', async () => {
    http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 500, statusText: 'Server Error' });
    await Promise.resolve();
    expect(Sentry.captureException).toHaveBeenCalledTimes(1);
  });

  it('não captura erros 4xx no Sentry', async () => {
    http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 404, statusText: 'Not Found' });
    await Promise.resolve();
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('exibe snackbar "Recurso não encontrado." para 404', async () => {
    let caught: unknown;
    http.get('/api/test').subscribe({ error: (e) => (caught = e) });

    controller.expectOne('/api/test').flush({}, { status: 404, statusText: 'Not Found' });
    await Promise.resolve();

    expect(snackBar.open).toHaveBeenCalledWith('Recurso não encontrado.', 'Fechar', { duration: 4000 });
    expect(caught).toBeDefined();
  });

  it('redireciona para /app/access-denied em GET 403', async () => {
    http.get('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 403, statusText: 'Forbidden' });
    await Promise.resolve();
    expect(router.navigate).toHaveBeenCalledWith(['/app/access-denied']);
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('exibe snackbar (sem redirecionar) em POST 403', async () => {
    http.post('/api/test', {}).subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 403, statusText: 'Forbidden' });
    await Promise.resolve();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Sem permissão para realizar esta ação.',
      'Fechar',
      { duration: 4000 },
    );
  });

  it('exibe snackbar (sem redirecionar) em DELETE 403', async () => {
    http.delete('/api/test').subscribe({ error: () => {} });
    controller.expectOne('/api/test').flush({}, { status: 403, statusText: 'Forbidden' });
    await Promise.resolve();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open).toHaveBeenCalledWith(
      'Sem permissão para realizar esta ação.',
      'Fechar',
      { duration: 4000 },
    );
  });

  it('não redireciona em GET 403 para /actuator/**', async () => {
    http.get('/actuator/health').subscribe({ error: () => {} });
    controller.expectOne('/actuator/health').flush({}, { status: 403, statusText: 'Forbidden' });
    await Promise.resolve();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(snackBar.open).not.toHaveBeenCalled();
  });

  it('não exibe snackbar para respostas de sucesso', async () => {
    let result: unknown;
    http.get('/api/test').subscribe({ next: (r) => (result = r) });

    controller.expectOne('/api/test').flush({ ok: true });
    await Promise.resolve();

    expect(snackBar.open).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
