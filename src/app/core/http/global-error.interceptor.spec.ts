import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import * as Sentry from '@sentry/angular';
import { globalErrorInterceptor } from './global-error.interceptor';

jest.mock('@sentry/angular', () => ({ captureException: jest.fn() }));

describe('globalErrorInterceptor', () => {
  let controller: HttpTestingController;
  let http: HttpClient;
  let snackBar: jest.Mocked<Pick<MatSnackBar, 'open'>>;

  beforeEach(() => {
    snackBar = { open: jest.fn() };
    (Sentry.captureException as jest.Mock).mockClear();

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([globalErrorInterceptor])),
        provideHttpClientTesting(),
        { provide: MatSnackBar, useValue: snackBar },
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

  it('não exibe snackbar para respostas de sucesso', async () => {
    let result: unknown;
    http.get('/api/test').subscribe({ next: (r) => (result = r) });

    controller.expectOne('/api/test').flush({ ok: true });
    await Promise.resolve();

    expect(snackBar.open).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true });
  });
});
