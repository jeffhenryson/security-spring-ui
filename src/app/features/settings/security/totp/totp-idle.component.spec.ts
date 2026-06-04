import { TestBed } from '@angular/core/testing';
import { TotpIdleComponent } from './totp-idle.component';
import { outputToObservable } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';

describe('TotpIdleComponent', () => {
  beforeEach(() =>
    TestBed.configureTestingModule({ imports: [TotpIdleComponent] })
      .overrideTemplate(TotpIdleComponent, ''),
  );

  function create(totpEnabled?: boolean, backupCodesRemaining = 8) {
    const fixture = TestBed.createComponent(TotpIdleComponent);
    if (totpEnabled !== undefined) fixture.componentRef.setInput('totpEnabled', totpEnabled);
    fixture.componentRef.setInput('backupCodesRemaining', backupCodesRemaining);
    fixture.componentRef.setInput('loading', false);
    fixture.componentRef.setInput('error', '');
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria o componente', () => {
    expect(create()).toBeTruthy();
  });

  it('totpEnabled = true quando 2FA está ativo', () => {
    expect(create(true).totpEnabled()).toBe(true);
  });

  it('totpEnabled = false quando 2FA está inativo', () => {
    expect(create(false).totpEnabled()).toBe(false);
  });

  it('backupCodesRemaining reflete o input', () => {
    expect(create(true, 3).backupCodesRemaining()).toBe(3);
  });

  it('emite setupRequested ao chamar output', async () => {
    const c = create(false);
    const promise = firstValueFrom(outputToObservable(c.setupRequested));
    c.setupRequested.emit();
    await expect(promise).resolves.toBeUndefined();
  });

  it('emite disableRequested ao chamar output', async () => {
    const c = create(true);
    const promise = firstValueFrom(outputToObservable(c.disableRequested));
    c.disableRequested.emit();
    await expect(promise).resolves.toBeUndefined();
  });
});
