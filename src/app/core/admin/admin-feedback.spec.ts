import { MatSnackBar } from '@angular/material/snack-bar';
import { runWithFeedback, httpErrMsg } from './admin-feedback';

function makeSnackBar(): jest.Mocked<MatSnackBar> {
  return { open: jest.fn() } as unknown as jest.Mocked<MatSnackBar>;
}

describe('runWithFeedback', () => {
  it('exibe okMessage e retorna resultado quando fn resolve', async () => {
    const snackBar = makeSnackBar();
    const result = await runWithFeedback(() => Promise.resolve(42), 'Sucesso!', 'Erro!', snackBar);
    expect(result).toBe(42);
    expect(snackBar.open).toHaveBeenCalledWith('Sucesso!', 'OK', { duration: 3000 });
  });

  it('exibe errMessage string e retorna null quando fn rejeita', async () => {
    const snackBar = makeSnackBar();
    const result = await runWithFeedback(
      () => Promise.reject(new Error('boom')),
      'OK',
      'Erro genérico',
      snackBar,
    );
    expect(result).toBeNull();
    expect(snackBar.open).toHaveBeenCalledWith('Erro genérico', 'OK', { duration: 3000 });
  });

  it('chama errMessage como função quando fn rejeita', async () => {
    const snackBar = makeSnackBar();
    const errFn = jest.fn().mockReturnValue('Erro por função');
    const err = new Error('custom');
    const result = await runWithFeedback(() => Promise.reject(err), 'OK', errFn, snackBar);
    expect(result).toBeNull();
    expect(errFn).toHaveBeenCalledWith(err);
    expect(snackBar.open).toHaveBeenCalledWith('Erro por função', 'OK', { duration: 3000 });
  });
});

describe('httpErrMsg', () => {
  it('retorna conflictMsg quando status é 409', () => {
    const resolver = httpErrMsg('Já existe.', 'Erro genérico.');
    expect(resolver({ status: 409 })).toBe('Já existe.');
  });

  it('retorna genericMsg quando status não é 409', () => {
    const resolver = httpErrMsg('Já existe.', 'Erro genérico.');
    expect(resolver({ status: 500 })).toBe('Erro genérico.');
    expect(resolver({ status: 400 })).toBe('Erro genérico.');
    expect(resolver({})).toBe('Erro genérico.');
    expect(resolver(null)).toBe('Erro genérico.');
  });
});
