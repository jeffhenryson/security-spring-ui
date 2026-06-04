import { TestBed } from '@angular/core/testing';
import { TotpDisableComponent } from './totp-disable.component';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

describe('TotpDisableComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpDisableComponent] })
      .overrideTemplate(TotpDisableComponent, ''),
  );

  function create() {
    const fixture = TestBed.createComponent(TotpDisableComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('formulário inválido quando vazio', () => {
    expect(create().form.invalid).toBe(true);
  });

  it('formulário inválido com código TOTP < 6 dígitos', () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234', code: '12345' });
    expect(c.form.invalid).toBe(true);
  });

  it('formulário válido com senha e código corretos', () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234', code: '123456' });
    expect(c.form.valid).toBe(true);
  });

  it('onSubmit() emite submitted com os dados quando formulário é válido', async () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234', code: '123456' });
    const promise = firstValueFrom(outputToObservable(c.submitted));
    c.onSubmit();
    const result = await promise;
    expect(result).toEqual({ currentPassword: 'Pass@1234', code: '123456' });
  });

  it('onSubmit() reseta o formulário após emitir', () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234', code: '123456' });
    c.onSubmit();
    expect(c.form.value.code).toBe('');
  });

  it('onSubmit() não emite quando formulário é inválido', () => {
    const c = create();
    const spy = jest.spyOn(c.submitted, 'emit');
    c.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
});
