import { TestBed } from '@angular/core/testing';
import { TotpSetupQrComponent } from './totp-setup-qr.component';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

describe('TotpSetupQrComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpSetupQrComponent] })
      .overrideTemplate(TotpSetupQrComponent, ''),
  );

  function create() {
    const fixture = TestBed.createComponent(TotpSetupQrComponent);
    fixture.componentRef.setInput('qrDataUrl', 'data:image/png;base64,abc');
    fixture.componentRef.setInput('secret', 'JBSWY3DPEHPK3PXP');
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.componentRef.setInput('secretCopied', false);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('formulário inválido com código vazio', () => {
    expect(create().form.invalid).toBe(true);
  });

  it('formulário inválido com código < 6 dígitos', () => {
    const c = create();
    c.form.setValue({ code: '12345' });
    expect(c.form.invalid).toBe(true);
  });

  it('formulário válido com código de 6 dígitos', () => {
    const c = create();
    c.form.setValue({ code: '123456' });
    expect(c.form.valid).toBe(true);
  });

  it('onConfirm() emite o código TOTP quando formulário é válido', async () => {
    const c = create();
    c.form.setValue({ code: '123456' });
    const promise = firstValueFrom(outputToObservable(c.confirmed));
    c.onConfirm();
    await expect(promise).resolves.toBe('123456');
  });

  it('onConfirm() reseta o formulário após emitir', () => {
    const c = create();
    c.form.setValue({ code: '123456' });
    c.onConfirm();
    expect(c.form.value.code).toBe('');
  });

  it('onConfirm() não emite quando formulário é inválido', () => {
    const c = create();
    const spy = jest.spyOn(c.confirmed, 'emit');
    c.onConfirm();
    expect(spy).not.toHaveBeenCalled();
  });
});
