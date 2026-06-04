import { TestBed } from '@angular/core/testing';
import { TotpReplaceComponent } from './totp-replace.component';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

describe('TotpReplaceComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpReplaceComponent] })
      .overrideTemplate(TotpReplaceComponent, ''),
  );

  function create() {
    const fixture = TestBed.createComponent(TotpReplaceComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('formulário inválido quando código está vazio', () => {
    expect(create().form.invalid).toBe(true);
  });

  it('formulário inválido com código < 6 dígitos', () => {
    const c = create();
    c.form.setValue({ currentTotpCode: '12345' });
    expect(c.form.invalid).toBe(true);
  });

  it('onSubmit() emite o código TOTP quando formulário é válido', async () => {
    const c = create();
    c.form.setValue({ currentTotpCode: '654321' });
    const promise = firstValueFrom(outputToObservable(c.submitted));
    c.onSubmit();
    await expect(promise).resolves.toBe('654321');
  });

  it('onSubmit() reseta o formulário após emitir', () => {
    const c = create();
    c.form.setValue({ currentTotpCode: '654321' });
    c.onSubmit();
    expect(c.form.value.currentTotpCode).toBe('');
  });

  it('onSubmit() não emite quando formulário é inválido', () => {
    const c = create();
    const spy = jest.spyOn(c.submitted, 'emit');
    c.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
});
