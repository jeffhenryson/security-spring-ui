import { TestBed } from '@angular/core/testing';
import { TotpRegenComponent } from './totp-regen.component';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

describe('TotpRegenComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpRegenComponent] })
      .overrideTemplate(TotpRegenComponent, ''),
  );

  function create() {
    const fixture = TestBed.createComponent(TotpRegenComponent);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('formulário inválido quando senha está vazia', () => {
    expect(create().form.invalid).toBe(true);
  });

  it('formulário válido com senha preenchida', () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234' });
    expect(c.form.valid).toBe(true);
  });

  it('onSubmit() emite a senha quando formulário é válido', async () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234' });
    const promise = firstValueFrom(outputToObservable(c.submitted));
    c.onSubmit();
    await expect(promise).resolves.toBe('Pass@1234');
  });

  it('onSubmit() reseta o formulário após emitir', () => {
    const c = create();
    c.form.setValue({ currentPassword: 'Pass@1234' });
    c.onSubmit();
    expect(c.form.value.currentPassword).toBe('');
  });

  it('onSubmit() não emite quando formulário é inválido', () => {
    const c = create();
    const spy = jest.spyOn(c.submitted, 'emit');
    c.onSubmit();
    expect(spy).not.toHaveBeenCalled();
  });
});
